# Plan de Depuración Integral — CoffeeOS

**Fecha:** 2026-06-10
**Método:** Auditoría multi-agente (5 agentes paralelos sobre 36 módulos API + frontend pos-web)
**Baseline:** API 52/52 suites + 1035 tests OK · pos-web 9/9 suites + 98 tests OK · TSC y ESLint limpios en ambos.

> Los tests pasan **pero ocultan deuda crítica**: módulos enteros corren contra `Map<string, T>` en memoria y los specs validan ese comportamiento, no la persistencia real. Por eso CI verde ≠ producción funcional.

---

## P0 — Ship-blockers (semana 1, no se puede salir a prod sin esto)

### Seguridad y multi-tenancy

| #   | Archivo                                                                                                                                                                                                                                                   | Bug                                                                                                                  | Acción                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | `apps/api/src/modules/auth/auth.controller.ts:35`                                                                                                                                                                                                         | `/register` `@Public()` acepta `organizationId` + `roleId` arbitrarios → cualquiera se vuelve admin de cualquier org | Exigir invite-code o token de owner                                                 |
| 2   | `apps/api/src/modules/auth/auth.service.ts:265-271`                                                                                                                                                                                                       | Refresh token usa el mismo `JWT_SECRET` y payload que el access; sin persistir/revocar                               | `JWT_REFRESH_SECRET` + payload `type:'refresh'` + tabla `RefreshToken` con hash     |
| 3   | `apps/api/src/modules/settings/settings.service.ts:37`                                                                                                                                                                                                    | `ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY \|\| 'default-key-change-in-prod'`                             | `getOrThrow`, sin fallback                                                          |
| 4   | `apps/api/src/modules/integrations/{twilio,mailrelay,cfdi}/*.service.ts`                                                                                                                                                                                  | Credenciales con default mock (`AC_mock_account_sid`, `XAXX010101000`, etc.)                                         | `getOrThrow` al boot, sin defaults                                                  |
| 5   | `apps/api/src/modules/upload/uploads.controller.ts:23,42`                                                                                                                                                                                                 | `path.join(uploadDir, 'products', filename)` con `filename` directo de `@Param` → path traversal                     | `path.basename()` + whitelist UUID                                                  |
| 6   | `apps/pos-web/src/app/login/page.tsx:19`                                                                                                                                                                                                                  | Credenciales reales hardcodeadas como defaults (`owner@coffeedemo.mx`/`password123`)                                 | Quitar defaults en build prod                                                       |
| 7   | `apps/pos-web/src/app/login/page.tsx:33`                                                                                                                                                                                                                  | `callbackUrl` sin validación de origen → open redirect                                                               | Validar mismo-origen antes del `router.push`                                        |
| 8   | Controllers en bulk: `locations`, `pos`, `orders`, `crm/customers`, `finance/expenses`, `analytics/dashboard`, `hr/employees`, `shifts`, `cash-registers`, `taxes`, `discounts`, `suppliers`, `purchase-orders`, `categories.findAll`, `products.findAll` | Sin `JwtAuthGuard` explícito y/o sin filtro de `organizationId` del JWT                                              | Interceptor global que inyecte `{ organizationId: user.organizationId }` en `where` |
| 9   | `apps/pos-web/src/lib/api.ts:101`                                                                                                                                                                                                                         | En 401 hace `window.location.href = '/login'` sin invalidar la sesión NextAuth                                       | `await signOut({ callbackUrl: '/login' })`                                          |

### Cálculos financieros incorrectos

| #   | Archivo                                                         | Bug                                                                                                                                          | Acción                                                                              |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 10  | `apps/api/src/modules/taxes/taxes.service.ts:83`                | `(subtotal * tax.rate) / 100` mientras schema documenta `rate=0.16` para 16% → IVA real cobrado 0.16%                                        | Unificar unidad: rate decimal (0.16) y service multiplica directo                   |
| 11  | `apps/api/src/modules/finance/pnl.service.ts:41,102`            | COGS hardcoded `netRevenue * 0.30`; tax hardcoded `ebt * 0.3`                                                                                | COGS desde `TicketLine.product.cost * quantity`; tax desde `Organization.taxRegime` |
| 12  | `apps/api/src/modules/integrations/cfdi/cfdi.service.ts:78-129` | `stampCFDI` genera UUID y sello con `Math.random()` → CFDIs **no válidos ante SAT** (fraude fiscal si se factura)                            | Integrar PAC real (Solución Factible / Finkok) ANTES de cualquier emisión           |
| 13  | `apps/pos-web/src/components/pos/Cart.tsx:135`                  | `unitPriceWithTax = unit_price * 1.16` mientras cart.store ya aplica IVA al total → **doble IVA en UI**                                      | Quitar multiplicación; mostrar precio del producto tal cual                         |
| 14  | `apps/pos-web/src/store/cart.store.ts:196`                      | IVA sobre `subtotal - discount` sin `Math.max(0,…)` → total negativo si discount > subtotal                                                  | Clamp `taxableAmount = Math.max(0, subtotal - discount)`                            |
| 15  | `apps/pos-web/src/components/pos/PaymentModal.tsx:53,104`       | `loyaltyDiscount = 50` se resta en UI pero el cart enviado al backend trae el total sin descontar → cliente paga menos, sistema registra más | Aplicar discount al cart antes del POST                                             |
| 16  | `apps/pos-web/src/components/pos/PaymentModal.tsx:102`          | Pago MIXED se envía como CASH al backend, sin desglose en `payments[]`                                                                       | Enviar array de `{ method, amount }`                                                |

### Concurrencia / atomicidad

| #   | Archivo                                                                         | Bug                                                                                                              | Acción                                                                          |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 17  | `apps/api/src/modules/pos/pos.service.ts:121,382`                               | `ticketNumber`/`orderNumber` vía `prisma.ticket.count() + 1` → race garantizado en concurrencia, choca `@unique` | Secuencia DB (`CREATE SEQUENCE`) o prefijo + cuid                               |
| 18  | `apps/api/src/modules/pos/pos.service.ts:126-245`                               | `createTicket` y `closeTicket` sin `$transaction`: si falla a mitad, stock queda decrementado y ticket abierto   | Envolver en `prisma.$transaction` + check de idempotencia (`status !== CLOSED`) |
| 19  | `apps/api/src/modules/inventory-movements/inventory-movements.service.ts:35-87` | Crear movement OUT no decrementa `InventoryItem.currentStock` persistido                                         | `$transaction` que cree movement + update stock                                 |
| 20  | `apps/api/src/modules/inventory-movements/inventory-movements.service.ts:266`   | `getCurrentStock` ignora `ADJUSTMENT` y `TRANSFER` → conteos físicos no se reflejan                              | Sumar signed según type                                                         |

### Endpoints rotos (datos `undefined` en runtime)

| #   | Archivo                                              | Bug                                                                                                                         | Acción                                                 |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 21  | `apps/pos-web/src/services/pos.service.ts:79-211`    | 13 endpoints asumen `response.data` pero `api.ts` ya devuelve JSON parseado → todos retornan `undefined`                    | Quitar `.data` o usar `unwrapSingle` consistente       |
| 22  | `apps/pos-web/src/services/categories.service.ts:57` | `baseUrl = '/api/v1/categories'` concatenado a `API_BASE_URL` que ya termina en `/api/v1` → `/api/v1/api/v1/categories` 404 | Quitar prefijo                                         |
| 23  | `apps/pos-web/src/services/expenses.service.ts:131`  | `uploadAttachment` con FormData a `api.post` que fuerza `JSON.stringify` + `Content-Type: application/json`                 | Fetch directo con FormData, sin Content-Type explícito |
| 24  | `apps/pos-web/src/lib/api.ts:41,175`                 | `Content-Type: application/json` se setea siempre, `body: JSON.stringify(data)` siempre → cualquier upload rompe            | Detectar si `body instanceof FormData/Blob`            |

---

## P1 — Funcional pero peligroso (semana 2-3)

### Módulos sin persistencia (todo Map en memoria, datos se pierden al restart)

| Módulo                | Archivos                            | Impacto                                                                                         | Migrar a Prisma                                                   |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `locations`           | `locations.service.ts:21`           | Sucursales + horarios efímeros                                                                  | Sí — schema ya existe                                             |
| `users`               | `users.module.ts` vacío             | No hay CRUD de usuarios                                                                         | Implementar completo                                              |
| `roles`               | `roles.service.ts:32`               | **RBAC efímero** — todos los permisos desaparecen al restart                                    | **Crítico para seguridad**                                        |
| `settings`            | `settings.service.ts:34`            | Config multi-tenant efímera                                                                     | Sí + KMS para secretos                                            |
| `maintenance`         | `maintenance.service.ts:29`         | Activos y mantenimientos perdidos                                                               | Crear modelos + migrar                                            |
| `notifications`       | `notifications.service.ts:29,558`   | Templates + envíos en memoria; `sendViaProvider` es **no-op** (marca DELIVERED sin enviar nada) | Conectar Twilio/Mailrelay reales                                  |
| `onboarding` (HR)     | `hr/onboarding.service.ts:12`       | Planes y progreso del empleado se pierden                                                       | Crear modelos                                                     |
| `certifications` (HR) | `hr/certifications.service.ts:7`    | NOM-251, manipulador de alimentos, RFC perdidos                                                 | Crear modelos                                                     |
| `evaluations` (HR)    | `hr/evaluations.service.ts:7`       | Evaluaciones de desempeño perdidas                                                              | Crear modelos                                                     |
| `dashboards`          | `dashboards.service.ts:29,296`      | 5 colecciones + `getWidgetData` devuelve **`Math.random()` como dato real**                     | Eliminar random, conectar a SalesAnalyticsService                 |
| `reports`             | `reports.service.ts:23,158`         | Schedules con `setTimeout` no durable; `generateReportData` retorna `[]` o random               | Queue (Bull) + conectar generators reales                         |
| `suppliers`           | `suppliers.service.ts:15-248`       | **Toda la API es Map**: create, findById, update, delete, getStats                              | Refactor completo a Prisma                                        |
| `purchase-orders`     | `purchase-orders.service.ts:21-320` | Toda la API es Map; `receive()` no crea `GoodsReceipt` ni `InventoryMovement IN`                | Refactor + integración con inventory en transacción               |
| `waste`               | `waste.service.ts:30`               | Schema Prisma no tiene modelo `Waste`; módulo 100% volátil                                      | Crear modelos + integrar con InventoryMovement OUT (reason=WASTE) |
| `inventory`           | `inventory.service.ts:25,396`       | Cache híbrida Map+DB; `delete` solo borra del Map                                               | Eliminar Map, single source = Prisma                              |
| `recipes`             | `recipes.service.ts:33,585`         | Map para recetas; `delete` no persiste; `getStats` siempre 0                                    | Eliminar Map, persistir delete                                    |

### Datos hardcoded que se muestran como reales

| Archivo                                                      | Bug                                                                                                                       | Acción                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `apps/api/src/modules/analytics/dashboard.service.ts:85,141` | `generateAlerts` retorna 5 alertas hardcoded; `getKPIDashboard` retorna `gross_margin: 68.5`, `nps_score: 72`, etc. fijos | Eliminar o conectar a queries reales |
| `apps/api/src/modules/pos/pos.service.ts:493`                | `getPaymentMethods` retorna array hardcoded                                                                               | Leer de DB                           |
| `apps/api/src/modules/recipes/recipes.service.ts:633,636`    | Labor 20% y overhead 10% hardcoded en `calculateCost`                                                                     | Tomar de settings de organización    |
| `apps/api/src/modules/recipes/recipes.service.ts:387,462`    | `cost_per_serving / (1 - 0.65)` ignora `target_margin_percentage` del registro                                            | Usar margin real                     |

### Otros backend

| Archivo                                                                | Bug                                                                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `apps/api/src/modules/orders/orders.controller.ts:13`                  | `import './orders.service.js'` con extensión `.js` en TS — rompe en algunos ESM                                                  |
| `apps/api/src/modules/orders/orders.service.ts:168`                    | `updateStatus` permite cualquier transición (PENDING → SERVED salta IN_PROGRESS); falta state machine                            |
| `apps/api/src/modules/pos/pos.service.ts:463`                          | `refundTicket` ignora el parámetro `amount`, no registra refund entity → pérdida de auditoría fiscal                             |
| `apps/api/src/modules/pos/pos.service.ts:479`                          | `getReceipt` renderiza HTML con `<pre>${...}` sin escape → XSS si nombre de producto lleva HTML                                  |
| `apps/api/src/modules/quality/temperature-logs.service.ts:46`          | NOM-251 data (in_range, subtype) serializada en `notes` con pares pipe-separated → consultas SQL imposibles                      |
| `apps/api/src/modules/quality/checklists.service.ts:7`                 | Mapeo arbitrario `DAILY→OPENING`, `WEEKLY→MID_SHIFT` pierde semántica regulatoria                                                |
| `apps/api/src/modules/hr/employees.service.ts:30,32`                   | `roleId = createDto.organization_id` (FK semánticamente rota); `password: ''`                                                    |
| `apps/api/src/modules/hr/employees.service.ts:25`                      | Campos PII (`rfc`, `curp`, `nss`, `address`, `hourly_rate`) **no se persisten** — viven solo en el response del create           |
| `apps/api/src/modules/shifts/shifts.service.ts:113`                    | `totalExpected = openingCash` ignora ventas en efectivo durante el turno → cash drift no detectable                              |
| `apps/api/src/modules/shifts/shifts.service.ts:108`                    | DTO acepta `closingCard`, `closingTransfers`, `closingOther` pero el service los descarta silenciosamente                        |
| `apps/api/src/modules/cash-registers/cash-registers.service.ts:91,121` | `recordDenominations` acepta campos non-numéricos sin whitelist (NaN persiste); `recordExpense` race con `findMany` + manual sum |
| `apps/api/src/modules/redis/redis.module.ts`                           | Esqueleto vacío registrado en `AppModule`; nada usa Redis (cache/queue)                                                          |
| `apps/api/src/modules/crm/customers.service.ts:111`                    | Filtro `birthday_month` carga toda la tabla y filtra en JS → DOS por OOM                                                         | `$queryRaw` con `EXTRACT(MONTH FROM …)` |

### Otros frontend

| Archivo                                                                      | Bug                                                                                                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `apps/pos-web/src/types/index.ts`                                            | Tipos en `snake_case` con `Date` mientras backend Prisma usa `camelCase` con strings — desactualizados desde mayo     |
| `apps/pos-web/src/types/index.ts:101`                                        | `PaymentMethod` sin `MIXED` aunque la UI y POSService lo usan                                                         |
| `apps/pos-web/src/components/pos/ProductCard.tsx:42,44`                      | `(product as any).stock` y `status === 'out_of_stock'` (lowercase) — el campo real es `current_stock`, enum UPPERCASE |
| `apps/pos-web/src/components/pos/NumPad.tsx:30`                              | `useState(initialValue)` solo inicializa una vez; al limpiar el padre sigue mostrando valor previo                    |
| `apps/pos-web/src/store/cart.store.ts:71`                                    | Mutación in-place de `updatedItems[i].quantity` y `subtotal` rompe inmutabilidad                                      |
| `apps/pos-web/src/store/offline.store.ts:194`                                | Listeners `online/offline` registrados a nivel módulo sin cleanup; duplicados con `use-offline.ts`                    |
| `apps/pos-web/src/store/offline.store.ts:185`                                | `partialize` persiste `syncQueue` con `Date` → string post-rehidratación, comparaciones rotas                         |
| `apps/pos-web/src/hooks/use-orders.ts` + `apps/pos-web/src/hooks/use-pos.ts` | Dos `useCreateOrder` con APIs incompatibles y endpoints distintos (`/orders` vs `/pos/orders`)                        |
| `apps/pos-web/src/app/dashboard/page.tsx:83`                                 | 4 `api.get` en `Promise.all` sin React Query — sin cache, sin retry                                                   |

---

## P2 — Cleanup (semana 4)

- Dividir `apps/api/src/modules/pos/pos.service.ts` (614 líneas, viola regla 500 LOC) en `TicketService` / `OrderService` / `CashRegisterService`.
- Eliminar duplicación `inventory` ⇄ `inventory-items` (dos módulos tocan `InventoryItem` con DTOs distintos).
- Unificar `ModifierType` (dual en `dto/create-modifier.dto.ts` y schema Prisma).
- Unificar `PurchaseOrderStatus` (enum interfaces vs schema con valores distintos).
- Subir `bcrypt.saltRounds` de 10 a 12 (`auth.service.ts:17`).
- `Math.random().toString(36).substr(2,9)` para IDs en >10 servicios → reemplazar por `cuid()`/`randomUUID()`.
- N+1 queries: `pos.service.ts:382` (product.findUnique en loop), `product-analytics.service.ts:120` (findIndex O(n²)).
- Snake_case ↔ camelCase: alinear DTOs API con camelCase de Prisma o documentar la traducción.
- Eliminar endpoints stub: `categories.{findBySlug, getTree, move}` siempre lanzan o devuelven `[]`.
- `bulkAction` y `inventory-automation.controller` exponen TODOs vacíos en Swagger como funcionales.

---

## Métricas baseline (2026-06-10)

```
API:    52 suites · 1035 tests · 0 fail · TSC OK · ESLint OK
pos-web: 9 suites ·   98 tests · 0 fail · TSC OK · ESLint OK
```

**Conteo de hallazgos por severidad:**

- CRITICAL: ~28 (multi-tenancy + finanzas + persistencia)
- HIGH: ~75 (lógica + endpoints rotos)
- MEDIUM: ~50 (UX/perf/inconsistencias)
- LOW: ~25 (cleanup)

**Causas raíz dominantes (atacar estas resuelve la mayoría):**

1. **Ausencia de filtro `organizationId` sistemático en controllers** — repite la conclusión del audit de mayo, sigue sin arreglarse.
2. **Map en memoria como fuente de verdad** en 13 servicios — la migración a Prisma quedó a medias.
3. **`response.data` inconsistente entre services pos-web** — `api.ts` ya parsea JSON pero varios services asumen shape Axios.
4. **Defaults peligrosos** en credenciales (encryption key, integrations API keys, login form).
5. **Cálculos financieros sin parametrizar**: tax rate, COGS, margen, labor cost — hardcoded en código en vez de schema/settings.

---

## Orden de ataque sugerido

1. **Día 1-2**: Interceptor de tenancy global + quitar `@Public()` de listados + fix `categories.service.ts` doble prefijo + fix `pos.service.ts` response.data.
2. **Día 3-5**: Auth (refresh secret + persistencia + register sin orgId arbitrario) + login frontend (defaults, open redirect, signOut en 401).
3. **Semana 2**: Cálculos financieros (taxes rate unit, PnL COGS, Cart doble IVA, PaymentModal loyalty + MIXED).
4. **Semana 2**: Transacciones POS (createTicket / closeTicket / inventory movements) + ticketNumber sin race.
5. **Semana 3**: Migrar a Prisma los módulos en memoria (orden: roles → settings → suppliers → purchase-orders → waste → maintenance → HR3 → dashboards → reports).
6. **Semana 4**: Cleanup P2 + reescribir tests que validan el comportamiento Map (pasan verde pero no reflejan prod).
