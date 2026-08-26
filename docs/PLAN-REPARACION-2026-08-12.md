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

---

## 6. Continuación — 2026-08-26

### Punto de partida

Todo el trabajo del 12 de agosto estaba **sin commitear** hasta hoy: 110 archivos
modificados, 3 migraciones y el árbol de `inventory-automation` vivían solo en el
working tree, a un `git checkout` de perderse. El último commit era del 19 de junio.
Ya está repartido en 9 commits temáticos, con `git status` limpio.

Cosas que aparecieron al commitear y conviene dejar asentadas:

- **`CLAUDE.md` había sido sobrescrito** por la plantilla genérica de RuFlo: se perdió
  la guía del proyecto entera. Restaurada y puesta al día.
- **`apps/pos-web/playwright/.auth/user.json` guarda cookies de sesión de NextAuth** y
  estaba a punto de entrar al repo. Ignorado.
- **El testigo del tenant B en `seed.ts` arrastraba tres conteos muertos** de su versión
  anterior. La verificación real —la que lanza— sí estaba bien.
- 118 archivos de 0 bytes de redirecciones de shell rotas, borrados.

Verificación tras los commits: `tsc --noEmit` limpio en ambos workspaces,
**55/55 suites y 1116 tests** en el API, **9/9 y 98** en pos-web.

### Hallazgo nuevo que reordena la prioridad

`apps/pos-web/src/middleware.ts` usa `withAuth` de next-auth como **única puerta de
autenticación del frontend**, sobre `next@14.0.4`. Esa versión cae en
**CVE-2025-29927**: una cabecera `x-middleware-subrequest` fabricada hace que Next salte
el middleware por completo. Es decir, la puerta se abre desde fuera.

Atenuante real: la API tiene su propio `JwtAuthGuard` global, así que saltarse el
middleware da el cascarón de la UI, no los datos. No es una brecha de datos — es que la
capa de autorización del frontend no es de fiar mientras siga en 14.0.4.

En el mismo archivo, `NEXT_PUBLIC_E2E_BYPASS_AUTH === 'true'` **desactiva la
autenticación entera**. Al ser `NEXT_PUBLIC_*` se inlinea en tiempo de build y queda
visible en el bundle: si alguna vez se cuela en un build de producción, la app queda
abierta y no hay nada en runtime que lo impida. Debe pasar a una variable de servidor y
quedar imposible de activar fuera de `NODE_ENV !== 'production'`.

### Orden propuesto y por qué

El criterio no es solo la gravedad: es **qué trabajo invalida a qué**. El upgrade a Next
15 vuelve asíncronas las Request APIs (`cookies()`, `headers()`, `params`,
`searchParams`) y toca las 46 rutas del App Router. Cualquier cosa que construyamos
antes sobre esas rutas —el cableado del hook de inventario, los E2E nuevos— habría que
rehacerla después. Por eso va primero, aunque el bug de inventario sea el que más duele
en el día a día.

---

### Sprint 1 · Next.js 15 + dependencias — ~1 día

Cierra la CVE del middleware y una de las tres críticas de npm, y estabiliza los
archivos que tocan los sprints siguientes.

1. `npx @next/codemod@canary upgrade latest`, fijando el rango a `>=15.2.3 <16.0.0`.
2. Request APIs asíncronas en las 46 rutas; revisar dónde se asumía caché implícita
   (`fetch` y los Route Handlers `GET` ya no cachean por defecto).
3. Compatibilidad con React 19 (hoy `react ^18.2.0`).
4. Sacar el bypass de auth del bundle: `NEXT_PUBLIC_E2E_BYPASS_AUTH` → variable de
   servidor, inerte bajo `NODE_ENV=production`.
5. `npm audit fix` para lo no-breaking; los breaking uno por uno. **Prioridad a
   `next-auth` y `jws`**, que tocan el flujo de autenticación.
6. Simplificar el pin del parser en `apps/pos-web/.eslintrc.json`: con
   `eslint-config-next@15` ya no hace falta.

**Salida:** build y tests verdes · `npm audit` sin critical/high · el bypass no aparece
en el bundle de producción · smoke manual login → POS → cobro.

---

### Sprint 2 · Que el sistema deje de mentir sobre el stock — ~1 día

Hoy `getAutoDeductConfig` responde `enabled:true` y completar una orden no descuenta
nada: `deductForOrder` no lo llama nadie fuera de su módulo y `useDeductStockForOrder`
está huérfano en el frontend. La lógica ya existe y está bien —idempotente por índice
único, respeta el flag, ignora `CANCELLED`—: falta enchufarla.

1. Llamar a `deductForOrder` **dentro de la transacción** que lleva la orden a
   `SERVED`/`COMPLETED`, no desde el frontend. Que el descuento dependa de un hook de
   React es justamente lo que permitió que llevara meses sin ejecutarse.
2. Borrar `useDeductStockForOrder` una vez el backend lo haga solo.
3. Test de integración contra Postgres: vender un producto con receta y verificar el
   movimiento de inventario; repetir la petición y comprobar que da 409 y no descuenta
   dos veces.

Restos de `roles`, del mismo tamaño y ya diagnosticados:

4. `GET /roles/:id` devuelve 404 siempre — `findRoleById` sigue leyendo del `Map`.
5. `is_system` / `system_role` son settables por el cliente en `CreateRoleDto`: permiten
   crear un rol que después no se deja actualizar ni borrar por API.
6. `assign-role.dto` combina `@IsDateString()` con `@Type(() => Date)`, así que las
   asignaciones temporales son inalcanzables por HTTP: 400 con un ISO válido.
7. `deleteRole` cuenta usuarios sin filtrar organización.
8. Turno huérfano apuntando a `loc-1778276356035-d63ovahg8`, sucursal inexistente.

**Salida:** una venta real descuenta insumos y el reporte de exactitud cuadra · ningún
endpoint de roles miente · `GET /roles/:id` funciona.

---

### Sprint 3 · Cerrar la clase de fuga, no las instancias — ~2 días

Quedan ~89 lookups sin filtro de organización. Arreglarlos a mano son ~89 firmas de
service más sus controllers y sus tests, con alto riesgo de omitir alguno, y **nada
impide el sitio 99 mañana**. La lección del triaje del 12 de agosto es que el análisis
estático sobre-reporta y solo la sonda contra la app viva distingue fuga de ruido: de 7
módulos marcados como expuestos, solo 2 fugaban.

1. **Extensión de Prisma Client** que inyecte `organizationId` en todo query sobre
   modelos multi-tenant, tomándolo de un `AsyncLocalStorage` poblado por request.
   Cubre `findUnique`/`findFirst`/`findMany`/`update`/`delete` de forma uniforme.
2. **Vía de escape explícita** para lo legítimamente global: auth por JWT, super admin,
   unicidad de email y slug. Cada excepción queda declarada; el silencio deja de ser el
   default.
3. `Modifier` gana `organizationId` + migración con backfill. Hoy `GET /modifiers`
   devuelve los 16 modificadores a cualquier tenant; era fuga teórica mientras la tabla
   estaba vacía y el seed la volvió observable.
4. Quitar el `if (query.organization_id) where.organizationId = ...` de los ~25 services
   que lo conservan: hoy los controllers siempre lo mandan, pero un controller nuevo que
   lo olvide reabre la enumeración.
5. **Sondear, no leer**: re-ejecutar la sonda de dos tenants sobre todos los endpoints,
   que es la única fuente fiable.

**Salida:** la sonda da 0 fugas · un endpoint nuevo escrito sin pensar en tenancy queda
acotado por defecto · las excepciones están enumeradas en un solo archivo.

---

### Sprint 4 · Tests donde está el dinero — ~1 día

1. pos-web tiene 9 suites para 46 rutas. Priorizar `pos`, `orders`, `expenses`, `pnl`,
   `cfdi`.
2. Playwright contra el stack real levantado: login → abrir turno → tomar orden →
   cobrar → **verificar que el inventario descontó** → cerrar turno → el corte cuadra.
   Ese flujo cruza justo los módulos con deuda, así que sirve de red de seguridad para
   todo lo anterior.
3. `RecipeModal.tsx:117` — resolver el `exhaustive-deps` con un `ref` en vez de dejarlo
   como deuda consciente.
4. Incorporar `Tenant B Testing` al seed en vez de dejarla como artefacto de la BD de
   desarrollo.

---

### Sprint 5 · Higiene restante — ~1 hora

Lo grueso ya está hecho. Queda:

- **96 archivos `.md` en la raíz** → `docs/` o `_archive/`.
- **Workspaces vacíos** — `apps/mobile`, `packages/shared`, `packages/ui`,
  `packages/integrations` están declarados en `workspaces` y son directorios sin un solo
  archivo. Quitarlos del `package.json` o poblarlos.
- `inventory-automation.service.ts` en 603 líneas contra la guía de <500 del CLAUDE.md.
- Falta `public/images/placeholder.png` → 400 en `/_next/image`.
- Polling excesivo de `/api/auth/session`.
- Panadería: productos con `tax_rate = 0.16` conviviendo con una regla «IVA 0%
  Panadería» para la misma categoría — el IVA sale distinto según qué fuente lea el POS.
  Decidir cuál manda.

---

### Resumen

| Sprint                  | Esfuerzo | Por qué en ese orden                                                                                                                                                                                     |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Next 15 + deps      | ~1 día   | ✅ **completado 2026-08-26.** En la práctica no tocó ninguna: ver el registro. Cierra la CVE del middleware. Toca las 46 rutas; hacerlo después obliga a rehacer lo demás. Cierra la CVE del middleware. |
| 2 · Stock + roles       | ~1 día   | ✅ **completado 2026-08-26.** El sistema afirma que descuenta y no descuenta. Corrompe reportes cada venta.                                                                                              |
| 3 · Extensión de Prisma | ~2 días  | Cierra la clase de fuga, no las 89 instancias.                                                                                                                                                           |
| 4 · Tests del dinero    | ~1 día   | Red de seguridad sobre lo anterior; necesita 1–3 estables.                                                                                                                                               |
| 5 · Higiene             | ~1 h     | No bloquea nada.                                                                                                                                                                                         |

**Total: ~5–6 días.** CFDI queda fuera a propósito: la decisión fue bloquear el mock, y
desbloquearlo exige integrar un PAC real, que es un proyecto aparte.

---

### Sprint 1 — ✅ completado 2026-08-26

#### El upgrade costó una fracción de lo estimado

El plan decía que Next 15 «afecta a las 46 rutas del App Router» por las Request APIs
asíncronas. Medido antes de tocar nada: **cero código afectado**.

| Superficie                                           | Realidad                                      |
| ---------------------------------------------------- | --------------------------------------------- |
| Usos de `next/headers`                               | ninguno                                       |
| Route handlers                                       | uno, el de NextAuth, que recibe `req` directo |
| Páginas que leen `params`/`searchParams` de servidor | ninguna — las 46 son client components        |
| `searchParams` en `/login`                           | es `useSearchParams()`, hook de cliente       |

React 18.2 sigue siendo peer válido de Next 15.5.24, así que tampoco hizo falta React 19
—un eje menos de churn—. El **único** breaking change real: `useSearchParams()` ahora
exige un límite de Suspense encima, y el build fallaba al prerenderizar `/login`.
Envuelto, con un fallback que replica fondo y logo para que no haya salto al hidratar.

De paso: `swcMinify` ya no existe como opción en 15 (es el default).

#### Tres cosas que aparecieron al hacerlo

**1. Había un `next@14.0.4` fósil en la raíz de `node_modules`.** Instalado como peer de
next-auth y nunca podado. Importa porque `playwright.config.ts` arrancaba el servidor con
`node ../../node_modules/next/dist/bin/next dev`: **los E2E corrían contra la versión
vulnerable**, no contra la del workspace. El comando pasa a `npm run dev`, que usa el
binario propio. Ese fósil, y no la versión instalada, era lo que `npm audit` reportaba
como crítico: sobre `15.5.24` no aplica ni uno de los 32 avisos.

**2. `next-pwa`, `workbox-webpack-plugin` y `workbox-window` estaban declarados y no se
usan en ninguna parte** — el `sw.js` está escrito a mano. Eliminados; dos de ellos eran
altas del audit.

**3. El pin del parser en `.eslintrc.json` ya no hace falta.** `eslint-config-next@15`
admite typescript-eslint v8 y el árbol deduplica en 8.67.0. Verificado que las reglas se
siguen evaluando de verdad —0 errores y los mismos **313 warnings** de la línea base—,
que era justo el síntoma que distinguía «lint limpio» de «lint que crashea en silencio».
Hicieron falta dos ajustes más: `settings.next.rootDir` con las dos rutas desde las que
se invoca ESLint (lint-staged desde la raíz, `next lint` desde el workspace; usar `"."`
hacía que el plugin escaneara el monorepo entero hasta morir por memoria), y excluir
`next-env.d.ts`, generado por Next y que en 15 gana una referencia triple-slash que la
regla de la raíz marca como error.

#### El bypass de autenticación

`NEXT_PUBLIC_E2E_BYPASS_AUTH` desactivaba la autenticación entera y, al ser
`NEXT_PUBLIC_*`, se inlinea en el bundle del cliente. Pasa a `E2E_BYPASS_AUTH` gateada
por `NODE_ENV`.

Verificado sobre el bundle, no por lectura del código: en un build de producción limpio,
`.next/server/src/middleware.js` no contiene `DISABLE_AUTH` ni
`process.env.E2E_BYPASS_AUTH` —el compilador evalúa el gate a `false` y elimina la
rama—, mientras que `RefreshAccessTokenError` y `"/login"` siguen presentes: la
protección real sobrevive. En `next dev` el mismo artefacto muestra
`const DISABLE_AUTH = true && process.env.E2E_BYPASS_AUTH === 'true'`, así que Playwright
sigue funcionando.

> Nota de método: el primer intento de verificación dio un falso «limpio» porque el
> servidor de desarrollo llevaba rato escribiendo encima de `.next`, y el segundo porque
> busqué en `.next/server/middleware.js`, que en Next 15 ya no es la ruta —el archivo no
> existía y `grep` devolvía vacío—. Un grep sin resultados no prueba nada si no se
> confirma que el archivo existe.

#### Dependencias

**60 → 34 vulnerabilidades. Críticas: 3 → 0.** En el árbol de producción
(`--omit=dev`): 21 → 15, con 0 críticas y 4 altas.

**`sharp` y `multer` estaban en el camino de producción, no eran teóricas.**

- `sharp` procesa las imágenes que suben los usuarios (`file-upload.service`), y las CVE
  de libvips (CVE-2026-33327/33328/35590/35591) se disparan justo al parsear una imagen.
  0.34.5 → 0.35.4, con libvips 8.18.6.
- `multer` atiende esas subidas vía `FileInterceptor`. npm proponía saltar a
  `@nestjs/platform-express@11`, o sea NestJS 11 entero; pero `platform-express@10.4.22`
  ya acepta multer 2.x y ambos deduplican al mismo paquete, así que bastó un `override` a
  `^2.2.0`. Confirmado con `require.resolve` que `FileInterceptor` cargaba la 2.0.2 y
  ahora carga la 2.2.0.

**Cinco dependencias de producción con cero uso, eliminadas.** `@nestjs/apollo`,
`@nestjs/graphql`, `@nestjs/typeorm`, `@apollo/server` y `graphql` estaban en
`dependencies` del API sin un solo import; en `app.module` solo queda `GraphQLModule`
comentado. El proyecto usa Prisma, no TypeORM. Se van con ellas `@apollo/server` (alta
directa), `glob` vía typeorm, y `ws` + `subscriptions-transport-ws` vía graphql.

**Dependencia fantasma descubierta al quitarlas.** `@nestjs/mapped-types` se importa en
20 DTOs pero nunca estuvo declarada: solo funcionaba porque `@nestjs/graphql` la
arrastraba. Quitar graphql rompió el build con 379 errores. Declarada explícitamente.

**`sharp@0.35` rompió el import, y el modo de fallo era silencioso.** Publica tipos
duales, pero su campo `types` apunta al `.d.mts` (ESM) y este workspace compila a
CommonJS sin `moduleResolution: node16`, así que TS lee los tipos ESM: el namespace no es
invocable y el callable vive en `.default`. En runtime `require("sharp")` **sí** devuelve
la función, sin `.default` — de modo que `import sharp from 'sharp'` habría compilado sin
quejarse y sido `undefined` en producción. Se usa import-equals más un cast, y se
verificó el JS emitido: `const sharp = require("sharp")`.

También: `sharp` declarado explícitamente en pos-web, porque `next/image` lo necesita y
el override lo había dejado colgando solo bajo `apps/api`.

**Lo que queda y por qué no se tocó.** `js-yaml` y `lodash` entran por
`@nestjs/swagger@7` y solo se resolverían con `@nestjs/swagger@11`, es decir NestJS 11;
corren al generar la documentación, no en el camino de petición. `postcss` entra por la
copia que Next empaqueta y pediría Next 16; corre en build sobre nuestro propio CSS. El
aviso de `glob` es sobre su flag `-c/--cmd`, que no usamos.

#### Verificación

| Check                          | Resultado                                |
| ------------------------------ | ---------------------------------------- |
| `tsc --noEmit` (API + pos-web) | ✅ limpio                                |
| `turbo run build`              | ✅ 2/2                                   |
| Tests API                      | ✅ 55/55 suites · 1116 tests             |
| Tests pos-web                  | ✅ 9/9 suites · 98 tests                 |
| `next lint`                    | ✅ 0 errores · 313 warnings (línea base) |
| **Venta real en navegador**    | ✅ ver abajo                             |

Smoke completo contra el stack levantado, sobre Next 15: login → POS → carrito → cobro
en efectivo. Ticket **`TKT-20260826-285064d0`**, subtotal 48 · IVA 7.68 · total 55.68,
`CLOSED`, con `payments` = CASH 55.68 `COMPLETED`. Verificado en Postgres, no en la UI.

#### Hallazgo nuevo para la lista de pendientes

En el POS, la consola escupe errores repetidos: _«Failed to execute 'json' on 'Response':
Unexpected end of JSON input»_ desde `use-costing`. Causa: `apps/pos-web/src/lib/api.ts`
solo contempla el cuerpo vacío cuando el status es `204`, y algún endpoint de costeo
responde **200 con cuerpo vacío**. No rompe la venta, pero ensucia la consola y deja la
query en error. Candidato al Sprint 2 o 4.

---

### Sprint 2 — ✅ completado 2026-08-26

#### El descuento ya no depende de que alguien se acuerde

La lógica estaba completa y bien hecha —idempotente por índice único, respeta el flag,
ignora `CANCELLED`—. Lo que faltaba era el cable: `deductForOrder` sólo era alcanzable
desde su propio endpoint, y el hook del frontend que debía invocarlo estaba huérfano.
`InventoryModule` incluso exportaba el servicio con un comentario explicando para qué.

**El plan decía «enchufarlo en la transacción de la orden». Se hizo distinto, a
propósito.** Cuando una orden se marca servida el café ya salió por la barra. Negarse a
registrar ese hecho porque el inventario no cuadra es peor que registrarlo con el
inventario descuadrado: el software estaría rechazando la realidad. Así que
`autoDeductOnSale` **nunca lanza**: el cambio de estado manda, y el fallo del descuento
se hace ruidoso (log a nivel error, `inventory_deduction.status = 'error'` en la
respuesta, y el reporte de exactitud lo delata) en vez de bloquear la venta. La ausencia
de doble descuento no dependía nunca de esa transacción — la garantiza el índice único
parcial en la base.

**Había dos caminos, no uno.** Una orden llega a SERVED/COMPLETED por `pos.service`
(`markOrderServed`, `updateOrderStatus`) y por `orders.service.updateStatus`. Enchufarlo
sólo donde decía el plan habría dejado el otro descontando a veces sí y a veces no, que
es peor que no descontar nunca porque nadie lo nota.

#### Tenancy, encontrado por el camino

Los cuatro mutadores del KDS —`PATCH :id/status`, `POST :id/start`, `:id/ready`,
`:id/served`— recibían sólo el id y actualizaban con `where: { id }`: **cualquier usuario
autenticado podía mover de estado la orden de otra organización.** Lo mismo
`orders.controller.updateStatus`, que no pasaba la organización y dejaba su `findOne`
interno sin filtro. Los cinco derivan ahora la organización del JWT.

No estaban en la lista de la Fase 2.5 porque aquella sonda probó lecturas; estos son
endpoints de escritura que sólo aparecen si se buscan por el otro lado.

#### Código muerto

`pos.service.completeOrder` no tenía ruta ni llamadas. `useDeductStockForOrder` no lo
importaba nadie y, mientras existió, hacía creer que el descuento lo dispara el cliente.
El endpoint manual se queda como vía de recuperación.

#### Restos de `roles`

- `is_system` y `system_role` se escribían tal cual venían del cliente: cualquiera podía
  crearse un rol `is_system: true` que después ni `updateRole` ni `deleteRole` dejan
  tocar. Se siguen aceptando por compatibilidad pero se ignoran. **No era escalada de
  privilegios** — `systemRole` no se lee fuera del módulo de roles.
- `assign-role.dto` combinaba `@IsDateString()` con `@Type(() => Date)`. El `@Type`
  convierte el ISO en `Date` **antes** de validar, así que `@IsDateString` lo rechazaba
  por no ser string: las asignaciones temporales devolvían 400 con cualquier fecha
  válida. La pareja correcta es `@IsDate` + `@Type`.

**Dos pendientes del plan resultaron ya cerrados**, y se comprobaron en vez de darlos por
buenos: `findRoleById` ya es Prisma y está acotado; y el turno huérfano lo borró la
migración `20260812163104` al añadir la FK (0 filas huérfanas, `shifts_location_id_fkey`
presente).

**Uno se deja como está, a propósito:** `deleteRole` cuenta usuarios sin filtrar
organización. Es correcto — `User.roleId` es una FK RESTRICT, así que el conteo tiene que
ver _todas_ las filas o el borrado reventaría en la base en vez de dar un 400 limpio.

#### El flag estaba apagado en desarrollo

El default del código es `enabled: false` —opt-in razonable para un tenant real— y la BD
de desarrollo no tenía ninguna fila de configuración. Es decir: el mecanismo ya
funcionaba y una venta seguía respondiendo `disabled`. Encendido en el seed, tras
comprobar que las 14 recetas sembradas usan unidades que sí convierten.

#### Verificación

Suite de integración nueva contra Postgres real, **porque los unitarios no podían
detectar esto**: probaban `deductForOrder` directamente, que es exactamente lo que nadie
llamaba. Recorre el camino real por HTTP: vender 2 unidades de un producto con receta de
200 ml descuenta 400 ml y crea un movimiento OUT; pasar después a COMPLETED no vuelve a
descontar; `/start` no descuenta; con el flag apagado el stock no se toca; y el token de
otra organización recibe 404 sin que la orden cambie de estado.

| Check                              | Resultado                    |
| ---------------------------------- | ---------------------------- |
| Tests unitarios API                | ✅ 55/55 suites · 1118 tests |
| Tests e2e                          | ✅ 5/5 suites · 39 tests     |
| `tsc --noEmit` · `turbo run build` | ✅                           |

Y contra la base de desarrollo, con el API levantado: vender 3 espressos deja café
**26 → 25.973 kg** y agua **210 → 209.91 l**, con dos movimientos `RECIPE_DEDUCTION`.
Sin ruido de coma flotante. `COMPLETED` después responde `skipped` y no toca el stock.

> **Trampa de método, la tercera de la jornada.** La primera medición dio
> `inventory_deduction: undefined` y parecía que el cable no funcionaba. El código
> compilado era correcto: lo que pasaba es que el API anterior **seguía vivo**. `TaskStop`
> mata el shell, no el proceso `nest` hijo, así que el viejo conservaba el puerto 4000, el
> nuevo no pudo enlazar, y el health check pasó contra el servidor rancio. Antes de creer
> una medición contra un servidor local, comprobar qué PID tiene el puerto y a qué hora
> arrancó.
