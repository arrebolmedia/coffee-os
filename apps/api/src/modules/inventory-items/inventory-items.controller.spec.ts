import { Test, TestingModule } from '@nestjs/testing';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';

describe('InventoryItemsController', () => {
  let controller: InventoryItemsController;
  let service: InventoryItemsService;

  const mockInventoryItemsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findLowStock: jest.fn(),
    findByCategory: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockInventoryItem = {
    id: 'item-1',
    code: 'MILK-WHOLE-001',
    name: 'Whole Milk',
    description: '1 Liter whole milk',
    unitOfMeasure: 'ml',
    costPerUnit: 0.02,
    parLevel: 5000,
    reorderPoint: 2000,
    category: 'Dairy',
    supplierId: 'supplier-1',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: {
      id: 'supplier-1',
      name: 'Dairy Supplier',
      contactName: 'John Doe',
    },
    _count: {
      recipeIngredients: 10,
      inventoryMovements: 50,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryItemsController],
      providers: [
        {
          provide: InventoryItemsService,
          useValue: mockInventoryItemsService,
        },
      ],
    }).compile();

    controller = module.get<InventoryItemsController>(
      InventoryItemsController,
    );
    service = module.get<InventoryItemsService>(InventoryItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item', async () => {
      const createDto: CreateInventoryItemDto = {
        code: 'MILK-WHOLE-001',
        name: 'Whole Milk',
        description: '1 Liter whole milk',
        unitOfMeasure: 'ml',
        costPerUnit: 0.02,
        parLevel: 5000,
        reorderPoint: 2000,
        category: 'Dairy',
      };

      mockInventoryItemsService.create.mockResolvedValue(mockInventoryItem);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockInventoryItem);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated inventory items', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockInventoryItem],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockInventoryItemsService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findAllActive', () => {
    it('should return all active inventory items', async () => {
      mockInventoryItemsService.findAllActive.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await controller.findAllActive();

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findLowStock', () => {
    it('should return low stock items', async () => {
      mockInventoryItemsService.findLowStock.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await controller.findLowStock();

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findLowStock).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('should return items by category', async () => {
      mockInventoryItemsService.findByCategory.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await controller.findByCategory('Dairy');

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findByCategory).toHaveBeenCalledWith('Dairy');
    });
  });

  describe('findOne', () => {
    it('should return an inventory item by id', async () => {
      mockInventoryItemsService.findOne.mockResolvedValue(mockInventoryItem);

      const result = await controller.findOne('item-1');

      expect(result).toEqual(mockInventoryItem);
      expect(service.findOne).toHaveBeenCalledWith('item-1');
    });
  });

  describe('findByCode', () => {
    it('should return an inventory item by code', async () => {
      mockInventoryItemsService.findByCode.mockResolvedValue(
        mockInventoryItem,
      );

      const result = await controller.findByCode('MILK-WHOLE-001');

      expect(result).toEqual(mockInventoryItem);
      expect(service.findByCode).toHaveBeenCalledWith('MILK-WHOLE-001');
    });
  });

  describe('update', () => {
    it('should update an inventory item', async () => {
      const updateDto: UpdateInventoryItemDto = {
        costPerUnit: 0.025,
      };

      const updatedItem = { ...mockInventoryItem, costPerUnit: 0.025 };
      mockInventoryItemsService.update.mockResolvedValue(updatedItem);

      const result = await controller.update('item-1', updateDto);

      expect(result).toEqual(updatedItem);
      expect(service.update).toHaveBeenCalledWith('item-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove an inventory item', async () => {
      mockInventoryItemsService.remove.mockResolvedValue(undefined);

      await controller.remove('item-1');

      expect(service.remove).toHaveBeenCalledWith('item-1');
    });
  });
});
