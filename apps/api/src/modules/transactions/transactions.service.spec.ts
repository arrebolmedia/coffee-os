import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService, TransactionStatus } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    transactionLineItem: {
      deleteMany: jest.fn(),
    },
    payment: {
      deleteMany: jest.fn(),
    },
  };

  const mockTransaction = {
    id: 'trans-1',
    organizationId: 'org-1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: 'PENDING',
    taxAmount: 16,
    discountAmount: 0,
    notes: 'Table 5',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lineItems: [
      {
        id: 'line-1',
        transactionId: 'trans-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 50,
        modifiers: ['mod-1'],
        notes: null,
        product: {
          id: 'prod-1',
          name: 'Latte',
          sku: 'LAT-001',
        },
      },
    ],
    payments: [],
    _count: {
      payments: 0,
      lineItems: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTransactionDto = {
      customerName: 'John Doe',
      lineItems: [
        {
          productId: 'prod-1',
          quantity: 2,
          unitPrice: 50,
        },
      ],
    };

    it('should create a transaction with line items', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTransaction);
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException if product not found', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const query: QueryTransactionsDto = {
        skip: 0,
        take: 10,
      };

      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockTransaction],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by status', async () => {
      const query: QueryTransactionsDto = {
        skip: 0,
        take: 10,
        status: TransactionStatus.PENDING,
      };

      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TransactionStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const query: QueryTransactionsDto = {
        skip: 0,
        take: 10,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findByStatus', () => {
    it('should return transactions by status', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await service.findByStatus('PENDING');

      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('findByDateRange', () => {
    it('should return transactions in date range', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.findOne('trans-1');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateTotal', () => {
    it('should calculate transaction totals correctly', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.calculateTotal('trans-1');

      expect(result.subtotal).toBe(100); // 2 * 50
      expect(result.tax).toBe(16);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(116); // 100 + 16 - 0
      expect(result.totalPaid).toBe(0);
      expect(result.balance).toBe(116);
    });

    it('should calculate with payments', async () => {
      const transWithPayment = {
        ...mockTransaction,
        payments: [{ id: 'pay-1', amount: 100 }],
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(
        transWithPayment,
      );

      const result = await service.calculateTotal('trans-1');

      expect(result.totalPaid).toBe(100);
      expect(result.balance).toBe(16);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTransactionDto = {
      customerName: 'Jane Doe',
    };

    it('should update a transaction', async () => {
      const updatedTransaction = {
        ...mockTransaction,
        customerName: 'Jane Doe',
      };
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );
      mockPrismaService.transaction.update.mockResolvedValue(
        updatedTransaction,
      );

      const result = await service.update('trans-1', updateDto);

      expect(result.customerName).toBe('Jane Doe');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if transaction is completed', async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      };
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        completedTransaction,
      );

      await expect(service.update('trans-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update line items if provided', async () => {
      const updateWithItems: UpdateTransactionDto = {
        lineItems: [
          {
            productId: 'prod-2',
            quantity: 1,
            unitPrice: 75,
          },
        ],
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );
      mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-2' }]);
      mockPrismaService.transactionLineItem.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.transaction.update.mockResolvedValue(mockTransaction);

      await service.update('trans-1', updateWithItems);

      expect(prisma.transactionLineItem.deleteMany).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a pending transaction', async () => {
      const cancelledTransaction = {
        ...mockTransaction,
        status: TransactionStatus.CANCELLED,
      };
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );
      mockPrismaService.transaction.update.mockResolvedValue(
        cancelledTransaction,
      );

      const result = await service.cancel('trans-1');

      expect(result.status).toBe(TransactionStatus.CANCELLED);
    });

    it('should throw BadRequestException if completed', async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      };
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        completedTransaction,
      );

      await expect(service.cancel('trans-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete a fully paid transaction', async () => {
      const paidTransaction = {
        ...mockTransaction,
        payments: [{ id: 'pay-1', amount: 116 }],
      };
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        paidTransaction,
      );
      mockPrismaService.transaction.update.mockResolvedValue({
        ...paidTransaction,
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
      });

      const result = await service.complete('trans-1');

      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it('should throw BadRequestException if not fully paid', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );

      await expect(service.complete('trans-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a pending transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );
      mockPrismaService.transactionLineItem.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.payment.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.transaction.delete.mockResolvedValue(mockTransaction);

      await service.remove('trans-1');

      expect(prisma.transactionLineItem.deleteMany).toHaveBeenCalled();
      expect(prisma.payment.deleteMany).toHaveBeenCalled();
      expect(prisma.transaction.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException if completed', async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      };
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        completedTransaction,
      );

      await expect(service.remove('trans-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
