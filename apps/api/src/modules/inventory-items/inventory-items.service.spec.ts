import { Test, TestingModule } from '@nestjs/testing';
import { InventoryItemsService } from './inventory-items.service';
import { PrismaService } from '../database/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('InventoryItemsService', () => {
  let service: InventoryItemsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    inventoryItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
    },
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
      leadTime: 2,
    },
    _count: {
      recipeIngredients: 10,
      inventoryMovements: 50,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryItemsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryItemsService>(InventoryItemsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateInventoryItemDto = {
      code: 'MILK-WHOLE-001',
      name: 'Whole Milk',
      description: '1 Liter whole milk',
      unitOfMeasure: 'ml',
      costPerUnit: 0.02,
      parLevel: 5000,
      reorderPoint: 2000,
      category: 'Dairy',
      supplierId: 'supplier-1',
    };

    it('should create an inventory item', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);
      mockPrismaService.supplier.findUnique.mockResolvedValue({
        id: 'supplier-1',
      });
      mockPrismaService.inventoryItem.create.mockResolvedValue(
        mockInventoryItem,
      );

      const result = await service.create(createDto);

      expect(result).toEqual(mockInventoryItem);
      expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          supplier: true,
          _count: {
            select: {
              recipeIngredients: true,
              inventoryMovements: true,
            },
          },
        },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryItem,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if supplier does not exist', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it('should create without supplierId', async () => {
      const dtoWithoutSupplier: CreateInventoryItemDto = {
        code: 'COFFEE-BEAN-001',
        name: 'Coffee Beans',
        unitOfMeasure: 'g',
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);
      mockPrismaService.inventoryItem.create.mockResolvedValue({
        ...mockInventoryItem,
        supplierId: null,
      });

      const result = await service.create(dtoWithoutSupplier);

      expect(result).toBeDefined();
      expect(prisma.supplier.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated inventory items', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
      };

      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);
      mockPrismaService.inventoryItem.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockInventoryItem],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by active status', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
        active: true,
      };

      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);
      mockPrismaService.inventoryItem.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
        category: 'Dairy',
      };

      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);
      mockPrismaService.inventoryItem.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Dairy',
          }),
        }),
      );
    });

    it('should filter by supplierId', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
        supplierId: 'supplier-1',
      };

      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);
      mockPrismaService.inventoryItem.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplierId: 'supplier-1',
          }),
        }),
      );
    });

    it('should search by name, code, or description', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
        search: 'milk',
      };

      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);
      mockPrismaService.inventoryItem.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'milk', mode: 'insensitive' } },
              { code: { contains: 'milk', mode: 'insensitive' } },
              { description: { contains: 'milk', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter low stock items', async () => {
      const query: QueryInventoryItemsDto = {
        skip: 0,
        take: 10,
        lowStock: true,
      };

      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);
      mockPrismaService.inventoryItem.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.items).toEqual([mockInventoryItem]);
      expect(prisma.inventoryItem.findMany).toHaveBeenCalled();
    });
  });

  describe('findAllActive', () => {
    it('should return all active inventory items', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await service.findAllActive();

      expect(result).toEqual([mockInventoryItem]);
      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });
  });

  describe('findLowStock', () => {
    it('should return items with low stock', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await service.findLowStock();

      expect(result).toEqual([mockInventoryItem]);
      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          reorderPoint: { gt: 0 },
        },
        orderBy: {
          reorderPoint: 'desc',
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              contactName: true,
              leadTime: true,
            },
          },
        },
      });
    });
  });

  describe('findByCategory', () => {
    it('should return items by category', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await service.findByCategory('Dairy');

      expect(result).toEqual([mockInventoryItem]);
      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          category: {
            equals: 'Dairy',
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
        include: {
          supplier: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return an inventory item by id', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryItem,
      );

      const result = await service.findOne('item-1');

      expect(result).toEqual(mockInventoryItem);
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should return an inventory item by code', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryItem,
      );

      const result = await service.findByCode('MILK-WHOLE-001');

      expect(result).toEqual(mockInventoryItem);
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateInventoryItemDto = {
      costPerUnit: 0.025,
    };

    it('should update an inventory item', async () => {
      const updatedItem = { ...mockInventoryItem, costPerUnit: 0.025 };
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryItem,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(updatedItem);

      const result = await service.update('item-1', updateDto);

      expect(result).toEqual(updatedItem);
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new code already exists', async () => {
      const updateWithCode: UpdateInventoryItemDto = {
        code: 'EXISTING-CODE',
      };

      mockPrismaService.inventoryItem.findUnique
        .mockResolvedValueOnce(mockInventoryItem) // First call for existence check
        .mockResolvedValueOnce({ id: 'other-item' }); // Second call for code uniqueness check

      await expect(
        service.update('item-1', updateWithCode),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if new supplier does not exist', async () => {
      const updateWithSupplier: UpdateInventoryItemDto = {
        supplierId: 'non-existent-supplier',
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryItem,
      );
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.update('item-1', updateWithSupplier),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete if item has recipe ingredients', async () => {
      const itemWithIngredients = {
        ...mockInventoryItem,
        _count: {
          recipeIngredients: 5,
          inventoryMovements: 0,
        },
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        itemWithIngredients,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue({
        ...itemWithIngredients,
        active: false,
      });

      const result = await service.remove('item-1');

      expect(result.active).toBe(false);
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { active: false },
      });
      expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
    });

    it('should soft delete if item has inventory movements', async () => {
      const itemWithMovements = {
        ...mockInventoryItem,
        _count: {
          recipeIngredients: 0,
          inventoryMovements: 10,
        },
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        itemWithMovements,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue({
        ...itemWithMovements,
        active: false,
      });

      const result = await service.remove('item-1');

      expect(result.active).toBe(false);
      expect(prisma.inventoryItem.update).toHaveBeenCalled();
      expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
    });

    it('should hard delete if item has no dependencies', async () => {
      const cleanItem = {
        ...mockInventoryItem,
        _count: {
          recipeIngredients: 0,
          inventoryMovements: 0,
        },
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(cleanItem);
      mockPrismaService.inventoryItem.delete.mockResolvedValue(cleanItem);

      await service.remove('item-1');

      expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
