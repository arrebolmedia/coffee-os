import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService, OrderStatus, OrderType } from './orders.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
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
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const createDto = {
        type: OrderType.DINE_IN,
        tableNumber: '15',
        customerName: 'Juan Pérez',
      };

      const expectedResult = {
        id: '1',
        ...createDto,
        status: OrderStatus.PENDING,
        orderNumber: 'ORD-20251020-0001',
      };

      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(prisma.order.create).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should validate transaction if provided', async () => {
      const createDto = {
        type: OrderType.DINE_IN,
        transactionId: 'txn-123',
      };

      const transaction = { id: 'txn-123' };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.create.mockResolvedValue({ id: '1' });

      await service.create(createDto);

      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'txn-123' },
      });
    });

    it('should throw BadRequestException if transaction not found', async () => {
      const createDto = {
        type: OrderType.DINE_IN,
        transactionId: 'txn-999',
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Transaction with ID txn-999 not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const query = { skip: 0, take: 50 };
      const orders = [
        { id: '1', orderNumber: 'ORD-001', status: OrderStatus.PENDING },
        { id: '2', orderNumber: 'ORD-002', status: OrderStatus.IN_PROGRESS },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(orders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: orders,
        total: 2,
        skip: 0,
        take: 50,
      });
    });

    it('should filter by status', async () => {
      const query = { skip: 0, take: 50, status: OrderStatus.PENDING };

      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.PENDING },
        }),
      );
    });

    it('should filter by type', async () => {
      const query = { skip: 0, take: 50, type: OrderType.DINE_IN };

      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: OrderType.DINE_IN },
        }),
      );
    });

    it('should filter by table number', async () => {
      const query = { skip: 0, take: 50, tableNumber: '15' };

      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tableNumber: '15' },
        }),
      );
    });
  });

  describe('findByStatus', () => {
    it('should return orders by status', async () => {
      const status = 'PENDING';
      const orders = [{ id: '1', status: OrderStatus.PENDING }];

      mockPrismaService.order.findMany.mockResolvedValue(orders);

      const result = await service.findByStatus(status);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.PENDING },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(result).toEqual(orders);
    });
  });

  describe('findByType', () => {
    it('should return orders by type', async () => {
      const type = 'DINE_IN';
      const orders = [{ id: '1', type: OrderType.DINE_IN }];

      mockPrismaService.order.findMany.mockResolvedValue(orders);

      const result = await service.findByType(type);

      expect(result).toEqual(orders);
    });
  });

  describe('findByTable', () => {
    it('should return orders by table number', async () => {
      const tableNumber = '15';
      const orders = [{ id: '1', tableNumber }];

      mockPrismaService.order.findMany.mockResolvedValue(orders);

      const result = await service.findByTable(tableNumber);

      expect(result).toEqual(orders);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const id = '1';
      const order = { id, orderNumber: 'ORD-001' };

      mockPrismaService.order.findUnique.mockResolvedValue(order);

      const result = await service.findOne(id);

      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order not found', async () => {
      const id = '1';

      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        'Order with ID 1 not found',
      );
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const id = '1';
      const updateDto = { specialInstructions: 'Sin cebolla' };
      const existingOrder = { id, status: OrderStatus.PENDING };
      const updatedOrder = { ...existingOrder, ...updateDto };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.update(id, updateDto);

      expect(result).toEqual(updatedOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      const id = '1';

      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.update(id, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is served', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.SERVED };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.update(id, {})).rejects.toThrow(BadRequestException);
      await expect(service.update(id, {})).rejects.toThrow(
        'Cannot update served order',
      );
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.CANCELLED };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.update(id, {})).rejects.toThrow(BadRequestException);
      await expect(service.update(id, {})).rejects.toThrow(
        'Cannot update cancelled order',
      );
    });
  });

  describe('startOrder', () => {
    it('should start a pending order', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.PENDING };
      const updatedOrder = { id, status: OrderStatus.IN_PROGRESS };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.startOrder(id);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status: OrderStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(updatedOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      const id = '1';

      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.startOrder(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is not pending', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.IN_PROGRESS };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.startOrder(id)).rejects.toThrow(BadRequestException);
      await expect(service.startOrder(id)).rejects.toThrow(
        'Can only start orders with PENDING status',
      );
    });
  });

  describe('markReady', () => {
    it('should mark an in-progress order as ready', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.IN_PROGRESS };
      const updatedOrder = { id, status: OrderStatus.READY };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.markReady(id);

      expect(result).toEqual(updatedOrder);
    });

    it('should throw BadRequestException if order is not in progress', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.PENDING };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.markReady(id)).rejects.toThrow(BadRequestException);
      await expect(service.markReady(id)).rejects.toThrow(
        'Can only mark orders as ready when IN_PROGRESS',
      );
    });
  });

  describe('markServed', () => {
    it('should mark a ready order as served', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.READY };
      const updatedOrder = { id, status: OrderStatus.SERVED };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.markServed(id);

      expect(result).toEqual(updatedOrder);
    });

    it('should throw BadRequestException if order is not ready', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.IN_PROGRESS };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.markServed(id)).rejects.toThrow(BadRequestException);
      await expect(service.markServed(id)).rejects.toThrow(
        'Can only mark orders as served when READY',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending order', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.PENDING };
      const updatedOrder = { id, status: OrderStatus.CANCELLED };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.cancel(id);

      expect(result).toEqual(updatedOrder);
    });

    it('should throw BadRequestException if order is served', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.SERVED };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.cancel(id)).rejects.toThrow(BadRequestException);
      await expect(service.cancel(id)).rejects.toThrow(
        'Cannot cancel served order',
      );
    });

    it('should throw BadRequestException if order is already cancelled', async () => {
      const id = '1';
      const existingOrder = { id, status: OrderStatus.CANCELLED };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.cancel(id)).rejects.toThrow(BadRequestException);
      await expect(service.cancel(id)).rejects.toThrow(
        'Order is already cancelled',
      );
    });
  });

  describe('remove', () => {
    it('should delete a pending order', async () => {
      const id = '1';
      const order = { id, status: OrderStatus.PENDING };

      mockPrismaService.order.findUnique.mockResolvedValue(order);
      mockPrismaService.order.delete.mockResolvedValue(order);

      await service.remove(id);

      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      const id = '1';

      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is served', async () => {
      const id = '1';
      const order = { id, status: OrderStatus.SERVED };

      mockPrismaService.order.findUnique.mockResolvedValue(order);

      await expect(service.remove(id)).rejects.toThrow(BadRequestException);
      await expect(service.remove(id)).rejects.toThrow(
        'Cannot delete served order. Use cancel instead.',
      );
    });
  });
});
