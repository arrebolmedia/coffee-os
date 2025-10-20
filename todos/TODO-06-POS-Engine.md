# 💳 TODO 06: POS Engine - Tickets y Payments

**Período**: Semana 4  
**Owner**: Full Stack Team  
**Prioridad**: 🔴 CRÍTICA

## 📋 Objetivos

Implementar el motor de ventas (POS Engine) que gestione tickets, líneas de venta, modificadores, múltiples métodos de pago y sincronización offline con cola transaccional.

## ✅ Entregables

### 1. Backend - Tickets System

#### 📊 Schema Prisma

```typescript
model Ticket {
  id              String   @id @default(cuid())
  ticketNumber    String   @unique
  clientUuid      String?  // Para offline sync

  // Importes
  subtotal        Decimal  @db.Decimal(10, 2)
  tax             Decimal  @db.Decimal(10, 2)
  tip             Decimal  @default(0) @db.Decimal(10, 2)
  discount        Decimal  @default(0) @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)

  // Estado
  status          TicketStatus @default(OPEN)
  paymentStatus   PaymentStatus @default(PENDING)

  // Multi-tenant
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  locationId      String
  location        Location @relation(fields: [locationId], references: [id])

  // Usuario y cliente
  userId          String
  user            User @relation(fields: [userId], references: [id])

  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])

  // Líneas de venta
  lines           TicketLine[]

  // Pagos
  payments        Payment[]

  // Facturación
  invoice         Invoice?

  // Metadata
  notes           String?
  metadata        Json?

  createdAt       DateTime @default(now())
  closedAt        DateTime?

  @@index([organizationId, locationId, createdAt])
  @@index([ticketNumber])
  @@map("tickets")
}

enum TicketStatus {
  OPEN
  CLOSED
  VOIDED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  REFUNDED
}

model TicketLine {
  id              String   @id @default(cuid())

  ticketId        String
  ticket          Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  productId       String
  product         Product @relation(fields: [productId], references: [id])

  quantity        Int      @default(1)
  unitPrice       Decimal  @db.Decimal(10, 2)
  subtotal        Decimal  @db.Decimal(10, 2)
  tax             Decimal  @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)

  // Modificadores aplicados
  modifiers       TicketLineModifier[]

  // Descuentos de línea
  discount        Decimal  @default(0) @db.Decimal(10, 2)
  discountReason  String?

  notes           String?

  createdAt       DateTime @default(now())

  @@map("ticket_lines")
}

model TicketLineModifier {
  id              String   @id @default(cuid())

  ticketLineId    String
  ticketLine      TicketLine @relation(fields: [ticketLineId], references: [id], onDelete: Cascade)

  modifierId      String
  modifier        Modifier @relation(fields: [modifierId], references: [id])

  priceDelta      Decimal  @db.Decimal(10, 2)

  @@map("ticket_line_modifiers")
}

model Payment {
  id              String   @id @default(cuid())

  ticketId        String
  ticket          Ticket @relation(fields: [ticketId], references: [id])

  method          PaymentMethod
  amount          Decimal  @db.Decimal(10, 2)

  // Para tarjeta
  reference       String?  // Transaction ID del payment gateway
  authCode        String?
  cardLast4       String?

  // Para efectivo
  received        Decimal? @db.Decimal(10, 2)
  change          Decimal? @db.Decimal(10, 2)

  status          PaymentStatusEnum @default(COMPLETED)

  processedAt     DateTime @default(now())

  @@map("payments")
}

enum PaymentMethod {
  CASH
  CARD
  TRANSFER
  LOYALTY_POINTS
  MIXED
}

enum PaymentStatusEnum {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```

#### 🔧 Tickets Service

```typescript
@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(dto: CreateTicketDto, user: AuthUser): Promise<Ticket> {
    // Generar número de ticket
    const ticketNumber = await this.generateTicketNumber(user.locationId);

    // Calcular totales
    const { subtotal, tax, total } = this.calculateTotals(dto.lines);

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        clientUuid: dto.clientUuid,
        subtotal,
        tax,
        tip: dto.tip || 0,
        discount: dto.discount || 0,
        total: total + (dto.tip || 0) - (dto.discount || 0),
        organizationId: user.organizationId,
        locationId: user.locationId,
        userId: user.id,
        customerId: dto.customerId,
        lines: {
          create: dto.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.quantity * line.unitPrice,
            tax: line.quantity * line.unitPrice * 0.16,
            total: line.quantity * line.unitPrice * 1.16,
            modifiers: line.modifiers
              ? {
                  create: line.modifiers.map((m) => ({
                    modifierId: m.modifierId,
                    priceDelta: m.priceDelta,
                  })),
                }
              : undefined,
            notes: line.notes,
          })),
        },
      },
      include: {
        lines: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
      },
    });

    return ticket;
  }

  async addPayment(
    ticketId: string,
    dto: AddPaymentDto,
    user: AuthUser,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, organizationId: user.organizationId },
      include: { payments: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Ticket already closed');
    }

    // Crear pago
    await this.prisma.payment.create({
      data: {
        ticketId,
        method: dto.method,
        amount: dto.amount,
        reference: dto.reference,
        authCode: dto.authCode,
        cardLast4: dto.cardLast4,
        received: dto.received,
        change: dto.change,
      },
    });

    // Calcular total pagado
    const totalPaid = await this.prisma.payment.aggregate({
      where: { ticketId },
      _sum: { amount: true },
    });

    const paid = totalPaid._sum.amount || 0;

    // Actualizar estado del ticket
    let paymentStatus = PaymentStatus.PARTIAL;
    let ticketStatus = ticket.status;

    if (paid >= ticket.total) {
      paymentStatus = PaymentStatus.PAID;
      ticketStatus = TicketStatus.CLOSED;

      // Descontar inventario
      await this.inventoryService.processTicketInventory(ticketId);

      // Acumular puntos de lealtad
      if (ticket.customerId) {
        await this.loyaltyService.addPoints(ticket.customerId, ticket.total);
      }
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        paymentStatus,
        status: ticketStatus,
        closedAt: ticketStatus === TicketStatus.CLOSED ? new Date() : null,
      },
      include: {
        lines: {
          include: {
            product: true,
            modifiers: { include: { modifier: true } },
          },
        },
        payments: true,
      },
    });
  }

  async void(
    ticketId: string,
    reason: string,
    user: AuthUser,
  ): Promise<Ticket> {
    const ticket = await this.findOne(ticketId, user.organizationId);

    if (ticket.status === TicketStatus.CLOSED) {
      // Revertir inventario si ya se descontó
      await this.inventoryService.revertTicketInventory(ticketId);

      // Revertir puntos de lealtad
      if (ticket.customerId) {
        await this.loyaltyService.removePoints(ticket.customerId, ticket.total);
      }
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.VOIDED,
        notes: `VOID: ${reason}`,
      },
    });
  }

  private calculateTotals(lines: CreateTicketLineDto[]) {
    let subtotal = 0;

    for (const line of lines) {
      const lineSubtotal = line.quantity * line.unitPrice;
      const modifiersTotal =
        line.modifiers?.reduce((sum, m) => sum + m.priceDelta, 0) || 0;
      subtotal += lineSubtotal + modifiersTotal;
    }

    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }

  private async generateTicketNumber(locationId: string): Promise<string> {
    const today = new Date();
    const prefix = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const lastTicket = await this.prisma.ticket.findFirst({
      where: {
        locationId,
        ticketNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}
```

### 2. Frontend - POS Store (Zustand)

#### 🛒 Cart State Management

```typescript
// apps/pos-web/src/stores/posStore.ts
interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  modifiers: Array<{
    modifier: Modifier;
    priceDelta: number;
  }>;
  notes?: string;
  subtotal: number;
  total: number;
}

interface POSStore {
  cart: CartItem[];
  customer?: Customer;
  tip: number;
  discount: number;

  // Actions
  addItem: (product: Product, modifiers?: Modifier[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer) => void;
  setTip: (amount: number) => void;
  setDiscount: (amount: number) => void;

  // Computed
  subtotal: number;
  tax: number;
  total: number;
}

export const usePOSStore = create<POSStore>((set, get) => ({
  cart: [],
  customer: undefined,
  tip: 0,
  discount: 0,

  addItem: (product, modifiers = []) => {
    const id = `${product.id}-${modifiers.map((m) => m.id).join('-')}`;
    const cart = get().cart;
    const existingItem = cart.find((item) => item.id === id);

    if (existingItem) {
      set({
        cart: cart.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      });
    } else {
      const modifiersWithDelta = modifiers.map((m) => ({
        modifier: m,
        priceDelta: m.priceDelta,
      }));

      const subtotal =
        product.price +
        modifiersWithDelta.reduce((sum, m) => sum + m.priceDelta, 0);
      const total = subtotal * 1.16;

      set({
        cart: [
          ...cart,
          {
            id,
            product,
            quantity: 1,
            unitPrice: product.price,
            modifiers: modifiersWithDelta,
            subtotal,
            total,
          },
        ],
      });
    }
  },

  removeItem: (itemId) => {
    set({ cart: get().cart.filter((item) => item.id !== itemId) });
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
    } else {
      set({
        cart: get().cart.map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
        ),
      });
    }
  },

  clearCart: () => {
    set({ cart: [], customer: undefined, tip: 0, discount: 0 });
  },

  setCustomer: (customer) => set({ customer }),
  setTip: (amount) => set({ tip: amount }),
  setDiscount: (amount) => set({ discount: amount }),

  get subtotal() {
    return get().cart.reduce(
      (sum, item) => sum + item.subtotal * item.quantity,
      0,
    );
  },

  get tax() {
    return get().subtotal * 0.16;
  },

  get total() {
    return get().subtotal + get().tax + get().tip - get().discount;
  },
}));
```

### 3. Offline Sync Queue

#### 📦 Sync Queue Implementation

```typescript
// apps/pos-web/src/services/syncQueue.ts
interface QueueItem {
  id: string;
  type: 'CREATE_TICKET' | 'ADD_PAYMENT' | 'VOID_TICKET';
  payload: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retries: number;
  createdAt: Date;
}

export class SyncQueueService {
  async addToQueue(type: QueueItem['type'], payload: any): Promise<void> {
    await db.syncQueue.add({
      type,
      payload,
      status: 'pending',
      retries: 0,
      createdAt: new Date(),
    });
  }

  async processPendingItems(): Promise<void> {
    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    for (const item of pending) {
      try {
        await db.syncQueue.update(item.id, { status: 'syncing' });

        let result;
        switch (item.type) {
          case 'CREATE_TICKET':
            result = await api.post('/tickets', item.payload);
            break;
          case 'ADD_PAYMENT':
            result = await api.post(
              `/tickets/${item.payload.ticketId}/payments`,
              item.payload,
            );
            break;
          case 'VOID_TICKET':
            result = await api.post(
              `/tickets/${item.payload.ticketId}/void`,
              item.payload,
            );
            break;
        }

        await db.syncQueue.update(item.id, { status: 'completed' });
        console.log(`✅ Synced ${item.type}:`, result.data);
      } catch (error) {
        const retries = item.retries + 1;
        const status = retries >= 3 ? 'failed' : 'pending';

        await db.syncQueue.update(item.id, { status, retries });
        console.error(`❌ Sync failed (retry ${retries}/3):`, error);
      }
    }
  }

  async getPendingCount(): Promise<number> {
    return db.syncQueue.where('status').equals('pending').count();
  }
}

export const syncQueue = new SyncQueueService();
```

## 🎯 Criterios de Aceptación

### Functional Requirements

- [ ] ✅ Crear ticket con múltiples líneas + modificadores
- [ ] ✅ Múltiples pagos por ticket (efectivo + tarjeta)
- [ ] ✅ Cálculo automático de impuestos y propinas
- [ ] ✅ Anular tickets con reversión de inventario
- [ ] ✅ Números de ticket secuenciales por día
- [ ] ✅ Asociar cliente para loyalty points

### Offline Support

- [ ] ✅ Cola de sincronización con retry automático (3 intentos)
- [ ] ✅ UUID cliente para deduplicación
- [ ] ✅ Sincronización en background cuando hay conexión
- [ ] ✅ Indicador visual de items pendientes de sync

### Performance

- [ ] ✅ POST /tickets < 200ms
- [ ] ✅ POST /payments < 150ms
- [ ] ✅ Carga inicial cart < 100ms
- [ ] ✅ Soportar 50+ tickets por hora sin degradación

## 🚀 Entregables Finales

### APIs

```bash
POST   /tickets              # Crear ticket
GET    /tickets/:id          # Detalle ticket
POST   /tickets/:id/payments # Agregar pago
POST   /tickets/:id/void     # Anular ticket
GET    /tickets/today        # Tickets del día
```

### Components

- `<Cart />` - Carrito lateral
- `<CartItem />` - Línea de venta
- `<CheckoutModal />` - Modal de pago
- `<PaymentMethod />` - Selector método pago
- `<Receipt />` - Vista previa recibo

---

**⏰ Deadline**: Jueves Semana 4  
**🔗 Depends on**: TODO 04 (Auth), TODO 05 (Products)  
**➡️ Enables**: TODO 07 (POS Web UI)

_The engine that powers sales! 💳🚀_
