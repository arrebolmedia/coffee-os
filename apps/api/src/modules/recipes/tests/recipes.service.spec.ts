import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from '../recipes.service';
import { NotFoundException } from '@nestjs/common';
import {
  RecipeCategory,
  PreparationMethod,
  DifficultyLevel,
} from '../dto/create-recipe.dto';

describe('RecipesService', () => {
  let service: RecipesService;

  const mockRecipeDto = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
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
        instruction: 'Moler 18g de café arábica a textura fina',
        duration_seconds: 15,
        is_critical: true,
      },
      {
        step_number: 2,
        instruction: 'Extraer espresso a 9 bares por 25-30 segundos',
        duration_seconds: 30,
        is_critical: true,
      },
    ],
    preparation_parameters: {
      dose_grams: 18,
      extraction_time_seconds: 27,
      pressure_bars: 9,
    },
    nutritional_info: {
      calories: 5,
      caffeine_mg: 120,
    },
    allergens: [],
    is_active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecipesService],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a recipe with all fields', async () => {
      const recipe = await service.create(mockRecipeDto);

      expect(recipe).toBeDefined();
      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBe('Espresso Doble');
      expect(recipe.category).toBe(RecipeCategory.ESPRESSO);
      expect(recipe.ingredients).toHaveLength(1);
      expect(recipe.steps).toHaveLength(2);
      expect(recipe.total_cost).toBeDefined();
      expect(recipe.cost_per_serving).toBeDefined();
      expect(recipe.suggested_price).toBeDefined();
    });

    it('should calculate costs automatically on creation', async () => {
      const recipe = await service.create(mockRecipeDto);

      // 18g * 0.5 MXN/g = 9 MXN ingredientes
      // Labor 20% = 1.8 MXN
      // Overhead 10% = 0.9 MXN
      // Total = 11.7 MXN
      expect(recipe.total_cost).toBe(11.7);
      expect(recipe.cost_per_serving).toBe(11.7);

      // Precio sugerido con 70% margen
      // 11.7 / (1 - 0.70) = 39 MXN
      expect(recipe.suggested_price).toBe(39);
    });

    it('should create recipe with minimal fields', async () => {
      const minimalDto = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Café Americano',
        category: RecipeCategory.FILTRADO,
        servings: 1,
        ingredients: [
          {
            inventory_item_id: 'item-002',
            quantity: 15,
            unit: 'g',
          },
        ],
      };

      const recipe = await service.create(minimalDto);

      expect(recipe).toBeDefined();
      expect(recipe.name).toBe('Café Americano');
      expect(recipe.is_active).toBe(true);
      expect(recipe.steps).toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(mockRecipeDto);
      await service.create({
        ...mockRecipeDto,
        name: 'Cappuccino',
        category: RecipeCategory.LECHE,
        difficulty: DifficultyLevel.AVANZADO,
      });
      await service.create({
        ...mockRecipeDto,
        name: 'Cold Brew',
        category: RecipeCategory.COLD_BREW,
        preparation_method: PreparationMethod.COLD_BREW_MAKER,
        is_active: false,
      });
    });

    it('should return all recipes', async () => {
      const recipes = await service.findAll();
      expect(recipes).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const recipes = await service.findAll({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(recipes).toHaveLength(3);
    });

    it('should filter by category', async () => {
      const recipes = await service.findAll({
        category: RecipeCategory.LECHE,
      });
      expect(recipes).toHaveLength(1);
      expect(recipes[0].name).toBe('Cappuccino');
    });

    it('should filter by preparation method', async () => {
      const recipes = await service.findAll({
        preparation_method: PreparationMethod.COLD_BREW_MAKER,
      });
      expect(recipes).toHaveLength(1);
      expect(recipes[0].name).toBe('Cold Brew');
    });

    it('should filter by difficulty', async () => {
      const recipes = await service.findAll({
        difficulty: DifficultyLevel.AVANZADO,
      });
      expect(recipes).toHaveLength(1);
      expect(recipes[0].name).toBe('Cappuccino');
    });

    it('should filter by is_active', async () => {
      const activeRecipes = await service.findAll({ is_active: 'true' });
      expect(activeRecipes).toHaveLength(2);

      const inactiveRecipes = await service.findAll({ is_active: 'false' });
      expect(inactiveRecipes).toHaveLength(1);
    });

    it('should search by name', async () => {
      const recipes = await service.findAll({ search: 'Doble' });
      expect(recipes).toHaveLength(1);
      expect(recipes[0].name).toBe('Espresso Doble');
    });

    it('should sort by name ascending', async () => {
      const recipes = await service.findAll({
        sort_by: 'name',
        order: 'asc',
      });
      expect(recipes[0].name).toBe('Cappuccino');
      expect(recipes[2].name).toBe('Espresso Doble');
    });

    it('should sort by cost descending', async () => {
      const recipes = await service.findAll({
        sort_by: 'cost',
        order: 'desc',
      });
      expect(recipes[0].total_cost).toBeGreaterThanOrEqual(
        recipes[1].total_cost || 0,
      );
    });
  });

  describe('findById', () => {
    it('should return a recipe by id', async () => {
      const created = await service.create(mockRecipeDto);
      const found = await service.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Espresso Doble');
    });

    it('should throw NotFoundException for non-existent recipe', async () => {
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate detailed cost breakdown', async () => {
      const recipe = await service.create(mockRecipeDto);
      const costBreakdown = await service.calculateCost(recipe.id);

      expect(costBreakdown).toBeDefined();
      expect(costBreakdown.recipe_id).toBe(recipe.id);
      expect(costBreakdown.recipe_name).toBe('Espresso Doble');
      expect(costBreakdown.ingredients_cost).toHaveLength(1);
      expect(costBreakdown.total_ingredients_cost).toBe(9); // 18g * 0.5
      expect(costBreakdown.labor_cost).toBe(1.8); // 20% of 9
      expect(costBreakdown.overhead_cost).toBe(0.9); // 10% of 9
      expect(costBreakdown.total_cost).toBe(11.7);
      expect(costBreakdown.cost_per_serving).toBe(11.7);
      expect(costBreakdown.suggested_price).toBe(39); // 11.7 / 0.3
      expect(costBreakdown.suggested_price_per_serving).toBe(39);
    });

    it('should include ingredient cost details with percentages', async () => {
      const recipeWithMultipleIngredients = await service.create({
        ...mockRecipeDto,
        ingredients: [
          {
            inventory_item_id: 'item-001',
            quantity: 18,
            unit: 'g',
            cost_per_unit: 0.5,
          },
          {
            inventory_item_id: 'item-002',
            quantity: 200,
            unit: 'ml',
            cost_per_unit: 0.3,
          },
        ],
      });

      const costBreakdown = await service.calculateCost(
        recipeWithMultipleIngredients.id,
      );

      expect(costBreakdown.ingredients_cost).toHaveLength(2);
      
      const cafeIngredient = costBreakdown.ingredients_cost.find(
        (i) => i.inventory_item_id === 'item-001',
      );
      expect(cafeIngredient).toBeDefined();
      expect(cafeIngredient?.total_cost).toBe(9); // 18 * 0.5
      expect(cafeIngredient?.percentage_of_total).toBeCloseTo(13.04, 0); // 9 / 69 * 100

      const lecheIngredient = costBreakdown.ingredients_cost.find(
        (i) => i.inventory_item_id === 'item-002',
      );
      expect(lecheIngredient).toBeDefined();
      expect(lecheIngredient?.total_cost).toBe(60); // 200 * 0.3
      expect(lecheIngredient?.percentage_of_total).toBeCloseTo(86.96, 0); // 60 / 69 * 100
    });
  });

  describe('scaleRecipe', () => {
    it('should scale recipe up (2x)', async () => {
      const recipe = await service.create(mockRecipeDto);
      const scaled = await service.scaleRecipe(recipe.id, {
        target_servings: 2,
      });

      expect(scaled.original_servings).toBe(1);
      expect(scaled.scaled_servings).toBe(2);
      expect(scaled.scaling_factor).toBe(2);
      expect(scaled.scaled_ingredients).toHaveLength(1);
      expect(scaled.scaled_ingredients[0].quantity).toBe(36); // 18 * 2
    });

    it('should scale recipe down (0.5x)', async () => {
      const recipe = await service.create({
        ...mockRecipeDto,
        servings: 4,
      });
      const scaled = await service.scaleRecipe(recipe.id, {
        target_servings: 2,
      });

      expect(scaled.original_servings).toBe(4);
      expect(scaled.scaled_servings).toBe(2);
      expect(scaled.scaling_factor).toBe(0.5);
      expect(scaled.scaled_ingredients[0].quantity).toBe(9); // 18 * 0.5
    });

    it('should recalculate costs for scaled recipe', async () => {
      const recipe = await service.create(mockRecipeDto);
      const scaled = await service.scaleRecipe(recipe.id, {
        target_servings: 4,
      });

      // Original: 11.7 MXN for 1 serving
      // Scaled: 11.7 * 4 = 46.8 MXN for 4 servings
      expect(scaled.total_cost).toBe(46.8);
      expect(scaled.cost_per_serving).toBe(11.7); // Same per serving
    });
  });

  describe('update', () => {
    it('should update recipe basic fields', async () => {
      const recipe = await service.create(mockRecipeDto);
      const updated = await service.update(recipe.id, {
        name: 'Espresso Triple',
        servings: 3,
      });

      expect(updated.name).toBe('Espresso Triple');
      expect(updated.servings).toBe(3);
      expect(updated.updated_at).not.toBe(recipe.updated_at);
    });

    it('should recalculate costs when updating ingredients', async () => {
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

      // 20g * 1 MXN/g = 20 MXN ingredientes
      // Labor 20% = 4 MXN
      // Overhead 10% = 2 MXN
      // Total = 26 MXN
      expect(updated.total_cost).toBe(26);
    });

    it('should throw NotFoundException for non-existent recipe', async () => {
      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a recipe', async () => {
      const recipe = await service.create(mockRecipeDto);
      await service.delete(recipe.id);

      await expect(service.findById(recipe.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-existent recipe', async () => {
      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        ...mockRecipeDto,
        category: RecipeCategory.ESPRESSO,
        difficulty: DifficultyLevel.INTERMEDIO,
      });
      await service.create({
        ...mockRecipeDto,
        name: 'Cappuccino',
        category: RecipeCategory.LECHE,
        difficulty: DifficultyLevel.AVANZADO,
      });
      await service.create({
        ...mockRecipeDto,
        name: 'Cold Brew',
        category: RecipeCategory.COLD_BREW,
        difficulty: DifficultyLevel.FACIL,
      });
    });

    it('should return recipe statistics', async () => {
      const stats = await service.getStats(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(stats.total_recipes).toBe(3);
      expect(stats.by_category[RecipeCategory.ESPRESSO]).toBe(1);
      expect(stats.by_category[RecipeCategory.LECHE]).toBe(1);
      expect(stats.by_category[RecipeCategory.COLD_BREW]).toBe(1);
      expect(stats.by_difficulty[DifficultyLevel.FACIL]).toBe(1);
      expect(stats.by_difficulty[DifficultyLevel.INTERMEDIO]).toBe(1);
      expect(stats.by_difficulty[DifficultyLevel.AVANZADO]).toBe(1);
      expect(stats.average_cost).toBeGreaterThan(0);
      expect(stats.average_margin).toBeGreaterThan(0);
    });
  });

  describe('analyzeProfitability', () => {
    it('should return profitability analysis sorted by score', async () => {
      // Receta con alto margen y bajo costo (más rentable)
      await service.create({
        ...mockRecipeDto,
        name: 'Café Filtrado',
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

      // Receta con bajo margen y alto costo (menos rentable)
      await service.create({
        ...mockRecipeDto,
        name: 'Bebida Especial',
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

      const profitability = await service.analyzeProfitability(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(profitability).toHaveLength(2);
      expect(profitability[0].profitability_score).toBeGreaterThan(
        profitability[1].profitability_score,
      );
      expect(profitability[0].recipe_name).toBe('Café Filtrado');
    });

    it('should include all profitability metrics', async () => {
      await service.create(mockRecipeDto);

      const profitability = await service.analyzeProfitability(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(profitability).toHaveLength(1);
      expect(profitability[0]).toHaveProperty('recipe_id');
      expect(profitability[0]).toHaveProperty('recipe_name');
      expect(profitability[0]).toHaveProperty('cost');
      expect(profitability[0]).toHaveProperty('suggested_price');
      expect(profitability[0]).toHaveProperty('margin_percentage');
      expect(profitability[0]).toHaveProperty('profitability_score');
    });
  });
});
