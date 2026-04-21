import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MovementType } from '@prisma/client';

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
    // Calcular totales
    let subtotal = 0;
    const lines = data.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const modifiersTotal =
        line.modifiers?.reduce((sum, m) => sum + m.priceDelta, 0) || 0;
      const lineTotal = lineSubtotal + modifiersTotal * line.quantity;
      subtotal += lineTotal;
      return {
        ...line,
        total: lineTotal,
      };
    });

    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    // Generar número de ticket
    const count = await this.prisma.ticket.count();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Crear ticket
    const ticket = await this.prisma.ticket.create({
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

    // 🍳 Auto-crear Order para cocina
    await this.createOrderFromTicket(ticket);

    return this.findOneTicket(ticket.id);
  }

  async closeTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Lógica de descuento de inventario
    for (const line of ticket.lines) {
      // Buscar receta activa para el producto
      const recipe = await this.prisma.recipe.findFirst({
        where: {
          productId: line.productId,
          active: true,
        },
        include: { ingredients: true },
        orderBy: { version: 'desc' },
      });

      if (recipe) {
        for (const ingredient of recipe.ingredients) {
          const quantityToDeduct = ingredient.quantity * line.quantity;

          // Actualizar stock
          await this.prisma.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: {
              currentStock: { decrement: quantityToDeduct },
            },
          });

          // Registrar movimiento
          await this.prisma.inventoryMovement.create({
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

    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
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
        payments: true,
        orders: true,
      },
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
                    lines: {
                      include: { product: true },
                    },
                  },
                },
              },
            },
          },
        },
        ticket: {
          include: {
            lines: {
              include: { product: true },
            },
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
                modifiers: {
                  include: { modifier: true },
                },
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

  private async createOrderFromTicket(ticket: any) {
    // Generar número de orden
    const orderCount = await this.prisma.order.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, '0')}`;

    // Estimar tiempo de preparación (suma de prep times de productos)
    let totalPrepTime = 0;
    for (const line of ticket.lines) {
      const product = await this.prisma.product.findUnique({
        where: { id: line.productId },
      });
      if (product?.preparationTimeMinutes) {
        totalPrepTime += product.preparationTimeMinutes * line.quantity;
      }
    }

    // Crear orden para cocina
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        ticketId: ticket.id,
        locationId: ticket.locationId,
        userId: ticket.userId,
        type: 'DINE_IN',
        status: 'PENDING',
        priority: 'NORMAL',
        prepTimeEstimate: totalPrepTime * 60, // convertir a segundos
        items: {
          create: ticket.lines.map((line: any) => ({
            productId: line.productId,
            quantity: Math.floor(line.quantity),
            notes: line.notes,
            status: 'PENDING',
          })),
        },
      },
      include: {
        items: true,
      },
    });

    this.logger.log(`🍳 Orden ${order.orderNumber} enviada a cocina`);
    return order;
  }
}
