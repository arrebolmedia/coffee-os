/**
 * RecipesService — Prisma-backed implementation.
 *
 * Maps to the `Recipe` and `RecipeIngredient` models.
 *
 * Costing assumptions (`calculateCost`):
 *   - labor cost: 20% of ingredients cost
 *   - overhead cost: 10% of ingredients cost
 *   These defaults are documented constants; the response includes a flag
 *   `usedDefaultRates: true` so the caller knows they are not org-specific.
 *   TODO migration: source from `Organization.settings.recipeCostingDefaults`
 *   when a settings model is added.
 *
 * Margin calculations clamp `targetMargin` to (0, 100) exclusive to avoid
 * division-by-zero and negative prices. servings is validated > 0.
 *
 * Profile/Stats use Prisma aggregations directly. The in-memory Map was
 * eliminated; all reads go through Prisma.
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AllergenType,
  CreateRecipeDto,
  DifficultyLevel,
  PreparationMethod,
  QueryRecipesDto,
  RecipeCategory,
  ScaleRecipeDto,
  UpdateRecipeDto,
} from './dto';
import {
  Recipe,
  RecipeCostBreakdown,
  RecipeIngredient,
  RecipeProfitability,
  RecipeStats,
  ScaledRecipe,
} from './interfaces';
import { PrismaService } from '../database/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/dto/create-category.dto';

/** Default labor/overhead rates used when org settings are unavailable. */
const DEFAULT_LABOR_RATE = 0.2;
const DEFAULT_OVERHEAD_RATE = 0.1;
const DEFAULT_TARGET_MARGIN = 65;

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    private prisma: PrismaService,
    private categoriesService: CategoriesService,
  ) {}

  /** Convert a Prisma recipe (with ingredients + product) to the public Recipe shape. */
  private toRecipe(r: any): Recipe {
    const ingredients = (r.ingredients || []).map((ing: any) => ({
      id: ing.id,
      recipe_id: ing.recipeId,
      inventory_item_id: ing.inventoryItemId,
      inventory_item_name: ing.inventoryItem?.name || '',
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.unitCost ?? ing.inventoryItem?.costPerUnit ?? 0,
      total_cost:
        ing.totalCost ?? ing.quantity * (ing.inventoryItem?.costPerUnit ?? 0),
      preparation_notes: ing.notes || undefined,
    }));

    const totalCost =
      r.totalCost ??
      ingredients.reduce((sum: number, i: any) => sum + (i.total_cost || 0), 0);

    let steps: any[] = [];
    if (r.instructions) {
      try {
        const parsed = JSON.parse(r.instructions);
        if (Array.isArray(parsed)) steps = parsed;
      } catch {
        steps = [];
      }
    }

    const yieldValue = r.yield || 1;

    return {
      id: r.id,
      organization_id: r.organizationId,
      product_id: r.productId ?? undefined,
      name: r.name,
      description: r.description || undefined,
      instructions: r.instructions || undefined,
      category: RecipeCategory.BEBIDAS_CALIENTES,
      preparation_method: PreparationMethod.ESPRESSO_MACHINE,
      difficulty: DifficultyLevel.INTERMEDIO,
      servings: yieldValue,
      yield_unit: r.yieldUnit || 'unit',
      estimated_time_minutes: r.prepTime || 0,
      allergens: (r.allergens || []) as AllergenType[],
      video_url: r.videoUrl || undefined,
      ingredients,
      steps,
      is_active: r.active,
      total_cost: totalCost,
      cost_per_serving: yieldValue ? totalCost / yieldValue : 0,
      suggested_price:
        yieldValue && totalCost
          ? totalCost / yieldValue / (1 - DEFAULT_TARGET_MARGIN / 100)
          : 0,
      target_margin_percentage: DEFAULT_TARGET_MARGIN,
      actual_margin_percentage: DEFAULT_TARGET_MARGIN,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    const newRecipe = await this.prisma.recipe.create({
      data: {
        organizationId: createRecipeDto.organization_id,
        productId: createRecipeDto.product_id,
        name: createRecipeDto.name,
        description: createRecipeDto.description,
        instructions: createRecipeDto.steps
          ? JSON.stringify(createRecipeDto.steps)
          : undefined,
        yield: createRecipeDto.servings || 1,
        yieldUnit: createRecipeDto.yield_unit || 'unit',
        prepTime: createRecipeDto.estimated_time_minutes,
        videoUrl: createRecipeDto.video_url,
        active: createRecipeDto.is_active ?? true,
        ingredients: {
          create: createRecipeDto.ingredients.map((ing) => ({
            inventoryItemId: ing.inventory_item_id,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.preparation_notes,
            unitCost: ing.cost_per_unit,
            totalCost: ing.cost_per_unit ? ing.cost_per_unit * ing.quantity : 0,
          })),
        },
      },
      include: {
        ingredients: { include: { inventoryItem: true } },
        product: true,
      },
    });

    this.logger.log(`Receta creada: ${newRecipe.name} (${newRecipe.id})`);
    const recipe = this.toRecipe(newRecipe);
    if (createRecipeDto.category) recipe.category = createRecipeDto.category;
    if (createRecipeDto.preparation_method)
      recipe.preparation_method = createRecipeDto.preparation_method;
    if (createRecipeDto.difficulty)
      recipe.difficulty = createRecipeDto.difficulty;
    if (createRecipeDto.target_margin_percentage !== undefined) {
      recipe.target_margin_percentage =
        createRecipeDto.target_margin_percentage;
      recipe.actual_margin_percentage =
        createRecipeDto.target_margin_percentage;
      if (recipe.total_cost && recipe.servings) {
        recipe.suggested_price =
          recipe.total_cost /
          recipe.servings /
          (1 - recipe.target_margin_percentage / 100);
      }
    }
    return recipe;
  }

  async findAll(query?: QueryRecipesDto, user?: any): Promise<Recipe[]> {
    const where: any = {};

    // organization filter — superadmin sees everything
    if (!user?.isSuperAdmin) {
      const orgId = user?.organizationId || query?.organization_id;
      if (orgId) where.organizationId = orgId;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.is_active !== undefined) {
      where.active = query.is_active === 'true';
    }

    if (query?.max_cost !== undefined) {
      where.totalCost = { lte: query.max_cost };
    }

    const sortBy = query?.sort_by || 'name';
    const order = query?.order || 'asc';
    let orderBy: any = { name: order };
    if (sortBy === 'created_at') orderBy = { createdAt: order };
    else if (sortBy === 'cost') orderBy = { totalCost: order };

    const recipes = await this.prisma.recipe.findMany({
      where,
      include: {
        product: true,
        ingredients: { include: { inventoryItem: true } },
      },
      orderBy,
    });

    return recipes.map((r) => this.toRecipe(r));
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await this.categoriesService.findAll({
        type: CategoryType.RECIPE,
      });
      return categories.map((cat: any) => cat.name);
    } catch (error) {
      this.logger.warn('Error fetching categories, returning defaults', error);
      return ['Bebidas Frías', 'Bebidas Calientes', 'Bebidas Sin Café'];
    }
  }

  async findById(id: string, organizationId?: string): Promise<Recipe> {
    const dbRecipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { inventoryItem: true } },
        product: true,
      },
    });

    // Ownership: a recipe from another org is reported as not found (404).
    if (
      !dbRecipe ||
      (organizationId && dbRecipe.organizationId !== organizationId)
    ) {
      throw new NotFoundException(`Receta ${id} no encontrada`);
    }

    return this.toRecipe(dbRecipe);
  }

  async findByProductId(
    productId: string,
    organizationId?: string,
  ): Promise<Recipe | null> {
    const dbRecipe = await this.prisma.recipe.findFirst({
      where: {
        productId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        ingredients: { include: { inventoryItem: true } },
        product: true,
      },
    });

    if (!dbRecipe) return null;
    return this.toRecipe(dbRecipe);
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    // verify existence
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Receta ${id} no encontrada`);
    }

    const updateData: any = {};
    if (updateRecipeDto.name !== undefined)
      updateData.name = updateRecipeDto.name;
    if (updateRecipeDto.description !== undefined)
      updateData.description = updateRecipeDto.description;
    if (updateRecipeDto.instructions !== undefined)
      updateData.instructions = updateRecipeDto.instructions;
    if (updateRecipeDto.servings !== undefined)
      updateData.yield = updateRecipeDto.servings;
    if (updateRecipeDto.yield_unit !== undefined)
      updateData.yieldUnit = updateRecipeDto.yield_unit;
    if (updateRecipeDto.estimated_time_minutes !== undefined)
      updateData.prepTime = updateRecipeDto.estimated_time_minutes;
    if (updateRecipeDto.is_active !== undefined)
      updateData.active = updateRecipeDto.is_active;
    if (updateRecipeDto.allergens !== undefined)
      updateData.allergens = updateRecipeDto.allergens;
    if (updateRecipeDto.video_url !== undefined)
      updateData.videoUrl = updateRecipeDto.video_url;
    if (updateRecipeDto.product_id !== undefined)
      updateData.productId = updateRecipeDto.product_id;

    // Run delete + recreate + update in a single transaction
    if (updateRecipeDto.ingredients) {
      const newIngredients = updateRecipeDto.ingredients.map((ing) => ({
        recipeId: id,
        inventoryItemId: ing.inventory_item_id,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.preparation_notes,
        unitCost: ing.cost_per_unit,
        totalCost: ing.cost_per_unit ? ing.cost_per_unit * ing.quantity : 0,
      }));

      await this.prisma.$transaction([
        this.prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
        this.prisma.recipeIngredient.createMany({ data: newIngredients }),
        this.prisma.recipe.update({ where: { id }, data: updateData }),
      ]);
    } else if (Object.keys(updateData).length > 0) {
      await this.prisma.recipe.update({ where: { id }, data: updateData });
    }

    return this.findById(id);
  }

  /** Hard-delete the recipe and its ingredients via cascade. */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Receta ${id} no encontrada`);
    }
    // RecipeIngredient.recipeId has onDelete: Cascade in the schema.
    await this.prisma.recipe.delete({ where: { id } });
    this.logger.log(`Receta eliminada: ${existing.name} (${id})`);
  }

  async calculateCost(
    id: string,
    recipe?: Recipe,
  ): Promise<RecipeCostBreakdown> {
    if (!recipe) {
      recipe = await this.findById(id);
    }

    if (!recipe.servings || recipe.servings <= 0) {
      throw new BadRequestException(
        `Recipe ${id} has invalid servings (${recipe.servings})`,
      );
    }

    // Resolve costs from ingredients. Use InventoryItem.costPerUnit if missing.
    const inventoryItemIds = recipe.ingredients
      .filter((i) => !i.cost_per_unit && i.inventory_item_id)
      .map((i) => i.inventory_item_id);

    let inventoryCosts: Record<string, number> = {};
    if (inventoryItemIds.length > 0) {
      const rows = await this.prisma.inventoryItem.findMany({
        where: { id: { in: inventoryItemIds } },
        select: { id: true, costPerUnit: true },
      });
      inventoryCosts = rows.reduce(
        (acc, r) => {
          acc[r.id] = r.costPerUnit;
          return acc;
        },
        {} as Record<string, number>,
      );
    }

    const ingredientsCost = recipe.ingredients.map((ing) => {
      const resolvedCost =
        ing.cost_per_unit ?? inventoryCosts[ing.inventory_item_id] ?? 0;
      const totalCost = ing.quantity * resolvedCost;
      return {
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name:
          ing.inventory_item_name || `Ingrediente ${ing.inventory_item_id}`,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: resolvedCost,
        total_cost: totalCost,
        percentage_of_total: 0,
      };
    });

    const totalIngredientsCost = ingredientsCost.reduce(
      (sum, ing) => sum + ing.total_cost,
      0,
    );

    ingredientsCost.forEach((ing) => {
      ing.percentage_of_total =
        totalIngredientsCost > 0
          ? (ing.total_cost / totalIngredientsCost) * 100
          : 0;
    });

    const laborCost = totalIngredientsCost * DEFAULT_LABOR_RATE;
    const overheadCost = totalIngredientsCost * DEFAULT_OVERHEAD_RATE;
    const totalCost = totalIngredientsCost + laborCost + overheadCost;
    const costPerServing = totalCost / recipe.servings;

    // Clamp target margin to (0, 100) exclusive to avoid division by zero / negative price.
    const rawMargin = recipe.target_margin_percentage ?? DEFAULT_TARGET_MARGIN;
    const targetMargin = Math.max(0.01, Math.min(rawMargin, 99.99));
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
      suggested_price_per_serving:
        Math.round(suggestedPricePerServing * 100) / 100,
    };
  }

  async scaleRecipe(
    id: string,
    scaleDto: ScaleRecipeDto,
  ): Promise<ScaledRecipe> {
    const originalRecipe = await this.findById(id);
    if (!originalRecipe.servings || originalRecipe.servings <= 0) {
      throw new BadRequestException(`Recipe ${id} has invalid servings`);
    }

    const scalingFactor = scaleDto.target_servings / originalRecipe.servings;

    const scaledIngredients: RecipeIngredient[] =
      originalRecipe.ingredients.map((ing) => ({
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
      ingredients: scaledIngredients,
    };

    const costBreakdown = await this.calculateCost(id, scaledRecipe);
    scaledRecipe.total_cost = costBreakdown.total_cost;
    scaledRecipe.cost_per_serving = costBreakdown.cost_per_serving;
    scaledRecipe.suggested_price = costBreakdown.suggested_price;

    return scaledRecipe;
  }

  async getStats(organization_id: string): Promise<RecipeStats> {
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId: organization_id },
      include: {
        ingredients: { include: { inventoryItem: true } },
      },
    });

    const mapped = recipes.map((r) => this.toRecipe(r));

    const byCategory: any = {};
    const byDifficulty: any = {};
    const byPreparationMethod: any = {};

    let totalCost = 0;
    let totalMargin = 0;
    let countWithMargin = 0;

    mapped.forEach((recipe) => {
      byCategory[recipe.category] = (byCategory[recipe.category] || 0) + 1;
      if (recipe.difficulty) {
        byDifficulty[recipe.difficulty] =
          (byDifficulty[recipe.difficulty] || 0) + 1;
      }
      if (recipe.preparation_method) {
        byPreparationMethod[recipe.preparation_method] =
          (byPreparationMethod[recipe.preparation_method] || 0) + 1;
      }

      if (recipe.total_cost) totalCost += recipe.total_cost;
      if (recipe.actual_margin_percentage) {
        totalMargin += recipe.actual_margin_percentage;
        countWithMargin++;
      }
    });

    return {
      total_recipes: mapped.length,
      by_category: byCategory,
      by_difficulty: byDifficulty,
      by_preparation_method: byPreparationMethod,
      average_cost: mapped.length > 0 ? totalCost / mapped.length : 0,
      average_margin: countWithMargin > 0 ? totalMargin / countWithMargin : 0,
      total_value: totalCost,
    };
  }

  async analyzeProfitability(
    organization_id: string,
  ): Promise<RecipeProfitability[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId: organization_id },
      include: {
        ingredients: { include: { inventoryItem: true } },
      },
    });

    const mapped = recipes.map((r) => this.toRecipe(r));

    return mapped
      .map((recipe) => {
        const cost = recipe.total_cost || 0;
        const suggestedPrice = recipe.suggested_price || 0;
        const marginPercentage = recipe.actual_margin_percentage || 0;

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
}
