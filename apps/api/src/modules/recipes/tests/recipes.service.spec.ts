import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from '../recipes.service';
import { PrismaService } from '../../database/prisma.service';
import { CategoriesService } from '../../categories/categories.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DifficultyLevel,
  PreparationMethod,
  RecipeCategory,
} from '../dto/create-recipe.dto';

describe('RecipesService', () => {
  let service: RecipesService;
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  const mockRecipeDto: any = {
    organization_id: orgId,
    name: 'Espresso Doble',
    description: 'Espresso clásico de alta calidad',
    category: RecipeCategory.ESPRESSO,
    preparation_method: PreparationMethod.ESPRESSO_MACHINE,
    difficulty: DifficultyLevel.INTERMEDIO,
    servings: 1,
    serving_size_ml: 60,
    estimated_time_minutes: 3,
    target_margin_percentage: 70,
    ingredients: [
      {
        inventory_item_id: 'item-001',
        quantity: 18,
        unit: 'g',
        cost_per_unit: 0.5,
      },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Moler 18g',
        duration_seconds: 15,
        is_critical: true,
      },
      {
        step_number: 2,
        instruction: 'Extraer',
        duration_seconds: 30,
        is_critical: true,
      },
    ],
    allergens: [],
    is_active: true,
  };

  const recipeStore: any[] = [];

  const buildRecipe = (data: any, ingredientsCreate: any[] = []) => {
    const id = `recipe-${Date.now()}-${Math.random()}`;
    const ingredients = ingredientsCreate.map((ing, idx) => ({
      id: `ing-${id}-${idx}`,
      recipeId: id,
      inventoryItemId: ing.inventoryItemId,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes || null,
      unitCost: ing.unitCost ?? null,
      totalCost: ing.totalCost ?? null,
      inventoryItem: {
        id: ing.inventoryItemId,
        name: `Item ${ing.inventoryItemId}`,
        code: 'X',
        unitOfMeasure: ing.unit,
        costPerUnit: ing.unitCost ?? 0,
      },
    }));
    const totalCost = ingredients.reduce((s, i) => s + (i.totalCost || 0), 0);
    return {
      id,
      organizationId: data.organizationId || orgId,
      productId: data.productId || null,
      product: data.productId
        ? { id: data.productId, name: 'P', organizationId: data.organizationId }
        : null,
      name: data.name,
      description: data.description || null,
      instructions: data.instructions || null,
      yield: data.yield || 1,
      yieldUnit: data.yieldUnit || 'unit',
      prepTime: data.prepTime || 0,
      allergens: data.allergens || [],
      videoUrl: data.videoUrl || null,
      totalCost,
      costingStatus: 'COMPLETE',
      readyForPos: false,
      lastCostedAt: new Date(),
      version: 1,
      active: data.active !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients,
    };
  };

  const mockPrismaService: any = {
    recipe: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockImplementation((args: any = {}) => {
        const where = args?.where || {};
        let results = [...recipeStore];
        if (where.organizationId)
          results = results.filter(
            (r) => r.organizationId === where.organizationId,
          );
        if (where.active !== undefined)
          results = results.filter((r) => r.active === where.active);
        return Promise.resolve(results);
      }),
      findUnique: jest.fn().mockImplementation((args: any) => {
        const found = recipeStore.find((r) => r.id === args?.where?.id);
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation((args: any) => {
        const ingredientsCreate = args.data?.ingredients?.create || [];
        const recipe = buildRecipe(args.data || {}, ingredientsCreate);
        recipeStore.push(recipe);
        return Promise.resolve(recipe);
      }),
      update: jest.fn().mockImplementation((args: any) => {
        const idx = recipeStore.findIndex((r) => r.id === args?.where?.id);
        if (idx < 0) return Promise.reject(new Error('Not found'));
        const updated = {
          ...recipeStore[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        recipeStore[idx] = updated;
        return Promise.resolve(updated);
      }),
      delete: jest.fn().mockImplementation((args: any) => {
        const idx = recipeStore.findIndex((r) => r.id === args?.where?.id);
        if (idx < 0) return Promise.reject(new Error('Not found'));
        const [removed] = recipeStore.splice(idx, 1);
        return Promise.resolve(removed);
      }),
    },
    recipeIngredient: {
      deleteMany: jest.fn().mockImplementation((args: any) => {
        const recipeId = args?.where?.recipeId;
        const recipe = recipeStore.find((r) => r.id === recipeId);
        if (recipe) recipe.ingredients = [];
        return Promise.resolve({ count: 0 });
      }),
      createMany: jest.fn().mockImplementation((args: any) => {
        const list = args?.data || [];
        list.forEach((ing: any) => {
          const recipe = recipeStore.find((r) => r.id === ing.recipeId);
          if (recipe) {
            recipe.ingredients.push({
              id: `ing-${Date.now()}-${Math.random()}`,
              recipeId: ing.recipeId,
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes || null,
              unitCost: ing.unitCost ?? null,
              totalCost: ing.totalCost ?? null,
              inventoryItem: {
                id: ing.inventoryItemId,
                name: `Item ${ing.inventoryItemId}`,
                code: 'X',
                unitOfMeasure: ing.unit,
                costPerUnit: ing.unitCost ?? 0,
              },
            });
            recipe.totalCost = recipe.ingredients.reduce(
              (s: number, i: any) => s + (i.totalCost || 0),
              0,
            );
          }
        });
        return Promise.resolve({ count: list.length });
      }),
    },
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest
      .fn()
      .mockImplementation((ops: Promise<any>[]) => Promise.all(ops)),
  };

  const mockCategoriesService = {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    recipeStore.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a recipe', async () => {
      const recipe = await service.create(mockRecipeDto);
      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBe('Espresso Doble');
      expect(recipe.ingredients).toHaveLength(1);
      expect(recipe.total_cost).toBe(9); // 18 * 0.5
    });

    it('should handle minimal fields', async () => {
      const minimal: any = {
        organization_id: orgId,
        name: 'Café',
        category: RecipeCategory.FILTRADO,
        servings: 1,
        ingredients: [{ inventory_item_id: 'i', quantity: 15, unit: 'g' }],
      };
      const recipe = await service.create(minimal);
      expect(recipe.is_active).toBe(true);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(mockRecipeDto);
      await service.create({ ...mockRecipeDto, name: 'Cappuccino' });
      await service.create({
        ...mockRecipeDto,
        name: 'Cold Brew',
        is_active: false,
      });
    });

    it('should return all recipes for org', async () => {
      const recipes = await service.findAll({ organization_id: orgId });
      expect(recipes).toHaveLength(3);
    });

    it('should filter by is_active', async () => {
      const inactives = await service.findAll({
        organization_id: orgId,
        is_active: 'false',
      });
      expect(inactives.every((r) => !r.is_active)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return recipe by id', async () => {
      const created = await service.create(mockRecipeDto);
      const found = await service.findById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException for non-existent', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost breakdown with labor and overhead', async () => {
      const recipe = await service.create(mockRecipeDto);
      const breakdown = await service.calculateCost(recipe.id);
      expect(breakdown.total_ingredients_cost).toBe(9);
      expect(breakdown.labor_cost).toBe(1.8); // 9 * 0.2
      expect(breakdown.overhead_cost).toBe(0.9); // 9 * 0.1
      expect(breakdown.total_cost).toBe(11.7);
      expect(breakdown.suggested_price).toBeGreaterThan(0);
    });

    it('should throw BadRequest if servings is 0', async () => {
      const recipe = await service.create(mockRecipeDto);
      // Pass an explicit recipe with servings=0 to bypass toRecipe's fallback
      const invalidRecipe = { ...recipe, servings: 0 };
      await expect(
        service.calculateCost(recipe.id, invalidRecipe as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('scaleRecipe', () => {
    it('should scale up 2x', async () => {
      const recipe = await service.create(mockRecipeDto);
      const scaled = await service.scaleRecipe(recipe.id, {
        target_servings: 2,
      });
      expect(scaled.scaling_factor).toBe(2);
      expect(scaled.scaled_ingredients[0].quantity).toBe(36);
    });

    it('should scale down 0.5x', async () => {
      const recipe = await service.create({ ...mockRecipeDto, servings: 4 });
      const scaled = await service.scaleRecipe(recipe.id, {
        target_servings: 2,
      });
      expect(scaled.scaling_factor).toBe(0.5);
      expect(scaled.scaled_ingredients[0].quantity).toBe(9);
    });
  });

  describe('update', () => {
    it('should update basic fields', async () => {
      const recipe = await service.create(mockRecipeDto);
      const updated = await service.update(recipe.id, {
        name: 'Espresso Triple',
        servings: 3,
      });
      expect(updated.name).toBe('Espresso Triple');
      expect(updated.servings).toBe(3);
    });

    it('should update ingredients via transaction', async () => {
      const recipe = await service.create(mockRecipeDto);
      const updated = await service.update(recipe.id, {
        ingredients: [
          {
            inventory_item_id: 'item-001',
            quantity: 20,
            unit: 'g',
            cost_per_unit: 1,
          },
        ],
      });
      expect(updated).toBeDefined();
      expect(updated.total_cost).toBe(20);
    });

    it('should throw NotFound if recipe missing', async () => {
      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a recipe', async () => {
      const recipe = await service.create(mockRecipeDto);
      await expect(service.delete(recipe.id)).resolves.toBeUndefined();
      await expect(service.findById(recipe.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFound if not found', async () => {
      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return stats for org', async () => {
      await service.create(mockRecipeDto);
      await service.create({ ...mockRecipeDto, name: 'B' });
      const stats = await service.getStats(orgId);
      expect(stats.total_recipes).toBe(2);
      expect(stats.average_cost).toBeGreaterThan(0);
    });
  });

  describe('analyzeProfitability', () => {
    it('should return profitability sorted by score', async () => {
      await service.create({
        ...mockRecipeDto,
        name: 'Cheap',
        target_margin_percentage: 80,
        ingredients: [
          {
            inventory_item_id: 'item-001',
            quantity: 10,
            unit: 'g',
            cost_per_unit: 0.3,
          },
        ],
      });
      await service.create({
        ...mockRecipeDto,
        name: 'Expensive',
        target_margin_percentage: 50,
        ingredients: [
          {
            inventory_item_id: 'item-002',
            quantity: 100,
            unit: 'g',
            cost_per_unit: 2,
          },
        ],
      });

      const profitability = await service.analyzeProfitability(orgId);
      expect(profitability).toHaveLength(2);
      expect(profitability[0].profitability_score).toBeGreaterThanOrEqual(
        profitability[1].profitability_score,
      );
    });
  });
});
