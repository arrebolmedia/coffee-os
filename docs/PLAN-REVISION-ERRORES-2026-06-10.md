# Plan Completo de Revisión de Errores — CoffeeOS

**Fecha:** 2026-06-10
**Alcance:** Del análisis estático del sistema hasta la funcionalidad real en navegadores.
**Contexto:** Post-fixes del audit multi-agente (ver `DEBUG-PLAN-2026-06-10.md`). Este plan define el pipeline de verificación en 7 fases con gates entre cada una: no se avanza a la siguiente fase si la actual falla.

---

## Fase 0 — Pre-requisitos de entorno

| Check                   | Comando                                                     | Esperado                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Node ≥ 20 LTS           | `node -v`                                                   | v20+ (política de versiones vetadas)                                                                                                      |
| Dependencias instaladas | `npm install` (root, turbo)                                 | Sin errores; correr `npm audit --audit-level=high` después                                                                                |
| Postgres disponible     | `docker-compose up -d` (root)                               | DB lista en el puerto del `.env`                                                                                                          |
| Migraciones aplicadas   | `npx prisma migrate deploy` (packages/database)             | Schema sincronizado                                                                                                                       |
| Variables de entorno    | comparar `.env` vs `apps/api/.env.example`                  | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SETTINGS_ENCRYPTION_KEY`, `DATABASE_URL` definidos — **el boot ahora crashea sin ellas (by design)** |
| Seed de datos demo      | script de seed si existe / crear org+user+productos mínimos | 1 org, 1 location, 1 usuario owner, ≥5 productos, ≥2 categorías                                                                           |

**Gate:** API arranca (`cd apps/api && npm run dev`) sin excepciones en consola.

---

## Fase 1 — Análisis estático

Todo en paralelo, ambas apps:

```bash
# Tipos
cd apps/api && npx tsc --noEmit
cd apps/pos-web && npx tsc --noEmit

# Lint (0 errors obligatorio; warnings se registran como deuda)
cd apps/api && npx eslint "src/**/*.ts"
cd apps/pos-web && npx eslint "src/**/*.{ts,tsx}"

# Seguridad de dependencias
npm audit --audit-level=high

# Build de producción (detecta errores que dev no muestra)
cd apps/api && npm run build
cd apps/pos-web && npm run build
```

**Qué buscar además del exit code:**

- Warnings de Next.js build sobre páginas con `dynamic = force-dynamic` accidental
- Imports circulares reportados por Nest al boot
- `any` count como métrica de tendencia (hoy: ~489 warnings API, ~399 pos-web — no debe crecer)

**Gate:** tsc 0 errores, eslint 0 errores, build exitoso ambas apps.

---

## Fase 2 — Tests unitarios

```bash
cd apps/api && npx jest --no-coverage          # baseline: 53 suites / 1016 tests
cd apps/pos-web && npx jest --no-coverage      # baseline: 9 suites / 98 tests
```

**Criterios:**

- 100% de suites pasan. Cualquier regresión vs baseline = bloqueante.
- Revisar los 34 skipped del API: documentar por qué cada uno está skipped o reactivarlo.
- **Trampa conocida:** los tests de módulos que eran in-memory fueron reescritos con mocks de Prisma — pasan sin DB real. No prueban SQL real (eso es Fase 3).

**Cobertura mínima nueva (deuda de tests detectada en el audit):**

- `pos.service`: race de ticketNumber, idempotencia de closeTicket, refund con amount — **hoy sin spec, crear**
- `orders.service`: transiciones de estado inválidas — **hoy sin spec, crear**
- `auth.service`: login/refresh/register-organization — **hoy sin spec, crear**

**Gate:** 0 suites fallando; specs nuevos para pos/orders/auth creados y pasando.

---

## Fase 3 — Tests de integración con DB real

El eslabón que hoy NO existe y que el audit demostró necesario (tests verdes con Maps falsos).

```bash
cd apps/api && npm run test:e2e    # jest-e2e.json — supertest contra app real
```

**Suite a construir (orden de prioridad):**

1. **Auth flow completo** — register-organization → login → access token → refresh → endpoint protegido → logout. Verificar que access token NO sirve como refresh.
2. **Multi-tenancy real** — crear 2 orgs con datos; con JWT de org A pedir `GET /products`, `/categories`, `/crm/customers`, `/finance/expenses`, `/orders` y verificar que NUNCA aparecen datos de org B. Probar también IDs directos de org B (`GET /products/:idDeOrgB` → 404/403, no 200).
3. **Ciclo de venta POS** — crear ticket → agregar líneas → cerrar ticket → verificar: stock decrementado, InventoryMovement OUT creado, totales con IVA correcto (16% real, no 0.16%), orden de cocina creada. Cerrar dos veces → 400 (idempotencia).
4. **Refund/Cancel** — refund parcial con amount, verificar movimiento IN reason=REFUND; cancel de ticket cerrado revierte inventario.
5. **Concurrencia** — 10 `createTicket` simultáneos (Promise.all) → 10 ticketNumbers únicos, 0 errores de unique constraint.
6. **Shifts/caja** — abrir turno → ventas en efectivo → cerrar turno → `totalExpected = openingFloat + ventas cash − gastos cash`; variance correcto.
7. **Loyalty** — 9 EARN → elegible; REDEEM → contador reinicia; EXPIRE > balance → 400.
8. **Uploads** — subir imagen válida; intentar `GET /uploads/products/..%2F..%2F` → 400, nunca 200.

**Infra:** levantar Postgres efímero (docker) + `prisma migrate deploy` + seed por suite. Limpiar entre tests con `TRUNCATE CASCADE`.

**Gate:** las 8 suites de integración pasan contra DB real.

---

## Fase 4 — Smoke test de API en vivo

Con API corriendo (`npm run dev`, puerto 4000):

```bash
# Sin token → 401 en todo lo protegido
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/products   # 401
# Login → token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"...","password":"..."}' | jq -r .accessToken)
# Con token → 200
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/v1/products | jq '.[0]'
```

**Matriz de smoke (cada módulo, 1 GET de lista + 1 POST de creación):** products, categories, modifiers, inventory-items, inventory-movements, recipes, taxes, suppliers, discounts, customers, loyalty, expenses, pnl, shifts, cash-registers, orders, tickets, locations, users, dashboard analytics.

**Qué verificar en cada respuesta:**

- Shape: camelCase consistente, sin `undefined`, fechas ISO string
- 401 sin token, 404 con ID de otra org, 400 con payload inválido (class-validator activo)
- Swagger (`/api/docs`): sin endpoints muertos (stubs eliminados en el audit no deben aparecer)

**Gate:** matriz completa sin 500s; errores siempre tipados (400/401/403/404).

---

## Fase 5 — E2E en navegador (Playwright)

Ya existe infra: `apps/pos-web/playwright.config.ts`, testDir `./e2e`, baseURL `localhost:3001`. Specs actuales: `pos-checkout.spec.ts`, `offline-mode.spec.ts`, `suppliers-quality.spec.ts`.

**Pre-requisito:** API (4000) + pos-web (3001) corriendo, DB con seed.

```bash
cd apps/pos-web
npm run playwright:install        # primera vez
npm run test:e2e                  # headless
npm run test:e2e:headed           # para depurar visualmente
```

**Specs existentes — actualizar primero:** los 3 specs pueden estar rotos tras el rename camelCase y los fixes de PaymentModal. Correrlos y corregir selectors/assertions antes de agregar nuevos.

**Specs nuevos a crear (orden de valor de negocio):**

1. **`auth.spec.ts`** — login con credenciales válidas → dashboard; inválidas → error visible; logout → redirect a /login; URL protegida sin sesión → redirect; callbackUrl externo → NO redirige fuera (open redirect fix).
2. **`pos-sale-flow.spec.ts`** — flujo completo: seleccionar productos → carrito muestra precios SIN doble IVA → totales correctos (subtotal + 16% = total) → pago CASH con cambio correcto → pago MIXED desglosado → ticket creado (verificar contra API).
3. **`pos-loyalty.spec.ts`** — cliente con descuento de lealtad: el total enviado al backend incluye el descuento (bug crítico del audit).
4. **`cart-edge-cases.spec.ts`** — cantidad 0/negativa rechazada; descuento > subtotal no produce total negativo; clearCart limpia customer/notas.
5. **`offline-mode.spec.ts`** (actualizar) — `context.setOffline(true)` → indicador visible → venta en cola → online → sincroniza → la fecha del queue item sobrevive el reload (fix de rehidratación de Dates).
6. **`products-crud.spec.ts`** — crear/editar/eliminar producto desde UI; imagen sube correctamente (fix FormData).
7. **`session-expiry.spec.ts`** — simular 401 del API (route interception) → la app hace signOut y redirige a login sin sesión zombie.

**Cross-browser:** configurar projects en playwright.config para `chromium` + `webkit` (Safari es relevante en iPads de cafetería). Firefox opcional.

**Gate:** todos los specs verdes en chromium; smoke (auth + pos-sale) verde en webkit.

---

## Fase 6 — QA manual asistido (lo que la automatización no cubre)

Checklist de 30 minutos con la app corriendo en navegador real:

- [ ] **Visual:** layouts sin overflow en 1024×768 (resolución típica de terminal POS) y 390×844 (móvil)
- [ ] **Teclado:** NumPad responde a teclado físico; tab order lógico en formularios
- [ ] **Impresión:** recibo (`getReceipt`) renderiza sin XSS con producto llamado `<script>alert(1)</script>` (fix de escape)
- [ ] **Latencia:** dashboard carga < 3s con seed de 1000 tickets; catálogo de productos no congela con 200 productos
- [ ] **Errores de red:** matar el API a mitad de un pago → la UI muestra error claro, no spinner infinito; el ticket NO queda medio creado (transacción)
- [ ] **Multi-pestaña:** venta en 2 pestañas simultáneas → sin doble decremento de stock
- [ ] **Refresh token:** dejar sesión abierta > 15 min → la siguiente acción renueva token sin echar al usuario

---

## Fase 7 — Cierre y registro

1. Actualizar `docs/DEBUG-PLAN-2026-06-10.md` marcando ítems verificados con la fase que los validó.
2. Registrar bugs nuevos encontrados en Fases 3-6 con el formato `[SEVERIDAD] archivo:línea — descripción`.
3. Commit por fase (no un mega-commit): `test(integration): ...`, `test(e2e): ...`, `fix: ...` para lo que aparezca.
4. Actualizar memoria del proyecto con resultados y pendientes.

---

## Resumen ejecutivo del pipeline

```
F0 Entorno → F1 Estático → F2 Unit → F3 Integración DB → F4 Smoke API → F5 Browser E2E → F6 QA manual → F7 Registro
   gate:boot    gate:0 err     gate:0 fail   gate:8 suites      gate:sin 500s     gate:specs verdes   checklist      commits
```

**Estado actual (2026-06-10):**

- F1: ⚠️ casi — API tiene 111 errores eslint en limpieza (agente corriendo); tsc limpio ambas
- F2: ✅ verde (53/53 API, 9/9 pos-web) — pero con los huecos de spec listados en F2
- F3: ❌ no existe — es la mayor brecha; los Maps falsos pasaron 1000+ tests durante meses
- F4: ❌ pendiente
- F5: ⚠️ infra lista, 3 specs probablemente rotos tras renames, 7 specs por crear
- F6-F7: pendientes

**Prioridad recomendada:** terminar F1 (en curso) → commit → F3 suite de multi-tenancy + ciclo POS (es lo que protege el dinero) → F5 actualizar specs existentes + auth/pos-sale → resto.
