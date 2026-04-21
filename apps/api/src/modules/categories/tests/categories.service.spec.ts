import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../categories.service';
import { PrismaService } from '../../database/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryType, CategoryStatus } from '../interfaces';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };

  const mockCategoryDto = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Bebidas',
    description: 'Todas las bebidas',
    type: CategoryType.PRODUCT,
    icon: 'coffee',
    color: '#FF5733',
  };

  const mockCategoryRecord = {
    id: 'cat-id-123',
    organizationId: mockCategoryDto.organization_id,
    name: 'Bebidas',
    description: 'Todas las bebidas',
    icon: 'coffee',
    color: '#FF5733',
    sortOrder: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    products: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category with all fields', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategoryRecord);

      const category = await service.create(mockCategoryDto);

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe('Bebidas');
      expect(category.active).toBe(true);
      expect(mockPrismaService.category.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if name already exists', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategoryRecord);

      await expect(service.create(mockCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should call prisma.create with correct data', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategoryRecord);

      await service.create(mockCategoryDto);

      expect(mockPrismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockCategoryDto.organization_id,
            name: mockCategoryDto.name,
            description: mockCategoryDto.description,
            color: mockCategoryDto.color,
            icon: mockCategoryDto.icon,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCategories = [mockCategoryRecord, { ...mockCategoryRecord, id: 'cat-id-456', name: 'Alimentos' }];
      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      const categories = await service.findAll();

      expect(categories).toHaveLength(2);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter by status active', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategoryRecord]);

      const categories = await service.findAll({ status: CategoryStatus.ACTIVE } as any);

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
      expect(categories).toHaveLength(1);
    });

    it('should filter by status inactive', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findAll({ status: CategoryStatus.INACTIVE } as any);

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: false }),
        }),
      );
    });

    it('should apply search filter', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategoryRecord]);

      await service.findAll({ search: 'bebidas' } as any);

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('should return empty array when no categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const categories = await service.findAll();

      expect(categories).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return category by id', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryRecord);

      const found = await service.findById('cat-id-123');

      expect(found.id).toBe('cat-id-123');
      expect(found.name).toBe('Bebidas');
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-id-123' } }),
      );
    });

    it('should throw NotFoundException for non-existent id', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      const updatedRecord = { ...mockCategoryRecord, name: 'Bebidas Frías', description: 'Bebidas frías y refrescantes' };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryRecord);
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.update.mockResolvedValue(updatedRecord);

      const updated = await service.update('cat-id-123', {
        name: 'Bebidas Frías',
        description: 'Bebidas frías y refrescantes',
      } as any);

      expect(updated.name).toBe('Bebidas Frías');
      expect(updated.description).toBe('Bebidas frías y refrescantes');
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing name', async () => {
      const otherCategory = { ...mockCategoryRecord, id: 'other-id', name: 'Alimentos' };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryRecord);
      mockPrismaService.category.findFirst.mockResolvedValue(otherCategory);

      await expect(
        service.update('cat-id-123', { name: 'Alimentos' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should update active status from CategoryStatus', async () => {
      const updatedRecord = { ...mockCategoryRecord, active: false };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryRecord);
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.update.mockResolvedValue(updatedRecord);

      await service.update('cat-id-123', { status: CategoryStatus.INACTIVE } as any);

      expect(mockPrismaService.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ active: false }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete category without products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryRecord);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.category.delete.mockResolvedValue(mockCategoryRecord);

      await service.delete('cat-id-123');

      expect(mockPrismaService.category.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-id-123' } }),
      );
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if category has products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryRecord);
      mockPrismaService.product.count.mockResolvedValue(3);

      await expect(service.delete('cat-id-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return category statistics', async () => {
      mockPrismaService.category.count
        .mockResolvedValueOnce(5)   // total
        .mockResolvedValueOnce(4)   // active
        .mockResolvedValueOnce(1);  // inactive
      mockPrismaService.product.count.mockResolvedValue(20);

      const stats = await service.getStats();

      expect(stats.total_categories).toBe(5);
      expect(stats.active_categories).toBe(4);
      expect(stats.inactive_categories).toBe(1);
      expect(stats.total_products).toBe(20);
      expect(stats.avg_products_per_category).toBe(4);
    });

    it('should return zero avg when no categories', async () => {
      mockPrismaService.category.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.product.count.mockResolvedValue(0);

      const stats = await service.getStats();

      expect(stats.avg_products_per_category).toBe(0);
    });
  });
});
