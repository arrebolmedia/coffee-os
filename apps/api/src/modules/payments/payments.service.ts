import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MOBILE = 'MOBILE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Verify transaction exists
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: createPaymentDto.transactionId },
    });

    if (!transaction) {
      throw new BadRequestException(
        `Transaction with ID ${createPaymentDto.transactionId} not found`,
      );
    }

    return this.prisma.payment.create({
      data: {
        ...createPaymentDto,
        status: PaymentStatus.PENDING,
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

  async findAll(query: QueryPaymentsDto) {
    const { skip = 0, take = 50, status, method, transactionId } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (transactionId) {
      where.transactionId = transactionId;
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
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
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findByTransaction(transactionId: string) {
    return this.prisma.payment.findMany({
      where: { transactionId },
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

  async findByMethod(method: string) {
    return this.prisma.payment.findMany({
      where: { method: method as PaymentMethod },
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Cannot update completed payment');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Cannot update refunded payment');
    }

    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
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

  async refund(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot delete completed payment. Use refund instead.',
      );
    }

    await this.prisma.payment.delete({
      where: { id },
    });
  }
}
