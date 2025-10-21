import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto, RecipeCategory } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipesDto } from './dto/query-recipes.dto';

describe('RecipesController', () => {
  let controller: RecipesController;
  let service: RecipesService;

  const mockRecipesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    calculateCost: jest.fn(),
    scaleRecipe: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn(),
    analyzeProfitability: jest.fn(),
  };

  const mockRecipe = {
    id: 'recipe-1',
    organization_id: 'org-1',
    name: 'Latte Recipe',
    description: 'Classic latte recipe',
    category: RecipeCategory.LECHE,
    servings: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ingredients: [
      {
        id: 'ing-1',
        recipe_id: 'recipe-1',
        inventory_item_id: 'inv-1',
        quantity: 240,
        unit: 'ml',
        cost_per_unit: 0.02,
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
        organization_id: 'org-1',
        name: 'Latte Recipe',
        category: RecipeCategory.LECHE,
        servings: 1,
        ingredients: [
          {
            inventory_item_id: 'inv-1',
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
    it('should return filtered recipes', async () => {
      const query: QueryRecipesDto = {
        organization_id: 'org-1',
      };

      const recipes = [mockRecipe];

      mockRecipesService.findAll.mockResolvedValue(recipes);

      const result = await controller.findAll(query);

      expect(result).toEqual(recipes);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should return a recipe by id', async () => {
      mockRecipesService.findById.mockResolvedValue(mockRecipe);

      const result = await controller.findById('recipe-1');

      expect(result).toEqual(mockRecipe);
      expect(service.findById).toHaveBeenCalledWith('recipe-1');
    });
  });

  describe('calculateCost', () => {
    it('should calculate recipe cost', async () => {
      const costResult = {
        recipe_id: 'recipe-1',
        recipe_name: 'Latte Recipe',
        total_cost: 4.8,
        currency: 'MXN',
        ingredients: [
          {
            name: 'Whole Milk',
            quantity: 240,
            unit: 'ml',
            cost_per_unit: 0.02,
            total_cost: 4.8,
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
        estimated_time_minutes: 4,
      };

      const updatedRecipe = { ...mockRecipe, estimated_time_minutes: 4 };
      mockRecipesService.update.mockResolvedValue(updatedRecipe);

      const result = await controller.update('recipe-1', updateDto);

      expect(result).toEqual(updatedRecipe);
      expect(service.update).toHaveBeenCalledWith('recipe-1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a recipe', async () => {
      mockRecipesService.delete.mockResolvedValue(undefined);

      await controller.delete('recipe-1');

      expect(service.delete).toHaveBeenCalledWith('recipe-1');
    });
  });

  describe('getStats', () => {
    it('should return recipe statistics', async () => {
      const stats = {
        total: 10,
        by_category: {
          [RecipeCategory.LECHE]: 5,
          [RecipeCategory.ESPRESSO]: 3,
          [RecipeCategory.FILTRADO]: 2,
        },
        active: 8,
        inactive: 2,
      };

      mockRecipesService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats('org-1');

      expect(result).toEqual(stats);
      expect(service.getStats).toHaveBeenCalledWith('org-1');
    });
  });

  describe('analyzeProfitability', () => {
    it('should analyze recipe profitability', async () => {
      const analysis = {
        recipes: [
          {
            recipe_id: 'recipe-1',
            recipe_name: 'Latte',
            cost: 15.5,
            suggested_price: 50,
            margin_percentage: 68.9,
          },
        ],
      };

      mockRecipesService.analyzeProfitability.mockResolvedValue(analysis);

      const result = await controller.analyzeProfitability('org-1');

      expect(result).toEqual(analysis);
      expect(service.analyzeProfitability).toHaveBeenCalledWith('org-1');
    });
  });
});
