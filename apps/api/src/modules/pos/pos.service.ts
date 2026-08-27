import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  fechaEnZona,
  rangoDelDia,
  rangoEntreDias,
  ZONA_POR_DEFECTO,
} from '../../common/time/day-range';
import { zonaDelNegocio } from '../../common/time/zona-negocio';
import { PrismaService } from '../database/prisma.service';
import { InventoryAutomationService } from '../inventory/inventory-automation.service';
import { MovementType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

/** Estados que representan una venta consumada y disparan el descuento de insumos. */
const DEDUCTING_ORDER_STATUSES = ['SERVED', 'COMPLETED'];

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  // Loyalty 9+1 reward — TODO: source threshold/value from per-org config
  // (LoyaltyReward) instead of these hardcoded constants.
  private static readonly LOYALTY_REDEMPTION_THRESHOLD_POINTS = 9;
  private static readonly LOYALTY_REDEMPTION_DISCOUNT = 50;

  constructor(
    private prisma: PrismaService,
    private readonly inventoryAutomation: InventoryAutomationService,
  ) {}

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

  /**
   * El numero que se imprime en el ticket del cliente.
   *
   * Con `toISOString()` llevaba la fecha UTC: una venta de las 19:25 salia
   * numerada como del dia siguiente, y asi estan seis tickets de la tarde del
   * 26 de agosto en la base de desarrollo, sellados `TKT-20260827`.
   *
   * Se usa la zona por defecto y no la de la organizacion a proposito: esto
   * corre en el camino de cada venta y no merece una consulta mas. El dia con
   * el que se cuadran los informes sale de `openedAt`/`closedAt`, que si se
   * recortan con la zona configurada.
   */
  private generateTicketNumber(): string {
    const date = fechaEnZona(new Date(), ZONA_POR_DEFECTO).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(-8);
    return `TKT-${date}-${suffix}`;
  }

  private generateOrderNumber(): string {
    const date = fechaEnZona(new Date(), ZONA_POR_DEFECTO).replace(/-/g, '');
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
    clientRequestId?: string;
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
    discount?: number;
    redeemLoyalty?: boolean;
    notes?: string;
  }) {
    // Idempotencia del reenvio offline: si esta venta ya se creo con la misma
    // clave, se devuelve la que hay en vez de cobrarla otra vez. La cola de
    // sincronizacion reintenta lo que fallo y no distingue "no se creo" de "se
    // creo y no me entere" cuando la red cae despues de la respuesta.
    if (data.clientRequestId) {
      const existente = await this.prisma.ticket.findUnique({
        where: { clientRequestId: data.clientRequestId },
        select: { id: true },
      });
      if (existente) {
        this.logger.log(
          `Reenvio idempotente: la venta ${data.clientRequestId} ya existe`,
        );
        return this.findOneTicket(existente.id);
      }
    }

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

    // Round money to 2 decimals to avoid binary-float cent drift accumulating
    // into the persisted ticket subtotal/tax/total.
    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

    // Calculate totals — tax applies to lineTotal + modifiers (per product taxRate).
    let subtotal = 0;
    let tax = 0;
    const lines = data.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const modifiersTotal =
        line.modifiers?.reduce((sum, m) => sum + m.priceDelta, 0) || 0;
      const lineTotal = round2(lineSubtotal + modifiersTotal * line.quantity);
      subtotal += lineTotal;
      const taxRate = productTaxRates.get(line.productId) ?? 0.16;
      // IVA sobre (lineTotal + modificadores ya incluidos); los modificadores
      // heredan la tasa del producto. Se acumula SIN descuento todavía: la
      // base gravable definitiva no se conoce hasta que se cierra el descuento
      // dentro de la transacción, porque el canje de lealtad se calcula ahí.
      tax += lineTotal * taxRate;
      return {
        ...line,
        total: lineTotal,
      };
    });

    subtotal = round2(subtotal);
    tax = round2(tax);
    const baseDiscount = data.discount ?? 0;

    // Race-free ticket number (no count+1).
    const ticketNumber = this.generateTicketNumber();

    // Wrap ticket creation, loyalty redemption and kitchen-order creation in
    // ONE transaction so the discount, the points decrement and the audit
    // LoyaltyTransaction are all-or-nothing.
    // El chequeo de idempotencia de arriba es check-then-act: dos reenvios
    // concurrentes lo pasan los dos. La garantia la da el indice unico sobre
    // client_request_id; aqui solo se traduce su violacion en la respuesta que
    // el cliente esperaba, en vez de un 500.
    let createdTicket;
    try {
      createdTicket = await this.prisma.$transaction(async (tx) => {
        // Loyalty 9+1 redemption is computed and the points decremented
        // SERVER-SIDE here (never trusting a client-supplied amount), so a
        // customer cannot redeem without enough points or redeem twice.
        let discount = baseDiscount;
        let loyalty: {
          points: number;
          balanceAfter: number;
          organizationId: string;
        } | null = null;
        if (data.redeemLoyalty) {
          if (!data.customerId) {
            throw new BadRequestException(
              'Se requiere un cliente para canjear puntos de lealtad',
            );
          }
          const customer = await tx.customer.findUnique({
            where: { id: data.customerId },
            select: { loyaltyPoints: true, organizationId: true },
          });
          if (!customer) throw new NotFoundException('Cliente no encontrado');
          if (
            customer.loyaltyPoints <
            PosService.LOYALTY_REDEMPTION_THRESHOLD_POINTS
          ) {
            throw new BadRequestException(
              `El cliente no tiene suficientes puntos de lealtad (requiere ${PosService.LOYALTY_REDEMPTION_THRESHOLD_POINTS})`,
            );
          }
          discount = round2(discount + PosService.LOYALTY_REDEMPTION_DISCOUNT);
          loyalty = {
            points: PosService.LOYALTY_REDEMPTION_THRESHOLD_POINTS,
            balanceAfter:
              customer.loyaltyPoints -
              PosService.LOYALTY_REDEMPTION_THRESHOLD_POINTS,
            organizationId: customer.organizationId,
          };
        }

        // El descuento reduce la BASE GRAVABLE: el IVA se calcula sobre el
        // importe ya descontado.
        //
        // Antes no era así: el IVA se cerraba sobre el subtotal completo y el
        // descuento se restaba después, de modo que una venta con el canje de
        // lealtad de $50 cobraba $8 de IVA que no correspondían. Y el carrito del
        // POS sí descontaba antes de calcular, así que al cajero le aparecía un
        // total y se le cobraba otro al cliente.
        //
        // El descuento se reparte proporcionalmente entre las líneas, que es lo
        // que hay que hacer cuando conviven varias tasas: con una sola tasa el
        // resultado es exactamente `(subtotal - descuento) * tasa`.
        const baseRatio =
          subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 0;
        const taxAfterDiscount = round2(tax * baseRatio);

        const total = round2(
          Math.max(0, subtotal - discount + taxAfterDiscount),
        );

        const ticket = await tx.ticket.create({
          data: {
            ticketNumber,
            clientRequestId: data.clientRequestId ?? null,
            locationId: data.locationId,
            userId: data.userId,
            customerId: data.customerId,
            status: 'OPEN',
            subtotal,
            tax: taxAfterDiscount,
            discount,
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

        if (loyalty && data.customerId) {
          // Race-safe decrement: only deduct if the balance still covers it, so
          // two concurrent redemptions for the same customer can't both succeed.
          const decremented = await tx.customer.updateMany({
            where: {
              id: data.customerId,
              loyaltyPoints: {
                gte: PosService.LOYALTY_REDEMPTION_THRESHOLD_POINTS,
              },
            },
            data: {
              loyaltyPoints: {
                decrement: PosService.LOYALTY_REDEMPTION_THRESHOLD_POINTS,
              },
            },
          });
          if (decremented.count === 0) {
            throw new BadRequestException(
              'Los puntos de lealtad cambiaron; vuelve a intentar el canje',
            );
          }
          await tx.loyaltyTransaction.create({
            data: {
              customerId: data.customerId,
              organizationId: loyalty.organizationId,
              type: 'REDEEM',
              points: loyalty.points,
              orderId: ticket.id,
              orderTotal: total,
              description: 'Canje 9+1 en venta',
              balanceAfter: loyalty.balanceAfter,
            },
          });
        }

        // Auto-create kitchen Order inside the same transaction.
        await this.createOrderFromTicketTx(tx, ticket);

        return ticket;
      });
    } catch (err: any) {
      if (
        err?.code === 'P2002' &&
        String(err?.meta?.target ?? '').includes('client_request_id') &&
        data.clientRequestId
      ) {
        const ganador = await this.prisma.ticket.findUnique({
          where: { clientRequestId: data.clientRequestId },
          select: { id: true },
        });
        if (ganador) {
          this.logger.log(
            `Reenvio idempotente: otra peticion creo ${data.clientRequestId} primero`,
          );
          return this.findOneTicket(ganador.id);
        }
      }
      throw err;
    }

    return this.findOneTicket(createdTicket.id);
  }

  async closeTicket(
    id: string,
    payments?: Array<{
      method: PaymentMethod;
      amount: number;
      reference?: string;
    }>,
    organizationId?: string,
  ) {
    const closed = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { lines: { include: { product: true } } },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Only OPEN tickets can be closed (blocks re-closing CLOSED tickets and
      // closing VOIDED/REFUNDED tickets, which would corrupt inventory).
      if (ticket.status !== 'OPEN') {
        throw new BadRequestException(
          `Cannot close ticket with status ${ticket.status}; only OPEN tickets can be closed`,
        );
      }

      // Register payments (breakdown comes from the POS frontend).
      if (payments && payments.length > 0) {
        await tx.payment.createMany({
          data: payments.map((p) => ({
            ticketId: ticket.id,
            method: p.method,
            amount: p.amount,
            reference: p.reference,
            status: PaymentStatus.COMPLETED,
          })),
        });
      }

      // El descuento de inventario NO va aquí. Vivía en este bucle, con una
      // implementación propia que ignoraba `recipe.yield`, no convertía
      // unidades, no redondeaba (dejaba 6.964000000000001), no tenía
      // idempotencia y descontaba aunque el flag estuviera apagado. Ahora lo
      // hace InventoryAutomationService después de commitear, que es la única
      // implementación y trae todas esas garantías.

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

    // El cobro es el momento en que la venta se consuma, así que es cuando se
    // descuentan los insumos. Va FUERA de la transacción a propósito: si el
    // inventario no cuadra, el cobro ya ocurrió y el software tiene que
    // registrarlo igual — ver `autoDeductOnSale`, que nunca lanza.
    //
    // La orden sigue PENDING en cocina; `requireSaleStatus: false` dice que la
    // autorización aquí es el ticket pagado, no el estado del KDS. Si después
    // alguien lleva la orden a SERVED, ese segundo intento devuelve `skipped`:
    // la idempotencia la garantiza el índice único de la base.
    if (organizationId) {
      const inventory = await Promise.all(
        (closed.orders ?? []).map((order) =>
          this.inventoryAutomation.autoDeductOnSale(order.id, organizationId, {
            requireSaleStatus: false,
          }),
        ),
      );
      return { ...closed, inventory_deduction: inventory[0] ?? null };
    }

    return closed;
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

  async findOneOrder(id: string, organizationId?: string) {
    // Order deriva su organización de la sucursal a través de la relación
    // `location`: se filtra en la misma consulta, sin traer antes el conjunto
    // de sucursales de la organización.
    return this.prisma.order.findFirst({
      where: {
        id,
        ...(organizationId ? { location: { organizationId } } : {}),
      },
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

  /**
   * Comprueba que la orden pertenece a la organización antes de mutarla.
   *
   * Estos endpoints del KDS recibían sólo el id y actualizaban por
   * `prisma.order.update({ where: { id } })`, así que cualquier usuario
   * autenticado podía mover de estado la orden de otra organización. La
   * pertenencia se resuelve por la sucursal, igual que en `findOneOrder`.
   */
  private async assertOrderInOrg(id: string, organizationId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, location: { organizationId } },
      select: { id: true, status: true, startedAt: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async updateOrderStatus(id: string, status: string, organizationId: string) {
    await this.assertOrderInOrg(id, organizationId);

    const order = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        items: true,
        ticket: true,
      },
    });

    return this.withAutoDeduction(order, organizationId);
  }

  async startOrder(id: string, organizationId: string) {
    await this.assertOrderInOrg(id, organizationId);

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: { items: true },
    });
  }

  async markOrderReady(id: string, organizationId: string) {
    const order = await this.assertOrderInOrg(id, organizationId);

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

  async markOrderServed(id: string, organizationId: string) {
    await this.assertOrderInOrg(id, organizationId);

    const order = await this.prisma.order.update({
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

    return this.withAutoDeduction(order, organizationId);
  }

  /**
   * Dispara el descuento automático de insumos cuando la orden llega a un
   * estado de venta consumada, y adjunta el resultado a la respuesta.
   *
   * Antes esto no lo llamaba nadie: `deductForOrder` sólo era alcanzable por su
   * propio endpoint y el hook del frontend que debía invocarlo estaba huérfano,
   * así que el POS informaba `enabled: true` y no descontaba nunca.
   *
   * No comparte transacción con el cambio de estado a propósito: ver
   * `InventoryAutomationService.autoDeductOnSale`.
   */
  private async withAutoDeduction<T extends { id: string; status: string }>(
    order: T,
    organizationId: string,
  ) {
    if (!DEDUCTING_ORDER_STATUSES.includes(order.status)) {
      return order;
    }
    const inventory = await this.inventoryAutomation.autoDeductOnSale(
      order.id,
      organizationId,
    );
    return { ...order, inventory_deduction: inventory };
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
    // «Hoy» es el dia de la cafeteria. `setHours` usaba el del servidor, que en
    // un contenedor es UTC: la jornada empezaba a las 18:00 del dia anterior.
    const zona = await zonaDelNegocio(this.prisma, { organizationId });
    const hoy = rangoDelDia(undefined, zona)!;

    return this.prisma.ticket.findMany({
      where: {
        location: { organizationId },
        openedAt: hoy,
      },
      include: { lines: true, payments: true },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findOrdersByOrgAndDateRange(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Antes el final del dia se estiraba con `setUTCHours` y el principio se
    // quedaba en medianoche UTC: el rango era un dia UTC, que en Mexico va de
    // las 18:00 a las 18:00. Las ventas de la tarde entraban en el informe del
    // dia siguiente.
    const zona = await zonaDelNegocio(this.prisma, { organizationId });
    const rango = rangoEntreDias(startDate, endDate, zona);

    if (!rango) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    const { gte: start, lte: end } = rango;

    return this.prisma.ticket.findMany({
      where: {
        location: { organizationId },
        openedAt: { gte: start, lte: end },
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
      // Only CLOSED tickets can be refunded: an OPEN ticket never decremented
      // inventory (closing does that), so refunding it would inflate stock.
      if (ticket.status !== 'CLOSED') {
        throw new BadRequestException(
          `Cannot refund ticket with status ${ticket.status}; only CLOSED tickets can be refunded`,
        );
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

      // Inventory reversal policy: ONLY a TOTAL refund (amount === total)
      // restores inventory. A partial refund does NOT revert inventory because
      // we cannot attribute the refunded amount to specific lines/ingredients.
      const isTotalRefund = amount === ticket.total;

      // Revert inventory via InventoryMovement (IN, reason=REFUND).
      // TODO: persist Refund records in a dedicated Refund table once added to
      // the Prisma schema. For now we capture the refund event in the ticket's
      // notes field plus IN movements.
      if (isTotalRefund) {
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
            `${this.escapeHtml(l.quantity)}x ${this.escapeHtml(
              l.product?.name ?? 'Item',
            )} — $${this.escapeHtml(l.total)}`,
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
    // El corte de caja. Mezclaba `new Date('2026-08-27')` —medianoche UTC— con
    // `setHours` —hora del proceso—, asi que el dia salia corrido en cuanto las
    // dos zonas no coincidian. Ahora se recorta en la de la cafeteria.
    const zona = await zonaDelNegocio(this.prisma, { organizationId });
    const dia = rangoDelDia(date, zona);

    if (!dia) {
      throw new BadRequestException('Invalid date');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        location: { organizationId },
        status: 'CLOSED',
        closedAt: dia,
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
      // El dia que se devuelve es el que se acaba de sumar, dicho en la zona de
      // la cafeteria. Con `toISOString()` el corte de la tarde se anunciaba con
      // la fecha del dia siguiente.
      date: fechaEnZona(dia.gte, zona),
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
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cashRegister.findUnique({
        where: { id: registerId },
        include: { shift: true },
      });
      if (!existing) {
        throw new NotFoundException(`Cash register ${registerId} not found`);
      }

      // Double-close guard: the associated shift must still be open.
      if (
        existing.shift?.status === 'CLOSED' ||
        existing.shift?.closedAt != null
      ) {
        throw new BadRequestException('Cash register is already closed');
      }

      const closedAt = new Date();

      const register = await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          countedCash: finalAmount,
          notes,
        },
      });

      await tx.shift.update({
        where: { id: register.shiftId },
        data: {
          status: 'CLOSED',
          closedAt,
          countedCash: finalAmount,
        },
      });

      const difference = finalAmount - (register.expectedCash || 0);
      return { id: register.id, closed_at: closedAt, difference };
    });
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
