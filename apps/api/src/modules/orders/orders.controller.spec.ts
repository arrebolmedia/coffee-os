import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByStatus: jest.fn(),
    findByType: jest.fn(),
    findByTable: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    startOrder: jest.fn(),
    markReady: jest.fn(),
    markServed: jest.fn(),
    cancel: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const createDto = {
        type: 'DINE_IN' as any,
        tableNumber: '15',
        customerName: 'Juan Pérez',
      };
      const expectedResult = { id: '1', ...createDto, orderNumber: 'ORD-001' };

      mockOrdersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const query = { skip: 0, take: 50 };
      const expectedResult = {
        items: [{ id: '1', orderNumber: 'ORD-001' }],
        total: 1,
        skip: 0,
        take: 50,
      };

      mockOrdersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByStatus', () => {
    it('should return orders by status', async () => {
      const status = 'PENDING';
      const expectedResult = [{ id: '1', status, orderNumber: 'ORD-001' }];

      mockOrdersService.findByStatus.mockResolvedValue(expectedResult);

      const result = await controller.findByStatus(status);

      expect(service.findByStatus).toHaveBeenCalledWith(status);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByType', () => {
    it('should return orders by type', async () => {
      const type = 'DINE_IN';
      const expectedResult = [{ id: '1', type, orderNumber: 'ORD-001' }];

      mockOrdersService.findByType.mockResolvedValue(expectedResult);

      const result = await controller.findByType(type);

      expect(service.findByType).toHaveBeenCalledWith(type);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByTable', () => {
    it('should return orders by table number', async () => {
      const tableNumber = '15';
      const expectedResult = [{ id: '1', tableNumber, orderNumber: 'ORD-001' }];

      mockOrdersService.findByTable.mockResolvedValue(expectedResult);

      const result = await controller.findByTable(tableNumber);

      expect(service.findByTable).toHaveBeenCalledWith(tableNumber);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const id = '1';
      const expectedResult = { id, orderNumber: 'ORD-001', status: 'PENDING' };

      mockOrdersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const id = '1';
      const updateDto = { specialInstructions: 'Sin cebolla' };
      const expectedResult = { id, ...updateDto };

      mockOrdersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('startOrder', () => {
    it('should start an order', async () => {
      const id = '1';
      const expectedResult = { id, status: 'IN_PROGRESS' };

      mockOrdersService.startOrder.mockResolvedValue(expectedResult);

      const result = await controller.startOrder(id);

      expect(service.startOrder).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('markReady', () => {
    it('should mark order as ready', async () => {
      const id = '1';
      const expectedResult = { id, status: 'READY' };

      mockOrdersService.markReady.mockResolvedValue(expectedResult);

      const result = await controller.markReady(id);

      expect(service.markReady).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('markServed', () => {
    it('should mark order as served', async () => {
      const id = '1';
      const expectedResult = { id, status: 'SERVED' };

      mockOrdersService.markServed.mockResolvedValue(expectedResult);

      const result = await controller.markServed(id);

      expect(service.markServed).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('cancel', () => {
    it('should cancel an order', async () => {
      const id = '1';
      const expectedResult = { id, status: 'CANCELLED' };

      mockOrdersService.cancel.mockResolvedValue(expectedResult);

      const result = await controller.cancel(id);

      expect(service.cancel).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete an order', async () => {
      const id = '1';

      mockOrdersService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
