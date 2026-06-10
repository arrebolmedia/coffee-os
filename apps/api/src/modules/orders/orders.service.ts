import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderPriority, OrderStatus, OrderType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    perPage?: number;
    search?: string;
    status?: string;
    date?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const perPage = params.perPage && params.perPage > 0 ? params.perPage : 10;
    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: Prisma.OrderWhereInput = {};

    if (params.status) {
      if (Object.values(OrderStatus).includes(params.status as OrderStatus)) {
        where.status = params.status as OrderStatus;
      } else {
        throw new BadRequestException('Invalid status');
      }
    }

    if (params.search) {
      where.OR = [
        { orderNumber: { contains: params.search, mode: 'insensitive' } },
        { customerName: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.date) {
      const parsed = new Date(params.date);
      if (!isNaN(parsed.valueOf())) {
        const start = new Date(parsed);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsed);
        end.setHours(23, 59, 59, 999);
        where.orderedAt = { gte: start, lte: end };
      }
    }

    const allowedSortFields: Array<keyof Prisma.OrderOrderByWithRelationInput> =
      ['orderedAt', 'createdAt', 'status', 'priority', 'orderNumber'];
    const sortField = allowedSortFields.includes(params.sortBy as any)
      ? (params.sortBy as keyof Prisma.OrderOrderByWithRelationInput)
      : 'orderedAt';
    const sortOrder: Prisma.SortOrder =
      params.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
        include: { items: true, ticket: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage) || 0;

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages,
      },
    };
  }

  async getStats(startDate?: string, endDate?: string) {
    const where: Prisma.OrderWhereInput = {};

    if (startDate || endDate) {
      const gte = startDate ? new Date(startDate) : undefined;
      const lte = endDate ? new Date(endDate) : undefined;
      where.orderedAt = {
        ...(gte ? { gte } : {}),
        ...(lte ? { lte } : {}),
      };
    }

    const totalsByStatus: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.IN_PROGRESS]: 0,
      [OrderStatus.READY]: 0,
      [OrderStatus.SERVED]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    const statuses = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      where,
    });

    statuses.forEach((item) => {
      totalsByStatus[item.status] = item._count._all;
    });

    const totalOrders = Object.values(totalsByStatus).reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      total: totalOrders,
      byStatus: totalsByStatus,
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, ticket: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async create(createOrderDto: CreateOrderDto, callerOrganizationId?: string) {
    // Validate referenced FKs exist; if a callerOrganizationId is provided,
    // validate that location, ticket, and user all belong to that organization.
    const [location, ticket, user] = await Promise.all([
      this.prisma.location.findUnique({
        where: { id: createOrderDto.locationId },
        select: { id: true, organizationId: true },
      }),
      this.prisma.ticket.findUnique({
        where: { id: createOrderDto.ticketId },
        select: {
          id: true,
          location: { select: { organizationId: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: createOrderDto.userId },
        select: { id: true, organizationId: true },
      }),
    ]);

    if (!location) {
      throw new NotFoundException(
        `Location ${createOrderDto.locationId} not found`,
      );
    }
    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${createOrderDto.ticketId} not found`,
      );
    }
    if (!user) {
      throw new NotFoundException(`User ${createOrderDto.userId} not found`);
    }

    if (callerOrganizationId) {
      const sameOrg =
        location.organizationId === callerOrganizationId &&
        ticket.location?.organizationId === callerOrganizationId &&
        user.organizationId === callerOrganizationId;
      if (!sameOrg) {
        throw new BadRequestException(
          'Location, ticket, and user must belong to the caller organization',
        );
      }
    }

    const orderNumber =
      createOrderDto.orderNumber ||
      `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        locationId: createOrderDto.locationId,
        ticketId: createOrderDto.ticketId,
        userId: createOrderDto.userId,
        assignedToId: createOrderDto.assignedToId,
        type: createOrderDto.type ?? OrderType.DINE_IN,
        status: OrderStatus.PENDING,
        priority: createOrderDto.priority ?? OrderPriority.NORMAL,
        tableNumber: createOrderDto.tableNumber,
        customerName: createOrderDto.customerName,
        notes: createOrderDto.notes,
        specialRequests: createOrderDto.specialRequests,
      },
      include: { items: true, ticket: true },
    });
  }

  /**
   * Allowed state transitions for orders. Source: spec.
   *   PENDING     -> IN_PROGRESS | CANCELLED
   *   IN_PROGRESS -> READY | CANCELLED
   *   READY       -> SERVED | CANCELLED
   *   SERVED      -> COMPLETED | CANCELLED
   *   COMPLETED   -> (terminal)
   *   CANCELLED   -> (terminal)
   */
  private static readonly ORDER_TRANSITIONS: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
    [OrderStatus.IN_PROGRESS]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
    [OrderStatus.SERVED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto) {
    const current = await this.findOne(id);

    const allowed = OrdersService.ORDER_TRANSITIONS[current.status] ?? [];
    if (
      current.status !== updateStatusDto.status &&
      !allowed.includes(updateStatusDto.status)
    ) {
      throw new BadRequestException(
        `Invalid status transition: ${current.status} -> ${updateStatusDto.status}`,
      );
    }

    const data: Prisma.OrderUpdateInput = {
      status: updateStatusDto.status,
    };

    if (updateStatusDto.assignedToId !== undefined) {
      data.assignedToId = updateStatusDto.assignedToId;
    }

    if (updateStatusDto.notes !== undefined) {
      data.notes = updateStatusDto.notes;
    }

    const now = new Date();
    switch (updateStatusDto.status) {
      case OrderStatus.IN_PROGRESS:
        data.startedAt = now;
        break;
      case OrderStatus.READY:
        data.readyAt = now;
        break;
      case OrderStatus.SERVED:
        data.servedAt = now;
        break;
      case OrderStatus.CANCELLED:
        data.canceledAt = now;
        break;
      default:
        break;
    }

    return this.prisma.order.update({
      where: { id },
      data,
      include: { items: true, ticket: true },
    });
  }

  async cancel(id: string, reason?: string) {
    const existing = await this.findOne(id);
    const notes = reason
      ? [existing.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n')
      : existing.notes;

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        canceledAt: new Date(),
        notes,
      },
      include: { items: true, ticket: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.order.delete({ where: { id } });
    return { id, deleted: true };
  }
}
