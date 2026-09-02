# Orders API Documentation

## Descripción General

La API de órdenes gestiona el ciclo de vida completo de las órdenes en CoffeeOS, desde su creación hasta su entrega. Incluye workflow de estados, estadísticas en tiempo real y filtros avanzados.

## Base URL

```
/api/orders
```

## Autenticación

Todos los endpoints requieren autenticación JWT:

```
Authorization: Bearer <token>
```

## Workflow de Estados

```
PENDING → IN_PROGRESS → READY → SERVED
    ↓
CANCELLED (en cualquier punto)
```

### Estados Disponibles

- **PENDING**: Orden creada, esperando preparación
- **IN_PROGRESS**: En preparación en cocina/barra
- **READY**: Lista para recoger/servir
- **SERVED**: Entregada al cliente
- **CANCELLED**: Cancelada

## Endpoints

### 1. Crear Orden

Crea una nueva orden y la asocia a una transacción.

**Endpoint:** `POST /orders`

**Request Body:**

```typescript
{
  transactionId: string;          // ID de transacción asociada
  type: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
  tableNumber?: string;           // Solo para DINE_IN
  priority?: number;              // 1-5 (default: 3)
  prepTimeEstimate?: number;      // Minutos estimados
  notes?: string;                 // Notas especiales
  customerName?: string;
  organizationId?: string;
  locationId?: string;
}
```

**Response:** `201 Created`

```typescript
{
  id: string;
  orderNumber: string;            // Auto-generado: ORD-20251022-0001
  transactionId: string;
  status: 'PENDING';
  type: OrderType;
  tableNumber?: string;
  priority: number;
  prepTimeEstimate?: number;
  notes?: string;
  customerName?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  readyAt?: Date;
  servedAt?: Date;
  transaction: {
    id: string;
    customerName: string;
    status: string;
  };
}
```

**Errores:**

- `400 Bad Request` - transactionId no existe

---

### 2. Listar Órdenes

Obtiene lista de órdenes con filtros y paginación.

**Endpoint:** `GET /orders`

**Query Parameters:**

```typescript
{
  skip?: number;                  // Default: 0
  take?: number;                  // Default: 50, Max: 100
  status?: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED';
  type?: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
  tableNumber?: string;
  organizationId?: string;
  locationId?: string;
  startDate?: string;             // ISO format
  endDate?: string;
}
```

**Response:** `200 OK`

```typescript
{
  items: Order[];
  total: number;
  skip: number;
  take: number;
}
```

**Ejemplo:**

```
GET /orders?status=IN_PROGRESS&type=DINE_IN&take=20
```

---

### 3. Obtener Estadísticas

Retorna métricas agregadas de órdenes.

**Endpoint:** `GET /orders/stats`

**Query Parameters:**

```typescript
{
  organizationId?: string;
  locationId?: string;
  startDate?: string;             // ISO format
  endDate?: string;
}
```

**Response:** `200 OK`

```typescript
{
  totalOrders: number;            // Total de órdenes en periodo
  totalSales: number;             // Ventas totales ($)
  averageTicket: number;          // Ticket promedio
  todayOrders: number;            // Órdenes de hoy
  todaySales: number;             // Ventas de hoy
  growthPercentage: number;       // Crecimiento vs ayer (%)
  byStatus: {
    PENDING: number;
    IN_PROGRESS: number;
    READY: number;
    SERVED: number;
    CANCELLED: number;
  };
  byType: {
    DINE_IN: number;
    TAKE_OUT: number;
    DELIVERY: number;
  };
  byPaymentMethod: {
    CASH: number;
    CARD: number;
    TRANSFER: number;
    MIXED: number;
  };
  topProducts: [
    {
      productId: string;
      productName: string;
      quantity: number;           // Unidades vendidas
      revenue: number;            // Ingresos generados
    }
  ];  // Top 5 productos
}
```

**Ejemplo:**

```
GET /orders/stats?organizationId=org123&startDate=2025-10-01&endDate=2025-10-31
```

---

### 4. Obtener Órdenes por Estado

Filtra órdenes por estado específico.

**Endpoint:** `GET /orders/status/:status`

**Parámetros:**

- `status`: PENDING | IN_PROGRESS | READY | SERVED | CANCELLED

**Response:** `200 OK`

```typescript
Order[]
```

**Ejemplo:**

```
GET /orders/status/IN_PROGRESS
```

---

### 5. Obtener Órdenes por Tipo

Filtra órdenes por tipo de servicio.

**Endpoint:** `GET /orders/type/:type`

**Parámetros:**

- `type`: DINE_IN | TAKE_OUT | DELIVERY

**Response:** `200 OK`

```typescript
Order[]
```

**Ejemplo:**

```
GET /orders/type/DINE_IN
```

---

### 6. Obtener Órdenes por Mesa

Filtra órdenes de una mesa específica.

**Endpoint:** `GET /orders/table/:tableNumber`

**Response:** `200 OK`

```typescript
Order[]  // Órdenes activas de la mesa
```

**Ejemplo:**

```
GET /orders/table/5
```

---

### 7. Obtener Orden por ID

Obtiene detalles completos de una orden.

**Endpoint:** `GET /orders/:id`

**Response:** `200 OK`

```typescript
{
  id: string;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  // ... todos los campos
  orderItems: [
    {
      id: string;
      productId: string;
      quantity: number;
      price: number;
      notes?: string;
      product: {
        id: string;
        name: string;
        image?: string;
      };
    }
  ];
  transaction: {
    id: string;
    total: number;
    subtotal: number;
    tax: number;
    paymentMethod: string;
    // ...
  };
}
```

**Errores:**

- `404 Not Found` - Orden no existe

---

### 8. Actualizar Orden

Actualiza campos generales de una orden.

**Endpoint:** `PATCH /orders/:id`

**Request Body:** (todos opcionales)

```typescript
{
  priority?: number;
  prepTimeEstimate?: number;
  notes?: string;
  tableNumber?: string;
}
```

**Response:** `200 OK`

```typescript
Order; // Orden actualizada
```

**Errores:**

- `404 Not Found` - Orden no existe

---

### 9. Iniciar Preparación

Cambia estado a IN_PROGRESS y registra timestamp.

**Endpoint:** `PATCH /orders/:id/start`

**Response:** `200 OK`

```typescript
{
  id: string;
  status: 'IN_PROGRESS';
  startedAt: Date; // Timestamp de inicio
  // ... resto de campos
}
```

**Validaciones:**

- Solo se puede iniciar si status = PENDING
- Registra tiempo de inicio automáticamente

**Errores:**

- `400 Bad Request` - Orden no está en estado PENDING
- `404 Not Found` - Orden no existe

---

### 10. Marcar como Lista

Cambia estado a READY.

**Endpoint:** `PATCH /orders/:id/ready`

**Response:** `200 OK`

```typescript
{
  id: string;
  status: 'READY';
  readyAt: Date; // Timestamp
  // ...
}
```

**Validaciones:**

- Solo si status = IN_PROGRESS

**Errores:**

- `400 Bad Request` - Orden no está en preparación

---

### 11. Marcar como Servida

Cambia estado a SERVED (estado final).

**Endpoint:** `PATCH /orders/:id/serve`

**Response:** `200 OK`

```typescript
{
  id: string;
  status: 'SERVED';
  servedAt: Date; // Timestamp de entrega
  // ...
}
```

**Validaciones:**

- Solo si status = READY

**Errores:**

- `400 Bad Request` - Orden no está lista

---

### 12. Cancelar Orden

Cancela una orden en cualquier estado.

**Endpoint:** `PATCH /orders/:id/cancel`

**Response:** `200 OK`

```typescript
{
  id: string;
  status: 'CANCELLED';
  cancelledAt: Date;
  // ...
}
```

**Comportamiento:**

- Se puede cancelar en cualquier estado excepto SERVED
- Libera recursos (mesa, inventario si aplica)

**Errores:**

- `400 Bad Request` - Orden ya servida
- `404 Not Found` - Orden no existe

---

### 13. Eliminar Orden

Elimina físicamente una orden.

**Endpoint:** `DELETE /orders/:id`

**Response:** `200 OK`

```typescript
{
  message: 'Order deleted successfully';
}
```

**Validaciones:**

- No se puede eliminar orden SERVED (usar cancelar)

**Errores:**

- `400 Bad Request` - Orden ya servida
- `404 Not Found` - Orden no existe

---

## Tipos y Enums

### OrderStatus

```typescript
enum OrderStatus {
  PENDING = 'PENDING', // Creada, esperando
  IN_PROGRESS = 'IN_PROGRESS', // En preparación
  READY = 'READY', // Lista
  SERVED = 'SERVED', // Entregada
  CANCELLED = 'CANCELLED', // Cancelada
}
```

### OrderType

```typescript
enum OrderType {
  DINE_IN = 'DINE_IN', // Para comer en local
  TAKE_OUT = 'TAKE_OUT', // Para llevar
  DELIVERY = 'DELIVERY', // Entrega a domicilio
}
```

---

## Validaciones Comunes

### Order Number

- Formato: `ORD-YYYYMMDD-XXXX`
- Ejemplo: `ORD-20251022-0001`
- Generado automáticamente
- Reinicia contador diariamente

### Priority

- Rango: 1-5
- 1 = Baja prioridad
- 3 = Normal (default)
- 5 = Alta prioridad

### Prep Time Estimate

- En minutos
- Calculado automáticamente según productos
- Puede ser sobrescrito manualmente

### Table Number

- Solo requerido para type = DINE_IN
- Formato libre (string)

---

## Ejemplos de Uso

### Flujo Completo de una Orden

```bash
# 1. Crear orden
POST /orders
{
  "transactionId": "txn_abc123",
  "type": "DINE_IN",
  "tableNumber": "5",
  "priority": 3,
  "customerName": "Juan Pérez"
}
# Response: { "id": "ord_xyz", "orderNumber": "ORD-20251022-0023", "status": "PENDING" }

# 2. Iniciar preparación
PATCH /orders/ord_xyz/start
# Response: { "status": "IN_PROGRESS", "startedAt": "2025-10-22T10:15:00Z" }

# 3. Marcar como lista
PATCH /orders/ord_xyz/ready
# Response: { "status": "READY", "readyAt": "2025-10-22T10:25:00Z" }

# 4. Servir al cliente
PATCH /orders/ord_xyz/serve
# Response: { "status": "SERVED", "servedAt": "2025-10-22T10:28:00Z" }
```

### Obtener Dashboard Stats

```bash
GET /orders/stats?organizationId=org123

# Response:
{
  "totalOrders": 156,
  "totalSales": 45678.50,
  "averageTicket": 293.07,
  "todayOrders": 23,
  "todaySales": 6789.00,
  "growthPercentage": 12.5,
  "byStatus": {
    "PENDING": 3,
    "IN_PROGRESS": 5,
    "READY": 2,
    "SERVED": 145,
    "CANCELLED": 1
  },
  "topProducts": [
    { "productName": "Café Latte", "quantity": 45, "revenue": 2025.00 },
    { "productName": "Cappuccino", "quantity": 38, "revenue": 1710.00 }
  ]
}
```

### Monitoreo de Cocina

```bash
# Órdenes pendientes de preparar
GET /orders/status/PENDING

# Órdenes en preparación
GET /orders/status/IN_PROGRESS

# Órdenes listas para servir
GET /orders/status/READY
```

### Órdenes de una Mesa

```bash
GET /orders/table/7

# Response: Órdenes activas de mesa 7
[
  {
    "orderNumber": "ORD-20251022-0045",
    "status": "IN_PROGRESS",
    "orderItems": [
      { "product": { "name": "Café Americano" }, "quantity": 2 },
      { "product": { "name": "Croissant" }, "quantity": 1 }
    ]
  }
]
```

---

## Casos de Uso Específicos

### 1. Pantalla de Cocina (KDS - Kitchen Display System)

```bash
# Obtener órdenes pendientes y en proceso
GET /orders?status=PENDING
GET /orders?status=IN_PROGRESS

# Iniciar preparación
PATCH /orders/{id}/start

# Marcar como lista
PATCH /orders/{id}/ready
```

### 2. Dashboard de Administración

```bash
# Estadísticas del día
GET /orders/stats

# Órdenes recientes
GET /orders?take=10&skip=0

# Filtrar por tipo
GET /orders?type=DELIVERY&status=IN_PROGRESS
```

### 3. Sistema de Meseros

```bash
# Ver órdenes de una mesa
GET /orders/table/12

# Actualizar notas de la orden
PATCH /orders/{id}
{
  "notes": "Sin azúcar, extra caliente"
}

# Servir orden
PATCH /orders/{id}/serve
```

### 4. Reportes de Ventas

```bash
# Ventas del mes
GET /orders/stats?startDate=2025-10-01&endDate=2025-10-31

# Top productos
GET /orders/stats
# Ver campo topProducts en respuesta
```

---

## Métricas de Performance

### Tiempos de Preparación

Calculados automáticamente:

```typescript
{
  waitTime: startedAt - createdAt,        // Tiempo en cola
  prepTime: readyAt - startedAt,          // Tiempo de preparación
  deliveryTime: servedAt - readyAt,       // Tiempo de entrega
  totalTime: servedAt - createdAt         // Tiempo total
}
```

### KPIs Importantes

- **Tiempo promedio de preparación**: Para optimizar cocina
- **Órdenes activas**: Carga actual del sistema
- **Tasa de cancelación**: Indicador de calidad
- **Ticket promedio**: Métrica de ventas

---

## Códigos de Estado HTTP

- `200 OK` - Operación exitosa
- `201 Created` - Orden creada
- `400 Bad Request` - Estado inválido, transición no permitida
- `401 Unauthorized` - Token inválido
- `404 Not Found` - Orden no encontrada

---

## Notas Técnicas

### Integración con Prisma

- Todas las operaciones usan Prisma ORM
- Transacciones automáticas para consistencia
- Includes optimizados para reducir queries

### Multi-Tenancy

- Filtrado automático por organizationId y locationId
- Aislamiento de datos entre organizaciones

### Generación de Order Number

- Formato: ORD-YYYYMMDD-XXXX
- Contador se reinicia diariamente
- Padding de 4 dígitos (0001-9999)

### Relaciones

```typescript
Order
├── Transaction (1:1)
│   ├── Customer
│   └── Payment details
└── OrderItems (1:N)
    └── Product
        └── Modifiers
```

---

## Webhook Events (Próximamente)

```typescript
{
  event: 'order.created',
  data: Order
}

{
  event: 'order.started',
  data: Order
}

{
  event: 'order.ready',
  data: Order
}

{
  event: 'order.served',
  data: Order
}

{
  event: 'order.cancelled',
  data: Order
}
```

---

## Próximas Mejoras

- [ ] Notificaciones push en cambios de estado
- [ ] Estimación automática de tiempo de preparación
- [ ] Queue management (priorización inteligente)
- [ ] Integración con impresoras de cocina
- [ ] Reportes avanzados (PDF, Excel)
- [ ] Histórico de modificaciones (audit log)
- [ ] Agrupación de órdenes por batch
- [ ] Predicción de demanda con ML
