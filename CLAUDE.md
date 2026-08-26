# CoffeeOS — Guía para Claude Code

Plataforma multi-tenant de gestión para cafeterías mexicanas. Monorepo Turbo con NestJS + Next.js + Prisma + PostgreSQL.

## Arquitectura

```
apps/pos-web    (Next.js :3001)  — Punto de venta (46 rutas; absorbió el admin)
apps/api        (NestJS  :4000)  — API REST + Swagger en /docs
packages/database               — Prisma schema (PostgreSQL)
```

`apps/admin-web` se eliminó en agosto de 2026: pos-web era superset de sus 27 rutas.
El historial de git conserva el original.

## Levantar el entorno

El sistema **no arranca sin Docker**: `DATABASE_URL` apunta a `localhost:5434`, que es
el mapeo `5434:5432` del `docker-compose.yml`. El Postgres nativo en 5432 es otra
instancia y no tiene `coffeeos_dev`. Sin esto, la API levanta igual porque Prisma
conecta en _lazy_, pero cada request que toca BD devuelve 500.

```bash
docker-compose up -d postgres redis
```

Solo esos dos: el compose trae además baserow, n8n, metabase, mailhog, minio,
prometheus y grafana que no hacen falta para desarrollar.

Credenciales de desarrollo: `owner@coffeedemo.mx` / `password123`.

## Dev servers

Cuando se pide "abre en local" o "levanta el servidor", levantar **ambos** en paralelo,
en un solo mensaje con `run_in_background: true`.

```bash
cd apps/api && npm run dev       # :4000
cd apps/pos-web && npm run dev   # :3001
```

## Comandos esenciales

```bash
npm run dev                                    # Levanta todo
npm run build                                  # turbo run build

# Tests
cd apps/api && npx jest --no-coverage          # Todos los tests del API
cd apps/api && npx jest <nombre> --no-coverage # Test específico

# TypeScript check (sin compilar)
cd apps/api && npx tsc --noEmit
cd apps/pos-web && npx tsc --noEmit

# Prisma (desde packages/database o apps/api)
npx prisma generate
npx prisma migrate dev --name <nombre>
npx prisma studio

npm run db:seed          # seed.ts — idempotente, acotado por organización
npm run db:seed:simple   # DESTRUCTIVO: deleteMany sin filtro. No usar por defecto.
```

## Reglas críticas

### Multi-tenancy

- **La organización sale del JWT, nunca del cliente.** Usar `@CurrentOrg()`; no aceptar
  `organization_id` por query, body ni path.
- `TenantGuard` está registrado como `APP_GUARD` después de `JwtAuthGuard` (el orden
  importa: necesita `request.user`) y valida body, query y path params.
- Los lookups por id van con `findFirst({ where: { id, organizationId } })`, no
  `findUnique({ where: { id } })`, y los borrados con `deleteMany`. Así un registro
  ajeno da 404 en vez de filtrar que existe.
- Quedan ~89 lookups sin filtro de organización. La solución de fondo es una extensión
  de Prisma Client con `AsyncLocalStorage`, no arreglarlos uno por uno.

### Backend (NestJS)

- `DatabaseModule` es `@Global()` — PrismaService disponible en todos los módulos sin importarlo explícitamente.
- `JwtAuthGuard` es `APP_GUARD` global — todos los endpoints requieren auth por defecto. Usar `@Public()` para rutas públicas.
- Los DTOs usan **snake_case** para recibir datos del cliente (`category_id`, `base_price`).
- Prisma devuelve **camelCase** en las respuestas (`organizationId`, `categoryId`, `stockQuantity`).
- `ValidationPipe` tiene `whitelist: true` y `forbidNonWhitelisted: true` — el cliente solo puede enviar campos que existen en el DTO.
- **Declarar `@Get(':id')` después de las rutas literales.** Al revés, `:id` captura el
  segmento y deja inalcanzable la ruta literal.
- Los ids son cuid, no uuid: en los DTOs va `@IsString()`, no `@IsUUID()`.

### Frontend (Next.js)

- **No usar `console.*`** — usar `src/lib/logger.ts`. La regla `no-console` es `error`
  bajo `NODE_ENV=production`, que es como corre `next build`.
- Los formularios que envían datos al backend usan los nombres de los DTOs.
- Headers de contexto: `X-Organization-Id` y `X-Location-Id`.
- pos-web tiene su propio `.eslintrc.json` con el parser de typescript-eslint fijado
  explícitamente. No quitarlo antes del upgrade a Next 15: `eslint-config-next@14`
  arrastra una copia anidada del parser v6 que hace crashear al plugin v8, y
  `next build` degrada ese crash a warning y pasa igual, sin evaluar ninguna regla.

### Tests (NestJS/Jest)

- **Siempre** proveer `PrismaService` como mock en los TestingModule. Sin esto, NestJS no puede resolver dependencias y todos los tests fallan.
  ```typescript
  const mockPrismaService = {
    modelName: { create: jest.fn(), findMany: jest.fn(), ... }
  };
  providers: [MyService, { provide: PrismaService, useValue: mockPrismaService }]
  ```
- Usar `mockResolvedValueOnce` para cada llamada esperada y `jest.clearAllMocks()` en `beforeEach`.
- Los tests unitarios son mock-based: **pasan con la BD caída** y no detectan
  desalineación real con el schema. Para eso están los e2e de `apps/api/test/integration`,
  que corren contra Postgres real y siembran dos organizaciones.

## Estado del sistema (agosto 2026)

El sistema vende de punta a punta: login → orden en POS → cobro → persistencia en
Postgres, verificado en navegador. Tests: 55/55 suites unitarias del API y 4/4 e2e.

Plan de reparación vigente, con lo hecho y lo pendiente:
[docs/PLAN-REPARACION-2026-08-12.md](docs/PLAN-REPARACION-2026-08-12.md).

Pendientes de mayor riesgo:

1. **Inventario no descuenta automáticamente.** Con `enabled:true`, llevar una orden a
   `COMPLETED` no descuenta: `deductForOrder` no lo llama nadie fuera de su módulo y
   `useDeductStockForOrder` está huérfano en el frontend.
2. **`GET /modifiers` es visible desde cualquier tenant** — `Modifier` no tiene `organizationId`.
3. **Next.js 14.0.4 está vetado** por tres CVEs, entre ellas un bypass de auth en
   middleware. Upgrade autorizado a `>=15.2.3 <16.0.0`.
4. **67 vulnerabilidades de npm**, 3 críticas.
5. **CFDI está bloqueado a propósito**: el timbrado era un mock que fingía `stamped`
   con `Math.random()`. No desbloquearlo sin integrar un PAC real.

## Convenciones de código

- Campos de inventario en Prisma: `stockQuantity`, `minimumStock`, `reorderPoint` (no `current_stock`, `min_stock`).
- Los enums de Prisma (`ProductStatus`, `ProductType`) son lowercase: `'active'`, `'simple'` — los del frontend son uppercase: `'ACTIVE'`, `'SIMPLE'`.
- El Ticket es la transacción de venta. Order es la orden de cocina (KDS).
- Dinero redondeado a 2 decimales al escribir, no `decrement` crudo: acumula ruido de
  coma flotante (`6.964000000000001`).
