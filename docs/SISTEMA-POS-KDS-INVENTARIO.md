# 🎯 Sistema Unificado: POS + Kitchen + Inventario

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────┐
│                    PUNTO DE VENTA (POS)                  │
├─────────────────────────────────────────────────────────┤
│  Ticket (Cuenta/Orden del cliente)                      │
│    ├── TicketLine (productos)                           │
│    │     └── TicketLineModifier (extras)                │
│    ├── Payment (múltiples pagos)                        │
│    ├── InvoiceCfdi (facturación MX)                     │
│    └── Order (envío a cocina) ───────────┐              │
└─────────────────────────────────────────┘ │              │
                                            │              │
┌───────────────────────────────────────────▼─────────────┐
│              KITCHEN DISPLAY SYSTEM (KDS)                │
├─────────────────────────────────────────────────────────┤
│  Order (Orden de preparación)                           │
│    └── OrderItem (items a preparar)                     │
│                                                          │
│  Estados: PENDING → IN_PROGRESS → READY → SERVED        │
└─────────────────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼─────────────┐
│                  INVENTARIO Y COSTEO                     │
├─────────────────────────────────────────────────────────┤
│  Product (producto en menú)                             │
│    └── Recipe (preparación)                             │
│          └── RecipeIngredient (ingredientes)            │
│                └── InventoryItem (materia prima)        │
│                      └── InventoryMovement (stock)      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo Completo de Venta

### 1️⃣ Cliente Ordena en POS

```typescript
// Crear ticket nuevo
const ticket = await prisma.ticket.create({
  data: {
    ticketNumber: 'TKT-2025-001234',
    locationId: user.locationId,
    userId: user.id,
    customerId: customer?.id,
    status: 'OPEN',
    lines: {
      create: [
        {
          productId: 'cappuccino-id',
          quantity: 2,
          unitPrice: 55.0,
          total: 110.0,
          modifiers: {
            create: [
              {
                modifierId: 'leche-almendra-id',
                priceDelta: 10.0,
              },
            ],
          },
        },
        {
          productId: 'croissant-id',
          quantity: 1,
          unitPrice: 40.0,
          total: 40.0,
        },
      ],
    },
    subtotal: 150.0,
    tax: 24.0,
    total: 174.0,
  },
});

// ✅ Ticket creado
console.log(`Ticket ${ticket.ticketNumber} abierto`);
```

---

### 2️⃣ Enviar a Cocina (Automático)

```typescript
// Al confirmar el ticket, crear Order automáticamente
async function sendToKitchen(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { lines: { include: { product: true } } },
  });

  // Crear orden de cocina
  const order = await prisma.order.create({
    data: {
      ticketId: ticket.id,
      orderNumber: `ORD-${ticket.ticketNumber}`,
      locationId: ticket.locationId,
      userId: ticket.userId,
      type: 'DINE_IN',
      status: 'PENDING',
      priority: 'NORMAL',
      tableNumber: 'Mesa 5',
      items: {
        create: ticket.lines.map((line) => ({
          productId: line.productId,
          quantity: Math.floor(line.quantity),
          notes: line.notes,
          status: 'PENDING',
        })),
      },
    },
  });

  // 🖨️ Imprimir ticket en cocina
  await printKitchenTicket(order);

  // 📺 Mostrar en pantalla KDS
  await notifyKitchenDisplay(order.id);

  return order;
}
```

**Estados de Order**:

- `PENDING`: Recibida, no iniciada
- `IN_PROGRESS`: Cocinero preparando
- `READY`: Lista para servir
- `SERVED`: Entregada al cliente
- `CANCELLED`: Cancelada

---

### 3️⃣ Cocina Prepara (KDS)

```typescript
// Cocinero marca como "en progreso"
async function startPreparation(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });
}

// Cocinero marca como "lista"
async function markOrderReady(orderId: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'READY',
      readyAt: new Date(),
      prepTimeActual: calculatePrepTime(order.startedAt),
    },
  });

  // 🔔 Notificar al mesero
  await notifyWaiter(order.ticketId);

  return order;
}

// Mesero confirma entrega
async function markOrderServed(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SERVED',
      servedAt: new Date(),
    },
  });
}
```

---

### 4️⃣ Cliente Paga (Cerrar Ticket)

```typescript
async function processPayment(ticketId: string, payments: PaymentData[]) {
  // 1. Registrar pagos
  await prisma.payment.createMany({
    data: payments.map((p) => ({
      ticketId: ticketId,
      method: p.method,
      amount: p.amount,
      status: 'COMPLETED',
      reference: p.reference,
    })),
  });

  // 2. Cerrar ticket
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
    include: {
      lines: {
        include: {
          product: {
            include: {
              recipes: {
                include: {
                  ingredients: {
                    include: { inventoryItem: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // 3. 📦 DESCONTAR INVENTARIO
  await deductInventory(ticket);

  return ticket;
}
```

---

### 5️⃣ Descuento Automático de Inventario

```typescript
async function deductInventory(ticket: TicketWithLines) {
  const movements: InventoryMovementData[] = [];

  // Por cada línea del ticket
  for (const line of ticket.lines) {
    const product = line.product;

    // Verificar si tiene receta
    if (!product.recipes || product.recipes.length === 0) {
      console.warn(
        `Producto ${product.name} no tiene receta. No se descuenta inventario.`,
      );
      continue;
    }

    const recipe = product.recipes[0]; // Usar receta activa

    // Por cada ingrediente de la receta
    for (const ingredient of recipe.ingredients) {
      const quantityNeeded = ingredient.quantity * line.quantity;
      const item = ingredient.inventoryItem;

      // Verificar stock disponible
      if (item.currentStock < quantityNeeded) {
        // ⚠️ ALERTA: Stock insuficiente
        await createAlert({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: `Stock bajo de ${item.name}. Disponible: ${item.currentStock} ${item.unitOfMeasure}, Necesario: ${quantityNeeded} ${item.unitOfMeasure}`,
          inventoryItemId: item.id,
        });
      }

      // Crear movimiento de salida
      movements.push({
        locationId: ticket.locationId,
        inventoryItemId: item.id,
        type: 'OUT',
        quantity: quantityNeeded,
        reason: 'SALE',
        reference: ticket.ticketNumber,
        notes: `Venta: ${line.quantity}x ${product.name}`,
      });

      // Actualizar stock actual
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: {
            decrement: quantityNeeded,
          },
        },
      });

      // Verificar punto de reorden
      const updatedItem = await prisma.inventoryItem.findUnique({
        where: { id: item.id },
      });

      if (updatedItem.currentStock <= updatedItem.reorderPoint) {
        // 🚨 CRÍTICO: Crear orden de compra automática
        await createPurchaseOrderSuggestion({
          inventoryItemId: item.id,
          quantity: updatedItem.parLevel - updatedItem.currentStock,
          priority: 'HIGH',
        });
      }
    }
  }

  // Guardar todos los movimientos
  await prisma.inventoryMovement.createMany({
    data: movements,
  });

  return movements.length;
}
```

---

## 📊 Reportes y Analytics

### Ventas del Día

```typescript
async function getDailySales(locationId: string, date: Date) {
  const tickets = await prisma.ticket.findMany({
    where: {
      locationId,
      status: 'CLOSED',
      closedAt: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
    include: {
      lines: { include: { product: true } },
      payments: true,
    },
  });

  return {
    totalTickets: tickets.length,
    totalRevenue: tickets.reduce((sum, t) => sum + t.total, 0),
    averageTicket:
      tickets.reduce((sum, t) => sum + t.total, 0) / tickets.length,
    paymentMethods: groupBy(
      tickets.flatMap((t) => t.payments),
      (p) => p.method,
    ),
    topProducts: getTopProducts(tickets.flatMap((t) => t.lines)),
  };
}
```

### Performance de Cocina

```typescript
async function getKitchenPerformance(locationId: string, date: Date) {
  const orders = await prisma.order.findMany({
    where: {
      locationId,
      orderedAt: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
  });

  return {
    totalOrders: orders.length,
    completedOrders: orders.filter((o) => o.status === 'SERVED').length,
    averagePrepTime: calculateAverage(
      orders.map((o) => o.prepTimeActual).filter(Boolean),
    ),
    cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
    ordersInProgress: orders.filter((o) => o.status === 'IN_PROGRESS').length,
  };
}
```

---

## 🔗 Relaciones Clave en el Schema

### Ticket → Order (1 a muchos)

Un ticket puede tener múltiples órdenes (ej: bebidas primero, comida después)

```prisma
model Ticket {
  orders Order[] // Todas las órdenes de cocina
}

model Order {
  ticketId String
  ticket   Ticket @relation(...)
}
```

### TicketLine → Product → Recipe → InventoryItem

Cada producto vendido conecta con su receta para descuento de inventario

```prisma
TicketLine
  └─> Product
        └─> Recipe
              └─> RecipeIngredient
                    └─> InventoryItem
```

---

## ✅ Validaciones del Sistema

### Al crear ticket

- ✅ Verificar que productos estén disponibles (`isAvailable = true`)
- ✅ Verificar que recetas estén aprobadas (`readyForPos = true`)
- ✅ Calcular precios con modificadores
- ✅ Aplicar descuentos si hay

### Al enviar a cocina

- ✅ Agrupar items por prioridad
- ✅ Estimar tiempo de preparación
- ✅ Asignar a estación correcta

### Al cerrar ticket

- ✅ Verificar que todas las órdenes estén servidas
- ✅ Verificar que pagos cubran el total
- ✅ Descontar inventario
- ✅ Generar alertas de stock bajo

---

## 🚀 Próximos Pasos de Implementación

1. **Backend Services**
   - [x] Schema limpio (Transaction eliminado)
   - [ ] TicketService (CRUD completo)
   - [ ] OrderService (KDS logic)
   - [ ] PaymentService (múltiples métodos)
   - [ ] InventoryService (descuento automático)

2. **Frontend POS**
   - [ ] Pantalla de venta (agregar productos)
   - [ ] Carrito con modificadores
   - [ ] Procesamiento de pagos
   - [ ] Impresión de tickets

3. **Frontend KDS**
   - [ ] Dashboard de órdenes pendientes
   - [ ] Drag & drop de estados
   - [ ] Timer de preparación
   - [ ] Notificaciones en tiempo real

4. **Alertas e Inventario**
   - [ ] Sistema de alertas de stock
   - [ ] Sugerencias de órdenes de compra
   - [ ] Reportes de consumo

---

## 📱 UI/UX Propuesto

### POS - Crear Venta

```
┌─────────────────────────────────────────┐
│ [Categorías]                    Cart: 3 │
│ ☕ Bebidas  🥐 Pasteles  🍰 Postres     │
├─────────────────────────────────────────┤
│                                         │
│  [Cappuccino]  [Latte]  [Espresso]      │
│    $55.00      $58.00    $34.80         │
│                                         │
│  [Americano]   [Mocha]  [Frappé]        │
│    $40.60      $58.00    $63.80         │
│                                         │
├─────────────────────────────────────────┤
│ CARRITO:                                │
│ • 2x Cappuccino          $110.00        │
│   + Leche de almendra    + $20.00       │
│ • 1x Croissant           $40.00         │
│                          ───────        │
│ Subtotal:                $170.00        │
│ IVA (16%):               $27.20         │
│ Total:                   $197.20        │
│                                         │
│ [Enviar a Cocina] [Cobrar]              │
└─────────────────────────────────────────┘
```

### KDS - Pantalla de Cocina

```
┌─────────────────────────────────────────┐
│ ÓRDENES PENDIENTES          14:35:22    │
├──────────┬──────────┬──────────┬────────┤
│ PENDING  │ PROGRESS │  READY   │ SERVED │
├──────────┼──────────┼──────────┼────────┤
│ ORD-123  │ ORD-120  │ ORD-118  │        │
│ Mesa 5   │ Mesa 3   │ Mesa 1   │        │
│ 🕐 2 min │ 🕐 5 min │ 🔔 LISTO │        │
│          │          │          │        │
│ 2x Cap   │ 1x Latte │ 3x Espr  │        │
│ 1x Crois │ 1x Mocha │          │        │
│          │          │          │        │
│ [Iniciar]│[Marcar   │[Servir]  │        │
│          │ Listo]   │          │        │
├──────────┼──────────┼──────────┼────────┤
│ ORD-124  │ ORD-121  │          │        │
│ Mesa 7   │ Para     │          │        │
│ 🕐 1 min │ llevar   │          │        │
│          │ 🕐 7 min │          │        │
└──────────┴──────────┴──────────┴────────┘
```

---

## 🎯 Sistema Completo Integrado

```
Cliente ordena en POS
    ↓
Ticket creado (OPEN)
    ↓
Order enviada a cocina (PENDING)
    ↓
Cocinero inicia (IN_PROGRESS)
    ↓
Orden lista (READY)
    ↓
Mesero sirve (SERVED)
    ↓
Cliente paga
    ↓
Ticket cerrado (CLOSED)
    ↓
Inventario descontado automáticamente
    ↓
Alertas generadas si stock bajo
    ↓
Sugerencias de compra creadas
```

Este es el sistema unificado y limpio que tenemos ahora. ¿Listo para empezar a implementar los servicios?
