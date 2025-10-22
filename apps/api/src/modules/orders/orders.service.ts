import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

export enum OrderStatus {
  PENDING = 'PENDING', // Order created, waiting to be prepared
  IN_PROGRESS = 'IN_PROGRESS', // Being prepared in kitchen
  READY = 'READY', // Ready for pickup/serving
  SERVED = 'SERVED', // Delivered to customer
  CANCELLED = 'CANCELLED', // Cancelled
}

export enum OrderType {
  DINE_IN = 'DINE_IN', // Eat in restaurant
  TAKE_OUT = 'TAKE_OUT', // Take away
  DELIVERY = 'DELIVERY', // Delivery
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    // Verify transaction exists if provided
    if (createOrderDto.transactionId) {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: createOrderDto.transactionId },
      });

      if (!transaction) {
        throw new BadRequestException(
          `Transaction with ID ${createOrderDto.transactionId} not found`,
        );
      }
    }

    return this.prisma.order.create({
      data: {
        ...createOrderDto,
        status: OrderStatus.PENDING,
        orderNumber: await this.generateOrderNumber(),
      },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryOrdersDto) {
    const { skip = 0, take = 50, status, type, tableNumber } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (tableNumber) {
      where.tableNumber = tableNumber;
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          transaction: {
            select: {
              id: true,
              customerName: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findByStatus(status: string) {
    return this.prisma.order.findMany({
      where: { status: status as OrderStatus },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Oldest first for kitchen
      },
    });
  }

  async findByType(type: string) {
    return this.prisma.order.findMany({
      where: { type: type as OrderType },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByTable(tableNumber: string) {
    return this.prisma.order.findMany({
      where: { tableNumber },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status === OrderStatus.SERVED) {
      throw new BadRequestException('Cannot update served order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update cancelled order');
    }

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
    });
  }

  async startOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Can only start orders with PENDING status',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
    });
  }

  async markReady(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Can only mark orders as ready when IN_PROGRESS',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.READY,
        readyAt: new Date(),
      },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
    });
  }

  async markServed(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException(
        'Can only mark orders as served when READY',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.SERVED,
        servedAt: new Date(),
      },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
    });
  }

  async cancel(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status === OrderStatus.SERVED) {
      throw new BadRequestException('Cannot cancel served order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        transaction: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status === OrderStatus.SERVED) {
      throw new BadRequestException(
        'Cannot delete served order. Use cancel instead.',
      );
    }

    await this.prisma.order.delete({
      where: { id },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
        },
      },
    });

    return `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  async getStats(
    organizationId?: string,
    locationId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Build where clause
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (locationId) where.locationId = locationId;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const todayWhere = { ...where, createdAt: { gte: today } };
    const yesterdayWhere = {
      ...where,
      createdAt: { gte: yesterday, lt: today },
    };

    // Get all orders in period
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        transaction: true,
      },
    });

    const todayOrders = await this.prisma.order.findMany({
      where: todayWhere,
      include: {
        transaction: true,
      },
    });

    const yesterdayOrders = await this.prisma.order.findMany({
      where: yesterdayWhere,
      include: {
        transaction: true,
      },
    });

    // Calculate totals
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => {
      return sum + (order.transaction?.total || 0);
    }, 0);
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    const todayOrdersCount = todayOrders.length;
    const todaySales = todayOrders.reduce((sum, order) => {
      return sum + (order.transaction?.total || 0);
    }, 0);

    const yesterdaySales = yesterdayOrders.reduce((sum, order) => {
      return sum + (order.transaction?.total || 0);
    }, 0);

    const growthPercentage =
      yesterdaySales > 0
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
        : todaySales > 0
        ? 100
        : 0;

    // Count by status
    const byStatus = {
      PENDING: 0,
      IN_PROGRESS: 0,
      READY: 0,
      SERVED: 0,
      CANCELLED: 0,
    };
    orders.forEach((order) => {
      if (byStatus[order.status] !== undefined) {
        byStatus[order.status]++;
      }
    });

    // Count by type
    const byType = {
      DINE_IN: 0,
      TAKE_OUT: 0,
      DELIVERY: 0,
    };
    orders.forEach((order) => {
      if (byType[order.type] !== undefined) {
        byType[order.type]++;
      }
    });

    // Count by payment method
    const byPaymentMethod = {
      CASH: 0,
      CARD: 0,
      TRANSFER: 0,
      MIXED: 0,
    };
    orders.forEach((order) => {
      if (order.transaction?.paymentMethod) {
        const method = order.transaction.paymentMethod;
        if (byPaymentMethod[method] !== undefined) {
          byPaymentMethod[method]++;
        }
      }
    });

    // Calculate top products
    const productStats = new Map<
      string,
      { productId: string; productName: string; quantity: number; revenue: number }
    >();

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const existing = productStats.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          productStats.set(item.productId, {
            productId: item.productId,
            productName: item.product?.name || 'Unknown',
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      });
    });

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalOrders,
      totalSales: Math.round(totalSales * 100) / 100,
      averageTicket: Math.round(averageTicket * 100) / 100,
      todayOrders: todayOrdersCount,
      todaySales: Math.round(todaySales * 100) / 100,
      growthPercentage: Math.round(growthPercentage * 100) / 100,
      byStatus,
      byType,
      byPaymentMethod,
      topProducts,
    };
  }
}
