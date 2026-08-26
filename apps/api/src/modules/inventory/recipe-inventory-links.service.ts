/**
 * RecipeInventoryLinksService — CRUD over `recipe_ingredients`.
 *
 * In this schema the recipe ingredient IS the link between a recipe and an
 * inventory item (`recipe_ingredients.inventory_item_id` is a required FK), so
 * there is no separate link table: `quantity` + `unit` are what the deduction
 * engine reads. Every write validates that the recipe and the inventory item
 * belong to the caller's organization and that their units can be converted.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { convertQuantity, roundQuantity } from './unit-conversion';

@Injectable()
export class RecipeInventoryLinksService {
  constructor(private readonly prisma: PrismaService) {}

  private linkShape(ingredient: {
    id: string;
    recipeId: string;
    inventoryItemId: string;
    quantity: number;
    unit: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    inventoryItem?: { name: string; unitOfMeasure: string } | null;
  }) {
    return {
      id: ingredient.id,
      recipe_id: ingredient.recipeId,
      recipe_ingredient_id: ingredient.id,
      inventory_item_id: ingredient.inventoryItemId,
      inventory_item_name: ingredient.inventoryItem?.name ?? null,
      // In this schema the recipe ingredient IS the link: `quantity` is how
      // much of the inventory item one recipe yield consumes.
      conversion_factor: ingredient.quantity,
      unit_mapping: {
        recipe_unit: ingredient.unit,
        inventory_unit: ingredient.inventoryItem?.unitOfMeasure ?? null,
      },
      auto_deduct: true,
      notes: ingredient.notes,
      created_at: ingredient.createdAt,
      updated_at: ingredient.updatedAt,
    };
  }

  private async assertRecipe(recipeId: string, organizationId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, organizationId },
      select: { id: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }
    return recipe;
  }

  private async assertLink(linkId: string, organizationId: string) {
    const link = await this.prisma.recipeIngredient.findFirst({
      where: { id: linkId, recipe: { organizationId } },
      include: { inventoryItem: true },
    });
    if (!link) {
      throw new NotFoundException(`Link with ID ${linkId} not found`);
    }
    return link;
  }

  async getRecipeLinks(recipeId: string, organizationId: string) {
    await this.assertRecipe(recipeId, organizationId);
    const ingredients = await this.prisma.recipeIngredient.findMany({
      where: { recipeId },
      include: {
        inventoryItem: { select: { name: true, unitOfMeasure: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return ingredients.map((i) => this.linkShape(i));
  }

  async createLink(
    organizationId: string,
    data: {
      recipe_id?: string;
      inventory_item_id?: string;
      conversion_factor?: number;
      quantity?: number;
      unit_mapping?: { recipe_unit?: string };
      unit?: string;
      notes?: string;
    },
  ) {
    if (!data?.recipe_id || !data?.inventory_item_id) {
      throw new BadRequestException(
        'recipe_id and inventory_item_id are required',
      );
    }
    await this.assertRecipe(data.recipe_id, organizationId);

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: data.inventory_item_id, organizationId },
    });
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${data.inventory_item_id} not found`,
      );
    }

    const quantity = Number(data.quantity ?? data.conversion_factor ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException(
        'quantity (conversion_factor) must be a number greater than 0',
      );
    }
    const unit =
      data.unit ?? data.unit_mapping?.recipe_unit ?? item.unitOfMeasure;

    const conversion = convertQuantity(quantity, unit, item.unitOfMeasure);
    if (!conversion.ok) {
      throw new BadRequestException(conversion.reason);
    }

    const link = await this.prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: data.recipe_id,
          inventoryItemId: data.inventory_item_id,
        },
      },
      create: {
        recipeId: data.recipe_id,
        inventoryItemId: data.inventory_item_id,
        quantity,
        unit,
        notes: data.notes,
        unitCost: item.costPerUnit,
        totalCost: roundQuantity(conversion.value * item.costPerUnit),
        isCosted: item.costPerUnit > 0,
      },
      update: {
        quantity,
        unit,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        unitCost: item.costPerUnit,
        totalCost: roundQuantity(conversion.value * item.costPerUnit),
        isCosted: item.costPerUnit > 0,
      },
      include: {
        inventoryItem: { select: { name: true, unitOfMeasure: true } },
      },
    });

    return this.linkShape(link);
  }

  async updateLink(
    linkId: string,
    organizationId: string,
    data: {
      conversion_factor?: number;
      quantity?: number;
      unit_mapping?: { recipe_unit?: string };
      unit?: string;
      notes?: string;
    },
  ) {
    const existing = await this.assertLink(linkId, organizationId);

    const quantity = Number(
      data.quantity ?? data.conversion_factor ?? existing.quantity,
    );
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException(
        'quantity (conversion_factor) must be a number greater than 0',
      );
    }
    const unit = data.unit ?? data.unit_mapping?.recipe_unit ?? existing.unit;

    const conversion = convertQuantity(
      quantity,
      unit,
      existing.inventoryItem.unitOfMeasure,
    );
    if (!conversion.ok) {
      throw new BadRequestException(conversion.reason);
    }

    const updated = await this.prisma.recipeIngredient.update({
      where: { id: linkId },
      data: {
        quantity,
        unit,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        totalCost: roundQuantity(
          conversion.value * existing.inventoryItem.costPerUnit,
        ),
      },
      include: {
        inventoryItem: { select: { name: true, unitOfMeasure: true } },
      },
    });

    return this.linkShape(updated);
  }

  async deleteLink(linkId: string, organizationId: string) {
    await this.assertLink(linkId, organizationId);
    await this.prisma.recipeIngredient.delete({ where: { id: linkId } });
  }
}
