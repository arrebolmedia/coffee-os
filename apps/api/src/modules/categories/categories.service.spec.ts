import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Coffee',
    description: 'Hot coffee drinks',
    color: '#8B4513',
    icon: 'coffee',
    sortOrder: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      products: 5,
    },
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
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'Coffee',
      description: 'Hot coffee drinks',
      color: '#8B4513',
      icon: 'coffee',
    };

    it('should create a category successfully', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(prisma.category.findFirst).toHaveBeenCalled();
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createDto.name,
          description: createDto.description,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if category name already exists', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should auto-assign sortOrder if not provided', async () => {
      const lastCategory = { sortOrder: 5 };
      mockPrismaService.category.findFirst
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(lastCategory); // sortOrder check

      mockPrismaService.category.create.mockResolvedValue({
        ...mockCategory,
        sortOrder: 6,
      });

      await service.create(createDto);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sortOrder: 6,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const query = { skip: 0, take: 10 };

      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);
      mockPrismaService.category.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockCategory],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by active status', async () => {
      const query = { active: true };

      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);
      mockPrismaService.category.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('should search categories by name or description', async () => {
      const query = { search: 'coffee' };

      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);
      mockPrismaService.category.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active categories ordered by sortOrder', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAllActive();

      expect(result).toEqual([mockCategory]);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('category-1');

      expect(result).toEqual(mockCategory);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findCategoryProducts', () => {
    it('should return products for a category', async () => {
      const categoryWithProducts = {
        ...mockCategory,
        products: [
          { id: 'product-1', name: 'Espresso', active: true },
        ],
      };

      mockPrismaService.category.findUnique.mockResolvedValue(
        categoryWithProducts,
      );

      const result = await service.findCategoryProducts('category-1');

      expect(result).toEqual(categoryWithProducts.products);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.findCategoryProducts('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Hot Coffee',
    };

    it('should update a category successfully', async () => {
      const updatedCategory = { ...mockCategory, name: 'Hot Coffee' };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      const result = await service.update('category-1', updateDto);

      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if new name already exists', async () => {
      const existingCategory = { ...mockCategory, id: 'other-id' };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.findFirst.mockResolvedValue(
        existingCategory,
      );

      await expect(service.update('category-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateSortOrder', () => {
    it('should update category sort order', async () => {
      const updatedCategory = { ...mockCategory, sortOrder: 5 };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      const result = await service.updateSortOrder('category-1', 5);

      expect(result).toEqual(updatedCategory);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        data: { sortOrder: 5 },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.updateSortOrder('invalid-id', 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete category if it has products', async () => {
      const categoryWithProducts = {
        ...mockCategory,
        _count: { products: 5 },
      };

      mockPrismaService.category.findUnique.mockResolvedValue(
        categoryWithProducts,
      );
      mockPrismaService.category.update.mockResolvedValue({
        ...categoryWithProducts,
        active: false,
      });

      await service.remove('category-1');

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        data: { active: false },
      });
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should hard delete category if it has no products', async () => {
      const categoryWithoutProducts = {
        ...mockCategory,
        _count: { products: 0 },
      };

      mockPrismaService.category.findUnique.mockResolvedValue(
        categoryWithoutProducts,
      );
      mockPrismaService.category.delete.mockResolvedValue(mockCategory);

      await service.remove('category-1');

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'category-1' },
      });
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
