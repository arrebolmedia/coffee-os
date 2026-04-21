# 🧪 Script de Prueba: Flujo POS → KDS

## Prerequisitos

- Backend corriendo en `http://localhost:4000`
- Datos de sandbox creados (seed-sandbox.ts)
- Token de autenticación (opcional si quitamos el guard)

---

## 1️⃣ Crear un Ticket (POS)

### Endpoint

```http
POST http://localhost:4000/pos/tickets
Content-Type: application/json
```

### Body

```json
{
  "locationId": "cm2zkj9r50001qgbvc5p3w8x1",
  "userId": "cm2zkj9ra0006qgbvzq8m4n2p",
  "lines": [
    {
      "productId": "prod-cappuccino",
      "quantity": 2,
      "unitPrice": 55.0,
      "modifiers": [
        {
          "modifierId": "mod-leche-almendra",
          "priceDelta": 10.0
        }
      ],
      "notes": "Sin azúcar"
    },
    {
      "productId": "prod-croissant",
      "quantity": 1,
      "unitPrice": 40.0
    }
  ],
  "notes": "Para llevar"
}
```

### Respuesta Esperada

```json
{
  "id": "cuid-ticket-001",
  "ticketNumber": "TKT-2025-000001",
  "status": "OPEN",
  "subtotal": 150.0,
  "tax": 24.0,
  "total": 174.0,
  "lines": [...],
  "orders": [
    {
      "id": "cuid-order-001",
      "orderNumber": "ORD-2025-000001",
      "status": "PENDING",
      "items": [...]
    }
  ]
}
```

---

## 2️⃣ Listar Órdenes de Cocina (KDS)

### Endpoint

```http
GET http://localhost:4000/pos/orders?locationId=cm2zkj9r50001qgbvc5p3w8x1
```

### Respuesta Esperada

```json
[
  {
    "id": "cuid-order-001",
    "orderNumber": "ORD-2025-000001",
    "status": "PENDING",
    "ticket": {
      "ticketNumber": "TKT-2025-000001",
      "lines": [
        {
          "product": {
            "name": "Cappuccino"
          },
          "quantity": 2,
          "modifiers": [...]
        }
      ]
    },
    "items": [...]
  }
]
```

---

## 3️⃣ Iniciar Preparación (Cocinero)

### Endpoint

```http
POST http://localhost:4000/pos/orders/{orderId}/start
```

### Respuesta

```json
{
  "id": "cuid-order-001",
  "status": "IN_PROGRESS",
  "startedAt": "2025-11-01T14:35:00.000Z"
}
```

---

## 4️⃣ Marcar Orden Lista

### Endpoint

```http
POST http://localhost:4000/pos/orders/{orderId}/ready
```

### Respuesta

```json
{
  "id": "cuid-order-001",
  "status": "READY",
  "readyAt": "2025-11-01T14:38:00.000Z",
  "prepTimeActual": 180
}
```

---

## 5️⃣ Marcar Orden Servida

### Endpoint

```http
POST http://localhost:4000/pos/orders/{orderId}/served
```

### Respuesta

```json
{
  "id": "cuid-order-001",
  "status": "SERVED",
  "servedAt": "2025-11-01T14:40:00.000Z"
}
```

---

## 6️⃣ Cerrar Ticket (Después de pagar)

### Endpoint

```http
PATCH http://localhost:4000/pos/tickets/{ticketId}/close
```

### Respuesta

```json
{
  "id": "cuid-ticket-001",
  "status": "CLOSED",
  "closedAt": "2025-11-01T14:42:00.000Z",
  "orders": [
    {
      "status": "SERVED"
    }
  ]
}
```

---

## 📊 Verificar Relaciones

### Ticket → Order

```http
GET http://localhost:4000/pos/tickets/{ticketId}
```

Debe mostrar:

- `orders[]` - Array de órdenes creadas para este ticket
- Cada order tiene `ticketId` apuntando al ticket

### Order → Ticket

```http
GET http://localhost:4000/pos/orders/{orderId}
```

Debe mostrar:

- `ticket` - Objeto con información del ticket
- `ticket.lines` - Productos vendidos

---

## 🧪 Pruebas con cURL

### 1. Crear Ticket

```bash
curl -X POST http://localhost:4000/pos/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "cm2zkj9r50001qgbvc5p3w8x1",
    "userId": "cm2zkj9ra0006qgbvzq8m4n2p",
    "lines": [
      {
        "productId": "prod-cappuccino",
        "quantity": 2,
        "unitPrice": 55.0
      }
    ]
  }'
```

### 2. Listar Órdenes

```bash
curl http://localhost:4000/pos/orders?locationId=cm2zkj9r50001qgbvc5p3w8x1
```

### 3. Iniciar Orden

```bash
curl -X POST http://localhost:4000/pos/orders/{ORDER_ID}/start
```

---

## ✅ Checklist de Validación

- [ ] POST /pos/tickets crea un ticket
- [ ] Ticket tiene un Order automáticamente creado
- [ ] GET /pos/orders lista las órdenes
- [ ] Orden tiene relación con Ticket
- [ ] POST /pos/orders/:id/start cambia status a IN_PROGRESS
- [ ] POST /pos/orders/:id/ready cambia status a READY
- [ ] POST /pos/orders/:id/served cambia status a SERVED
- [ ] PATCH /pos/tickets/:id/close cierra el ticket
- [ ] Las relaciones Ticket ↔ Order funcionan correctamente

---

## 🐛 Errores Comunes

### Error: Cannot connect to database

**Solución**: Asegúrate que Docker está corriendo y PostgreSQL en puerto 5434

### Error: Location/User not found

**Solución**: Ejecuta el seed primero con `npx tsx scripts/seed-sandbox.ts`

### Error: Product not found

**Solución**: Verifica que los IDs de productos en el body sean correctos

### Error: JWT Guard blocking requests

**Solución temporal**: Comenta el JWT Guard en app.module.ts para pruebas
