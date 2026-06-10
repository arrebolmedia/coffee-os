import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../inventory.service';
import { PrismaService } from '../../database/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, ItemType, UnitOfMeasure } from '../interfaces';

describe('InventoryService', () => {
  let service: InventoryService;

  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  const mockItemDto = {
    organization_id: orgId,
    sku: 'MILK-001',
    name: 'Leche Entera',
    unit_of_measure: UnitOfMeasure.LITER,
    cost_per_unit: 25,
    current_stock: 100,
    minimum_stock: 20,
  };

  const itemStore: any[] = [];
  const movementStore: any[] = [];

  const makeMockPrismaItem = (data: any = {}, id?: string) => ({
    id: id || `item-${Date.now()}-${Math.random()}`,
    organizationId: data.organizationId || orgId,
    code: data.code || 'MILK-001',
    name: data.name || 'Leche Entera',
    description: data.description ?? null,
    unitOfMeasure: data.unitOfMeasure || 'LITER',
    costPerUnit: data.costPerUnit ?? 25,
    parLevel: data.parLevel ?? 0,
    reorderPoint: data.reorderPoint ?? 20,
    category: data.category ?? null,
    supplierId: data.supplierId ?? null,
    active: data.active !== false,
    currentStock: data.currentStock ?? 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: null,
  });

  const mockPrismaService: any = {
    inventoryItem: {
      findFirst: jest.fn().mockImplementation((args: any) => {
        const w = args?.where || {};
        let candidates = [...itemStore];
        if (w.code) candidates = candidates.filter((i) => i.code === w.code);
        if (w.organizationId)
          candidates = candidates.filter(
            (i) => i.organizationId === w.organizationId,
          );
        if (w.id?.not) candidates = candidates.filter((i) => i.id !== w.id.not);
        return Promise.resolve(candidates[0] || null);
      }),
      findMany: jest.fn().mockImplementation((args: any = {}) => {
        const w = args?.where || {};
        let results = [...itemStore];
        if (w.organizationId)
          results = results.filter(
            (i) => i.organizationId === w.organizationId,
          );
        if (w.active !== undefined)
          results = results.filter((i) => i.active === w.active);
        if (w.currentStock === 0)
          results = results.filter((i) => i.currentStock === 0);
        return Promise.resolve(results);
      }),
      findUnique: jest.fn().mockImplementation((args: any) => {
        const found = itemStore.find((i) => i.id === args?.where?.id);
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation((args: any) => {
        const item = makeMockPrismaItem(args.data || {});
        itemStore.push(item);
        return Promise.resolve(item);
      }),
      update: jest.fn().mockImplementation((args: any) => {
        const idx = itemStore.findIndex((i) => i.id === args?.where?.id);
        if (idx < 0) return Promise.reject(new Error('Not found'));
        itemStore[idx] = {
          ...itemStore[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        return Promise.resolve(itemStore[idx]);
      }),
      count: jest
        .fn()
        .mockImplementation(() => Promise.resolve(itemStore.length)),
    },
    inventoryMovement: {
      create: jest.fn().mockImplementation((args: any) => {
        const m = {
          id: `mov-${Date.now()}-${Math.random()}`,
          inventoryItemId: args.data?.inventoryItemId,
          locationId: args.data?.locationId ?? null,
          type: args.data?.type,
          quantity: args.data?.quantity,
          unitCost: args.data?.unitCost ?? null,
          reason: args.data?.reason ?? null,
          reference: args.data?.reference ?? null,
          lotId: args.data?.lotId ?? null,
          notes: args.data?.notes ?? null,
          createdAt: new Date(),
        };
        movementStore.push(m);
        return Promise.resolve(m);
      }),
      findMany: jest.fn().mockImplementation((args: any = {}) => {
        const w = args?.where || {};
        let results = [...movementStore];
        if (w.inventoryItemId)
          results = results.filter(
            (m) => m.inventoryItemId === w.inventoryItemId,
          );
        return Promise.resolve(results);
      }),
    },
    $transaction: jest.fn().mockImplementation(async (ops: Promise<any>[]) => {
      // ops is an array of already-started prisma calls; the mock client returns
      // promises, so we just await them in order.
      return Promise.all(ops);
    }),
  };

  beforeEach(async () => {
    itemStore.length = 0;
    movementStore.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item', async () => {
      const item = await service.create(mockItemDto);
      expect(item.id).toBeDefined();
      expect(item.name).toBe('Leche Entera');
      expect(item.type).toBe(ItemType.INGREDIENT);
      expect(item.status).toBe(ItemStatus.ACTIVE);
      expect(item.track_inventory).toBe(true);
    });

    it('should throw ConflictException if SKU exists', async () => {
      await service.create(mockItemDto);
      await expect(service.create(mockItemDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(mockItemDto);
      await service.create({
        ...mockItemDto,
        sku: 'SUGAR-001',
        name: 'Azúcar',
        current_stock: 5,
        minimum_stock: 10,
      });
      await service.create({
        ...mockItemDto,
        sku: 'CUP-001',
        name: 'Vasos',
      });
    });

    it('should return all items', async () => {
      const items = await service.findAll();
      expect(items).toHaveLength(3);
    });

    it('should filter by organization', async () => {
      const items = await service.findAll({ organization_id: orgId });
      expect(items).toHaveLength(3);
    });

    it('should filter by low_stock', async () => {
      const items = await service.findAll({ low_stock: 'true' });
      expect(Array.isArray(items)).toBe(true);
      // SUGAR-001 has currentStock=5 <= reorderPoint=10
      expect(items.find((i) => i.sku === 'SUGAR-001')).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return item by id', async () => {
      const created = await service.create(mockItemDto);
      const found = await service.findById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      const item = await service.create(mockItemDto);
      const updated = await service.update(item.id, { cost_per_unit: 30 });
      expect(updated.cost_per_unit).toBe(30);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete (soft)', () => {
    it('should soft delete by setting active=false', async () => {
      const item = await service.create(mockItemDto);
      await service.delete(item.id);
      const after = await service.findById(item.id);
      expect(after.status).toBe(ItemStatus.INACTIVE);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('adjustStock', () => {
    it('should add stock', async () => {
      const item = await service.create(mockItemDto);
      const updated = await service.adjustStock(item.id, 50, 'add');
      expect(updated.current_stock).toBe(150);
    });

    it('should subtract stock', async () => {
      const item = await service.create(mockItemDto);
      const updated = await service.adjustStock(item.id, 30, 'subtract');
      expect(updated.current_stock).toBe(70);
    });

    it('should set stock', async () => {
      const item = await service.create(mockItemDto);
      const updated = await service.adjustStock(item.id, 200, 'set');
      expect(updated.current_stock).toBe(200);
    });

    it('should throw if insufficient stock', async () => {
      const item = await service.create(mockItemDto);
      await expect(
        service.adjustStock(item.id, 150, 'subtract'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record an InventoryMovement', async () => {
      const item = await service.create(mockItemDto);
      await service.adjustStock(item.id, 10, 'add', 'Restock');
      const movements = await service.getMovements(item.id);
      expect(movements.length).toBe(1);
      expect(movements[0].type).toBe('purchase');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        ...mockItemDto,
        current_stock: 5,
        minimum_stock: 10,
      });
      await service.create({
        ...mockItemDto,
        sku: 'ITEM-2',
        current_stock: 0,
        minimum_stock: 0,
      });
    });

    it('should return statistics', async () => {
      const stats = await service.getStats(orgId);
      expect(stats.total_items).toBe(2);
      expect(stats.low_stock_count).toBe(2);
      expect(stats.out_of_stock_count).toBe(1);
      expect(stats.total_value).toBeGreaterThan(0);
    });
  });

  describe('getValuation', () => {
    it('should return valuation sorted by value', async () => {
      await service.create({
        ...mockItemDto,
        current_stock: 100,
        cost_per_unit: 10,
      });
      await service.create({
        ...mockItemDto,
        sku: 'ITEM-2',
        current_stock: 50,
        cost_per_unit: 50,
      });

      const valuation = await service.getValuation(orgId);
      expect(valuation).toHaveLength(2);
      expect(valuation[0].total_value).toBeGreaterThan(
        valuation[1].total_value,
      );
    });
  });
});
