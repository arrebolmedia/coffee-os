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

  async create(createOrderDto: CreateOrderDto) {
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

  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto) {
    await this.findOne(id);

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
