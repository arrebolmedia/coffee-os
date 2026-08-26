/**
 * Theoretical stock engine.
 *
 * "Theoretical stock" answers: given the last physical count, everything that
 * came IN, everything that went OUT for non-recipe reasons, and everything the
 * recipes say should have been consumed by the orders actually sold — how much
 * SHOULD be on the shelf right now?
 *
 *   physical    = InventoryItem.currentStock (what the books say)
 *   opening     = physical rolled back through every movement after windowStart
 *   theoretical = opening
 *                 + IN(after)
 *                 - OUT(after, reasons other than the recipe auto-deduction)
 *                 - recipe-implied consumption of orders sold after windowStart
 *   discrepancy = physical - theoretical
 *
 * windowStart is the last physical count (ADJUSTMENT movement), or the item's
 * creation date when it has never been counted.
 *
 * A positive discrepancy means the books overstate stock: sales happened whose
 * ingredients were never deducted. That is exactly the failure mode this
 * module used to hide behind a hardcoded `enabled: true`.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { convertQuantity, roundQuantity } from './unit-conversion';

/** Reason tag written on every movement created by the recipe auto-deduction. */
export const DEDUCTION_REASON = 'RECIPE_DEDUCTION';
/** Reason tag written on the compensating IN movement of a reversal. */
export const REVERSAL_REASON = 'RECIPE_DEDUCTION_REVERSAL';
/** Reason tag written on reconciliation (physical count) movements. */
export const RECONCILIATION_REASON = 'COUNT_ADJUSTMENT';

/** Order statuses that count as "sold" for consumption purposes. */
const SOLD_STATUSES: OrderStatus[] = [
  OrderStatus.SERVED,
  OrderStatus.COMPLETED,
];

export interface RecipeUsage {
  recipe_id: string;
  recipe_name: string;
  times_sold: number;
  quantity_used: number;
}

export interface TheoreticalStockRow {
  organization_id: string;
  inventory_item_id: string;
  inventory_item_name: string;
  unit: string;
  physical_stock: number;
  theoretical_stock: number;
  discrepancy: number;
  discrepancy_percentage: number;
  last_reconciliation: Date | null;
  window_start: Date;
  linked_recipes: RecipeUsage[];
  warnings: string[];
}

interface ConsumptionEntry {
  quantity: number;
  cost: number;
  recipes: Map<string, RecipeUsage>;
  warnings: Set<string>;
}

@Injectable()
export class TheoreticalStockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recipe-implied ingredient consumption of the orders sold in the window.
   *
   * `sinceByItem` lets every item carry its own window start (each item's
   * window opens at its own last physical count).
   */
  async impliedConsumption(
    organizationId: string,
    sinceByItem: Map<string, Date>,
    until?: Date,
  ): Promise<Map<string, ConsumptionEntry>> {
    const result = new Map<string, ConsumptionEntry>();
    if (sinceByItem.size === 0) return result;

    const earliest = new Date(
      Math.min(...[...sinceByItem.values()].map((d) => d.getTime())),
    );

    const locations = await this.prisma.location.findMany({
      where: { organizationId },
      select: { id: true },
    });
    if (locations.length === 0) return result;

    const orders = await this.prisma.order.findMany({
      where: {
        locationId: { in: locations.map((l) => l.id) },
        status: { in: SOLD_STATUSES },
        orderedAt: { gte: earliest, ...(until ? { lte: until } : {}) },
      },
      select: {
        id: true,
        orderedAt: true,
        items: { select: { productId: true, quantity: true } },
      },
    });
    if (orders.length === 0) return result;

    const productIds = [
      ...new Set(orders.flatMap((o) => o.items.map((i) => i.productId))),
    ];

    // Newest active recipe per product (version desc, then updatedAt desc).
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId, active: true, productId: { in: productIds } },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      include: {
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unitOfMeasure: true,
                costPerUnit: true,
              },
            },
          },
        },
      },
    });

    const recipeByProduct = new Map<string, (typeof recipes)[number]>();
    for (const recipe of recipes) {
      if (recipe.productId && !recipeByProduct.has(recipe.productId)) {
        recipeByProduct.set(recipe.productId, recipe);
      }
    }

    for (const order of orders) {
      for (const line of order.items) {
        const recipe = recipeByProduct.get(line.productId);
        if (!recipe) continue;
        const yieldQty = recipe.yield > 0 ? recipe.yield : 1;

        for (const ingredient of recipe.ingredients) {
          const item = ingredient.inventoryItem;
          const since = sinceByItem.get(item.id);
          if (!since || order.orderedAt < since) continue;

          const entry = this.entryFor(result, item.id);
          const raw = (ingredient.quantity / yieldQty) * line.quantity;
          const converted = convertQuantity(
            raw,
            ingredient.unit,
            item.unitOfMeasure,
          );

          if (!converted.ok) {
            entry.warnings.add(`${recipe.name}: ${converted.reason}`);
            continue;
          }

          const quantity = roundQuantity(converted.value);
          entry.quantity = roundQuantity(entry.quantity + quantity);
          entry.cost = roundQuantity(entry.cost + quantity * item.costPerUnit);

          const usage = entry.recipes.get(recipe.id) ?? {
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            times_sold: 0,
            quantity_used: 0,
          };
          usage.times_sold += line.quantity;
          usage.quantity_used = roundQuantity(usage.quantity_used + quantity);
          entry.recipes.set(recipe.id, usage);
        }
      }
    }

    return result;
  }

  private entryFor(
    map: Map<string, ConsumptionEntry>,
    itemId: string,
  ): ConsumptionEntry {
    let entry = map.get(itemId);
    if (!entry) {
      entry = { quantity: 0, cost: 0, recipes: new Map(), warnings: new Set() };
      map.set(itemId, entry);
    }
    return entry;
  }

  async forOrganization(
    organizationId: string,
    opts: { itemIds?: string[]; startDate?: Date } = {},
  ): Promise<TheoreticalStockRow[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        organizationId,
        ...(opts.itemIds ? { id: { in: opts.itemIds } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    if (items.length === 0) return [];

    const itemIds = items.map((i) => i.id);
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId: { in: itemIds } },
      orderBy: { createdAt: 'asc' },
      select: {
        inventoryItemId: true,
        type: true,
        quantity: true,
        reason: true,
        createdAt: true,
      },
    });

    const byItem = new Map<string, typeof movements>();
    for (const movement of movements) {
      const list = byItem.get(movement.inventoryItemId) ?? [];
      list.push(movement);
      byItem.set(movement.inventoryItemId, list);
    }

    // Window start per item = max(caller startDate, last physical count).
    const windowStart = new Map<string, Date>();
    const lastReconciliation = new Map<string, Date>();
    for (const item of items) {
      const itemMovements = byItem.get(item.id) ?? [];
      const lastAdjustment = [...itemMovements]
        .reverse()
        .find((m) => m.type === 'ADJUSTMENT');
      if (lastAdjustment) {
        lastReconciliation.set(item.id, lastAdjustment.createdAt);
      }
      const base = lastAdjustment?.createdAt ?? item.createdAt;
      windowStart.set(
        item.id,
        opts.startDate && opts.startDate > base ? opts.startDate : base,
      );
    }

    const consumption = await this.impliedConsumption(
      organizationId,
      windowStart,
    );

    return items.map((item) => {
      const start = windowStart.get(item.id) as Date;
      const itemMovements = byItem.get(item.id) ?? [];

      // Opening balance at `start`, reconstructed backwards from the recorded
      // stock. Rolling `currentStock` back through the movements that came
      // after `start` is the only baseline that stays consistent with
      // `physical` even for items whose opening stock was written directly
      // (seeds, imports) without a matching IN movement.
      let deltaAfter = 0;
      let inAfter = 0;
      let outAfterOther = 0;
      for (const m of itemMovements) {
        if (m.createdAt <= start) continue;
        if (m.type === 'IN') {
          deltaAfter += m.quantity;
          // Reversal INs cancel a recipe OUT; both are excluded from the
          // theoretical figure so the pair nets out instead of inflating it.
          if (m.reason !== REVERSAL_REASON) inAfter += m.quantity;
        } else if (m.type === 'OUT') {
          deltaAfter -= m.quantity;
          if (m.reason !== DEDUCTION_REASON) outAfterOther += m.quantity;
        }
        // ADJUSTMENT cannot appear after `start`: `start` is at or after the
        // last physical count.
      }
      const baseline = item.currentStock - deltaAfter;

      const entry = consumption.get(item.id);
      const implied = entry?.quantity ?? 0;
      const theoretical = roundQuantity(
        baseline + inAfter - outAfterOther - implied,
      );
      const physical = roundQuantity(item.currentStock);
      const discrepancy = roundQuantity(physical - theoretical);
      const percentage =
        theoretical !== 0
          ? roundQuantity((discrepancy / Math.abs(theoretical)) * 100)
          : discrepancy !== 0
            ? 100
            : 0;

      return {
        organization_id: organizationId,
        inventory_item_id: item.id,
        inventory_item_name: item.name,
        unit: item.unitOfMeasure,
        physical_stock: physical,
        theoretical_stock: theoretical,
        discrepancy,
        discrepancy_percentage: percentage,
        last_reconciliation: lastReconciliation.get(item.id) ?? null,
        window_start: start,
        linked_recipes: entry ? [...entry.recipes.values()] : [],
        warnings: entry ? [...entry.warnings] : [],
      };
    });
  }

  async forItem(
    inventoryItemId: string,
    organizationId: string,
    startDate?: Date,
  ): Promise<TheoreticalStockRow> {
    const rows = await this.forOrganization(organizationId, {
      itemIds: [inventoryItemId],
      startDate,
    });
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(
        `Inventory item with ID ${inventoryItemId} not found`,
      );
    }
    return row;
  }

  async accuracyReport(organizationId: string, startDate?: Date) {
    const rows = await this.forOrganization(organizationId, { startDate });
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId },
      select: { id: true, costPerUnit: true },
    });
    const costById = new Map(items.map((i) => [i.id, i.costPerUnit]));

    const withDiscrepancy = rows.filter((r) => Math.abs(r.discrepancy) > 1e-6);
    const totalValueDiscrepancy = withDiscrepancy.reduce(
      (sum, r) =>
        sum +
        Math.abs(r.discrepancy) * (costById.get(r.inventory_item_id) ?? 0),
      0,
    );
    const meanError =
      rows.length > 0
        ? rows.reduce(
            (sum, r) => sum + Math.min(Math.abs(r.discrepancy_percentage), 100),
            0,
          ) / rows.length
        : 0;

    return {
      organization_id: organizationId,
      overall_accuracy: roundQuantity(Math.max(0, 100 - meanError)),
      total_items_tracked: rows.length,
      items_with_discrepancies: withDiscrepancy.length,
      total_value_discrepancy: roundQuantity(totalValueDiscrepancy),
      top_discrepancies: [...withDiscrepancy]
        .sort(
          (a, b) =>
            Math.abs(b.discrepancy_percentage) -
            Math.abs(a.discrepancy_percentage),
        )
        .slice(0, 10)
        .map((r) => ({
          inventory_item_id: r.inventory_item_id,
          item_name: r.inventory_item_name,
          discrepancy: r.discrepancy,
          discrepancy_percentage: r.discrepancy_percentage,
          value_lost: roundQuantity(
            Math.abs(r.discrepancy) * (costById.get(r.inventory_item_id) ?? 0),
          ),
        })),
    };
  }

  async usageReport(organizationId: string, startDate: Date, endDate?: Date) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId },
      select: { id: true, name: true, unitOfMeasure: true, costPerUnit: true },
    });
    if (items.length === 0) return [];

    const sinceByItem = new Map(items.map((i) => [i.id, startDate]));
    const consumption = await this.impliedConsumption(
      organizationId,
      sinceByItem,
      endDate,
    );

    return items
      .filter((item) => consumption.has(item.id))
      .map((item) => {
        const entry = consumption.get(item.id) as ConsumptionEntry;
        return {
          inventory_item_id: item.id,
          inventory_item_name: item.name,
          total_quantity_used: entry.quantity,
          unit: item.unitOfMeasure,
          used_in_recipes: [...entry.recipes.values()],
          cost_of_goods_used: entry.cost,
          warnings: [...entry.warnings],
        };
      })
      .sort((a, b) => b.cost_of_goods_used - a.cost_of_goods_used);
  }
}
