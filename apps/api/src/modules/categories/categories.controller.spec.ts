import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findOne: jest.fn(),
    findCategoryProducts: jest.fn(),
    update: jest.fn(),
    updateSortOrder: jest.fn(),
    remove: jest.fn(),
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
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const createDto: CreateCategoryDto = {
        name: 'Coffee',
        description: 'Hot coffee drinks',
        color: '#8B4513',
        icon: 'coffee',
      };

      mockCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const query: QueryCategoriesDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockCategory],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockCategoriesService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findAllActive', () => {
    it('should return all active categories', async () => {
      mockCategoriesService.findAllActive.mockResolvedValue([mockCategory]);

      const result = await controller.findAllActive();

      expect(result).toEqual([mockCategory]);
      expect(service.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      mockCategoriesService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('category-1');

      expect(result).toEqual(mockCategory);
      expect(service.findOne).toHaveBeenCalledWith('category-1');
    });
  });

  describe('findProducts', () => {
    it('should return products for a category', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Espresso',
          price: 35.0,
        },
      ];

      mockCategoriesService.findCategoryProducts.mockResolvedValue(mockProducts);

      const result = await controller.findProducts('category-1');

      expect(result).toEqual(mockProducts);
      expect(service.findCategoryProducts).toHaveBeenCalledWith('category-1');
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto: UpdateCategoryDto = {
        name: 'Hot Coffee',
      };

      const updatedCategory = { ...mockCategory, name: 'Hot Coffee' };
      mockCategoriesService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('category-1', updateDto);

      expect(result).toEqual(updatedCategory);
      expect(service.update).toHaveBeenCalledWith('category-1', updateDto);
    });
  });

  describe('reorder', () => {
    it('should update category sort order', async () => {
      const updatedCategory = { ...mockCategory, sortOrder: 5 };
      mockCategoriesService.updateSortOrder.mockResolvedValue(updatedCategory);

      const result = await controller.reorder('category-1', 5);

      expect(result).toEqual(updatedCategory);
      expect(service.updateSortOrder).toHaveBeenCalledWith('category-1', 5);
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      mockCategoriesService.remove.mockResolvedValue(undefined);

      await controller.remove('category-1');

      expect(service.remove).toHaveBeenCalledWith('category-1');
    });
  });
});
