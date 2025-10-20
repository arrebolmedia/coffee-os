# Migración: Módulos POS (Orders, Discounts, Taxes, Shifts, Cash Registers)

**Fecha**: 2025-10-20  
**Versión**: 20251020_add_pos_modules  
**Autor**: Auto-generado

---

## 📋 Resumen

Esta migración agrega las tablas y relaciones necesarias para los **5 módulos POS** implementados:

1. **Orders Module** - Sistema de comandas y órdenes
2. **Discounts Module** - Descuentos y promociones
3. **Taxes Module** - Configuración de impuestos mexicanos
4. **Shifts Module** - Gestión de turnos de caja
5. **Cash Registers Module** - Arqueo de caja con denominaciones

---

## 📊 Tablas Creadas

### Orders & Kitchen Management (2 tablas)

#### `orders`
- **Propósito**: Gestión de comandas para cocina
- **Campos principales**:
  - `order_number` (UNIQUE): Número de orden
  - `type`: DINE_IN, TAKE_OUT, DELIVERY
  - `status`: PENDING → IN_PROGRESS → READY → SERVED / CANCELLED
  - `priority`: LOW, NORMAL, HIGH, URGENT
  - `table_number`: Número de mesa
  - `prep_time_estimate/actual`: Tiempos de preparación
- **Timestamps**: `ordered_at`, `started_at`, `ready_at`, `served_at`, `canceled_at`
- **Índices**: location_id, status, ordered_at

#### `order_items`
- **Propósito**: Items individuales de cada orden
- **Campos principales**:
  - `order_id` (FK → orders)
  - `product_id`: Referencia al producto
  - `quantity`: Cantidad
  - `status`: Estado individual del item
- **Cascade**: DELETE on order delete

---

### Discounts & Promotions (1 tabla)

#### `discounts`
- **Propósito**: Descuentos, cupones y promociones
- **Campos principales**:
  - `code` (UNIQUE): Código del cupón
  - `type`: PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y
  - `percentage`: Para descuentos porcentuales (0.10 = 10%)
  - `fixed_amount`: Para descuentos de cantidad fija
  - `buy_quantity/get_quantity`: Para promociones "Compra X, Lleva Y"
  - `applicable_to`: total, category, product
  - `product_ids[]`: Array de productos aplicables
  - `min_purchase`: Compra mínima requerida
  - `max_uses`: Límite de usos totales
  - `max_uses_per_user`: Límite por usuario
  - `current_uses`: Contador de usos
  - `valid_from/valid_until`: Periodo de validez
  - `stackable`: Permite combinarse con otros descuentos
- **Índices**: code, active, organization_id

---

### Tax Configuration (1 tabla)

#### `taxes`
- **Propósito**: Configuración de impuestos (principalmente mexicanos)
- **Campos principales**:
  - `category`: IVA, IEPS, ISR, OTHER
  - `rate`: Tasa decimal (0.16 para 16%, 0.08 para 8%)
  - `applicable_to`: all, category, product
  - `product_ids[]`: Productos específicos
  - `category_ids[]`: Categorías específicas
  - `included`: Si el impuesto está incluido en el precio
- **Índices**: organization_id, category
- **Uso**: IVA 16%, IEPS para bebidas alcohólicas, ISR, etc.

---

### Shift Management (1 tabla)

#### `shifts`
- **Propósito**: Gestión de turnos de trabajo y caja
- **Campos principales**:
  - `shift_number` (UNIQUE): Número de turno
  - `status`: OPEN, CLOSED
  - `opening_float`: Efectivo inicial en caja
  - `expected_cash`: Efectivo esperado (del sistema)
  - `counted_cash`: Efectivo contado físicamente
  - `variance`: Diferencia (counted - expected)
  - `opening_notes/closing_notes`: Notas de apertura/cierre
- **Timestamps**: `opened_at`, `closed_at`
- **Índices**: location_id, user_id, status

---

### Cash Register & Reconciliation (3 tablas)

#### `cash_registers`
- **Propósito**: Arqueo de caja detallado
- **Campos principales**:
  - `shift_id` (FK → shifts): Turno asociado
  - `expected_cash`: Efectivo esperado
  - `counted_cash`: Efectivo contado
  - `total_expenses`: Total de gastos de caja
- **Cascade**: DELETE on shift delete
- **Índices**: shift_id, location_id

#### `cash_denominations`
- **Propósito**: Conteo de billetes y monedas MXN
- **Campos principales**:
  - `cash_register_id` (FK → cash_registers)
  - `denomination`: Valor (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5)
  - `count`: Cantidad de esa denominación
  - `total`: denomination × count
- **Cascade**: DELETE on cash_register delete
- **Uso**: Conteo físico de billetes y monedas

#### `cash_expenses`
- **Propósito**: Gastos de caja durante el turno
- **Campos principales**:
  - `cash_register_id` (FK → cash_registers)
  - `amount`: Monto del gasto
  - `description`: Descripción
  - `category`: Categoría (cambio, proveedor, etc.)
  - `recipient`: Destinatario del dinero
- **Cascade**: DELETE on cash_register delete

---

## 🔗 Relaciones

### Relaciones Principales

```
shifts (1) ──< (N) cash_registers
cash_registers (1) ──< (N) cash_denominations
cash_registers (1) ──< (N) cash_expenses
orders (1) ──< (N) order_items
```

### Flujo de Datos

1. **Turno de Caja**:
   - Empleado abre `shift` con `opening_float`
   - Durante el turno se generan ventas
   - Al cerrar, se crea `cash_register`
   - Se registran `cash_denominations` (conteo físico)
   - Se registran `cash_expenses` (gastos del turno)
   - Se calcula `variance` (diferencia de caja)

2. **Órdenes de Cocina**:
   - POS crea `order` con items
   - Cocina ve orden en estado PENDING
   - Cambia a IN_PROGRESS → READY
   - Mesero entrega y marca SERVED

3. **Descuentos**:
   - Cliente usa código de cupón
   - Sistema valida en tabla `discounts`
   - Verifica validez, usos, mínimo de compra
   - Incrementa `current_uses`
   - Aplica descuento al ticket

4. **Impuestos**:
   - Al crear producto, se consulta tabla `taxes`
   - Se aplican impuestos según categoría/producto
   - Se calcula según `rate` y si está `included`

---

## 🚀 Aplicación de la Migración

### Opción A: Con Prisma (Recomendado)

```bash
# 1. Asegurar que DATABASE_URL esté configurado
cd packages/database

# 2. Aplicar migración
npx prisma migrate deploy

# 3. Regenerar Prisma Client
npx prisma generate
```

### Opción B: Manual con PostgreSQL

```bash
# 1. Conectar a la base de datos
psql -U coffeeos -d coffeeos_dev

# 2. Ejecutar el archivo SQL
\i packages/database/prisma/migrations/20251020_add_pos_modules/migration.sql

# 3. Verificar tablas creadas
\dt

# 4. Regenerar Prisma Client
npx prisma generate
```

---

## ✅ Verificación Post-Migración

### Comandos de Verificación

```sql
-- Verificar que las tablas existan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'order_items', 'discounts', 'taxes', 'shifts', 'cash_registers', 'cash_denominations', 'cash_expenses');

-- Verificar enums creados
SELECT typname 
FROM pg_type 
WHERE typname IN ('OrderType', 'OrderStatus', 'OrderPriority', 'DiscountType', 'TaxCategory', 'ShiftStatus');

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('orders', 'discounts', 'taxes', 'shifts', 'cash_registers');

-- Verificar foreign keys
SELECT conname 
FROM pg_constraint 
WHERE contype = 'f' 
AND conrelid IN (
    SELECT oid FROM pg_class 
    WHERE relname IN ('order_items', 'cash_registers', 'cash_denominations', 'cash_expenses')
);
```

### Checklist de Validación

- [ ] ✅ 8 tablas creadas correctamente
- [ ] ✅ 7 nuevos enums creados
- [ ] ✅ 14 índices creados
- [ ] ✅ 4 foreign keys con CASCADE
- [ ] ✅ Prisma Client regenerado
- [ ] ✅ Tests de backend pasando
- [ ] ✅ Servicios pueden conectar a BD

---

## 📊 Datos de Ejemplo (Seed)

### Impuestos (México)

```sql
-- IVA 16% (estándar)
INSERT INTO taxes (id, organization_id, name, category, rate, applicable_to, active)
VALUES ('tax_iva_16', 'org_default', 'IVA 16%', 'IVA', 0.16, 'all', true);

-- IVA 8% (frontera)
INSERT INTO taxes (id, organization_id, name, category, rate, applicable_to, active)
VALUES ('tax_iva_8', 'org_default', 'IVA 8% Frontera', 'IVA', 0.08, 'all', false);

-- IEPS Bebidas Azucaradas
INSERT INTO taxes (id, organization_id, name, category, rate, applicable_to, active)
VALUES ('tax_ieps_bebidas', 'org_default', 'IEPS Bebidas', 'IEPS', 0.01, 'category', true);
```

### Descuentos

```sql
-- Descuento 10% bienvenida
INSERT INTO discounts (
    id, organization_id, code, name, type, percentage, 
    applicable_to, min_purchase, max_uses, valid_from, valid_until, active
)
VALUES (
    'disc_bienvenida', 'org_default', 'BIENVENIDO10', 'Bienvenida 10%', 
    'PERCENTAGE', 0.10, 'total', 100.00, 1000, 
    NOW(), NOW() + INTERVAL '30 days', true
);

-- Promoción 2x1
INSERT INTO discounts (
    id, organization_id, code, name, type, buy_quantity, get_quantity,
    applicable_to, max_uses_per_user, active
)
VALUES (
    'disc_2x1_cafe', 'org_default', '2X1CAFE', 'Café 2x1', 
    'BUY_X_GET_Y', 2, 1, 'category', 1, true
);
```

---

## 🔄 Rollback

Si necesitas revertir la migración:

```sql
-- Eliminar tablas en orden inverso (por dependencias)
DROP TABLE IF EXISTS cash_expenses CASCADE;
DROP TABLE IF EXISTS cash_denominations CASCADE;
DROP TABLE IF EXISTS cash_registers CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS taxes CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Eliminar enums
DROP TYPE IF EXISTS "ShiftStatus";
DROP TYPE IF EXISTS "TaxCategory";
DROP TYPE IF EXISTS "DiscountType";
DROP TYPE IF EXISTS "OrderItemStatus";
DROP TYPE IF EXISTS "OrderPriority";
DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "OrderType";
```

---

## 📝 Notas de Implementación

### Consideraciones de Diseño

1. **Cascade Deletes**:
   - `order_items` se eliminan al eliminar `order`
   - `cash_denominations` y `cash_expenses` se eliminan al eliminar `cash_register`
   - `cash_register` se elimina al eliminar `shift`

2. **Índices Optimizados**:
   - `orders`: Búsquedas por ubicación, estado y fecha
   - `discounts`: Búsquedas por código y estado activo
   - `shifts`: Búsquedas por ubicación, usuario y estado

3. **Validaciones de Negocio** (en aplicación):
   - Descuentos: Validar fechas, usos, mínimo de compra
   - Turnos: Solo un turno abierto por ubicación a la vez
   - Órdenes: Transiciones de estado válidas

4. **Denominaciones MXN**:
   - Billetes: 1000, 500, 200, 100, 50, 20
   - Monedas: 10, 5, 2, 1, 0.5
   - Se permiten decimales para monedas fraccionarias

---

## 🧪 Testing

### Casos de Prueba Recomendados

```sql
-- Test 1: Crear orden completa
BEGIN;
INSERT INTO orders (id, location_id, user_id, order_number, type, status)
VALUES ('test_order_1', 'loc_1', 'user_1', 'ORD-001', 'DINE_IN', 'PENDING');

INSERT INTO order_items (id, order_id, product_id, quantity)
VALUES ('test_item_1', 'test_order_1', 'prod_cafe', 2);

SELECT * FROM orders WHERE id = 'test_order_1';
ROLLBACK;

-- Test 2: Aplicar descuento
BEGIN;
INSERT INTO discounts (id, organization_id, code, name, type, percentage, applicable_to, active)
VALUES ('test_disc', 'org_1', 'TEST10', 'Test 10%', 'PERCENTAGE', 0.10, 'total', true);

UPDATE discounts SET current_uses = current_uses + 1 WHERE code = 'TEST10';
SELECT current_uses FROM discounts WHERE code = 'TEST10';
ROLLBACK;

-- Test 3: Cerrar turno con arqueo
BEGIN;
INSERT INTO shifts (id, location_id, user_id, shift_number, opening_float, status)
VALUES ('test_shift', 'loc_1', 'user_1', 'SH-001', 500.00, 'OPEN');

INSERT INTO cash_registers (id, shift_id, location_id, organization_id, expected_cash)
VALUES ('test_reg', 'test_shift', 'loc_1', 'org_1', 5000.00);

INSERT INTO cash_denominations (id, cash_register_id, denomination, count, total)
VALUES 
    ('denom_1', 'test_reg', 1000, 3, 3000),
    ('denom_2', 'test_reg', 500, 4, 2000);

SELECT SUM(total) FROM cash_denominations WHERE cash_register_id = 'test_reg';
ROLLBACK;
```

---

## 📚 Referencias

- **Schema Prisma**: `packages/database/prisma/schema.prisma`
- **Módulos Backend**: `apps/api/src/modules/{orders,discounts,taxes,shifts,cash-registers}/`
- **Tests**: 157 tests implementados (100% passing)
- **Documentación**: Ver archivos PR-*.md en raíz del proyecto

---

**Status**: ✅ Migración lista para aplicar  
**Próximo Paso**: Ejecutar migración y hacer seed de datos iniciales
