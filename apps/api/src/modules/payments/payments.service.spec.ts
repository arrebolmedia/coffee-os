import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentsService,
  PaymentMethod,
  PaymentStatus,
} from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment', async () => {
      const createDto = {
        transactionId: 'txn-1',
        amount: 150.0,
        method: PaymentMethod.CARD,
        reference: 'AUTH123',
      };

      const transaction = { id: 'txn-1', status: 'PENDING' };
      const expectedResult = {
        id: '1',
        ...createDto,
        status: PaymentStatus.PENDING,
        transaction: {
          id: 'txn-1',
          customerName: 'John Doe',
          status: 'PENDING',
        },
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.payment.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
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
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if transaction not found', async () => {
      const createDto = {
        transactionId: 'txn-1',
        amount: 150.0,
        method: PaymentMethod.CARD,
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Transaction with ID txn-1 not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated payments', async () => {
      const query = { skip: 0, take: 50 };
      const payments = [
        { id: '1', amount: 150.0, method: PaymentMethod.CARD },
        { id: '2', amount: 75.0, method: PaymentMethod.CASH },
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(payments);
      mockPrismaService.payment.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: payments,
        total: 2,
        skip: 0,
        take: 50,
      });
    });

    it('should filter by status', async () => {
      const query = { skip: 0, take: 50, status: PaymentStatus.COMPLETED };

      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.payment.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: PaymentStatus.COMPLETED },
        }),
      );
    });

    it('should filter by method', async () => {
      const query = { skip: 0, take: 50, method: PaymentMethod.CARD };

      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.payment.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { method: PaymentMethod.CARD },
        }),
      );
    });

    it('should filter by transactionId', async () => {
      const query = { skip: 0, take: 50, transactionId: 'txn-1' };

      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.payment.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { transactionId: 'txn-1' },
        }),
      );
    });
  });

  describe('findByTransaction', () => {
    it('should return payments for a transaction', async () => {
      const transactionId = 'txn-1';
      const payments = [{ id: '1', transactionId, amount: 150.0 }];

      mockPrismaService.payment.findMany.mockResolvedValue(payments);

      const result = await service.findByTransaction(transactionId);

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
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
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(payments);
    });
  });

  describe('findByMethod', () => {
    it('should return payments by method', async () => {
      const method = 'CARD';
      const payments = [{ id: '1', method, amount: 150.0 }];

      mockPrismaService.payment.findMany.mockResolvedValue(payments);

      const result = await service.findByMethod(method);

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { method: PaymentMethod.CARD },
        include: {
          transaction: {
            select: {
              id: true,
              customerName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(payments);
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      const id = '1';
      const payment = { id, amount: 150.0, method: PaymentMethod.CARD };

      mockPrismaService.payment.findUnique.mockResolvedValue(payment);

      const result = await service.findOne(id);

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { transaction: true },
      });
      expect(result).toEqual(payment);
    });

    it('should throw NotFoundException if payment not found', async () => {
      const id = '1';

      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        'Payment with ID 1 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a payment', async () => {
      const id = '1';
      const updateDto = { status: PaymentStatus.COMPLETED };
      const existingPayment = {
        id,
        status: PaymentStatus.PENDING,
        amount: 150.0,
      };
      const updatedPayment = { ...existingPayment, ...updateDto };

      mockPrismaService.payment.findUnique.mockResolvedValue(existingPayment);
      mockPrismaService.payment.update.mockResolvedValue(updatedPayment);

      const result = await service.update(id, updateDto);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id },
        data: updateDto,
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
      expect(result).toEqual(updatedPayment);
    });

    it('should throw NotFoundException if payment not found', async () => {
      const id = '1';
      const updateDto = { status: PaymentStatus.COMPLETED };

      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if payment is completed', async () => {
      const id = '1';
      const updateDto = { amount: 200.0 };
      const existingPayment = {
        id,
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(existingPayment);

      await expect(service.update(id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(id, updateDto)).rejects.toThrow(
        'Cannot update completed payment',
      );
    });

    it('should throw BadRequestException if payment is refunded', async () => {
      const id = '1';
      const updateDto = { amount: 200.0 };
      const existingPayment = {
        id,
        status: PaymentStatus.REFUNDED,
        amount: 150.0,
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(existingPayment);

      await expect(service.update(id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(id, updateDto)).rejects.toThrow(
        'Cannot update refunded payment',
      );
    });
  });

  describe('refund', () => {
    it('should refund a payment', async () => {
      const id = '1';
      const existingPayment = {
        id,
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
      };
      const refundedPayment = {
        ...existingPayment,
        status: PaymentStatus.REFUNDED,
        refundedAt: expect.any(Date),
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(existingPayment);
      mockPrismaService.payment.update.mockResolvedValue(refundedPayment);

      const result = await service.refund(id);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: expect.any(Date),
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
      expect(result).toEqual(refundedPayment);
    });

    it('should throw NotFoundException if payment not found', async () => {
      const id = '1';

      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.refund(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment is not completed', async () => {
      const id = '1';
      const existingPayment = {
        id,
        status: PaymentStatus.PENDING,
        amount: 150.0,
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(existingPayment);

      await expect(service.refund(id)).rejects.toThrow(BadRequestException);
      await expect(service.refund(id)).rejects.toThrow(
        'Can only refund completed payments',
      );
    });
  });

  describe('remove', () => {
    it('should delete a payment', async () => {
      const id = '1';
      const payment = { id, status: PaymentStatus.PENDING, amount: 150.0 };

      mockPrismaService.payment.findUnique.mockResolvedValue(payment);
      mockPrismaService.payment.delete.mockResolvedValue(payment);

      await service.remove(id);

      expect(prisma.payment.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      const id = '1';

      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment is completed', async () => {
      const id = '1';
      const payment = { id, status: PaymentStatus.COMPLETED, amount: 150.0 };

      mockPrismaService.payment.findUnique.mockResolvedValue(payment);

      await expect(service.remove(id)).rejects.toThrow(BadRequestException);
      await expect(service.remove(id)).rejects.toThrow(
        'Cannot delete completed payment. Use refund instead.',
      );
    });
  });
});
