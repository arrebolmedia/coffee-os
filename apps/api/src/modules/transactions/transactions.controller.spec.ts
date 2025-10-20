import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByStatus: jest.fn(),
    findByDateRange: jest.fn(),
    findOne: jest.fn(),
    calculateTotal: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
    remove: jest.fn(),
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
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 50,
        modifiers: ['mod-1'],
        product: {
          id: 'prod-1',
          name: 'Latte',
          sku: 'LAT-001',
        },
      },
    ],
    payments: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
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

      mockTransactionsService.create.mockResolvedValue(mockTransaction);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTransaction);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const query: QueryTransactionsDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockTransaction],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockTransactionsService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findByStatus', () => {
    it('should return transactions by status', async () => {
      mockTransactionsService.findByStatus.mockResolvedValue([mockTransaction]);

      const result = await controller.findByStatus('PENDING');

      expect(result).toEqual([mockTransaction]);
      expect(service.findByStatus).toHaveBeenCalledWith('PENDING');
    });
  });

  describe('findByDateRange', () => {
    it('should return transactions in date range', async () => {
      mockTransactionsService.findByDateRange.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await controller.findByDateRange(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);

      const result = await controller.findOne('trans-1');

      expect(result).toEqual(mockTransaction);
      expect(service.findOne).toHaveBeenCalledWith('trans-1');
    });
  });

  describe('calculateTotal', () => {
    it('should calculate transaction total', async () => {
      const totalResult = {
        transactionId: 'trans-1',
        status: 'PENDING',
        subtotal: 100,
        tax: 16,
        discount: 0,
        total: 116,
        totalPaid: 0,
        balance: 116,
        lineItems: [],
        currency: 'MXN',
      };

      mockTransactionsService.calculateTotal.mockResolvedValue(totalResult);

      const result = await controller.calculateTotal('trans-1');

      expect(result).toEqual(totalResult);
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const updateDto: UpdateTransactionDto = {
        customerName: 'Jane Doe',
      };

      const updatedTransaction = {
        ...mockTransaction,
        customerName: 'Jane Doe',
      };
      mockTransactionsService.update.mockResolvedValue(updatedTransaction);

      const result = await controller.update('trans-1', updateDto);

      expect(result).toEqual(updatedTransaction);
      expect(service.update).toHaveBeenCalledWith('trans-1', updateDto);
    });
  });

  describe('cancel', () => {
    it('should cancel a transaction', async () => {
      const cancelledTransaction = { ...mockTransaction, status: 'CANCELLED' };
      mockTransactionsService.cancel.mockResolvedValue(cancelledTransaction);

      const result = await controller.cancel('trans-1');

      expect(result.status).toBe('CANCELLED');
      expect(service.cancel).toHaveBeenCalledWith('trans-1');
    });
  });

  describe('complete', () => {
    it('should complete a transaction', async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: 'COMPLETED',
        completedAt: new Date(),
      };
      mockTransactionsService.complete.mockResolvedValue(completedTransaction);

      const result = await controller.complete('trans-1');

      expect(result.status).toBe('COMPLETED');
      expect(service.complete).toHaveBeenCalledWith('trans-1');
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      mockTransactionsService.remove.mockResolvedValue(undefined);

      await controller.remove('trans-1');

      expect(service.remove).toHaveBeenCalledWith('trans-1');
    });
  });
});
