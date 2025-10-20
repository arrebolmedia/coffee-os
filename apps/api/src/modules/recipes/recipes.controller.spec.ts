import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipesDto } from './dto/query-recipes.dto';

describe('RecipesController', () => {
  let controller: RecipesController;
  let service: RecipesService;

  const mockRecipesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findByProduct: jest.fn(),
    findOne: jest.fn(),
    calculateCost: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRecipe = {
    id: 'recipe-1',
    productId: 'product-1',
    name: 'Latte Recipe',
    description: 'Classic latte recipe',
    servings: 1,
    prepTimeMinutes: 5,
    instructions: 'Steam milk, pull espresso, combine',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'product-1',
      name: 'Latte',
      sku: 'LAT-001',
    },
    ingredients: [
      {
        id: 'ing-1',
        recipeId: 'recipe-1',
        inventoryItemId: 'inv-1',
        quantity: 240,
        unit: 'ml',
        inventoryItem: {
          id: 'inv-1',
          code: 'MILK-001',
          name: 'Whole Milk',
          costPerUnit: 0.02,
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [
        {
          provide: RecipesService,
          useValue: mockRecipesService,
        },
      ],
    }).compile();

    controller = module.get<RecipesController>(RecipesController);
    service = module.get<RecipesService>(RecipesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a recipe', async () => {
      const createDto: CreateRecipeDto = {
        productId: 'product-1',
        name: 'Latte Recipe',
        servings: 1,
        ingredients: [
          {
            inventoryItemId: 'inv-1',
            quantity: 240,
            unit: 'ml',
          },
        ],
      };

      mockRecipesService.create.mockResolvedValue(mockRecipe);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockRecipe);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated recipes', async () => {
      const query: QueryRecipesDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockRecipe],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockRecipesService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findAllActive', () => {
    it('should return all active recipes', async () => {
      mockRecipesService.findAllActive.mockResolvedValue([mockRecipe]);

      const result = await controller.findAllActive();

      expect(result).toEqual([mockRecipe]);
      expect(service.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findByProduct', () => {
    it('should return recipes for a product', async () => {
      mockRecipesService.findByProduct.mockResolvedValue([mockRecipe]);

      const result = await controller.findByProduct('product-1');

      expect(result).toEqual([mockRecipe]);
      expect(service.findByProduct).toHaveBeenCalledWith('product-1');
    });
  });

  describe('findOne', () => {
    it('should return a recipe by id', async () => {
      mockRecipesService.findOne.mockResolvedValue(mockRecipe);

      const result = await controller.findOne('recipe-1');

      expect(result).toEqual(mockRecipe);
      expect(service.findOne).toHaveBeenCalledWith('recipe-1');
    });
  });

  describe('calculateCost', () => {
    it('should calculate recipe cost', async () => {
      const costResult = {
        recipeId: 'recipe-1',
        recipeName: 'Latte Recipe',
        totalCost: 4.8,
        currency: 'MXN',
        ingredients: [
          {
            name: 'Whole Milk',
            quantity: 240,
            unit: 'ml',
            costPerUnit: 0.02,
            totalCost: 4.8,
          },
        ],
      };

      mockRecipesService.calculateCost.mockResolvedValue(costResult);

      const result = await controller.calculateCost('recipe-1');

      expect(result).toEqual(costResult);
      expect(service.calculateCost).toHaveBeenCalledWith('recipe-1');
    });
  });

  describe('update', () => {
    it('should update a recipe', async () => {
      const updateDto: UpdateRecipeDto = {
        prepTimeMinutes: 4,
      };

      const updatedRecipe = { ...mockRecipe, prepTimeMinutes: 4 };
      mockRecipesService.update.mockResolvedValue(updatedRecipe);

      const result = await controller.update('recipe-1', updateDto);

      expect(result).toEqual(updatedRecipe);
      expect(service.update).toHaveBeenCalledWith('recipe-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a recipe', async () => {
      mockRecipesService.remove.mockResolvedValue(undefined);

      await controller.remove('recipe-1');

      expect(service.remove).toHaveBeenCalledWith('recipe-1');
    });
  });
});
