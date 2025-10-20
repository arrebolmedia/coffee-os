import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySku: jest.fn(),
    findByCategory: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
    category: {
      id: 'category-1',
      name: 'Coffee',
      description: 'Hot coffee drinks',
      color: '#8B4513',
      icon: 'coffee',
      sortOrder: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createDto: CreateProductDto = {
        categoryId: 'category-1',
        sku: 'ESPRESSO-01',
        name: 'Espresso',
        description: 'Classic espresso shot',
        price: 35.0,
        cost: 12.0,
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query: QueryProductsDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockProduct],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockProductsService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by active status', async () => {
      const query: QueryProductsDto = {
        active: true,
      };

      mockProductsService.findAll.mockResolvedValue({
        items: [mockProduct],
        total: 1,
        skip: 0,
        take: 50,
      });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should search products', async () => {
      const query: QueryProductsDto = {
        search: 'espresso',
      };

      mockProductsService.findAll.mockResolvedValue({
        items: [mockProduct],
        total: 1,
        skip: 0,
        take: 50,
      });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('test-id');

      expect(result).toEqual(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith('test-id');
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      mockProductsService.findBySku.mockResolvedValue(mockProduct);

      const result = await controller.findBySku('ESPRESSO-01');

      expect(result).toEqual(mockProduct);
      expect(service.findBySku).toHaveBeenCalledWith('ESPRESSO-01');
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      mockProductsService.findByCategory.mockResolvedValue([mockProduct]);

      const result = await controller.findByCategory('category-1');

      expect(result).toEqual([mockProduct]);
      expect(service.findByCategory).toHaveBeenCalledWith('category-1');
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateDto: UpdateProductDto = {
        price: 40.0,
      };

      const updatedProduct = { ...mockProduct, price: 40.0 };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update('test-id', updateDto);

      expect(result).toEqual(updatedProduct);
      expect(service.update).toHaveBeenCalledWith('test-id', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      await controller.remove('test-id');

      expect(service.remove).toHaveBeenCalledWith('test-id');
    });
  });
});
