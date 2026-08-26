# CoffeeOS — Estado del Sistema

**Última actualización**: Abril 2026

---

## ¿Qué es CoffeeOS?

Plataforma SaaS multi-tenant para cafeterías mexicanas. Cubre POS, inventario, recetas, CRM, calidad NOM-251, nómina, finanzas y analítica. Arquitectura monorepo con NestJS (API), Next.js (admin + POS), React Native (mobile) y Prisma + PostgreSQL.

---

## Estado por capa

### API (NestJS :4000)

| Área              | Estado                             | Notas                                                                              |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| Auth (JWT)        | ✅ Completo                        | Guard global, @Public() para rutas abiertas                                        |
| Products          | ✅ Completo                        | CRUD + bulk ops + image upload                                                     |
| Categories        | ✅ Completo                        | CRUD + bulk + reorder                                                              |
| Modifiers         | ✅ Completo                        | Soft delete inteligente                                                            |
| POS (Tickets)     | ✅ Completo                        | Tickets, líneas, modificadores                                                     |
| Orders (KDS)      | ✅ Completo                        | Estados, timestamps, kitchen display                                               |
| Cash Registers    | ✅ Completo                        | Turnos, denominaciones, gastos                                                     |
| Inventory         | ✅ Completo                        | Items, movimientos, alertas                                                        |
| Recipes           | ✅ Completo                        | Costeo automático, costing status                                                  |
| Suppliers         | ✅ Completo                        | CRUD                                                                               |
| Purchase Orders   | ✅ Completo                        | Ciclo de compra                                                                    |
| Discounts         | ✅ Completo                        |                                                                                    |
| Taxes             | ✅ Completo                        |                                                                                    |
| Quality           | ✅ Completo                        | Checklists NOM-251                                                                 |
| Analytics         | ✅ Completo                        | Queries Prisma reales sobre Ticket/TicketLine                                      |
| **Organizations** | ✅ Implementado abril 2026         | CRUD completo, soft delete, endpoint slug                                          |
| **CRM/Customers** | ✅ Migrado a Prisma abril 2026     | Migración `20260407230330`, `organizationId` requerido                             |
| **CRM/Loyalty**   | ✅ **Migrado a Prisma abril 2026** | `LoyaltyTransaction`, `LoyaltyReward`, migración `20260407232649`                  |
| **CRM/Campaigns** | ✅ **Migrado a Prisma abril 2026** | `Campaign`, `CampaignRecipient`, misma migración                                   |
| **CRM/RFM**       | ✅ **Migrado a Prisma abril 2026** | Calcula R/F/M sobre `LoyaltyTransaction`; distribución sobre `Customer.rfmSegment` |
| Finance           | ⚠️ En memoria                      | Sin schema Prisma                                                                  |
| HR                | ⚠️ En memoria                      | Sin schema Prisma                                                                  |
| Integrations      | ✅ Parcial                         | Twilio, Mailrelay, CFDI configurados                                               |

### Frontend admin-web (Next.js :3000)

| Área                   | Estado              | Notas                                      |
| ---------------------- | ------------------- | ------------------------------------------ |
| TypeScript             | ✅ 0 errores        | Verificado con `tsc --noEmit`              |
| Tipos Product/Category | ✅ Unificados       | camelCase, coinciden con respuestas Prisma |
| Autenticación          | ✅ Completo         | JWT, refresh token, localStorage           |
| Dashboard              | ✅ Conectado al API |                                            |
| Productos              | ✅ CRUD + bulk      | ProductFormModal + ProductModal            |
| Categorías             | ✅ CRUD             | CategoryFormModal                          |
| Órdenes                | ✅ Vista + detalle  | OrderDetailModal                           |
| Modificadores          | ✅ Modal            | ModifierGroupModal                         |

### Frontend pos-web (Next.js :3001)

| Área                    | Estado                            | Notas                                                |
| ----------------------- | --------------------------------- | ---------------------------------------------------- |
| Build                   | ✅ Errores de sintaxis corregidos | inventory, hr, sales, training pages                 |
| POS Core                | ✅ Funcional                      | Tickets, pagos, modificadores                        |
| Inventory page          | ✅ Corregido abril 2026           | Campos `min_stock`, `product?.name`, etc.            |
| Analytics pages         | ⚠️ Arrays vacíos                  | Pendiente conectar API                               |
| Employees page          | ✅ Corregido abril 2026           | `DisplayEmployee` adapter desde `HookEmployee`       |
| InventoryManager        | ✅ Corregido abril 2026           | `InventoryItem` unificado desde `InventoryItemModal` |
| Tests suppliers/quality | ✅ Corregido abril 2026           | DTOs y firmas de hooks alineados                     |

### Base de Datos (Prisma + PostgreSQL)

- 40+ modelos relacionales
- Multi-tenant vía `organizationId` en la mayoría de modelos
- `Customer` ahora tiene `organizationId` (migración `20260407230330_add_customer_full_fields`)
- Enum `CustomerStatus` agregado: `ACTIVE`, `INACTIVE`, `BLOCKED`
- Enums de otros módulos en lowercase (`active`, `inactive`, `simple`)

---

## Tests

### API (estado: abril 2026)

| Suite                                 | Estado   | Tests                                  |
| ------------------------------------- | -------- | -------------------------------------- |
| analytics (sales, product, dashboard) | ✅ Pasan | Prisma mocks                           |
| categories                            | ✅ Pasan | 20 tests activos                       |
| crm/customers                         | ✅ Pasan | Reescritos abril 2026 con Prisma mocks |
| organizations                         | ✅ Pasan | Nueva suite abril 2026, 14 tests       |
| crm (campaigns, loyalty, rfm)         | ✅ Pasan | In-memory                              |
| todos los demás módulos               | ✅ Pasan |                                        |

**Totales actuales**: 52 suites / 1054 pasan / 34 skipped (pre-existentes en categories)

---

## Correcciones aplicadas (abril 2026)

| #   | Problema                                    | Archivo(s)                                                                                                               | Fix                                                                                                                                                                                |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Puerto API incorrecto                       | `admin-web/next.config.js:29`                                                                                            | `4001` → `4000`                                                                                                                                                                    |
| 2   | Headers CORS distintos                      | `admin-web/src/lib/api-client.ts:33`                                                                                     | `X-Organization-ID` → `X-Organization-Id`                                                                                                                                          |
| 3   | Sintaxis rota en pos-web                    | analytics/inventory, hr, sales + training                                                                                | Eliminados bloques de código huérfanos                                                                                                                                             |
| 4   | `@ts-ignore` innecesarios                   | 8 componentes admin-web                                                                                                  | Eliminados todos                                                                                                                                                                   |
| 5   | Tipos Product/Category mezclados            | `admin-web/src/types/index.ts`                                                                                           | Unificados a camelCase Prisma                                                                                                                                                      |
| 6   | BulkUpdateStatusData incorrecto             | `product.service.ts`, `useApi.ts`                                                                                        | `{ productIds, isActive }`                                                                                                                                                         |
| 7   | Tests categories con skip                   | `categories.service.spec.ts`                                                                                             | 20 tests activos con mocks Prisma                                                                                                                                                  |
| 8   | Analytics retornaba ceros                   | `sales-analytics.service.ts`                                                                                             | Queries Prisma reales                                                                                                                                                              |
| 9   | Analytics productos vacío                   | `product-analytics.service.ts`                                                                                           | groupBy TicketLine + rankings                                                                                                                                                      |
| 10  | DashboardService crash                      | `dashboard.service.ts:51`                                                                                                | `day.period` en lugar de `day.date`                                                                                                                                                |
| 11  | CRM customers en memoria                    | `customers.service.ts`                                                                                                   | Migrado a Prisma — datos persisten                                                                                                                                                 |
| 12  | Organizations vacío                         | `organizations.module.ts`                                                                                                | CRUD completo implementado                                                                                                                                                         |
| 13  | pos-web inventory tipos rotos               | `inventory/page.tsx`                                                                                                     | `min_stock`, `product?.name`, etc.                                                                                                                                                 |
| 14  | pos-web employees Employee mismatch         | `employees/page.tsx`                                                                                                     | `DisplayEmployee` adapter con `toDisplay(HookEmployee)`                                                                                                                            |
| 15  | pos-web InventoryItem duplicado             | `InventoryManager.tsx`, `InventoryItemModal.tsx`                                                                         | Export único desde modal; `organizationId` prop agregado                                                                                                                           |
| 16  | pos-web SupplierFormModal test import       | `SupplierFormModal.test.tsx`                                                                                             | Named import + alinear `onSubmit` + shape de Supplier                                                                                                                              |
| 17  | pos-web hooks/service tests desactualizados | `use-quality-control.test.tsx`, `use-suppliers.test.tsx`, `quality-control.service.test.ts`, `suppliers.service.test.ts` | Firmas de hooks corregidas, DTOs con `recorded_at`/`created_by`/`active`/`business_name`/`contact_phone`, rango `from`/`to`, `issue_type` literal union, `{id, verificationNotes}` |

---

## Próximos pasos (ordenados por impacto)

### Pendientes

- Migrar Finance a Prisma (expenses, permits, p&l) — sin schema aún
- Migrar HR a Prisma (employees, certifications, evaluations) — sin schema aún
- Eliminar bloques `describe.skip` en `categories.service.spec.ts` (34 tests skipped)
- Mover `authOptions` fuera de la route para eliminar último error TS generado por Next

---

## Infraestructura local (Docker)

```bash
# Puertos activos
PostgreSQL  :5434
Redis       :6379
API         :4000  (NestJS)
Admin       :3000  (Next.js)
POS         :3001  (Next.js)
Swagger     :4000/docs

# Credenciales de desarrollo
DB: postgres / postgres123
JWT secret: configurado en .env
Admin demo: owner@coffeedemo.mx / password123
```

## Archivos de referencia

| Archivo                                  | Propósito                          |
| ---------------------------------------- | ---------------------------------- |
| `CLAUDE.md`                              | Reglas y contexto para Claude Code |
| `packages/database/prisma/schema.prisma` | Schema completo de BD              |
| `apps/api/src/app.module.ts`             | Módulos registrados (29)           |
| `apps/api/src/main.ts`                   | Bootstrap, CORS, puerto            |
| `apps/admin-web/src/types/index.ts`      | Tipos frontend                     |
| `apps/admin-web/src/lib/api-client.ts`   | Cliente HTTP                       |
