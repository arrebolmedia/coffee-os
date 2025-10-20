import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../inventory.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ItemType, ItemStatus, UnitOfMeasure } from '../interfaces';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockItemDto = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    sku: 'MILK-001',
    name: 'Leche Entera',
    unit_of_measure: UnitOfMeasure.LITER,
    cost_per_unit: 25,
    current_stock: 100,
    minimum_stock: 20,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService],
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
      await expect(service.create(mockItemDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(mockItemDto);
      await service.create({
        ...mockItemDto,
        sku: 'SUGAR-001',
        name: 'Azúcar',
        type: ItemType.INGREDIENT,
        current_stock: 5,
        minimum_stock: 10,
      });
      await service.create({
        ...mockItemDto,
        sku: 'CUP-001',
        name: 'Vasos',
        type: ItemType.SUPPLY,
        is_perishable: false,
      });
    });

    it('should return all items', async () => {
      const items = await service.findAll();
      expect(items).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const items = await service.findAll({ type: ItemType.INGREDIENT });
      expect(items).toHaveLength(2);
    });

    it('should filter by low_stock', async () => {
      const items = await service.findAll({ low_stock: 'true' });
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Azúcar');
    });

    it('should search by text', async () => {
      const items = await service.findAll({ search: 'leche' });
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Leche Entera');
    });
  });

  describe('findById', () => {
    it('should return item by id', async () => {
      const created = await service.create(mockItemDto);
      const found = await service.findById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      const item = await service.create(mockItemDto);
      const updated = await service.update(item.id, { cost_per_unit: 30 });
      expect(updated.cost_per_unit).toBe(30);
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
      await expect(service.adjustStock(item.id, 150, 'subtract')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({ ...mockItemDto, type: ItemType.INGREDIENT, current_stock: 5, minimum_stock: 10 });
      await service.create({ ...mockItemDto, sku: 'ITEM-2', type: ItemType.SUPPLY, current_stock: 0, minimum_stock: 0 });
    });

    it('should return statistics', async () => {
      const stats = await service.getStats('123e4567-e89b-12d3-a456-426614174000');

      expect(stats.total_items).toBe(2);
      expect(stats.low_stock_count).toBe(2); // Both items: 5 <= 10, and 0 <= 0
      expect(stats.out_of_stock_count).toBe(1);
      expect(stats.total_value).toBeGreaterThan(0);
    });
  });

  describe('getValuation', () => {
    it('should return valuation sorted by value', async () => {
      await service.create({ ...mockItemDto, current_stock: 100, cost_per_unit: 10 });
      await service.create({ ...mockItemDto, sku: 'ITEM-2', current_stock: 50, cost_per_unit: 50 });

      const valuation = await service.getValuation('123e4567-e89b-12d3-a456-426614174000');

      expect(valuation).toHaveLength(2);
      expect(valuation[0].total_value).toBeGreaterThan(valuation[1].total_value);
    });
  });
});
