import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  QueryRecipesDto,
  ScaleRecipeDto,
  RecipeCategory,
  PreparationMethod,
  DifficultyLevel,
  AllergenType,
} from './dto';
import {
  Recipe,
  RecipeCostBreakdown,
  ScaledRecipe,
  RecipeStats,
  RecipeProfitability,
  RecipeIngredient,
} from './interfaces';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/dto/create-category.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);
  private recipes: Map<string, Recipe> = new Map();

  constructor(
    private prisma: PrismaService,
    private categoriesService: CategoriesService,
  ) {}

  /**
   * Crear una nueva receta
   */
  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    // Calcular costos (si es posible)
    // En una implementación real, buscaríamos los costos de los items de inventario aquí.
    
    const newRecipe = await this.prisma.recipe.create({
      data: {
        organizationId: createRecipeDto.organization_id,
        productId: createRecipeDto.product_id,
        name: createRecipeDto.name,
        description: createRecipeDto.description,
        // Serializamos los pasos en instructions por ahora ya que el schema es simple
        instructions: createRecipeDto.steps ? JSON.stringify(createRecipeDto.steps) : undefined,
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
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    this.logger.log(`Receta creada: ${newRecipe.name} (${newRecipe.id})`);

    // Mapear a la interfaz Recipe
    const mapped: Recipe = {
      id: newRecipe.id,
      organization_id: newRecipe.organizationId,
      product_id: newRecipe.productId,
      name: newRecipe.name,
      description: newRecipe.description || undefined,
      instructions: newRecipe.instructions || undefined,
      category: createRecipeDto.category || RecipeCategory.BEBIDAS_CALIENTES,
      servings: newRecipe.yield,
      yield_unit: newRecipe.yieldUnit,
      difficulty: createRecipeDto.difficulty,
      preparation_method: createRecipeDto.preparation_method,
      target_margin_percentage: createRecipeDto.target_margin_percentage,
      actual_margin_percentage: createRecipeDto.target_margin_percentage,
      ingredients: newRecipe.ingredients.map((ing) => ({
        id: ing.id,
        recipe_id: ing.recipeId,
        inventory_item_id: ing.inventoryItemId,
        inventory_item_name: ing.inventoryItem?.name || 'Unknown',
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.unitCost || 0,
        total_cost: ing.totalCost || 0,
        preparation_notes: ing.notes || undefined,
      })),
      steps: newRecipe.instructions ? JSON.parse(newRecipe.instructions) : [],
      is_active: newRecipe.active,
      created_at: newRecipe.createdAt,
      updated_at: newRecipe.updatedAt,
      total_cost: newRecipe.totalCost,
      cost_per_serving: newRecipe.totalCost && newRecipe.yield
        ? newRecipe.totalCost / newRecipe.yield
        : 0,
      suggested_price: newRecipe.totalCost && newRecipe.yield && createRecipeDto.target_margin_percentage
        ? (newRecipe.totalCost / newRecipe.yield) / (1 - createRecipeDto.target_margin_percentage / 100)
        : 0,
    };

    this.recipes.set(mapped.id, mapped);
    return mapped;
  }

  /**
   * Obtener todas las recetas con filtros
   */
  async findAll(query?: QueryRecipesDto, user?: any): Promise<Recipe[]> {
    // Primero intentar cargar de base de datos
    try {
      const whereClause: any = {
        organizationId: user?.organizationId,
        ...(query?.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            {
              description: { contains: query.search, mode: 'insensitive' },
            },
          ],
        }),
        ...(query?.is_active !== undefined && {
          active: query.is_active === 'true',
        }),
      };

      const recipes = await this.prisma.recipe.findMany({
        where: whereClause,
        include: {
          product: true,
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Filtrar por organización después de la consulta
      // Si es super admin, NO filtrar. Si no, filtrar por organization_id
      let filteredRecipes = recipes;
      if (!user?.isSuperAdmin && query?.organization_id) {
        filteredRecipes = recipes.filter(
          (r: any) => r.product?.organizationId === query.organization_id,
        );
      }

      // Mapear a formato Recipe
      return filteredRecipes.map((r: any) => ({
        id: r.id,
        organization_id: r.product?.organizationId || '',
        product_id: r.productId,
        product_name: r.product?.name || '',
        name: r.name,
        description: r.description || '',
        category: 'COFFEE' as RecipeCategory,
        preparation_method: 'ESPRESSO' as PreparationMethod,
        difficulty: 'EASY' as DifficultyLevel,
        servings: r.yield,
        preparation_time: r.prepTime || 0,
        cooking_time: 0,
        resting_time: 0,
        total_time: r.prepTime || 0,
        ingredients: (r.ingredients || []).map((ing: any) => ({
          id: ing.id,
          inventory_item_id: ing.inventoryItemId,
          inventory_item_name: ing.inventoryItem?.name || '',
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || undefined,
          is_optional: false,
          preparation_notes: ing.notes || undefined,
        })),
        steps: [],
        target_margin_percentage: 65,
        total_cost: 0,
        cost_per_serving: 0,
        suggested_price: 0,
        actual_margin_percentage: 65,
        allergens: (r.allergens || []) as AllergenType[],
        is_active: r.active,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Error cargando recetas de DB:', error);
      // Continuar con fallback
    }

    // Fallback a Map en memoria
    let recipes = Array.from(this.recipes.values());

    if (!query) {
      return recipes.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Filtrar por organización
    if (query.organization_id) {
      recipes = recipes.filter(
        (r) => r.organization_id === query.organization_id,
      );
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
      recipes = recipes.filter(
        (r) => r.preparation_method === query.preparation_method,
      );
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
   * Obtener categorías disponibles desde el módulo de categorías
   */
  async getCategories(): Promise<string[]> {
    try {
      // Obtener categorías de tipo 'recipe' o 'product'
      const categories = await this.categoriesService.findAll({
        type: CategoryType.RECIPE,
      });

      // Retornar solo los nombres
      return categories.map((cat: any) => cat.name);
    } catch (error) {
      this.logger.warn('Error fetching categories, returning defaults', error);
      // Fallback a categorías por defecto
      return ['Bebidas Frías', 'Bebidas Calientes', 'Bebidas Sin Café'];
    }
  }

  /**
   * Obtener receta por ID
   */
  async findById(id: string): Promise<Recipe> {
    // Try in-memory cache first
    const cached = this.recipes.get(id);
    if (cached) return cached;

    // Fallback to database lookup
    try {
      const dbRecipe = await this.prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredients: { include: { inventoryItem: true } },
          product: true,
        },
      });

      if (!dbRecipe) {
        throw new NotFoundException(`Receta ${id} no encontrada`);
      }

      const recipe: Recipe = {
        id: dbRecipe.id,
        organization_id: dbRecipe.product?.organizationId || '',
        product_id: dbRecipe.productId,
        name: dbRecipe.name,
        description: dbRecipe.description || undefined,
        instructions: dbRecipe.instructions || undefined,
        category: RecipeCategory.ESPRESSO,
        preparation_method: PreparationMethod.ESPRESSO_MACHINE,
        difficulty: DifficultyLevel.INTERMEDIO,
        servings: dbRecipe.yield,
        yield_unit: dbRecipe.yieldUnit || 'unit',
        estimated_time_minutes: dbRecipe.prepTime || 0,
        allergens: (dbRecipe.allergens || []) as AllergenType[],
        ingredients: dbRecipe.ingredients.map((ing: any) => ({
          id: ing.id,
          inventory_item_id: ing.inventoryItemId,
          inventory_item_name: ing.inventoryItem?.name || '',
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.inventoryItem?.costPerUnit || 0,
          total_cost: ing.quantity * (ing.inventoryItem?.costPerUnit || 0),
          notes: ing.notes || undefined,
        })),
        steps: [],
        notes: undefined,
        image_url: dbRecipe.videoUrl || undefined,
        video_url: dbRecipe.videoUrl || undefined,
        total_cost: dbRecipe.ingredients.reduce(
          (sum: number, ing: any) =>
            sum + ing.quantity * (ing.inventoryItem?.costPerUnit || 0),
          0,
        ),
        cost_per_serving: 0,
        suggested_price: 0,
        target_margin_percentage: 65,
        actual_margin_percentage: 65,
        is_active: dbRecipe.active,
        created_at: dbRecipe.createdAt,
        updated_at: dbRecipe.updatedAt,
      };

      // Calcular costo por porción y precio sugerido
      recipe.cost_per_serving =
        recipe.total_cost && dbRecipe.yield
          ? recipe.total_cost / dbRecipe.yield
          : 0;
      recipe.suggested_price = recipe.cost_per_serving / (1 - 0.65);

      return recipe;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error finding recipe by id ${id}:`, error);
      throw new NotFoundException(`Receta ${id} no encontrada`);
    }
  }

  /**
   * Obtener receta por ID de producto
   */
  async findByProductId(productId: string): Promise<Recipe | null> {
    try {
      const dbRecipe = await this.prisma.recipe.findFirst({
        where: { productId },
        include: {
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
          product: true,
        },
      });

      if (!dbRecipe) {
        return null;
      }

      // Transformar de Prisma model a nuestra interfaz Recipe
      const recipe: Recipe = {
        id: dbRecipe.id,
        organization_id: '', // TODO: agregar organizationId al schema si es necesario
        product_id: dbRecipe.productId,
        name: dbRecipe.name,
        description: dbRecipe.description || undefined,
        category: RecipeCategory.ESPRESSO, // Default, TODO: obtener de producto
        preparation_method: PreparationMethod.ESPRESSO_MACHINE,
        difficulty: DifficultyLevel.INTERMEDIO,
        servings: dbRecipe.yield,
        estimated_time_minutes: dbRecipe.prepTime || 0,
        allergens: (dbRecipe.allergens || []) as AllergenType[],
        ingredients: dbRecipe.ingredients.map((ing: any) => ({
          id: ing.id,
          inventory_item_id: ing.inventoryItemId,
          inventory_item_name: ing.inventoryItem.name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.inventoryItem.costPerUnit,
          total_cost: ing.quantity * ing.inventoryItem.costPerUnit,
          notes: ing.notes || undefined,
        })),
        steps: [],
        notes: undefined,
        image_url: dbRecipe.videoUrl || undefined,
        total_cost: dbRecipe.ingredients.reduce(
          (sum: number, ing: any) =>
            sum + ing.quantity * ing.inventoryItem.costPerUnit,
          0,
        ),
        cost_per_serving: 0, // Se calcula abajo
        suggested_price: 0, // Se calcula abajo
        target_margin_percentage: 65,
        actual_margin_percentage: 65,
        is_active: dbRecipe.active,
        created_at: dbRecipe.createdAt,
        updated_at: dbRecipe.updatedAt,
      };

      // Calcular costo por porción
      recipe.cost_per_serving = recipe.total_cost / dbRecipe.yield;

      // Calcular precio sugerido con margen del 65%
      recipe.suggested_price = recipe.cost_per_serving / (1 - 0.65);

      return recipe;
    } catch (error) {
      this.logger.error(
        `Error finding recipe by productId ${productId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Actualizar una receta
   */
  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.findById(id);

    // Preparar datos para actualización en Prisma
    const updateData: any = {
      name: updateRecipeDto.name,
      description: updateRecipeDto.description,
      instructions: updateRecipeDto['instructions'],
      yield: updateRecipeDto.servings,
      yieldUnit: updateRecipeDto['yield_unit'],
      prepTime: updateRecipeDto.estimated_time_minutes,
      active: updateRecipeDto.is_active,
      allergens: updateRecipeDto.allergens,
      videoUrl: updateRecipeDto['video_url'],
      updatedAt: new Date(),
    };

    // Actualizar productId si se proporciona
    if (updateRecipeDto['product_id']) {
      updateData.productId = updateRecipeDto['product_id'];
    }

    // Si hay ingredientes, actualizar la relación
    if (updateRecipeDto.ingredients) {
      // Primero eliminar ingredientes existentes
      await this.prisma.recipeIngredient.deleteMany({
        where: { recipeId: id },
      });

      // Crear nuevos ingredientes
      updateData.ingredients = {
        create: updateRecipeDto.ingredients.map((ing) => ({
          inventoryItemId: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.preparation_notes,
        })),
      };
    }

    // Actualizar en base de datos
    const updatedRecipe = await this.prisma.recipe.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    // Transformar a formato de respuesta
    const updatedIngredients = updatedRecipe.ingredients.map((ing) => ({
      id: ing.id,
      inventory_item_id: ing.inventoryItemId,
      inventory_item_name: ing.inventoryItem?.name || '',
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.inventoryItem?.costPerUnit || 0,
      total_cost: ing.quantity * (ing.inventoryItem?.costPerUnit || 0),
      preparation_notes: ing.notes || undefined,
    }));
    const updatedTotalCost = updatedIngredients.reduce((sum, i) => sum + i.total_cost, 0);

    const existingRecipe = this.recipes.get(id);
    const formattedRecipe: Recipe = {
      id: updatedRecipe.id,
      organization_id: updatedRecipe.organizationId,
      product_id: updatedRecipe.productId,
      name: updatedRecipe.name,
      description: updatedRecipe.description || '',
      instructions: updatedRecipe.instructions || '',
      category: existingRecipe?.category || ('espresso' as RecipeCategory),
      difficulty: existingRecipe?.difficulty,
      preparation_method: existingRecipe?.preparation_method,
      target_margin_percentage: existingRecipe?.target_margin_percentage,
      actual_margin_percentage: existingRecipe?.actual_margin_percentage,
      servings: updatedRecipe.yield,
      yield_unit: updatedRecipe.yieldUnit,
      estimated_time_minutes: updatedRecipe.prepTime || 0,
      allergens: updatedRecipe.allergens as AllergenType[],
      video_url: updatedRecipe.videoUrl || undefined,
      is_active: updatedRecipe.active,
      ingredients: updatedIngredients,
      created_at: updatedRecipe.createdAt,
      updated_at: updatedRecipe.updatedAt,
      total_cost: updatedTotalCost,
      cost_per_serving: updatedRecipe.yield ? updatedTotalCost / updatedRecipe.yield : 0,
      suggested_price: existingRecipe?.target_margin_percentage && updatedRecipe.yield
        ? (updatedTotalCost / updatedRecipe.yield) / (1 - existingRecipe.target_margin_percentage / 100)
        : 0,
    };

    // También actualizar en memoria para mantener consistencia
    this.recipes.set(id, formattedRecipe);
    this.logger.log(
      `Receta actualizada en BD y memoria: ${formattedRecipe.name}`,
    );

    return formattedRecipe;
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
      const costPerUnit =
        ing.cost_per_unit || this.getMockCostPerUnit(ing.unit);
      const totalCost = ing.quantity * costPerUnit;

      return {
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name:
          ing.inventory_item_name || `Ingrediente ${ing.inventory_item_id}`,
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
        totalIngredientsCost > 0
          ? (ing.total_cost / totalIngredientsCost) * 100
          : 0;
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
      suggested_price_per_serving:
        Math.round(suggestedPricePerServing * 100) / 100,
    };
  }

  /**
   * Escalar una receta a diferentes porciones
   */
  async scaleRecipe(
    id: string,
    scaleDto: ScaleRecipeDto,
  ): Promise<ScaledRecipe> {
    const originalRecipe = await this.findById(id);
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
        byDifficulty[recipe.difficulty] =
          (byDifficulty[recipe.difficulty] || 0) + 1;
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
  async analyzeProfitability(
    organization_id: string,
  ): Promise<RecipeProfitability[]> {
    const recipes = Array.from(this.recipes.values()).filter(
      (r) => r.organization_id === organization_id,
    );

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
