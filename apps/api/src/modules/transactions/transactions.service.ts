import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const { lineItems, ...transactionData } = createTransactionDto;

    // Verify all products exist
    if (lineItems && lineItems.length > 0) {
      const productIds = lineItems.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products not found');
      }
    }

    return this.prisma.transaction.create({
      data: {
        ...transactionData,
        status: TransactionStatus.PENDING,
        lineItems: lineItems
          ? {
              create: lineItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                modifiers: item.modifiers || [],
                notes: item.notes,
              })),
            }
          : undefined,
      },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });
  }

  async findAll(query: QueryTransactionsDto) {
    const { skip = 0, take = 50, status, startDate, endDate } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          lineItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findByStatus(status: string) {
    return this.prisma.transaction.findMany({
      where: { status: status as TransactionStatus },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    return this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async calculateTotal(id: string) {
    const transaction = await this.findOne(id);

    let subtotal = 0;
    const lineItemsDetail = [];

    for (const item of transaction.lineItems) {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      lineItemsDetail.push({
        product: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
        modifiers: item.modifiers,
      });
    }

    const tax = transaction.taxAmount || 0;
    const discount = transaction.discountAmount || 0;
    const total = subtotal + tax - discount;

    const totalPaid = transaction.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    return {
      transactionId: transaction.id,
      status: transaction.status,
      subtotal,
      tax,
      discount,
      total,
      totalPaid,
      balance: total - totalPaid,
      lineItems: lineItemsDetail,
      currency: 'MXN',
    };
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Cannot update completed transaction');
    }

    const { lineItems, ...transactionData } = updateTransactionDto;

    // If updating line items, delete old ones and create new ones
    if (lineItems && lineItems.length > 0) {
      const productIds = lineItems.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products not found');
      }

      await this.prisma.transactionLineItem.deleteMany({
        where: { transactionId: id },
      });
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...transactionData,
        lineItems: lineItems
          ? {
              create: lineItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                modifiers: item.modifiers || [],
                notes: item.notes,
              })),
            }
          : undefined,
      },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });
  }

  async cancel(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot cancel completed transaction. Use refund instead.',
      );
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });
  }

  async complete(id: string) {
    const transaction = await this.findOne(id);

    // Calculate total
    const totals = await this.calculateTotal(id);

    if (totals.balance > 0) {
      throw new BadRequestException(
        'Cannot complete transaction with outstanding balance',
      );
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });
  }

  async remove(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
            lineItems: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete completed transaction');
    }

    // Delete line items first
    await this.prisma.transactionLineItem.deleteMany({
      where: { transactionId: id },
    });

    // Delete payments
    await this.prisma.payment.deleteMany({
      where: { transactionId: id },
    });

    // Delete transaction
    await this.prisma.transaction.delete({
      where: { id },
    });
  }
}
