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

- **El precio que se exhibe ya lleva el IVA dentro.** Lo obliga el artículo 7 bis
  de la LFPC: al público se le exhibe el precio total. Es el default del sistema
  (`taxIncluded: true`), y el precio que se teclea al dar de alta un producto es
  el que va a pagar el cliente, no una base a la que se le suma el impuesto.
  El precio de $78 del Affogato son $78: $67.24 de base y $10.76 de IVA.
- **Todos los productos van al 16 % de IVA.** Se revisó si la panadería debía ir
  a tasa 0 por el artículo 2-A de la LIVA y la respuesta del dueño es no: se
  cobra el 16 % en todo el catálogo. No cambiar tasas de productos sin que él lo
  pida.
- **El descuento se teclea en pesos de lo que paga el cliente.** «$50 de
  descuento» son $50 menos en el total, no $50 menos de base gravable. Es la
  única lectura que el cajero puede defender delante del cliente.
- **Lo que no se cobra son las bolsas y los desechables para llevar.** Se dan sin
  cargo; no son un producto del catálogo ni una línea del ticket.
- El mecanismo por producto (`taxRate`, `taxIncluded`) sí funciona y es
  configurable desde Productos → botón de régimen fiscal, por si la decisión
  cambia.
- **El cobro con tarjeta se queda simulado.** Decisión del dueño el 27 de agosto
  de 2026, confirmada el 28 como algo para «mucho más adelante». El POS registra
  el método y el importe que teclea el cajero, y eso es todo lo que hay. Lo que
  eso implica está en «Aplazado por decisión del dueño», más abajo.
- **Todo lo demás sí tiene que funcionar de punta a punta**, desde crear una
  receta hasta el inventario y las compras. Ver el sandbox: `npm run
sandbox:seed && npm run sandbox:dia`.
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

### Aplazado por decisión del dueño, no por falta de tiempo

El 28 de agosto de 2026 dijo que las dos van «para mucho más adelante». No son
trabajo próximo: no empezarlas, no estimarlas y no listarlas como pendientes.

- **CFDI.** El timbrado era un mock que fingía `stamped` con `Math.random()`, y
  está bloqueado a propósito. No desbloquearlo sin integrar un PAC real; hay dos
  tests saltados que lo documentan. Mientras tanto el negocio no factura desde
  el sistema.
- **Terminal bancaria.** El POS registra el método y el importe que teclea el
  cajero, y nada más: sin código de autorización y **sin conciliación contra el
  corte de la terminal**, así que una venta con tarjeta apuntada que el banco
  nunca autorizó no se puede detectar. Las columnas `reference` y
  `processor_data` de `payments` están preparadas y llegan siempre vacías. El
  arqueo de caja no se distorsiona: sólo cuenta efectivo.

Pendientes de verdad, hoy:

1. **La tabla `taxes` no la consulta nadie.** Tiene CRUD y reglas de
   aplicabilidad por producto y categoría, y el POS cobra con `product.taxRate`.
   Se puede configurar un impuesto ahí y no pasa nada. Cablearla exige decidir
   qué regla gana cuando varias aplican al mismo producto.
2. **Las tablas no son cómodas en un teléfono.** Ninguna pantalla desborda ya el
   viewport —medido a 375px en productos, inventario, recetas, empleados,
   gastos, compras, P&L y órdenes—, pero las tablas resuelven el ancho
   desplazándose dentro de su contenedor: la de productos mide 1427px en una
   columna de 325, o sea cuatro pantallas de arrastre para leer una fila. Lo que
   falta es una vista de tarjetas por debajo de `md`, no más `overflow-x`.

## Convenciones de código

- Campos de inventario en Prisma: `stockQuantity`, `minimumStock`, `reorderPoint` (no `current_stock`, `min_stock`).
- Los enums de Prisma (`ProductStatus`, `ProductType`) son lowercase: `'active'`, `'simple'` — los del frontend son uppercase: `'ACTIVE'`, `'SIMPLE'`.
- El Ticket es la transacción de venta. Order es la orden de cocina (KDS).
- Dinero redondeado a 2 decimales al escribir, no `decrement` crudo: acumula ruido de
  coma flotante (`6.964000000000001`).
- **En un ticket, `subtotal + tax === total`.** Los dos primeros van ya
  descontados: son la base y el IVA que la venta devengó de verdad, que es lo
  que se declara. `discount` queda como registro en pesos de lo que se le rebajó
  al cliente, y NO se vuelve a restar. El total se cierra primero y la base se
  deriva restándole el IVA, porque redondear las dos por separado deja centavos
  colgando (86.21 y 13.79 a la mitad suman 50.01).
- El carrito de pos-web tiene que hacer **exactamente la misma cuenta, en el
  mismo orden**, que `pos.service.ts`. Si se separan, el cajero ve un total en
  pantalla y se le cobra otro al cliente.
