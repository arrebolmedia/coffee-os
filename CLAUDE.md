# CoffeeOS — Guía para Claude Code

Plataforma multi-tenant de gestión para cafeterías mexicanas. Monorepo Turbo con NestJS + Next.js + Prisma + PostgreSQL.

## Arquitectura

```
apps/admin-web  (Next.js :3000)  — Dashboard administrativo
apps/pos-web    (Next.js :3001)  — Punto de venta
apps/api        (NestJS  :4000)  — API REST + Swagger en /docs
apps/mobile     (React Native)   — App móvil (en desarrollo)
packages/database               — Prisma schema (40 modelos, PostgreSQL)
packages/shared                 — Tipos y utilidades compartidas
```

## Comandos esenciales

```bash
# Desde la raíz del monorepo
npm run dev              # Levanta todo
cd apps/api && npm run dev    # Solo API
cd apps/admin-web && npm run dev  # Solo admin

# Tests
cd apps/api && npx jest --no-coverage          # Todos los tests del API
cd apps/api && npx jest <nombre> --no-coverage # Test específico

# TypeScript check (sin compilar)
cd apps/api && npx tsc --noEmit
cd apps/admin-web && npx tsc --noEmit
cd apps/pos-web && npx tsc --noEmit

# Prisma (desde packages/database o apps/api)
npx prisma generate
npx prisma migrate dev --name <nombre>
npx prisma studio
```

## Reglas críticas

### Backend (NestJS)
- `DatabaseModule` es `@Global()` — PrismaService disponible en todos los módulos sin importarlo explícitamente.
- `JwtAuthGuard` es `APP_GUARD` global — todos los endpoints requieren auth por defecto. Usar `@Public()` para rutas públicas.
- Los DTOs usan **snake_case** para recibir datos del cliente (`organization_id`, `category_id`, `base_price`).
- Prisma devuelve **camelCase** en las respuestas (`organizationId`, `categoryId`, `stockQuantity`).
- `ValidationPipe` tiene `whitelist: true` y `forbidNonWhitelisted: true` — el cliente solo puede enviar campos que existen en el DTO.

### Frontend (Next.js)
- Los tipos en `apps/admin-web/src/types/index.ts` usan **camelCase** (coinciden con las respuestas de Prisma).
- Los formularios que envían datos al backend usan los nombres de los DTOs (snake_case o camelCase según el DTO).
- `apiClient` en `apps/admin-web/src/lib/api-client.ts` apunta a `:4000` (API).
- Headers de contexto: `X-Organization-Id` y `X-Location-Id` (con minúscula d al final).

### Tests (NestJS/Jest)
- **Siempre** proveer `PrismaService` como mock en los TestingModule. Sin esto, NestJS no puede resolver dependencias y todos los tests fallan.
- Patrón correcto:
  ```typescript
  const mockPrismaService = {
    modelName: { create: jest.fn(), findMany: jest.fn(), ... }
  };
  providers: [MyService, { provide: PrismaService, useValue: mockPrismaService }]
  ```
- Usar `mockResolvedValueOnce` para cada llamada esperada. Usar `jest.clearAllMocks()` en `beforeEach`.

## Estado actual del sistema (abril 2026)

### Módulos completamente funcionales (Prisma real)
- auth, products, categories, modifiers, pos, orders, cash-registers, shifts
- discounts, taxes, inventory, inventory-items, inventory-movements
- recipes, suppliers, purchase-orders, quality, integrations (twilio, mailrelay, cfdi)
- upload, health, database, redis
- **organizations** — CRUD completo (GET/POST/PATCH/DELETE /organizations, GET /organizations/slug/:slug)
- **crm/customers** — migrado a Prisma (migración `20260407230330_add_customer_full_fields`)
- **crm/loyalty** — migrado a Prisma (migración `20260407232649_add_loyalty_campaigns`): `LoyaltyTransaction`, `LoyaltyReward`
- **crm/campaigns** — migrado a Prisma: `Campaign`, `CampaignRecipient`
- **crm/rfm** — migrado a Prisma: calcula R/F/M sobre `LoyaltyTransaction`, distribución sobre `Customer.rfmSegment`

### Módulos con datos en memoria (Maps) — pendientes de migrar a Prisma
- finance (expenses, permits, p&l) — sin schema Prisma
- hr (employees, certifications, evaluations) — sin schema Prisma

### Analytics (implementado con Prisma real en abril 2026)
- `sales-analytics.service.ts` — queries sobre Ticket/TicketLine
- `product-analytics.service.ts` — groupBy TicketLine por producto
- `dashboard.service.ts` — orquesta los anteriores

### Tests (estado: abril 2026)
- **52 test suites pasan, 0 fallan** (1054 passed, 34 skipped)
- Los 34 skipped son bloques `describe.skip` pre-existentes en `categories.service.spec.ts`
- Todo el módulo CRM usa mocks Prisma: `customers`, `organizations`, `loyalty`, `campaigns`, `rfm`

### Frontend admin-web
- 0 errores de TypeScript (`npx tsc --noEmit` limpio)
- Tipos `Product` y `Category` unificados a camelCase (coinciden con respuestas Prisma)

### Frontend pos-web
- `inventory/page.tsx` corregido (campos `min_stock`, `max_stock`, `product?.name`, etc.)
- **`employees/page.tsx`, `InventoryManager.tsx`, tests de suppliers/quality corregidos abril 2026** — 0 errores TS de código fuente
- Único error remanente: `.next/types/app/api/auth/[...nextauth]/route.ts` (artefacto generado por Next; requiere mover `authOptions` fuera de la route)

## Próximos pasos prioritarios

1. **Migrar Finance a Prisma** — expenses, permits, p&l — sin schema aún.
2. **Migrar HR a Prisma** — employees, certifications, evaluations — sin schema aún.
3. **Eliminar bloques `describe.skip`** en `categories.service.spec.ts` (34 tests skipped).
4. **Mover `authOptions`** fuera de `app/api/auth/[...nextauth]/route.ts` para eliminar el último error TS generado por Next.

## Convenciones de código

- Los servicios de analytics deben inyectar PrismaService en el constructor (no `@Inject()`).
- Campos de inventario en Prisma: `stockQuantity`, `minimumStock`, `reorderPoint` (no `current_stock`, `min_stock`).
- Los enums de Prisma (`ProductStatus`, `ProductType`) son lowercase: `'active'`, `'inactive'`, `'simple'` — los enums del frontend son uppercase: `'ACTIVE'`, `'INACTIVE'`, `'SIMPLE'`.
- El Ticket es la transacción de venta. Order es la orden de cocina (KDS).
