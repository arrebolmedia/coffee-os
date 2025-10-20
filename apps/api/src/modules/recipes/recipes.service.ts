import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateRecipeDto, UpdateRecipeDto, QueryRecipesDto, ScaleRecipeDto } from './dto';
import {
  Recipe,
  RecipeCostBreakdown,
  ScaledRecipe,
  RecipeStats,
  RecipeProfitability,
  RecipeIngredient,
} from './interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);
  private recipes: Map<string, Recipe> = new Map();

  /**
   * Crear una nueva receta
   */
  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    const recipe: Recipe = {
      id: uuidv4(),
      ...createRecipeDto,
      ingredients: createRecipeDto.ingredients.map((ing) => ({
        id: uuidv4(),
        ...ing,
        inventory_item_name: `Ingrediente ${ing.inventory_item_id.substring(0, 8)}`,
      })),
      steps: createRecipeDto.steps?.map((step) => ({
        id: uuidv4(),
        ...step,
      })),
      is_active: createRecipeDto.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Calcular costos
    const costBreakdown = await this.calculateCost(recipe.id, recipe);
    recipe.total_cost = costBreakdown.total_cost;
    recipe.cost_per_serving = costBreakdown.cost_per_serving;
    recipe.suggested_price = costBreakdown.suggested_price;
    recipe.actual_margin_percentage = recipe.target_margin_percentage || 65;

    this.recipes.set(recipe.id, recipe);
    this.logger.log(`Receta creada: ${recipe.name} (${recipe.id})`);

    return recipe;
  }

  /**
   * Obtener todas las recetas con filtros
   */
  async findAll(query?: QueryRecipesDto): Promise<Recipe[]> {
    let recipes = Array.from(this.recipes.values());

    if (!query) {
      return recipes.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Filtrar por organización
    if (query.organization_id) {
      recipes = recipes.filter((r) => r.organization_id === query.organization_id);
    }

    // Buscar por texto
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      recipes = recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower),
      );
    }

    // Filtrar por categoría
    if (query.category) {
      recipes = recipes.filter((r) => r.category === query.category);
    }

    // Filtrar por método de preparación
    if (query.preparation_method) {
      recipes = recipes.filter((r) => r.preparation_method === query.preparation_method);
    }

    // Filtrar por dificultad
    if (query.difficulty) {
      recipes = recipes.filter((r) => r.difficulty === query.difficulty);
    }

    // Filtrar por activo
    if (query.is_active !== undefined) {
      const isActive = query.is_active === 'true';
      recipes = recipes.filter((r) => r.is_active === isActive);
    }

    // Filtrar por costo máximo
    if (query.max_cost) {
      recipes = recipes.filter((r) => (r.total_cost || 0) <= query.max_cost!);
    }

    // Filtrar por margen mínimo
    if (query.min_margin) {
      recipes = recipes.filter(
        (r) => (r.actual_margin_percentage || 0) >= query.min_margin!,
      );
    }

    // Ordenar
    const sortBy = query.sort_by || 'name';
    const order = query.order || 'asc';

    recipes.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Recipe];
      let bValue: any = b[sortBy as keyof Recipe];

      if (sortBy === 'cost') {
        aValue = a.total_cost || 0;
        bValue = b.total_cost || 0;
      } else if (sortBy === 'margin') {
        aValue = a.actual_margin_percentage || 0;
        bValue = b.actual_margin_percentage || 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return recipes;
  }

  /**
   * Obtener una receta por ID
   */
  async findById(id: string): Promise<Recipe> {
    const recipe = this.recipes.get(id);
    if (!recipe) {
      throw new NotFoundException(`Receta ${id} no encontrada`);
    }
    return recipe;
  }

  /**
   * Actualizar una receta
   */
  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.findById(id);

    const updatedRecipe: Recipe = {
      ...recipe,
      ...updateRecipeDto,
      updated_at: new Date(),
    };

    // Si se actualizaron ingredientes, recalcular
    if (updateRecipeDto.ingredients) {
      updatedRecipe.ingredients = updateRecipeDto.ingredients.map((ing) => ({
        id: ing.inventory_item_id,
        ...ing,
        inventory_item_name: `Ingrediente ${ing.inventory_item_id.substring(0, 8)}`,
      }));

      const costBreakdown = await this.calculateCost(id, updatedRecipe);
      updatedRecipe.total_cost = costBreakdown.total_cost;
      updatedRecipe.cost_per_serving = costBreakdown.cost_per_serving;
      updatedRecipe.suggested_price = costBreakdown.suggested_price;
    }

    this.recipes.set(id, updatedRecipe);
    this.logger.log(`Receta actualizada: ${updatedRecipe.name}`);

    return updatedRecipe;
  }

  /**
   * Eliminar una receta
   */
  async delete(id: string): Promise<void> {
    const recipe = await this.findById(id);
    this.recipes.delete(id);
    this.logger.log(`Receta eliminada: ${recipe.name}`);
  }

  /**
   * Calcular el costo de una receta
   */
  async calculateCost(
    id: string,
    recipe?: Recipe,
  ): Promise<RecipeCostBreakdown> {
    if (!recipe) {
      recipe = await this.findById(id);
    }

    const ingredientsCost = recipe.ingredients.map((ing) => {
      const costPerUnit = ing.cost_per_unit || this.getMockCostPerUnit(ing.unit);
      const totalCost = ing.quantity * costPerUnit;

      return {
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name: ing.inventory_item_name || `Ingrediente ${ing.inventory_item_id}`,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: costPerUnit,
        total_cost: totalCost,
        percentage_of_total: 0, // Se calcula después
      };
    });

    const totalIngredientsCost = ingredientsCost.reduce(
      (sum, ing) => sum + ing.total_cost,
      0,
    );

    // Calcular porcentajes
    ingredientsCost.forEach((ing) => {
      ing.percentage_of_total =
        totalIngredientsCost > 0 ? (ing.total_cost / totalIngredientsCost) * 100 : 0;
    });

    // Labor cost (estimado 20% del costo de ingredientes)
    const laborCost = totalIngredientsCost * 0.2;

    // Overhead (estimado 10% del costo de ingredientes)
    const overheadCost = totalIngredientsCost * 0.1;

    const totalCost = totalIngredientsCost + laborCost + overheadCost;
    const costPerServing = totalCost / recipe.servings;

    // Precio sugerido basado en margen objetivo
    const targetMargin = recipe.target_margin_percentage || 65;
    const suggestedPrice = totalCost / (1 - targetMargin / 100);
    const suggestedPricePerServing = suggestedPrice / recipe.servings;

    return {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      servings: recipe.servings,
      ingredients_cost: ingredientsCost,
      total_ingredients_cost: Math.round(totalIngredientsCost * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
      overhead_cost: Math.round(overheadCost * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      cost_per_serving: Math.round(costPerServing * 100) / 100,
      target_margin_percentage: targetMargin,
      suggested_price: Math.round(suggestedPrice * 100) / 100,
      suggested_price_per_serving: Math.round(suggestedPricePerServing * 100) / 100,
    };
  }

  /**
   * Escalar una receta a diferentes porciones
   */
  async scaleRecipe(id: string, scaleDto: ScaleRecipeDto): Promise<ScaledRecipe> {
    const originalRecipe = await this.findById(id);
    const scalingFactor = scaleDto.target_servings / originalRecipe.servings;

    const scaledIngredients: RecipeIngredient[] = originalRecipe.ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity * scalingFactor,
      total_cost: ing.total_cost ? ing.total_cost * scalingFactor : undefined,
    }));

    const scaledRecipe: ScaledRecipe = {
      ...originalRecipe,
      original_servings: originalRecipe.servings,
      scaled_servings: scaleDto.target_servings,
      scaling_factor: scalingFactor,
      scaled_ingredients: scaledIngredients,
      servings: scaleDto.target_servings,
      ingredients: scaledIngredients, // Important: update ingredients for cost calculation
    };

    // Recalcular costos para la versión escalada
    const costBreakdown = await this.calculateCost(id, scaledRecipe);
    scaledRecipe.total_cost = costBreakdown.total_cost;
    scaledRecipe.cost_per_serving = costBreakdown.cost_per_serving;
    scaledRecipe.suggested_price = costBreakdown.suggested_price;

    return scaledRecipe;
  }

  /**
   * Obtener estadísticas de recetas
   */
  async getStats(organization_id: string): Promise<RecipeStats> {
    const recipes = Array.from(this.recipes.values()).filter(
      (r) => r.organization_id === organization_id,
    );

    const byCategory: any = {};
    const byDifficulty: any = {};
    const byPreparationMethod: any = {};

    let totalCost = 0;
    let totalMargin = 0;
    let countWithMargin = 0;

    recipes.forEach((recipe) => {
      // Por categoría
      byCategory[recipe.category] = (byCategory[recipe.category] || 0) + 1;

      // Por dificultad
      if (recipe.difficulty) {
        byDifficulty[recipe.difficulty] = (byDifficulty[recipe.difficulty] || 0) + 1;
      }

      // Por método de preparación
      if (recipe.preparation_method) {
        byPreparationMethod[recipe.preparation_method] =
          (byPreparationMethod[recipe.preparation_method] || 0) + 1;
      }

      // Costos y márgenes
      if (recipe.total_cost) {
        totalCost += recipe.total_cost;
      }

      if (recipe.actual_margin_percentage) {
        totalMargin += recipe.actual_margin_percentage;
        countWithMargin++;
      }
    });

    return {
      total_recipes: recipes.length,
      by_category: byCategory,
      by_difficulty: byDifficulty,
      by_preparation_method: byPreparationMethod,
      average_cost: recipes.length > 0 ? totalCost / recipes.length : 0,
      average_margin: countWithMargin > 0 ? totalMargin / countWithMargin : 0,
      total_value: totalCost,
    };
  }

  /**
   * Analizar rentabilidad de recetas
   */
  async analyzeProfitability(organization_id: string): Promise<RecipeProfitability[]> {
    const recipes = await this.findAll({ organization_id });

    return recipes
      .map((recipe) => {
        const cost = recipe.total_cost || 0;
        const suggestedPrice = recipe.suggested_price || 0;
        const marginPercentage = recipe.actual_margin_percentage || 0;

        // Profitability score: combina margen y costo
        // Recetas con mayor margen y menor costo son más rentables
        const profitabilityScore =
          marginPercentage * 0.7 + (cost > 0 ? (1 / cost) * 1000 : 0) * 0.3;

        return {
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          cost,
          suggested_price: suggestedPrice,
          margin_percentage: marginPercentage,
          profitability_score: Math.round(profitabilityScore * 100) / 100,
        };
      })
      .sort((a, b) => b.profitability_score - a.profitability_score);
  }

  /**
   * Obtener costos mock para desarrollo
   */
  private getMockCostPerUnit(unit: string): number {
    const mockCosts: Record<string, number> = {
      g: 0.5, // 0.50 MXN por gramo
      ml: 0.3, // 0.30 MXN por ml
      kg: 500, // 500 MXN por kg
      l: 300, // 300 MXN por litro
      oz: 10, // 10 MXN por onza
      pieza: 5, // 5 MXN por pieza
      unidad: 5,
    };

    return mockCosts[unit.toLowerCase()] || 1;
  }
}
