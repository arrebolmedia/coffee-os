import { Test, TestingModule } from '@nestjs/testing';
import {
  InventoryMovementsService,
  MovementType,
  MovementReason,
} from './inventory-movements.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    inventoryMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    inventoryItem: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryMovementsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryMovementsService>(InventoryMovementsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory movement (IN)', async () => {
      const createDto = {
        inventoryItemId: 'item-1',
        type: MovementType.IN,
        reason: MovementReason.PURCHASE,
        quantity: 50,
        unitCost: 12.5,
        totalCost: 625.0,
      };

      const inventoryItem = {
        id: 'item-1',
        name: 'Coffee Beans',
        sku: 'CB-001',
      };
      const expectedResult = {
        id: '1',
        ...createDto,
        inventoryItem: {
          id: 'item-1',
          name: 'Coffee Beans',
          sku: 'CB-001',
          currentStock: 100,
        },
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        inventoryItem,
      );
      mockPrismaService.inventoryMovement.create.mockResolvedValue(
        expectedResult,
      );

      const result = await service.create(createDto);

      expect(prisma.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              currentStock: true,
            },
          },
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should create an inventory movement (OUT) with sufficient stock', async () => {
      const createDto = {
        inventoryItemId: 'item-1',
        type: MovementType.OUT,
        reason: MovementReason.SALE,
        quantity: 10,
      };

      const inventoryItem = {
        id: 'item-1',
        name: 'Coffee Beans',
        currentStock: 50,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        inventoryItem,
      );
      mockPrismaService.inventoryMovement.create.mockResolvedValue({
        id: '1',
        ...createDto,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if inventory item not found', async () => {
      const createDto = {
        inventoryItemId: 'item-999',
        type: MovementType.IN,
        reason: MovementReason.PURCHASE,
        quantity: 50,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Inventory item with ID item-999 not found',
      );
    });

    it('should throw BadRequestException if insufficient stock for OUT movement', async () => {
      const createDto = {
        inventoryItemId: 'item-1',
        type: MovementType.OUT,
        reason: MovementReason.SALE,
        quantity: 100,
      };

      const inventoryItem = {
        id: 'item-1',
        name: 'Coffee Beans',
        currentStock: 50,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        inventoryItem,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Insufficient stock. Available: 50, Requested: 100',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated movements', async () => {
      const query = { skip: 0, take: 50 };
      const movements = [
        { id: '1', type: MovementType.IN, quantity: 50 },
        { id: '2', type: MovementType.OUT, quantity: 10 },
      ];

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue(movements);
      mockPrismaService.inventoryMovement.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: movements,
        total: 2,
        skip: 0,
        take: 50,
      });
    });

    it('should filter by type', async () => {
      const query = { skip: 0, take: 50, type: MovementType.IN };

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue([]);
      mockPrismaService.inventoryMovement.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: MovementType.IN },
        }),
      );
    });

    it('should filter by reason', async () => {
      const query = { skip: 0, take: 50, reason: MovementReason.PURCHASE };

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue([]);
      mockPrismaService.inventoryMovement.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reason: MovementReason.PURCHASE },
        }),
      );
    });

    it('should filter by inventory item ID', async () => {
      const query = { skip: 0, take: 50, inventoryItemId: 'item-1' };

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue([]);
      mockPrismaService.inventoryMovement.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { inventoryItemId: 'item-1' },
        }),
      );
    });
  });

  describe('findByType', () => {
    it('should return movements by type', async () => {
      const type = 'IN';
      const movements = [{ id: '1', type: MovementType.IN, quantity: 50 }];

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue(movements);

      const result = await service.findByType(type);

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: { type: MovementType.IN },
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              currentStock: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(movements);
    });
  });

  describe('findByItem', () => {
    it('should return movements by inventory item', async () => {
      const itemId = 'item-1';
      const movements = [{ id: '1', inventoryItemId: itemId, quantity: 50 }];

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue(movements);

      const result = await service.findByItem(itemId);

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: { inventoryItemId: itemId },
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              currentStock: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(movements);
    });
  });

  describe('findByDateRange', () => {
    it('should return movements in date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const movements = [{ id: '1', quantity: 50 }];

      mockPrismaService.inventoryMovement.findMany.mockResolvedValue(movements);

      const result = await service.findByDateRange(startDate, endDate);

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              currentStock: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(movements);
    });

    it('should throw BadRequestException if dates are missing', async () => {
      await expect(service.findByDateRange(null, null)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findByDateRange(null, null)).rejects.toThrow(
        'Start date and end date are required',
      );
    });
  });

  describe('findOne', () => {
    it('should return a movement by id', async () => {
      const id = '1';
      const movement = { id, quantity: 50, type: MovementType.IN };

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        movement,
      );

      const result = await service.findOne(id);

      expect(prisma.inventoryMovement.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { inventoryItem: true },
      });
      expect(result).toEqual(movement);
    });

    it('should throw NotFoundException if movement not found', async () => {
      const id = '1';

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        'Inventory movement with ID 1 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a movement', async () => {
      const id = '1';
      const updateDto = { notes: 'Updated notes' };
      const existingMovement = { id, quantity: 50, type: MovementType.IN };
      const updatedMovement = { ...existingMovement, ...updateDto };

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        existingMovement,
      );
      mockPrismaService.inventoryMovement.update.mockResolvedValue(
        updatedMovement,
      );

      const result = await service.update(id, updateDto);

      expect(prisma.inventoryMovement.update).toHaveBeenCalledWith({
        where: { id },
        data: updateDto,
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              currentStock: true,
            },
          },
        },
      });
      expect(result).toEqual(updatedMovement);
    });

    it('should throw NotFoundException if movement not found', async () => {
      const id = '1';
      const updateDto = { notes: 'Updated' };

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(null);

      await expect(service.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a movement', async () => {
      const id = '1';
      const movement = { id, quantity: 50, type: MovementType.IN };

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        movement,
      );
      mockPrismaService.inventoryMovement.delete.mockResolvedValue(movement);

      await service.remove(id);

      expect(prisma.inventoryMovement.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if movement not found', async () => {
      const id = '1';

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
