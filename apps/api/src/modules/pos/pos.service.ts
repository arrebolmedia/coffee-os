import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MovementType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(private prisma: PrismaService) {}

  // ========================================
  // TICKETS (POS)
  // ========================================

  async findAllTickets(locationId: string) {
    return this.prisma.ticket.findMany({
      where: { locationId },
      include: {
        lines: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
        payments: true,
        orders: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findOneTicket(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
        payments: true,
        orders: {
          include: {
            items: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: true,
      },
    });
  }

  private generateTicketNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(-8);
    return `TKT-${date}-${suffix}`;
  }

  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(-8);
    return `ORD-${date}-${suffix}`;
  }

  private escapeHtml(value: unknown): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(value ?? '').replace(/[&<>"']/g, (c) => map[c]);
  }

  async createTicket(data: {
    locationId: string;
    userId: string;
    customerId?: string;
    lines: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{ modifierId: string; priceDelta: number }>;
      notes?: string;
    }>;
    notes?: string;
  }) {
    // Fetch taxRate per product to compute tax correctly
    const productTaxRates = new Map<string, number>();
    for (const line of data.lines) {
      if (!productTaxRates.has(line.productId)) {
        const product = await this.prisma.product.findUnique({
          where: { id: line.productId },
          select: { taxRate: true },
        });
        productTaxRates.set(line.productId, product?.taxRate ?? 0.16);
      }
    }

    // Calculate totals — tax applies to lineTotal + modifiers (per product taxRate).
    let subtotal = 0;
    let tax = 0;
    const lines = data.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const modifiersTotal =
        line.modifiers?.reduce((sum, m) => sum + m.priceDelta, 0) || 0;
      const lineTotal = lineSubtotal + modifiersTotal * line.quantity;
      subtotal += lineTotal;
      const taxRate = productTaxRates.get(line.productId) ?? 0.16;
      // Tax over (lineTotal + modifiers already included) — modifiers inherit
      // product taxRate.
      tax += lineTotal * taxRate;
      return {
        ...line,
        total: lineTotal,
      };
    });

    const total = subtotal + tax;

    // Race-free ticket number (no count+1).
    const ticketNumber = this.generateTicketNumber();

    // Wrap ticket creation and kitchen-order creation in a transaction.
    const createdTicket = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          locationId: data.locationId,
          userId: data.userId,
          customerId: data.customerId,
          status: 'OPEN',
          subtotal,
          tax,
          total,
          notes: data.notes,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              total: line.total,
              notes: line.notes,
              modifiers: line.modifiers
                ? {
                    create: line.modifiers.map((mod) => ({
                      modifierId: mod.modifierId,
                      priceDelta: mod.priceDelta,
                    })),
                  }
                : undefined,
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

      // Auto-create kitchen Order inside the same transaction.
      await this.createOrderFromTicketTx(tx, ticket);

      return ticket;
    });

    return this.findOneTicket(createdTicket.id);
  }

  async closeTicket(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { lines: { include: { product: true } } },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Idempotency guard — can't re-close a CLOSED ticket.
      if (ticket.status === 'CLOSED') {
        throw new BadRequestException('Ticket ya cerrado');
      }

      // Decrement inventory and record movements inside the transaction.
      for (const line of ticket.lines) {
        const recipe = await tx.recipe.findFirst({
          where: { productId: line.productId, active: true },
          include: { ingredients: true },
          orderBy: { version: 'desc' },
        });

        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            const quantityToDeduct = ingredient.quantity * line.quantity;

            await tx.inventoryItem.update({
              where: { id: ingredient.inventoryItemId },
              data: { currentStock: { decrement: quantityToDeduct } },
            });

            await tx.inventoryMovement.create({
              data: {
                locationId: ticket.locationId,
                inventoryItemId: ingredient.inventoryItemId,
                type: MovementType.OUT,
                quantity: quantityToDeduct,
                reason: `Venta Ticket #${ticket.ticketNumber}`,
                reference: ticket.id,
              },
            });
          }
        } else {
          this.logger.warn(
            `No recipe found for product ${line.product.name} (${line.productId}) - Inventory not deducted`,
          );
        }
      }

      return tx.ticket.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
        include: {
          lines: {
            include: {
              product: true,
              modifiers: { include: { modifier: true } },
            },
          },
          payments: true,
          orders: true,
        },
      });
    });
  }

  // ========================================
  // ORDERS (KDS - Kitchen Display)
  // ========================================

  async findAllOrders(locationId: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        locationId,
        ...(status && { status: status as any }),
      },
      include: {
        items: {
          include: {
            order: {
              include: {
                ticket: {
                  include: {
                    lines: { include: { product: true } },
                  },
                },
              },
            },
          },
        },
        ticket: {
          include: {
            lines: { include: { product: true } },
          },
        },
      },
      orderBy: { orderedAt: 'asc' },
    });
  }

  async findOneOrder(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        ticket: {
          include: {
            lines: {
              include: {
                product: true,
                modifiers: { include: { modifier: true } },
              },
            },
          },
        },
      },
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        items: true,
        ticket: true,
      },
    });
  }

  async startOrder(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: { items: true },
    });
  }

  async completeOrder(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        servedAt: new Date(),
      },
      include: { items: true },
    });
  }

  async markOrderReady(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const prepTime = order.startedAt
      ? Math.floor((Date.now() - order.startedAt.getTime()) / 1000)
      : null;

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'READY',
        readyAt: new Date(),
        prepTimeActual: prepTime,
      },
      include: {
        items: true,
        ticket: true,
      },
    });
  }

  async markOrderServed(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'SERVED',
        servedAt: new Date(),
      },
      include: {
        items: true,
        ticket: true,
      },
    });
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  private async createOrderFromTicketTx(tx: any, ticket: any) {
    const orderNumber = this.generateOrderNumber();

    let totalPrepTime = 0;
    for (const line of ticket.lines) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
      });
      if (product?.preparationTimeMinutes) {
        totalPrepTime += product.preparationTimeMinutes * line.quantity;
      }
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        ticketId: ticket.id,
        locationId: ticket.locationId,
        userId: ticket.userId,
        type: 'DINE_IN',
        status: 'PENDING',
        priority: 'NORMAL',
        prepTimeEstimate: totalPrepTime * 60,
        items: {
          create: ticket.lines.map((line: any) => ({
            productId: line.productId,
            // Schema column is Int — but we don't truncate fractional quantities
            // beyond integer storage; we round-half-up to preserve decimals when
            // possible (kitchen needs whole units).
            quantity: Math.max(1, Math.round(line.quantity)),
            notes: line.notes,
            status: 'PENDING',
          })),
        },
      },
      include: { items: true },
    });

    this.logger.log(`Orden ${order.orderNumber} enviada a cocina`);
    return order;
  }

  // ========================================
  // TODAY'S TICKETS BY ORGANIZATION
  // ========================================

  async findTodayOrdersByOrg(organizationId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.ticket.findMany({
      where: {
        location: { organizationId },
        openedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { lines: true, payments: true },
      orderBy: { openedAt: 'desc' },
    });
  }

  // ========================================
  // CANCEL / REFUND TICKET
  // ========================================

  async cancelTicket(id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { lines: { include: { product: true } } },
      });
      if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
      if (ticket.status === 'VOIDED' || ticket.status === 'REFUNDED') {
        throw new BadRequestException(`Ticket is already ${ticket.status}`);
      }

      const previouslyClosed = ticket.status === 'CLOSED';

      // If ticket had been CLOSED (inventory was decremented), revert inventory.
      if (previouslyClosed) {
        for (const line of ticket.lines) {
          const recipe = await tx.recipe.findFirst({
            where: { productId: line.productId, active: true },
            include: { ingredients: true },
            orderBy: { version: 'desc' },
          });
          if (!recipe) continue;
          for (const ingredient of recipe.ingredients) {
            const quantityToRestore = ingredient.quantity * line.quantity;
            await tx.inventoryItem.update({
              where: { id: ingredient.inventoryItemId },
              data: { currentStock: { increment: quantityToRestore } },
            });
            await tx.inventoryMovement.create({
              data: {
                locationId: ticket.locationId,
                inventoryItemId: ingredient.inventoryItemId,
                type: MovementType.IN,
                quantity: quantityToRestore,
                reason: `CANCEL Ticket #${ticket.ticketNumber}`,
                reference: ticket.id,
              },
            });
          }
        }
      }

      const appendedNote = `\n[CANCELED ${new Date().toISOString()}]: ${reason}`;
      const newNotes = (ticket.notes ?? '') + appendedNote;

      return tx.ticket.update({
        where: { id },
        data: { status: 'VOIDED', notes: newNotes },
      });
    });
  }

  async refundTicket(id: string, reason: string, amount?: number) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { lines: { include: { product: true } } },
      });
      if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
      if (ticket.status === 'VOIDED' || ticket.status === 'REFUNDED') {
        throw new BadRequestException(`Ticket is already ${ticket.status}`);
      }

      if (amount === undefined || amount === null) {
        throw new BadRequestException('Refund amount is required');
      }
      if (amount <= 0) {
        throw new BadRequestException('Refund amount must be greater than 0');
      }
      if (amount > ticket.total) {
        throw new BadRequestException(
          `Refund amount (${amount}) cannot exceed ticket total (${ticket.total})`,
        );
      }

      // Revert inventory via InventoryMovement (IN, reason=REFUND).
      // TODO: persist Refund records in a dedicated Refund table once added to
      // the Prisma schema. For now we capture the refund event in the ticket's
      // notes field plus IN movements.
      for (const line of ticket.lines) {
        const recipe = await tx.recipe.findFirst({
          where: { productId: line.productId, active: true },
          include: { ingredients: true },
          orderBy: { version: 'desc' },
        });
        if (!recipe) continue;
        for (const ingredient of recipe.ingredients) {
          const quantityToRestore = ingredient.quantity * line.quantity;
          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: { currentStock: { increment: quantityToRestore } },
          });
          await tx.inventoryMovement.create({
            data: {
              locationId: ticket.locationId,
              inventoryItemId: ingredient.inventoryItemId,
              type: MovementType.IN,
              quantity: quantityToRestore,
              reason: 'REFUND',
              reference: ticket.id,
            },
          });
        }
      }

      const refundNote = `\n[REFUND ${new Date().toISOString()} amount=${amount}]: ${reason}`;
      const newNotes = (ticket.notes ?? '') + refundNote;

      return tx.ticket.update({
        where: { id },
        data: { status: 'REFUNDED', notes: newNotes },
      });
    });
  }

  // ========================================
  // RECEIPT
  // ========================================

  async getReceipt(id: string) {
    const ticket = await this.findOneTicket(id);
    const lines =
      (ticket as any)?.lines
        ?.map(
          (l: any) =>
            `${this.escapeHtml(l.quantity)}x — $${this.escapeHtml(l.total)}`,
        )
        .join('\n') ?? '';
    const ticketNumber = this.escapeHtml((ticket as any)?.ticketNumber);
    const total = this.escapeHtml((ticket as any)?.total);
    return {
      receipt: `<pre>Ticket: ${ticketNumber}\n${lines}\nTotal: $${total}</pre>`,
    };
  }

  // ========================================
  // PAYMENT METHODS
  // ========================================

  async getPaymentMethods(_organizationId: string) {
    // TODO: replace with prisma.paymentMethod.findMany() once a PaymentMethod
    // table is added to the schema. For now return canonical defaults.
    return ['cash', 'card', 'transfer', 'mixed'];
  }

  // ========================================
  // DAILY STATS
  // ========================================

  async getDailyStats(organizationId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        location: { organizationId },
        status: 'CLOSED',
        closedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { payments: true },
    });

    const total_sales = tickets.reduce(
      (sum: number, t: any) => sum + (Number(t.total) || 0),
      0,
    );
    const total_orders = tickets.length;
    const average_ticket = total_orders > 0 ? total_sales / total_orders : 0;

    const payment_methods: Record<string, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
      mixed: 0,
    };
    for (const ticket of tickets) {
      for (const payment of (ticket as any).payments ?? []) {
        const method = (payment.method as string)?.toLowerCase() ?? 'cash';
        if (method in payment_methods) {
          payment_methods[method] += Number(payment.amount) || 0;
        }
      }
    }

    return {
      date: targetDate.toISOString().split('T')[0],
      total_sales,
      total_orders,
      average_ticket,
      payment_methods,
    };
  }

  // ========================================
  // CASH REGISTER (POS-prefixed routes)
  // ========================================

  async openCashRegisterForOrg(data: {
    organization_id: string;
    initial_amount: number;
    user_id: string;
    location_id?: string;
  }) {
    if (!data.location_id) {
      throw new BadRequestException(
        'location_id is required to open a cash register',
      );
    }

    // Validate location belongs to org
    const location = await this.prisma.location.findFirst({
      where: { id: data.location_id, organizationId: data.organization_id },
    });
    if (!location) {
      throw new NotFoundException(
        `Location ${data.location_id} not found for organization ${data.organization_id}`,
      );
    }

    const shift = await this.prisma.shift.create({
      data: {
        locationId: location.id,
        userId: data.user_id,
        openedAt: new Date(),
        status: 'OPEN',
        shiftNumber: `SHF-${randomUUID().replace(/-/g, '').slice(-8)}`,
        openingFloat: data.initial_amount,
        openingCash: data.initial_amount,
      },
    });

    const register = await this.prisma.cashRegister.create({
      data: {
        shiftId: shift.id,
        locationId: location.id,
        organizationId: data.organization_id,
        expectedCash: data.initial_amount,
      },
    });

    return { id: register.id, opened_at: shift.openedAt };
  }

  async closeCashRegisterById(
    registerId: string,
    finalAmount: number,
    notes?: string,
  ) {
    const register = await this.prisma.cashRegister.update({
      where: { id: registerId },
      data: {
        countedCash: finalAmount,
        notes,
      },
      include: { shift: true },
    });

    await this.prisma.shift.update({
      where: { id: register.shiftId },
      data: { closedAt: new Date(), countedCash: finalAmount },
    });

    const difference = finalAmount - (register.expectedCash || 0);
    return { id: register.id, closed_at: new Date(), difference };
  }

  async getCurrentCashRegister(organizationId: string) {
    const location = await this.prisma.location.findFirst({
      where: { organizationId },
    });
    if (!location) return null;

    return this.prisma.cashRegister.findFirst({
      where: {
        locationId: location.id,
        shift: { closedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: { shift: true },
    });
  }
}
