import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipesDto } from './dto/query-recipes.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRecipeDto: CreateRecipeDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createRecipeDto.productId },
    });

    if (!product) {
      throw new BadRequestException(
        `Product with ID ${createRecipeDto.productId} not found`,
      );
    }

    // Verify all ingredients exist
    if (createRecipeDto.ingredients && createRecipeDto.ingredients.length > 0) {
      const ingredientIds = createRecipeDto.ingredients.map(
        (i) => i.inventoryItemId,
      );
      const inventoryItems = await this.prisma.inventoryItem.findMany({
        where: { id: { in: ingredientIds } },
      });

      if (inventoryItems.length !== ingredientIds.length) {
        throw new BadRequestException('One or more inventory items not found');
      }
    }

    const { ingredients, ...recipeData } = createRecipeDto;

    return this.prisma.recipe.create({
      data: {
        ...recipeData,
        ingredients: ingredients
          ? {
              create: ingredients.map((ingredient) => ({
                inventoryItemId: ingredient.inventoryItemId,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
              })),
            }
          : undefined,
      },
      include: {
        product: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryRecipesDto) {
    const { skip = 0, take = 50, active, search, productId } = query;

    const where: any = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          ingredients: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  costPerUnit: true,
                  unitOfMeasure: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.recipe.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findAllActive() {
    return this.prisma.recipe.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        product: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });
  }

  async findByProduct(productId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        productId,
        active: true,
      },
      include: {
        product: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    return recipes;
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        product: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return recipe;
  }

  async calculateCost(id: string) {
    const recipe = await this.findOne(id);

    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
      if (ingredient.inventoryItem.costPerUnit) {
        const cost = ingredient.quantity * ingredient.inventoryItem.costPerUnit;
        totalCost += cost;
      }
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      totalCost,
      currency: 'MXN',
      ingredients: recipe.ingredients.map((ing) => ({
        name: ing.inventoryItem.name,
        quantity: ing.quantity,
        unit: ing.unit,
        costPerUnit: ing.inventoryItem.costPerUnit || 0,
        totalCost: ing.quantity * (ing.inventoryItem.costPerUnit || 0),
      })),
    };
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto) {
    // Check if recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    // Verify product if changing
    if (updateRecipeDto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: updateRecipeDto.productId },
      });

      if (!product) {
        throw new BadRequestException(
          `Product with ID ${updateRecipeDto.productId} not found`,
        );
      }
    }

    const { ingredients, ...recipeData } = updateRecipeDto;

    // If updating ingredients, verify they exist
    if (ingredients && ingredients.length > 0) {
      const ingredientIds = ingredients.map((i) => i.inventoryItemId);
      const inventoryItems = await this.prisma.inventoryItem.findMany({
        where: { id: { in: ingredientIds } },
      });

      if (inventoryItems.length !== ingredientIds.length) {
        throw new BadRequestException('One or more inventory items not found');
      }

      // Delete existing ingredients and create new ones
      await this.prisma.recipeIngredient.deleteMany({
        where: { recipeId: id },
      });
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ingredients: ingredients
          ? {
              create: ingredients.map((ingredient) => ({
                inventoryItemId: ingredient.inventoryItemId,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
              })),
            }
          : undefined,
      },
      include: {
        product: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    // Delete ingredients first (cascade should handle this, but being explicit)
    await this.prisma.recipeIngredient.deleteMany({
      where: { recipeId: id },
    });

    // Delete recipe
    await this.prisma.recipe.delete({
      where: { id },
    });
  }
}
