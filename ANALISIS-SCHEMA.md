# Análisis del Schema - Duplicados y Problemas

## 🔴 PROBLEMA: Duplicación de Modelos

### 1. Sistema de Órdenes DUPLICADO

#### Opción A: Ticket System (Viejo)

```prisma
Ticket (POS principal)
  ├── TicketLine (productos vendidos)
  │   └── TicketLineModifier
  └── Payment
```

#### Opción B: Order System (Kitchen)

```prisma
Order (Kitchen/Order Management)
  └── OrderItem (productos a preparar)
```

#### Opción C: Transaction System (Nuevo)

```prisma
Transaction (Sistema transaccional)
  └── TransactionLineItem
```

**PROBLEMA**: ¡3 sistemas diferentes para el mismo concepto!

---

### 2. Inventario - BIEN ESTRUCTURADO ✅

```prisma
Inventory (productos terminados por ubicación)
  ├── currentStock, minStock, maxStock
  └── unitCost, totalValue

InventoryItem (materias primas/ingredientes)
  ├── costPerUnit, parLevel
  └── Usado en RecipeIngredient
```

**CORRECTO**: Estos dos modelos SÍ deben coexistir

---

## 🎯 DECISIÓN ARQUITECTÓNICA REQUERIDA

### Opción 1: Sistema Unificado (RECOMENDADO)

- **USAR**: `Transaction` + `TransactionLineItem` + `Payment`
- **ELIMINAR**: `Ticket`, `TicketLine`, `TicketLineModifier`
- **MANTENER**: `Order` + `OrderItem` (solo para kitchen display)
- **VENTAJA**: Un solo flujo transaccional, más simple

### Opción 2: Sistema Dual

- **USAR**: `Ticket` como orden de venta principal
- **USAR**: `Order` solo para cocina/preparación
- **ELIMINAR**: `Transaction` completo
- **VENTAJA**: Separación clara POS vs Kitchen

---

## 📊 MODELOS A REVISAR

### ✅ MANTENER (Bien estructurados)

- `Organization`, `Location`, `Role`, `User`
- `Category`, `Product`, `Modifier`
- `Inventory` (productos)
- `InventoryItem` (ingredientes)
- `Recipe`, `RecipeIngredient`
- `Supplier`, `PurchaseOrder`
- `Customer`, `Consent`
- `Checklist`, `QualityLog`
- `Permit`, `InvoiceCfdi`
- `Shift`, `CashRegister`
- `Discount`, `Tax`

### ⚠️ DECIDIR (Duplicados)

- `Ticket` vs `Transaction` vs `Order`
- `TicketLine` vs `TransactionLineItem` vs `OrderItem`
- `Payment` (conectado a ambos)

### 🔍 VERIFICAR

- ¿`TicketLineModifier` se usa? ¿O solo `ProductModifier`?
- ¿`Lot` se usa? (trazabilidad de lotes)
- ¿`GoodsReceipt` se usa? (recepción de mercancía)

---

## 🚀 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Análisis

1. ✅ Identificar duplicados (HECHO)
2. ⏳ Decidir arquitectura (Transaction vs Ticket)
3. ⏳ Verificar qué módulos están en uso

### Fase 2: Limpieza

1. Eliminar modelos no usados
2. Migrar datos si es necesario
3. Actualizar schema

### Fase 3: Código

1. Eliminar servicios obsoletos
2. Actualizar frontend
3. Unificar nomenclatura

---

## ❓ PREGUNTAS PARA EL USUARIO

1. **¿Qué sistema quieres usar como principal?**
   - A) Transaction (más moderno, limpio)
   - B) Ticket (más específico para POS)

2. **¿Necesitas Kitchen Display System separado?**
   - Si NO → Eliminar `Order`/`OrderItem`
   - Si SÍ → Mantener pero conectar con Transaction

3. **¿Usarás trazabilidad de lotes?**
   - Si NO → Eliminar `Lot`, `GoodsReceipt`

4. **¿Necesitas recepción de mercancía completa?**
   - Si NO → Simplificar `PurchaseOrder`

---

## 🎯 MI RECOMENDACIÓN

**Sistema Simplificado:**

```
POS/Venta:
  Transaction (venta completa)
    ├── TransactionLineItem (productos vendidos)
    ├── Payment (pagos múltiples)
    └── InvoiceCfdi (facturación)

Cocina (opcional):
  Order (solo si necesitas KDS)
    └── OrderItem (items a preparar)

Inventario:
  Inventory (productos terminados)
  InventoryItem (materias primas)
  Recipe (costeo y preparación)
```

**ELIMINAR:**

- Ticket, TicketLine, TicketLineModifier
- Lot (a menos que necesites trazabilidad farmacéutica)
- GoodsReceipt (simplificar a InventoryMovement)
