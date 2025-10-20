import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByTransaction: jest.fn(),
    findByMethod: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    refund: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment', async () => {
      const createDto = {
        transactionId: 'txn-1',
        amount: 150.0,
        method: 'CARD' as any,
        reference: 'AUTH123',
      };
      const expectedResult = { id: '1', ...createDto };

      mockPaymentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated payments', async () => {
      const query = { skip: 0, take: 50 };
      const expectedResult = {
        items: [{ id: '1', amount: 150.0 }],
        total: 1,
        skip: 0,
        take: 50,
      };

      mockPaymentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByTransaction', () => {
    it('should return payments for a transaction', async () => {
      const transactionId = 'txn-1';
      const expectedResult = [{ id: '1', transactionId, amount: 150.0 }];

      mockPaymentsService.findByTransaction.mockResolvedValue(expectedResult);

      const result = await controller.findByTransaction(transactionId);

      expect(service.findByTransaction).toHaveBeenCalledWith(transactionId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByMethod', () => {
    it('should return payments by method', async () => {
      const method = 'CARD';
      const expectedResult = [{ id: '1', method, amount: 150.0 }];

      mockPaymentsService.findByMethod.mockResolvedValue(expectedResult);

      const result = await controller.findByMethod(method);

      expect(service.findByMethod).toHaveBeenCalledWith(method);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      const id = '1';
      const expectedResult = { id, amount: 150.0, method: 'CARD' };

      mockPaymentsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a payment', async () => {
      const id = '1';
      const updateDto = { status: 'COMPLETED' as any };
      const expectedResult = { id, ...updateDto };

      mockPaymentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refund', () => {
    it('should refund a payment', async () => {
      const id = '1';
      const expectedResult = { id, status: 'REFUNDED' };

      mockPaymentsService.refund.mockResolvedValue(expectedResult);

      const result = await controller.refund(id);

      expect(service.refund).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete a payment', async () => {
      const id = '1';

      mockPaymentsService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
