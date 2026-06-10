import { Test, TestingModule } from '@nestjs/testing';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';
import { CurrentUserType } from '../auth/decorators/current-user.decorator';

const mockUser: CurrentUserType = {
  userId: 'user-1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  organizationId: 'org-1',
};

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
    organizationId: 'org-1',
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

    controller = module.get<InventoryItemsController>(InventoryItemsController);
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
        organizationId: 'org-1',
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

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockInventoryItem);
      expect(service.create).toHaveBeenCalledWith({
        ...createDto,
        organizationId: 'org-1',
      });
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

      const result = await controller.findAll(query, mockUser);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query, 'org-1');
    });
  });

  describe('findAllActive', () => {
    it('should return all active inventory items', async () => {
      mockInventoryItemsService.findAllActive.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await controller.findAllActive(mockUser);

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findAllActive).toHaveBeenCalledWith('org-1');
    });
  });

  describe('findLowStock', () => {
    it('should return low stock items', async () => {
      mockInventoryItemsService.findLowStock.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await controller.findLowStock(mockUser);

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findLowStock).toHaveBeenCalledWith('org-1');
    });
  });

  describe('findByCategory', () => {
    it('should return items by category', async () => {
      mockInventoryItemsService.findByCategory.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await controller.findByCategory('Dairy', mockUser);

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findByCategory).toHaveBeenCalledWith('Dairy', 'org-1');
    });
  });

  describe('findOne', () => {
    it('should return an inventory item by id', async () => {
      mockInventoryItemsService.findOne.mockResolvedValue(mockInventoryItem);

      const result = await controller.findOne('item-1', mockUser);

      expect(result).toEqual(mockInventoryItem);
      expect(service.findOne).toHaveBeenCalledWith('item-1');
    });
  });

  describe('findByCode', () => {
    it('should return an inventory item by code', async () => {
      mockInventoryItemsService.findByCode.mockResolvedValue(mockInventoryItem);

      const result = await controller.findByCode('MILK-WHOLE-001', mockUser);

      expect(result).toEqual(mockInventoryItem);
      expect(service.findByCode).toHaveBeenCalledWith(
        'MILK-WHOLE-001',
        'org-1',
      );
    });
  });

  describe('update', () => {
    it('should update an inventory item', async () => {
      const updateDto: UpdateInventoryItemDto = {
        costPerUnit: 0.025,
      };

      const updatedItem = { ...mockInventoryItem, costPerUnit: 0.025 };
      mockInventoryItemsService.findOne.mockResolvedValue(mockInventoryItem);
      mockInventoryItemsService.update.mockResolvedValue(updatedItem);

      const result = await controller.update('item-1', updateDto, mockUser);

      expect(result).toEqual(updatedItem);
      expect(service.update).toHaveBeenCalledWith('item-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove an inventory item', async () => {
      mockInventoryItemsService.findOne.mockResolvedValue(mockInventoryItem);
      mockInventoryItemsService.remove.mockResolvedValue(undefined);

      await controller.remove('item-1', mockUser);

      expect(service.remove).toHaveBeenCalledWith('item-1');
    });
  });
});
