# 🎯 Decisión: Sistema de Órdenes/Ventas

## Pregunta: ¿Qué sistema mantener?

### Opción A: Transaction (Sistema Transaccional Moderno)

```prisma
Transaction (Venta/Transacción)
  ├── TransactionLineItem (productos vendidos)
  └── Payment (pagos múltiples)
```

**Pros**:

- ✅ Más genérico (no solo POS)
- ✅ Nombre neutral (funciona para delivery, e-commerce)
- ✅ Ya tiene estructura completa
- ✅ Soporta múltiples pagos

**Contras**:

- ❌ Menos específico para POS

---

### Opción B: Ticket (Sistema POS Tradicional)

```prisma
Ticket (Ticket/Cuenta de POS)
  ├── TicketLine (productos)
  │   └── TicketLineModifier (modificadores)
  └── Payment
```

**Pros**:

- ✅ Lenguaje familiar para POS/restaurantes
- ✅ Soporta modificadores por línea
- ✅ Nombre tradicional del sector

**Contras**:

- ❌ Específico solo para POS físico
- ❌ No funciona bien para otros canales

---

## 🎯 MI RECOMENDACIÓN: **Ticket**

### Razón Principal:

Tu sistema es **específicamente para cafeterías/restaurantes**. En este contexto:

- El personal dice "Ticket 123" no "Transaction 123"
- Los clientes piden "la cuenta" (ticket)
- La terminología del sector es clara

### Sistema Simplificado Propuesto:

```
VENTAS (POS):
  Ticket (cuenta/orden del cliente)
    ├── TicketLine (productos vendidos)
    │     └── TicketLineModifier (extras: leche de almendra, shot extra)
    └── Payment (efectivo, tarjeta, múltiples)

COCINA (opcional - decidir):
  Order (orden de preparación en cocina)
    └── OrderItem (items a preparar)

INVENTARIO:
  Inventory (stock de productos terminados)
  InventoryItem (ingredientes/materias primas)
  Recipe (receta con costeo)
```

---

## 🗑️ Propuesta: ELIMINAR Transaction

**Tabla a eliminar**:

- `Transaction`
- `TransactionLineItem`

**Razón**: Es redundante con `Ticket`, que es más específico para tu caso de uso.

---

## ❓ Decisión sobre Order/OrderItem

**¿Necesitas Kitchen Display System (KDS)?**

### Escenario 1: SÍ necesito KDS

- **Mantener**: `Order` + `OrderItem`
- **Conectar**: Cuando se crea un `Ticket`, automáticamente crear `Order` para cocina
- **Flujo**:
  ```
  Cliente ordena → Ticket creado → Order enviado a cocina →
  Cocinero prepara → Order.status = READY → Mesero sirve
  ```

### Escenario 2: NO necesito KDS

- **Eliminar**: `Order` + `OrderItem`
- **Simplificar**: Solo usar `Ticket` para todo
- **Flujo**:
  ```
  Cliente ordena → Ticket creado → Se imprime en cocina →
  Cocinero prepara → Ticket cerrado
  ```

---

## 🎯 PLAN DE LIMPIEZA

### Paso 1: Eliminar Transaction

```bash
# 1. Verificar que no hay datos
# 2. Eliminar del schema
# 3. Crear migración
```

### Paso 2: Decidir sobre Order

- **Opción A**: Mantener para KDS
- **Opción B**: Eliminar si no lo usas

### Paso 3: Unificar en Ticket

- Usar `Ticket` como sistema principal de ventas
- Conectar con `Recipe` para descuento de inventario
- Integrar con `InvoiceCfdi` para facturación

---

## 📊 Flujo Completo Propuesto

### Venta en POS:

```typescript
1. Crear Ticket
   └─> Agregar TicketLine (producto + cantidad)
       └─> Agregar TicketLineModifier (si aplica)

2. Calcular totales
   └─> Subtotal, tax, discount, total

3. Registrar Payment
   └─> Puede haber múltiples pagos (efectivo + tarjeta)

4. Descontar inventario
   └─> Por cada producto vendido:
       └─> Obtener Recipe
           └─> Por cada ingrediente:
               └─> Crear InventoryMovement (OUT)
               └─> Actualizar currentStock

5. Cerrar ticket
   └─> ticket.status = CLOSED
```

---

## ✅ RECOMENDACIÓN FINAL

**USAR**:

- ✅ `Ticket` + `TicketLine` + `TicketLineModifier` (ventas)
- ✅ `Payment` (pagos)
- ✅ `Recipe` + `RecipeIngredient` (costeo)
- ✅ `InventoryItem` + `InventoryMovement` (stock)
- ✅ `InvoiceCfdi` (facturación)

**ELIMINAR**:

- ❌ `Transaction` + `TransactionLineItem` (redundante)

**DECIDIR**:

- ❔ `Order` + `OrderItem` (solo si necesitas KDS)

**MANTENER** (otros módulos):

- ✅ Todo lo demás está bien estructurado

---

## 🚀 Siguiente Paso

**Dime**:

1. ¿Elimino `Transaction`? (recomiendo SÍ)
2. ¿Necesitas Kitchen Display System? (mantener o eliminar `Order`)

Una vez confirmes, hago la limpieza del schema y creamos las migraciones correspondientes.
