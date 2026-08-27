import { Test, TestingModule } from '@nestjs/testing';
import {
  InventoryMovementsService,
  MovementReason,
  MovementType,
} from './inventory-movements.service';
import { PrismaService } from '../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    inventoryMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    inventoryItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    // Pass-through $transaction that just invokes the callback with the same
    // mock client (so service tx code paths run against the same mocks).
    $transaction: jest.fn(async (cbOrArr: any) => {
      if (typeof cbOrArr === 'function') return cbOrArr(mockPrismaService);
      return Promise.all(cbOrArr);
    }),
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
        locationId: 'default-loc',
        inventoryItemId: 'item-1',
        type: MovementType.IN,
        quantity: 50,
        unitCost: 12.5,
        reason: MovementReason.PURCHASE,
        reference: undefined,
        notes: undefined,
        createdAt: new Date(),
        inventoryItem: {
          id: 'item-1',
          name: 'Coffee Beans',
          code: 'CB-001',
        },
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        inventoryItem,
      );
      mockPrismaService.inventoryMovement.create.mockResolvedValue(
        expectedResult,
      );
      // IN type: getCurrentStock only called once after create for response.
      // No ADJUSTMENT in history → base 0 + IN - OUT.
      mockPrismaService.inventoryMovement.findFirst.mockResolvedValue(null);
      mockPrismaService.inventoryMovement.aggregate.mockResolvedValue({
        _sum: { quantity: 100 },
      });

      const result = await service.create(createDto);

      expect(prisma.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(result).toBeDefined();
      expect(result.inventoryItemId).toBe('item-1');
      // Should have updated currentStock on InventoryItem (IN → increment)
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { currentStock: { increment: 50 } },
        }),
      );
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

      const expectedResult = {
        id: '1',
        locationId: 'default-loc',
        inventoryItemId: 'item-1',
        type: MovementType.OUT,
        quantity: 10,
        unitCost: 0,
        reason: MovementReason.SALE,
        reference: undefined,
        notes: undefined,
        createdAt: new Date(),
        inventoryItem: {
          id: 'item-1',
          name: 'Coffee Beans',
          code: 'CB-001',
        },
      };

      // OUT stock check happens INSIDE the transaction reading
      // InventoryItem.currentStock (50 ≥ 10 → allowed).
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        inventoryItem,
      );
      // getCurrentStock (post): no ADJUSTMENT → IN=50, OUT=10 → 40.
      mockPrismaService.inventoryMovement.findFirst.mockResolvedValue(null);
      mockPrismaService.inventoryMovement.aggregate
        .mockResolvedValueOnce({ _sum: { quantity: 50 } }) // IN (post)
        .mockResolvedValueOnce({ _sum: { quantity: 10 } }); // OUT (post)
      mockPrismaService.inventoryMovement.create.mockResolvedValue(
        expectedResult,
      );

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.inventoryItemId).toBe('item-1');
      expect(result.inventoryItem.currentStock).toBe(40);
      // Decrement applied transactionally.
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { currentStock: { decrement: 10 } },
        }),
      );
    });

    it('should compute stock with ADJUSTMENT as absolute base (last adjustment resets)', async () => {
      const createDto = {
        inventoryItemId: 'item-1',
        type: MovementType.ADJUSTMENT,
        reason: MovementReason.COUNT_ADJUSTMENT,
        quantity: 80,
      };

      const adjustmentMovement = {
        id: 'adj-1',
        inventoryItemId: 'item-1',
        type: MovementType.ADJUSTMENT,
        quantity: 80,
        createdAt: new Date(),
        inventoryItem: { id: 'item-1', name: 'Coffee Beans', code: 'CB-001' },
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        name: 'Coffee Beans',
      });
      mockPrismaService.inventoryMovement.create.mockResolvedValue(
        adjustmentMovement,
      );
      // getCurrentStock: last ADJUSTMENT = 80, then IN=5 / OUT=3 after it
      // → stock = 80 + 5 - 3 = 82.
      mockPrismaService.inventoryMovement.findFirst.mockResolvedValue(
        adjustmentMovement,
      );
      mockPrismaService.inventoryMovement.aggregate
        .mockResolvedValueOnce({ _sum: { quantity: 5 } }) // IN after adj
        .mockResolvedValueOnce({ _sum: { quantity: 3 } }); // OUT after adj

      const result = await service.create(createDto);

      // ADJUSTMENT persists the ABSOLUTE value on InventoryItem.currentStock.
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { currentStock: 80 },
        }),
      );
      expect(result.inventoryItem.currentStock).toBe(82);
      // IN/OUT aggregates are restricted to movements AFTER the adjustment.
      expect(
        mockPrismaService.inventoryMovement.aggregate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'IN',
            createdAt: { gt: adjustmentMovement.createdAt },
          }),
        }),
      );
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

      // The check reads InventoryItem.currentStock INSIDE the transaction
      // (currentStock=50 < requested 100 → reject).
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        inventoryItem,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Insufficient stock. Available: 50, Requested: 100',
      );
      // No movement is created when the in-transaction check fails.
      expect(mockPrismaService.inventoryMovement.create).not.toHaveBeenCalled();
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
              code: true,
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
              code: true,
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
          // El rango cubre los dos dias completos, en la zona de la cafeteria.
          // Antes `lte` era `new Date('2024-01-31')` —medianoche UTC— y el
          // informe perdia el ultimo dia entero; esta prueba daba por buena esa
          // resta porque comprobaba justo el valor que producia el fallo.
          createdAt: {
            gte: new Date('2024-01-01T06:00:00.000Z'),
            lte: new Date('2024-02-01T05:59:59.999Z'),
          },
        },
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(movements);
    });

    it('incluye un movimiento de la tarde del ultimo dia del rango', async () => {
      mockPrismaService.inventoryMovement.findMany.mockResolvedValue([]);

      await service.findByDateRange('2024-01-01', '2024-01-31');

      const { gte, lte } =
        mockPrismaService.inventoryMovement.findMany.mock.calls[0][0].where
          .createdAt;
      // 31 de enero a las 20:00 en la cafeteria.
      const laTardeDelUltimoDia = new Date('2024-02-01T02:00:00.000Z');

      expect(laTardeDelUltimoDia >= gte && laTardeDelUltimoDia <= lte).toBe(
        true,
      );
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
      const existingMovement = {
        id,
        inventoryItemId: 'item-1',
        quantity: 50,
        type: MovementType.IN,
        inventoryItem: {
          id: 'item-1',
          name: 'Coffee Beans',
          code: 'CB-001',
        },
      };
      const updatedMovement = {
        ...existingMovement,
        notes: 'Updated notes',
      };

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        existingMovement,
      );
      mockPrismaService.inventoryMovement.update.mockResolvedValue(
        updatedMovement,
      );
      mockPrismaService.inventoryMovement.findFirst.mockResolvedValue(null);
      mockPrismaService.inventoryMovement.aggregate.mockResolvedValue({
        _sum: { quantity: 100 },
      });

      const result = await service.update(id, updateDto);

      expect(result).toBeDefined();
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw if attempting to change type', async () => {
      const id = '1';
      const existingMovement = {
        id,
        inventoryItemId: 'item-1',
        quantity: 50,
        type: MovementType.IN,
      };
      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        existingMovement,
      );

      await expect(
        service.update(id, { type: MovementType.OUT } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if attempting to change quantity', async () => {
      const id = '1';
      const existingMovement = {
        id,
        inventoryItemId: 'item-1',
        quantity: 50,
        type: MovementType.IN,
      };
      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        existingMovement,
      );

      await expect(service.update(id, { quantity: 99 } as any)).rejects.toThrow(
        BadRequestException,
      );
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
    it('should create a reversing movement instead of hard delete', async () => {
      const id = '1';
      const movement = {
        id,
        inventoryItemId: 'item-1',
        quantity: 50,
        type: MovementType.IN,
        notes: null,
        locationId: 'loc-1',
      };

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(
        movement,
      );
      mockPrismaService.inventoryMovement.update.mockResolvedValue(movement);
      mockPrismaService.inventoryMovement.create.mockResolvedValue({
        ...movement,
        id: 'rev-1',
        type: MovementType.OUT,
      });

      await service.remove(id);

      // Original is annotated, not deleted
      expect(prisma.inventoryMovement.delete).not.toHaveBeenCalled();
      expect(prisma.inventoryMovement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: expect.objectContaining({
            notes: expect.stringContaining('VOIDED'),
          }),
        }),
      );
      // Reversal movement created with inverse type
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: MovementType.OUT,
            quantity: 50,
            reason: 'REVERSAL',
          }),
        }),
      );
    });

    it('should throw NotFoundException if movement not found', async () => {
      const id = '1';

      mockPrismaService.inventoryMovement.findUnique.mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
