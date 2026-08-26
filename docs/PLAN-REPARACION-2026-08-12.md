# Plan de reparación integral — CoffeeOS

**Fecha:** 2026-08-12
**Método:** diagnóstico ejecutado en la máquina (build, tests, boot, migraciones, puertos), no heredado de auditorías previas.
**Alcance:** monorepo completo — `apps/api`, `apps/pos-web`, `packages/database`.

---

## 1. Estado medido

Todo lo de esta tabla se corrió hoy, no se asume.

| Check                     | Comando                     | Resultado                                |
| ------------------------- | --------------------------- | ---------------------------------------- |
| Typecheck                 | `turbo run type-check`      | ✅ limpio (api + pos-web)                |
| Build API                 | `nest build`                | ✅                                       |
| Compilación pos-web       | `next build` (fase compile) | ✅ "Compiled successfully"               |
| **Build pos-web (total)** | `next build`                | ❌ **falla en lint**                     |
| Tests API                 | `jest`                      | 1078/1081 ✅ · 2 ❌ · 1 skip · 54 suites |
| Tests pos-web             | `jest`                      | 98/102 ✅ · 4 skip · 9 suites            |
| Boot API                  | `nest start`                | ✅ 36 módulos, rutas mapeadas            |
| **Base de datos**         | `prisma migrate status`     | ❌ **P1001 unreachable**                 |
| **Redis**                 | puerto 6379                 | ❌ **no escucha**                        |

**Conclusión: el sistema no arranca por entorno, no por código.** La API levanta porque Prisma conecta en _lazy_; cada request que toca BD devuelve 500.

### Correcciones a auditorías previas

Dos cosas que la memoria del proyecto reportaba mal y conviene dejar asentadas:

1. **"13 módulos backend con `Map` en memoria"** → queda **uno**: `roles.service.ts`
   (`permissions`, `roles`, `userRoles`; solo 2 referencias a Prisma). Los `Map` en
   `analytics/*`, `pos` y `waste` son agregadores locales dentro de funciones —
   código legítimo. Los commits de junio cerraron esa deuda casi por completo.

2. **Los 2 tests que fallan no son bugs de producto**, son mocks desalineados:
   - `shifts.service.spec.ts` — el mock no define `prisma.shift.updateMany`. El modelo
     `Shift` existe (`schema.prisma:1260`) y el método es válido.
   - `cash-registers.service.spec.ts:340` — el test espera un objeto; el servicio
     devuelve el array de un `$transaction`.

---

## 2. Decisiones tomadas

| Tema                    | Decisión                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Infra dev               | **Docker Compose.** Postgres en 5434 coincide con el `DATABASE_URL` actual → cero cambios de config. |
| Next.js 14.0.4 (vetado) | **Upgrade autorizado a `>=15.2.3 <16.0.0`.**                                                         |
| CFDI mock               | **Bloquear el mock**, no integrar PAC en esta ronda.                                                 |

---

## 3. Fases

Las fases **0 y 1 son estrictamente secuenciales y bloqueantes**. De la 2 en adelante
se pueden reordenar según prioridad de negocio.

---

### Fase 0 · Levantar el entorno — _bloqueante_ · ~45 min

**Problema.** `DATABASE_URL` → `localhost:5434`, que es el mapeo `5434:5432` de
`docker-compose.yml`. Docker Desktop está apagado. El Postgres 16 nativo que corre en
5432 es otra instancia y no tiene `coffeeos_dev`.

**Acciones**

1. Arrancar Docker Desktop.
2. `docker-compose up -d postgres redis` — deliberadamente solo esos dos; el compose
   trae además baserow, n8n, metabase, mailhog, minio, prometheus y grafana que no
   hacen falta para reparar.
3. Verificar que 5434 y 6379 escuchan.
4. `npm run db:migrate:deploy` — 16 migraciones pendientes de aplicar.
5. `npm run db:seed`.

**Criterio de salida (verificable)**

- `prisma migrate status` → "Database schema is up to date"
- `GET /api/v1/health/ready` → 200
- Login real desde el navegador contra la API, y `GET /api/v1/products` devuelve datos.

---

### Fase 1 · Desbloquear el build — _bloqueante_ · ~2–3 h

**Causa raíz.** [`.eslintrc.js:38`](../.eslintrc.js)

```js
'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
```

`next build` corre con `NODE_ENV=production` → la regla se vuelve `error` **solo en el
build**. En dev siempre fue warning, por eso nunca se notó. Son **66 errores en 71
archivos**, y están concentrados:

| Archivo                           | Errores |
| --------------------------------- | ------- |
| `src/lib/sync.service.ts`         | 25      |
| `src/lib/sw-registration.ts`      | 8       |
| `src/lib/api.ts`                  | 5       |
| `src/services/costing.service.ts` | 4       |
| `src/hooks/use-offline.ts`        | 4       |
| resto (7 archivos)                | 20      |

Los 5 primeros son **46 de los 66**.

**Acciones**

**1a. Logger real.** Crear `apps/pos-web/src/lib/logger.ts` con niveles, silencioso en
producción salvo `warn`/`error`. Migrar los 66 `console.*`. No usar `eslint-disable`:
la regla está bien puesta, lo que falta es el logger.

**1b. Darle a pos-web su propia config de ESLint.** Hoy **no tiene ninguna** — el build
avisa _"The Next.js plugin was not detected in your ESLint configuration"_. Hereda la
raíz, que omite a propósito los plugins de React porque no están instalados ahí
(ver comentario en `.eslintrc.js:52-56`, que asume incorrectamente que pos-web ya usa
`eslint-config-next`).

> **Consecuencia:** `react-hooks/rules-of-hooks` y `react-hooks/exhaustive-deps` **nunca
> han corrido** sobre las 46 rutas React de pos-web. Es fuente latente de bugs reales
> (efectos con deps incompletas, hooks condicionales). Esperar una cosecha de hallazgos
> nuevos al activarlo — hay que presupuestar la triage.

Crear `apps/pos-web/.eslintrc.json` extendiendo `next/core-web-vitals`.

**Criterio de salida**

- `npm run build` verde en los 3 workspaces.
- Plugin de Next activo, y los hallazgos nuevos de `react-hooks` triados
  (arreglados o registrados con justificación).

---

### Fase 2 · Next.js 14.0.4 → 15.x — _autorizado_ · ~medio día

**Por qué.** `14.0.4` está clavado exacto y cae en tres CVEs vetadas:

| CVE                 | Impacto                          | Rango afectado |
| ------------------- | -------------------------------- | -------------- |
| CVE-2024-46982      | Cache poisoning                  | `< 14.2.10`    |
| CVE-2025-29927      | **Bypass de auth en middleware** | `< 14.2.25`    |
| GHSA-7gfc-8cq8-jh5f | Bypass de autorización           | `< 14.2.7`     |

**Acciones**

1. `npx @next/codemod@canary upgrade latest`, fijando el rango a `>=15.2.3 <16.0.0`.
2. Revisar los breaking changes de Next 15 que sí tocan este proyecto:
   - **Request APIs asíncronas** — `cookies()`, `headers()`, `params`, `searchParams`
     ahora son `Promise`. Afecta a las 46 rutas del App Router.
   - **Defaults de caché** — `fetch` ya no cachea por defecto; los Route Handlers `GET`
     tampoco. Revisar dónde se asumía caché implícita.
   - **React 19** — verificar compatibilidad (hoy `react ^18.2.0`).
3. `npm audit --audit-level=high` **obligatorio** después, y reportar findings.

**Criterio de salida**

- Build + tests verdes.
- `npm audit` sin high/critical.
- Smoke manual en navegador: login → POS → cobro.

---

### Fase 2.6 · Dependencias vulnerables · ~medio día

> **Hallazgo nuevo, 2026-08-12.** `npm audit` tras alinear `typescript-eslint`.

**67 vulnerabilidades: 3 críticas, 35 altas, 23 moderadas, 6 bajas.**

| Severidad  | Paquete                     | Vector                                           |
| ---------- | --------------------------- | ------------------------------------------------ |
| 🔴 crítica | `next` _(directo)_          | SSRF en Server Actions — **lo cierra la Fase 2** |
| 🔴 crítica | `next-auth` _(directo)_     | Email misdelivery                                |
| 🔴 crítica | `handlebars` _(transitivo)_ | JS Injection vía AST Type Confusion              |

**Altas directas:** `axios` (NO_PROXY hostname bypass), `multer` (DoS), `sharp`
(libvips CVE-2026-33327), `@apollo/server` (DoS en `startStandaloneServer`),
`@nestjs/platform-express`, `@nestjs/cli`, `postcss` (XSS), `workbox-webpack-plugin`,
`next-pwa`.

**Transitivas notables:** `lodash` (code injection vía `_.template`), `jws`
(verificación HMAC incorrecta), `serialize-javascript` (RCE), `rollup` (path
traversal), `ws` (memory disclosure), `validator`, `tmp`, `glob`, `form-data`,
`minimatch`, `brace-expansion`.

**Acciones:** `npm audit fix` para lo no-breaking; evaluar los breaking uno por uno.
`jws` y `next-auth` son prioritarios por tocar el flujo de autenticación.

---

### Fase 2.5 · Aislamiento multi-tenant — 🔴 **CRÍTICO** · ~1–2 días

> **Hallazgo nuevo, encontrado el 2026-08-12 al ejecutar el sistema levantado.**
> No estaba caracterizado con esta precisión en auditorías previas.

**19 de 53 controllers toman `organization_id` del cliente y nunca leen el JWT.**

```
crm/campaigns          crm/loyalty            crm/rfm
dashboards             finance/permits        hr/certifications
hr/evaluations         hr/onboarding          integrations/cfdi
inventory/inventory-automation                maintenance
notifications          onboarding             pos/pos-cash-register
quality/checklists     quality/food-safety    quality/temperature-logs
reports                waste
```

**Mecanismo confirmado** en `crm/campaigns.service.ts:102`:

```js
if (query.organization_id) where.organizationId = query.organization_id;
```

El valor entra directo al `where` de Prisma sin contrastarse contra el JWT. Dos vectores:

1. **Lectura cross-tenant** — un usuario de la org A pasa `organization_id=<B>` y lee datos de B.
2. **Enumeración total** — al ser `if (query.organization_id)`, **omitir el parámetro
   elimina el filtro** y devuelve los registros de _todas_ las organizaciones.
3. **Escritura cross-tenant** — `campaigns.controller.ts:128-135` →
   `createBirthdayCampaign(body.organization_id)` crea registros en la organización que
   el cliente indique.

**Estado de la verificación:** confirmado por inspección de código y trazado
controller→service. No se pudo demostrar en vivo porque las tablas afectadas están
vacías en el seed de dev; los endpoints devuelven `[]` tanto para la org propia como
para una ajena. Para prueba definitiva hace falta sembrar dos organizaciones con datos.

**El patrón correcto ya existe en el repo** y hay dos referencias a seguir:

- `products.controller.ts:88` — acepta el query param pero usa `user.organizationId` del JWT.
- `inventory-items` — valida con whitelist y **rechaza** `organization_id` con 400.

**Acciones**

1. Sacar `organization_id` de la superficie pública de esos 19 controllers.
2. Derivar siempre la organización de `@CurrentUser()`.
3. Añadir un guard o interceptor que lo imponga globalmente, para que no vuelva a
   filtrarse por olvido en un controller nuevo.
4. Tests de tenancy con **dos organizaciones sembradas** — hoy el seed trae una sola,
   y por eso ninguna suite puede detectar esta clase de fuga.

**Criterio de salida**

- Ningún controller acepta `organization_id` del cliente para decidir scope.
- Un test que, con token de la org A, intente leer y escribir en la org B y reciba 403.

---

### Fase 3 · Cerrar los stubs que mienten · ~1–2 días

Endpoints que reportan éxito sin lógica detrás. El frontend y los tests los consumen
como funcionales → falsa confianza.

**3a. CFDI — timbres fiscales falsos** · `apps/api/src/modules/integrations/cfdi/cfdi.service.ts:108,436-457`
Genera `SelloCFD`/`SelloSAT` con `Buffer.from(Math.random()...)`, marca
`status='stamped'` y `getDownloadXml` entrega el XML como si el SAT lo hubiera timbrado.
`NoCertificadoSAT` es el literal `'00001000000987654321'`.
→ **Decidido: bloquear.** Forzar `status='mock'` visible, **bloquear la descarga del
XML** mientras sea mock, y corregir `cfdi.service.spec.ts:117,124,131` que hoy afirman
`success:true` contra el mock. Añadir un test _pending_ que documente que falta el PAC.

**3b. `inventory-automation.controller.ts:17-240`**
18 endpoints con `constructor() {}` vacío, sin Prisma, montado en producción
(`inventory.module.ts:9`). `getAutoDeductConfig` devuelve `enabled:true` hardcodeado;
`deductStockForOrder` devuelve `{ deductions:[], total_items_deducted:0 }`. **El POS cree
que descuenta stock automáticamente; nunca descuenta.**
→ Implementar sobre Prisma+recipes, o desmontar el controller y devolver `501`. Mínimo
inaceptable de dejar: que siga diciendo `enabled:true`.

**3c. `roles.service.ts`** — último módulo con estado en memoria. Migrar
`permissions`/`roles`/`userRoles` a Prisma.

**Criterio de salida**

- Ningún endpoint reporta éxito sin lógica detrás.
- Un test que lo verifique por cada uno de los tres.

---

### Fase 4 · Tests · ~medio día

**4a.** Arreglar los 2 mocks desalineados (ver §1). Son de test, no de producto.

**4b. Cobertura.** pos-web tiene **9 suites para 46 rutas**. Priorizar las rutas de
dinero: `pos`, `orders`, `expenses`, `pnl`, `cfdi`.

**4c.** Los tests de API son mock-based (`mockPrisma`), por eso pasan con la BD caída —
no detectan desalineación real con el schema. Considerar una capa de tests de
integración contra la BD levantada.

**Criterio de salida:** 100% de suites verdes en ambos workspaces.

---

### Fase 5 · Higiene del repo · ~1 h

No bloquea nada, pero hoy `git status` es ilegible (143 entradas) y eso esconde
problemas reales.

- **60 archivos basura en la raíz** — restos de redirecciones de shell rotas. Nombres
  como `POSService.getCurrentCashRegister(organizationId)`, `,+`, `0)`, `(url)`,
  `{try{const`. Revisar la lista y borrar.
- **96 archivos `.md` en la raíz** → mover a `docs/` o `_archive/`. CLAUDE.md ya
  prohíbe guardar en la raíz.
- **`.gitignore`** no cubre `.turbo/`, `.swarm/`, `.claude-flow/`, `.claude/`.
- **Workspaces vacíos** — `apps/mobile`, `packages/shared`, `packages/ui`,
  `packages/integrations` están declarados en `workspaces` pero son directorios sin
  un solo archivo. Quitarlos del `package.json` o poblarlos.
- **Commitear el borrado de `apps/admin-web`.** Está en `_archive/` sin commitear.
  Verificado: pos-web (46 rutas) es superset del admin (27 rutas) — el archivado fue
  correcto, solo falta registrarlo en git.

**Criterio de salida:** `git status` limpio y legible.

---

### Fase 6 · Verificación end-to-end · ~medio día

Playwright contra el stack real levantado, no contra mocks.

**Flujo mínimo que debe pasar:**
login → abrir turno → tomar orden en POS → cobrar → verificar que el inventario
descontó → cerrar turno → el corte de caja cuadra.

Ese flujo cruza justo los módulos con deuda (3b inventory-automation, roles, shifts,
cash-registers), así que sirve de red de seguridad para las fases anteriores.

---

## 4. Resumen de esfuerzo

| Fase                      | Esfuerzo   | Bloqueante | Estado                                                        |
| ------------------------- | ---------- | ---------- | ------------------------------------------------------------- |
| 0 · Entorno               | ~45 min    | ✅         | ✅ **completada** 2026-08-12                                  |
| 1 · Build                 | ~2–3 h     | ✅         | ✅ **completada** 2026-08-12                                  |
| **2.5 · Multi-tenant** 🔴 | ~1–2 días  | —          | 🟡 **fugas conocidas cerradas**; falta la extensión de Prisma |
| 3 · Stubs                 | ~1–2 días  | —          | pendiente                                                     |
| 2 · Next.js 15            | ~medio día | —          | pendiente                                                     |
| 2.6 · Deps vulnerables    | ~medio día | —          | pendiente                                                     |
| 4 · Tests                 | ~medio día | —          | pendiente                                                     |
| 5 · Higiene               | ~1 h       | —          | pendiente                                                     |
| 6 · E2E                   | ~medio día | —          | pendiente                                                     |

**Total: ~7–8 días** (partió de 4–5; subieron las fases 2.5 y 2.6, ambas descubiertas
al ejecutar el sistema en vez de solo leerlo).

Orden sugerido: **2.5 → 3 → 2 → 2.6 → 4 → 5 → 6.** La 2.5 va primero porque es fuga de
datos entre clientes y no depende de nada. La 2.6 va pegada a la 2 porque el upgrade de
Next resuelve una de las tres críticas por sí solo.

---

## 5. Registro de ejecución

### Sesión «que funcione» — 2026-08-12

Cambio de enfoque a petición del dueño: dejar de auditar y hacer que el flujo real
opere. Se manejó la app en el navegador hasta cerrar una venta.

**El bloqueador que impedía vender.** Al cobrar, el POS respondía
_«Error al crear la orden»_. Causa: `use-pos.ts:69` aborta si `user.locationId` viene
vacío, y `/auth/login` **no devolvía la sucursal del usuario** pese a que la asignación
existe en `user_locations`. Se añadió `locationId`/`locationIds` a la respuesta de login
(`auth.service.ts`). Verificado: una sesión NextAuth nueva ya trae la sucursal.

> Matiz que costó descubrir: NextAuth sólo rellena el JWT en el _sign-in_. Una sesión
> abierta desde antes del arreglo conserva `locationId: null` para siempre, y ni
> `/api/auth/signout` por GET ni el botón de la UI la limpiaban de forma fiable. El
> síntoma sobrevive al fix hasta que se cierra sesión de verdad.

**Venta real ejecutada de punta a punta:**

| Paso                           | Resultado                                                     |
| ------------------------------ | ------------------------------------------------------------- |
| Ticket `TKT-20260812-92b184a3` | subtotal 156 · IVA 24.96 · total 180.96 — aritmética correcta |
| Cobro en efectivo              | `CLOSED`, `payments` = CASH 180.96 `COMPLETED`                |
| Persistencia                   | verificada en Postgres (ticket, línea y pago)                 |

**Otros arreglos de esta tanda**

- **P&L devolvía 500** en sus 4 endpoints: construía `new Date(undefined)` →
  `"Invalid Date"` y Prisma reventaba. Ahora valida y responde 400.
- **4 endpoints inalcanzables por orden de rutas** — `@Get(':id')` declarado antes que
  la ruta literal capturaba el segmento: `/dashboards/alerts`, `/reports/schedules`,
  `/notifications/batches`, `/settings/templates`.
- **CFDI**: el timbrado mock quedó bloqueado con error explícito
  («no se emitió ningún comprobante ante el SAT») en vez de fingir `stamped`.
- **`roles` migrado a Prisma** — era el último módulo con `Map` en memoria. `Role` ganó
  `code`, `scopes`, `isSystem` y `organizationId` opcional (roles globales vs. del
  tenant). Hubo que añadir `code` a las fixtures de los 3 e2e.
- **Catálogo sembrado**: de 1 producto a **31**, con 9 categorías y 16 modificadores.
  La organización B quedó intacta (0 productos), como debe ser para los tests de tenancy.
- **Datos corruptos**: 1 producto con mojibake (`Origen �nico` → `único`) y una
  categoría «Lácteos» duplicada y vacía, eliminada.

**Contrato frontend↔API verificado**: 136 llamadas del frontend contrastadas contra el
OpenAPI real — **0 desajustes**.

**Estado final**

| Check                         | Resultado                        |
| ----------------------------- | -------------------------------- |
| `turbo run build`             | ✅ 2/2                           |
| Tests unitarios API           | ✅ **55/55 suites · 1114 tests** |
| Tests e2e                     | ✅ 4/4 suites · 34 tests         |
| `tsc --noEmit`                | ✅ limpio                        |
| Venta real en navegador + API | ✅ funciona                      |

### Verificación adversarial — regresiones encontradas y cerradas

Se corrió un workflow de 12 agentes: 6 arreglaron, 6 intentaron **refutar** cada arreglo
contra la app viva. Resultado: 3 confirmados (P&L, orden de rutas, CFDI) y **3 con
defectos reales que los propios arreglos introdujeron**. La fase de refutación valió
exactamente por esto.

**Críticos cerrados (regresiones de esta sesión)**

| Defecto                                            | Causa                                                                                                                                                                                                      | Estado                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Usuario de A enlazable a un rol de B               | `auth.service.ts:67` usaba `role.findUnique({id})` sin filtro. Antes de migrar roles a Prisma **era imposible** porque todos eran globales: la migración creó el peligro y este call site no se actualizó. | ✅ 400                                                                    |
| `POST /users` con rol ajeno                        | `users.service.ts` escribía `roleId` sin validar nada                                                                                                                                                      | ✅ 400                                                                    |
| Seed pisaba datos del tenant B                     | `customer.upsert({where:{email}})` sobre `Customer.email`, que es `@unique` **global**                                                                                                                     | ✅ acotado por organización, aborta si el email es de otro tenant         |
| «Tenant B intacto» sin verificar                   | imprimía conteos sin compararlos: mostraría «intacto» aunque lo hubiéramos pisado                                                                                                                          | ✅ testigo antes/después que **lanza** si algo cambió                     |
| `npm run db:seed` borraba TODAS las organizaciones | apuntaba a `seed-simple.ts`, con 7 `deleteMany({})` sin filtro                                                                                                                                             | ✅ deletes acotados por organización + `db:seed` repuntado al seed seguro |

**Inventory-automation — tres huecos reales**

- **Doble descuento bajo concurrencia**: la idempotencia era un _check-then-act_ fuera de
  la transacción. Con 12 peticiones en paralelo, dos pasaron y el stock bajó el doble.
  → Índice único parcial sobre `(reference, inventory_item_id)` para
  `reason='RECIPE_DEDUCTION'` + P2002 traducido a 409. La garantía la da ahora la BD.
- **Descontaba con `enabled:false`**: leía el flag, lo devolvía en la respuesta y
  descontaba igual. → 409 explícito.
- **Descontaba de órdenes `CANCELLED`**, fabricando una discrepancia permanente que el
  propio reporte de exactitud contaba como merma. → sólo `SERVED`/`COMPLETED`.
- Ruido de coma flotante (`6.964000000000001`) → se escribe el valor redondeado en vez de
  un `decrement` crudo.

### Estado al cerrar

| Check                | Resultado                                       |
| -------------------- | ----------------------------------------------- |
| `tsc --noEmit`       | ✅ limpio                                       |
| Tests unitarios      | ✅ **55/55 suites · 1116 tests**                |
| Tests e2e            | ✅ 4/4 · 34 tests                               |
| Exploits re-probados | ✅ los 3 críticos bloqueados contra la app viva |

### Pendientes conocidos

**Alto**

- **La automatización de inventario sigue sin ser automática.** Con `enabled:true`, llevar
  una orden a `COMPLETED` no descuenta nada: `deductForOrder` no lo llama nadie fuera de
  su propio módulo y el hook `useDeductStockForOrder` está huérfano en el frontend. Falta
  cablear esa última milla.
- **`GET /modifiers` es visible desde cualquier tenant** (200 con los 16 modificadores).
  `Modifier` no tiene `organizationId`; antes era fuga teórica porque la tabla estaba
  vacía, el seed la volvió observable. Bloqueante de la Fase 2.5.
- **`is_system` / `system_role` son settables por el cliente** en `CreateRoleDto`: se
  puede crear un rol que después no se deja actualizar ni borrar por API.

**Medio**

- `assign-role.dto.ts` combina `@IsDateString()` con `@Type(() => Date)`, así que las
  asignaciones temporales son inalcanzables por HTTP (400 con un ISO válido).
- Panadería: productos con `tax_rate = 0.16` conviviendo con una regla «IVA 0% Panadería»
  para la misma categoría — el IVA sale distinto según qué fuente lea el POS.
- `deleteRole` cuenta usuarios sin filtrar organización (filtra conteos ajenos).

**Bajo**

- Falta `public/images/placeholder.png` → 400 en `/_next/image`.
- Polling excesivo de `/api/auth/session`.
- `inventory-automation.service.ts` en 603 líneas contra la guía de <500 del CLAUDE.md.
- Basura sin trackear en la raíz y en `packages/database/` (Fase 5).

**Fases del plan sin empezar:** 2 (Next.js 15), 2.6 (67 vulnerabilidades), 5 (higiene),
6 (Playwright). Y la extensión de Prisma Client para tenancy sigue siendo la pieza que
convierte la disciplina en garantía.

---

### Fase 0 — ✅ completada 2026-08-12

| Paso                    | Resultado                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Docker Desktop          | ✅ daemon 29.3.0                                                                            |
| `coffeeos-postgres`     | ✅ up, `0.0.0.0:5434->5432`                                                                 |
| `coffeeos-redis`        | ✅ up, `0.0.0.0:6379->6379`                                                                 |
| `prisma migrate status` | ✅ "Database schema is up to date" — las 16 ya estaban aplicadas                            |
| Datos                   | 1 org · 4 usuarios · 3 categorías · 3 sucursales · 2 proveedores · 1 orden · **1 producto** |
| API `:4000`             | ✅ `/health` → `{"status":"ok"}`                                                            |
| pos-web `:3001`         | ✅ HTTP 200                                                                                 |
| **Login real**          | ✅ `owner@coffeedemo.mx` → JWT de 323 chars                                                 |
| **Smoke autenticado**   | ✅ 9/10 endpoints 200 con datos reales de BD                                                |

No hizo falta correr `db:migrate:deploy` ni `db:seed`: la BD del volumen
`postgres_data` ya venía migrada y sembrada. El único problema era que Docker estaba
apagado.

**Pendiente menor:** el seed tiene **1 solo producto** y **1 sola organización**. Lo
segundo bloquea los tests de tenancy de la Fase 2.5 — hay que ampliarlo.

---

### Fase 1 — ✅ completada 2026-08-12

**1a. Logger.** Creado `apps/pos-web/src/lib/logger.ts` con niveles: `debug`/`info`
silenciados en producción, `warn`/`error` siempre visibles. Migradas **66/66** llamadas
en **18 archivos** (`console.log`→`logger.debug`, `warn`→`warn`, `error`→`error`).
Quedan 0 `console.*` fuera del propio logger y de los tests.

**1b. Config de ESLint.** Creado `apps/pos-web/.eslintrc.json`. Sin `root: true`, para
que herede las reglas TS de la raíz y sume las de Next/React.

**Obstáculo encontrado y resuelto — el linter llevaba tiempo sin correr de verdad.**

Al añadir la config, ESLint empezó a crashear:

```
Cannot read properties of undefined (reading 'members')
Rule: "@typescript-eslint/no-duplicate-enum-values"
```

Y `next build` degradaba ese crash a warning y **pasaba igual** — un verde falso: el
build compilaba sin que ninguna regla se evaluara.

Causa: `eslint-config-next@14.0.4` declara `@typescript-eslint/parser: "^5.4.2 || ^6.0.0"`
y npm le da una copia anidada **v6.21.0**, mientras la raíz carga el plugin **v8**.
typescript-eslint v8 movió `TSEnumDeclaration.members` a `.body.members`, así que la
regla v8 leía `.members` de `undefined` sobre un AST v6.

Alinear el `package.json` de pos-web a `^8.46.2` **no bastó**: la copia anidada
pertenece a `eslint-config-next`, que topa en v6 por diseño. Solución: fijar el parser
explícitamente en `.eslintrc.json`, que gana sobre el que impone `next/core-web-vitals`.
_Se podrá simplificar tras la Fase 2, cuando `eslint-config-next@15` ya admita v8._

**Cosecha de las reglas de React que nunca habían corrido** — bastante menor de lo
previsto:

| Regla                            | Antes      | Después  |
| -------------------------------- | ---------- | -------- |
| `react/display-name`             | 3 errores  | 0 ✅     |
| `react/no-unescaped-entities`    | 2 errores  | 0 ✅     |
| `react-hooks/exhaustive-deps`    | 2 warnings | 1        |
| **`react-hooks/rules-of-hooks`** | **0**      | **0** ✅ |

Cero violaciones de `rules-of-hooks` en 46 rutas es una señal buena del código.

**Arreglos aplicados:**

- `InventoryItemModal.tsx` — `predefinedCategories` subido a scope de módulo como
  `PREDEFINED_CATEGORIES`. Estaba declarado dentro del componente, así que se recreaba
  en cada render; meterlo a las deps habría limpiado el formulario solo. Warning
  eliminado de raíz, no silenciado.
- `IngredientsList.tsx:86` — comillas escapadas a `&quot;`.
- 3 wrappers de test anónimos → `const Wrapper` + `displayName`.

**Deuda consciente que queda:** `RecipeModal.tsx:117` sigue con un
`react-hooks/exhaustive-deps`. Ahí `categories` es un **prop**, y añadirlo a las deps
resetearía el formulario cada vez que el padre re-renderice — borraría lo que el usuario
esté escribiendo. El bug latente real es menor (si las categorías cargan async después
de abrir el modal, el default queda vacío). Se atiende en la Fase 4 con un `ref` o
reestructurando el efecto.

**Verificación**

| Check                     | Resultado                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `next lint`               | ✅ **0 errores** · 313 warnings (280 `no-explicit-any`, 28 `no-non-null-assertion`) |
| `tsc --noEmit`            | ✅ limpio                                                                           |
| `turbo run build --force` | ✅ **2/2 tasks**                                                                    |
| Tests pos-web             | ✅ 9/9 suites · 98 pasan                                                            |
| Tests API                 | 52/54 suites · 1078 pasan — **los mismos 2 fallos previos**, nada nuevo roto        |

Los 313 warnings no bloquean y son deuda de tipado (`any`), no defectos. Reducirlos es
candidato a fase aparte si interesa.

---

### Fase 2.5 — 🟡 parcialmente completada 2026-08-12

#### Explotación confirmada en vivo (antes del fix)

Se creó una organización real de prueba (`Tenant B Testing`) y una campaña dentro de
ella. Con el token de la **org A**, contra la app corriendo:

| #   | Vector                                   | Antes                            |
| --- | ---------------------------------------- | -------------------------------- |
| 1   | `GET /crm/campaigns/:id` de otra org     | 🔴 devolvió el registro completo |
| 2   | `GET /crm/campaigns` sin parámetro       | 🔴 devolvió la campaña de B      |
| 3   | `GET /crm/campaigns?organization_id=<B>` | 🔴 devolvió datos de B           |
| 4   | `PATCH /crm/campaigns/:id/status`        | 🔴 **modificó** el registro de B |
| 5   | `DELETE /crm/campaigns/:id`              | 🔴 **borró** el registro de B    |
| 6   | `GET /waste/stats/<org B>`               | 🔴 organización tomada del path  |

No era una debilidad teórica: lectura, enumeración, modificación y borrado de datos de
otro cliente, con un usuario válido y sin privilegios especiales.

#### Lo que ya estaba construido y nadie había cableado

`common/guards/tenant.guard.ts` y `common/decorators/current-org.decorator.ts` **ya
existían**, documentados y con la semántica correcta. El guard no estaba registrado en
ningún módulo: era código muerto. Sólo `JwtAuthGuard` estaba como `APP_GUARD`.

#### Correcciones aplicadas

**Capa 1 — `TenantGuard` global.** Registrado como segundo `APP_GUARD` en `AppModule`,
después de `JwtAuthGuard` (el orden importa: necesita `request.user`). Se le añadió:

- respeto a `@Public()` — sin esto el login se rompía;
- paso libre para `isSuperAdmin`, que cruza organizaciones por diseño;
- **validación de path params**, que no tenía. Sin eso, `GET /waste/stats/:organization_id`
  seguía abierto: el guard sólo miraba body y query.

**Capa 2 — origen de la organización.** 19 controllers migrados a `@CurrentOrg()`:
51 decoradores `@Query/@Param('organization_id')` convertidos por codemod, 9 handlers
que reciben el DTO de query completo ajustados para forzar `organization_id` desde el
JWT, y los 2 `@Body() { organization_id }` de campaigns eliminados.

> Se evaluó inyectar `organization_id` globalmente desde el guard —una sola línea que
> lo habría resuelto todo— y **se descartó**: endpoints con `forbidNonWhitelisted`
> como `inventory-items` rechazan ese campo con 400, así que habría roto la API.

**Capa 3 — IDOR, hecho en `crm/campaigns` como caso de referencia.**
`findOne`/`updateStatus` pasaron de `findUnique({ where: { id } })` a
`findFirst({ where: { id, organizationId } })`, y `delete` a `deleteMany` con el mismo
filtro. Así un registro ajeno es indistinguible de uno inexistente (404) y no se filtra
su existencia. `findAll` ahora **exige** `organization_id` y lanza `BadRequestException`
en vez de consultar sin filtro.

`CreateCampaignDto.organization_id` pasó a opcional: el controller siempre lo
sobrescribe con el del JWT, y si un cliente manda uno ajeno, el guard responde 403.

#### Verificación

Los 6 vectores, re-ejecutados contra la app tras el fix:

| #   | Vector                       | Después                       |
| --- | ---------------------------- | ----------------------------- |
| 1   | IDOR `GET /:id`              | ✅ 404                        |
| 2   | Enumeración sin parámetro    | ✅ sólo datos propios         |
| 3   | Cross-tenant explícito       | ✅ 403                        |
| 4   | `PATCH` de otra org          | ✅ 404                        |
| 5   | `DELETE` de otra org         | ✅ 404, el registro sobrevive |
| 6   | Organización en el path      | ✅ 403                        |
| —   | _Control:_ org A con lo suyo | ✅ 200, sigue operando        |

Además: crear una campaña **sin** enviar `organization_id` la asigna correctamente a la
organización del JWT, y cada tenant lista únicamente lo propio.

**Tests:** 7 casos de regresión añadidos a `test/integration/tenancy-and-writes.e2e-spec.ts`
(suite que ya sembraba dos tenants) — **7/7 pasan** contra Postgres real. Suite unitaria
de campaigns actualizada a las nuevas firmas, con 4 tests nuevos que fijan el
comportamiento. Total API: **1082 pasan**, los mismos 2 fallos preexistentes.

#### 🔴 Lo que queda abierto — no dar la fase por cerrada

##### Corrección del alcance: no son 20, son 98

La cifra de «20 lookups» reportada antes **era un subconteo**. Salía de un `grep` de una
sola línea restringido a 13 módulos. Un escáner que analiza el `where` de cada
`findUnique`/`findFirst` —incluida la forma abreviada `{ id }` y los filtros por
relación— encuentra **98 lookups sin filtro de organización** repartidos en ~25 módulos:

| Módulo            |     | Módulo                |         |
| ----------------- | --- | --------------------- | ------- |
| `crm`             | 12  | `inventory-movements` | 5       |
| `pos`             | 10  | `modifiers`           | 5       |
| `settings`        | 9   | `notifications`       | 5       |
| `inventory-items` | 5   | resto (~18 módulos)   | 1–4 c/u |

##### Matiz importante: 98 es superficie, no vulnerabilidades confirmadas

No todos son explotables. Al arreglarlos aparecieron tres categorías distintas:

1. **Realmente expuestos** — `crm/campaigns` era el caso puro: ni el controller ni el
   service filtraban. Explotación demostrada en vivo.
2. **Compensados en el controller** — `expenses`, `customers`, `hr/employees`,
   `inventory-items` y `purchase-orders` ya comparaban manualmente
   (`expense.organization_id !== organizationId`). El service estaba flojo, pero el
   endpoint **no** era explotable. Sólo 4–5 controllers hacen esto.
3. **Benignos** — búsqueda de usuario por `sub` del JWT, chequeos de unicidad global
   (`{ email, id: { not: id } }`), y relecturas dentro de una transacción sobre un
   registro ya validado.

Clasificar los 98 uno por uno es parte del trabajo pendiente; el escáner
(`scratchpad/scan-idor.mjs`) da la lista completa pero no distingue las tres categorías.

##### Arreglados en esta sesión (9 de los 98)

`crm/campaigns` (findOne, updateStatus, delete), `crm/customers` (findOne, update,
addVisit), `finance/expenses` (findOne, update, markAsPaid) y `finance/permits`
(findOne, update, renewPermit) migrados a `findFirst({ where: { id, organizationId } })`
/ `deleteMany`, con la organización enhebrada desde el controller vía `@CurrentOrg()`.
En `expenses` y `customers` se eliminó de paso la doble verificación manual del
controller, ahora redundante.

##### Triaje ejecutado — y por qué el análisis estático no bastó

Se construyó un clasificador (`scratchpad/triage-idor.mjs`) que cruza cada lookup con su
método y cada método con el endpoint que lo expone. **Hubo que corregirlo cuatro veces**,
y cada bug inflaba el conteo:

1. no detectaba la forma abreviada `{ id }` (sólo `{ id: x }`);
2. cruzaba métodos por nombre suelto — `findOne` existe en casi todos los módulos, así
   que atribuía hallazgos al controller equivocado;
3. tomaba como cuerpo del handler las llaves de decoradores como `@ApiOperation({...})`;
4. exigía `async` en la firma, y varios controllers no lo usan.

Aun corregido, seguía sobre-reportando: no veía las verificaciones **posteriores** al
lookup (`products.findById` compara `product.organizationId !== organizationId` después
de consultar).

**Contraste decisivo:** de 7 módulos que el clasificador marcaba como expuestos, al
sondear la API real **sólo 2 fugaban**. La conclusión metodológica es que aquí el
análisis estático sirve para _ordenar la búsqueda_, no para contar vulnerabilidades. La
sonda contra la app corriendo es la única fuente fiable.

##### Fugas reales encontradas por sondeo y cerradas

Con la org B (vacía) pidiendo recursos de la org A:

| Endpoint                    | Antes                                  | Causa                              |
| --------------------------- | -------------------------------------- | ---------------------------------- |
| `GET /locations/:id`        | 🔴 devolvía la sucursal ajena          | `findUnique` sin filtro            |
| `GET /inventory/:id`        | 🔴 devolvía el insumo ajeno            | `findUnique` sin filtro            |
| `GET /orders/:id`           | 🔴 devolvía la orden ajena             | organización deriva de la sucursal |
| `GET /pos/orders/:id`       | 🔴 idem                                | idem                               |
| `GET /shifts/:id`           | 🔴 devolvía el turno ajeno             | idem                               |
| `GET /users/:id`            | 🔴 **exponía email de otra org (PII)** | `findUnique` sin filtro            |
| `GET /organizations/:id`    | 🔴 devolvía la organización ajena      | sin comparar contra el JWT         |
| `PATCH`/`DELETE /users/:id` | 🔴 mutaban usuarios de otra org        | `findOne` interno sin scope        |

**Sonda final: 0 fugas sobre 13 endpoints**, con la org A conservando acceso a lo suyo.

Detalle de implementación: `Order` y `Shift` **no declaran relación `location`** en el
schema (sólo el escalar `locationId`), así que el primer intento con
`where: { location: { organizationId } }` reventó con `Unknown argument 'location'`. La
pertenencia se resuelve en dos pasos consultando la sucursal.

##### Hallazgos colaterales del sondeo

- **`shifts.location_id` no tiene foreign key** y hay 1 turno huérfano apuntando a
  `loc-1778276356035-d63ovahg8`, una sucursal inexistente. Al verificar pertenencia vía
  sucursal, ese turno queda inaccesible — falla cerrado, que es lo correcto, pero los
  datos quedan colgados. Tarea aparte creada.
- **`GET /pos/orders/:id` devolvía 200 con body vacío** en vez de 404 para recursos
  ajenos. No era fuga, pero un 200 vacío es indistinguible de «existe y está vacío».
  Corregido.
- **`GET /roles/:id` devuelve 404 siempre**, para cualquiera. `findRoleById` lee
  `this.roles.get(id)` del Map en memoria vacío, pese al comentario del archivo que
  afirma que las lecturas son Prisma-backed: sólo migraron `findAllRoles`. Es el
  pendiente de `roles` ya listado en la Fase 3.

##### La recomendación para el resto: dejar de arreglarlos a mano

89 sitios restantes ≈ 89 firmas de service + sus controllers + sus tests. Es varios días
de trabajo mecánico, con alto riesgo de omitir alguno, y **nada impide el sitio 99**
mañana.

La solución de fondo es una **extensión de Prisma Client** que inyecte
`organizationId` en todo query sobre modelos multi-tenant, tomándolo de un contexto de
request (`AsyncLocalStorage`). Ventajas: un solo lugar que auditar, imposible de olvidar
en código nuevo, y cubre `findUnique`/`findFirst`/`findMany`/`update`/`delete` de forma
uniforme. Necesita una vía de escape explícita para los casos legítimamente globales
(auth por JWT, super admin, unicidad de email/slug) — y ese es justamente el punto: cada
excepción queda declarada en vez de ser el silencio por defecto.

**Defensa en profundidad pendiente (independiente):** ~25 services conservan
`if (query.organization_id) where.organizationId = ...`. Hoy los controllers siempre lo
mandan, pero un controller nuevo que lo olvide reabre la enumeración. La misma extensión
de Prisma lo resolvería.

**Dato de entorno:** quedó creada la organización `Tenant B Testing`
(`owner@tenant-b.test`) en la BD de desarrollo. Es justo la segunda organización que el
plan pedía para poder testear tenancy — conviene incorporarla al seed en vez de
borrarla.
