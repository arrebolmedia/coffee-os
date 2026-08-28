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
- La extensión de Prisma Client con `AsyncLocalStorage` ya acota los 32 modelos que
  declaran `organizationId`. Ver `common/tenancy/tenant-scope.ts`, que es el único
  sitio que hay que auditar para saber qué queda acotado.
- **Lo que la extensión NO puede filtrar** son los modelos sin esa columna, que derivan
  la organización de la sucursal: `Ticket`, `Order`, `Shift`, `Payment`,
  `InventoryMovement` y las filas hijas. Ahí el filtro lo pone el servicio, a mano, y es
  donde han aparecido las fugas — las tres rutas de `/pos/tickets` estaban abiertas hasta
  el 27 de agosto de 2026. Al tocar cualquiera de esos modelos, comprobar la pertenencia
  explícitamente y **escribir el test con dos organizaciones**: correrlo contra el código
  sin arreglar es la única forma de saber que prueba algo.

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

### Decisiones fiscales (27 de agosto de 2026)

Nota interna del negocio, no reglas de código. Escritas aquí porque el sistema
no tiene todavía una pantalla de configuración fiscal donde vivirían.

- **Todos los productos van al 16 % de IVA.** Se revisó si la panadería debía ir
  a tasa 0 por el artículo 2-A de la LIVA y la respuesta del dueño es no: se
  cobra el 16 % en todo el catálogo. No cambiar tasas de productos sin que él lo
  pida.
- **Lo que no se cobra son las bolsas y los desechables para llevar.** Se dan sin
  cargo; no son un producto del catálogo ni una línea del ticket.
- El mecanismo por producto (`taxRate`, `taxIncluded`) sí funciona y es
  configurable desde Productos → botón de régimen fiscal, por si la decisión
  cambia.
- **El negocio tributa en RESICO de persona física.** Confirmado por el dueño el
  27 de agosto de 2026. El ISR sale de los **ingresos cobrados**, no de la
  utilidad, con la tabla por tramos del artículo 113-E de la LISR (1 % a 2.5 %),
  y la tasa del tramo se aplica a la totalidad del ingreso, no por escalones.
  Está configurado en `settings` con `category: 'finance'`,
  `key: 'regimen_fiscal'`, valor `resico_pf`. La lógica vive en
  `apps/api/src/modules/finance/isr.ts`, que es el único archivo que hay que
  auditar —o enseñarle al contador— para saber con qué se calcula.
- La tabla del 113-E es una **estimación para el estado de resultados**, no
  sustituye a la declaración. Conviene que el contador la confirme.

## Estado del sistema (agosto 2026)

El sistema vende de punta a punta: login → orden en POS → cobro → persistencia en
Postgres, verificado en navegador. Tests: 62 suites unitarias del API (1253
casos), 9 e2e contra Postgres real (80), 13 suites de pos-web (150) y 171 de
navegador en cinco proyectos de Playwright.

Plan de reparación de agosto, ya cerrado:
[docs/PLAN-REPARACION-2026-08-12.md](docs/PLAN-REPARACION-2026-08-12.md).

Los cinco «pendientes de mayor riesgo» que listaba esta sección quedaron
resueltos el 27 de agosto de 2026 salvo el último, y mantenerlos escritos como
pendientes mandaba a arreglar cosas ya hechas:

- El inventario **sí** descuenta al cobrar (`autoDeductOnSale` desde `closeTicket`).
- `Modifier` **ya tiene** `organizationId`, con su migración.
- Next.js está en 15.5.24, dentro del rango permitido.
- Las vulnerabilidades de npm son 9 en total y 2 en producción, ninguna crítica.

**CFDI sigue bloqueado a propósito**: el timbrado era un mock que fingía
`stamped` con `Math.random()`. No desbloquearlo sin integrar un PAC real; hay
dos tests saltados que lo documentan.

Pendientes de verdad, hoy:

1. **La tabla `taxes` no la consulta nadie.** Tiene CRUD y reglas de
   aplicabilidad por producto y categoría, y el POS cobra con `product.taxRate`.
   Se puede configurar un impuesto ahí y no pasa nada. Cablearla exige decidir
   qué regla gana cuando varias aplican al mismo producto.
2. **No hay editor de productos.** La pantalla lista y filtra; los botones de
   ver y borrar de cada fila no tienen `onClick`. El de editar abre sólo el
   diálogo de régimen fiscal.
3. **No hay integración con terminal bancaria.** El POS registra cuánto entró
   por tarjeta y nada más: sin código de autorización ni conciliación contra el
   corte de la terminal. Las columnas `reference` y `processor_data` de
   `payments` están preparadas y llegan siempre vacías.
4. **El POS no es usable en pantallas pequeñas más allá del carrito.** El cajón
   del carrito ya funciona; el resto de las vistas no se ha revisado a 393px.

## Convenciones de código

- Campos de inventario en Prisma: `stockQuantity`, `minimumStock`, `reorderPoint` (no `current_stock`, `min_stock`).
- Los enums de Prisma (`ProductStatus`, `ProductType`) son lowercase: `'active'`, `'simple'` — los del frontend son uppercase: `'ACTIVE'`, `'SIMPLE'`.
- El Ticket es la transacción de venta. Order es la orden de cocina (KDS).
- Dinero redondeado a 2 decimales al escribir, no `decrement` crudo: acumula ruido de
  coma flotante (`6.964000000000001`).
