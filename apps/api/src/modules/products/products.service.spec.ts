import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
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
  };

  const mockProduct = {
    id: 'test-id',
    categoryId: 'category-1',
    sku: 'ESPRESSO-01',
    name: 'Espresso',
    description: 'Classic espresso shot',
    price: 35.0,
    cost: 12.0,
    taxRate: 0.16,
    allowModifiers: true,
    trackInventory: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: null,
    category: mockCategory,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      categoryId: 'category-1',
      sku: 'ESPRESSO-01',
      name: 'Espresso',
      description: 'Classic espresso shot',
      price: 35.0,
      cost: 12.0,
    };

    it('should create a product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(result).toEqual(mockProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { sku: createDto.sku },
      });
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.categoryId },
      });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: createDto,
        include: { category: true },
      });
    });

    it('should throw ConflictException if SKU already exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if category does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query = { skip: 0, take: 10 };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockProduct],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by active status', async () => {
      const query = { active: true };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('should filter by category', async () => {
      const query = { categoryId: 'category-1' };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'category-1' }),
        }),
      );
    });

    it('should search products by name, SKU, or description', async () => {
      const query = { search: 'espresso' };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ sku: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('test-id');

      expect(result).toEqual(mockProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findBySku('ESPRESSO-01');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if SKU not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySku('INVALID-SKU')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findByCategory('category-1');

      expect(result).toEqual([mockProduct]);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'category-1', active: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = {
      price: 40.0,
    };

    it('should update a product successfully', async () => {
      const updatedProduct = { ...mockProduct, price: 40.0 };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update('test-id', updateDto);

      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new SKU already exists', async () => {
      const updateWithSku: UpdateProductDto = { sku: 'NEW-SKU' };
      const existingProduct = { ...mockProduct, id: 'other-id' };

      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(existingProduct);

      await expect(
        service.update('test-id', updateWithSku),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if new category does not exist', async () => {
      const updateWithCategory: UpdateProductDto = {
        categoryId: 'invalid-category',
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('test-id', updateWithCategory),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete product if used in tickets', async () => {
      const productWithTickets = {
        ...mockProduct,
        _count: { ticketLines: 5 },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(
        productWithTickets,
      );
      mockPrismaService.product.update.mockResolvedValue({
        ...productWithTickets,
        active: false,
      });

      await service.remove('test-id');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { active: false },
      });
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('should hard delete product if not used in tickets', async () => {
      const productWithoutTickets = {
        ...mockProduct,
        _count: { ticketLines: 0 },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(
        productWithoutTickets,
      );
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      await service.remove('test-id');

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
