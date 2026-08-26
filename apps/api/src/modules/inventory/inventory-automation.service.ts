/**
 * InventoryAutomationService — recipe-driven stock deduction, backed by Prisma.
 *
 * Replaces the previous stub controller, whose `getAutoDeductConfig` reported
 * `enabled: true` while `deductStockForOrder` returned an empty array and never
 * touched a single row.
 *
 * How a deduction works:
 *   order -> order_items -> product -> recipe (Recipe.productId)
 *         -> recipe_ingredients -> inventory_items
 *
 *   qty_to_deduct = (ingredient.quantity / recipe.yield) * units_sold
 *                   converted from the recipe unit into the inventory unit
 *
 * Each deduction writes an `inventory_movements` row (type OUT, reason
 * RECIPE_DEDUCTION, reference `ORDER:<orderId>`) and decrements
 * `inventory_items.current_stock`, both inside one transaction. The reference
 * makes the operation idempotent and reversible.
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AutoDeductConfig,
  AutoDeductConfigService,
} from './auto-deduct-config.service';
import { convertQuantity, roundQuantity } from './unit-conversion';
import { DEDUCTION_REASON, REVERSAL_REASON } from './theoretical-stock.service';

const orderRef = (orderId: string) => `ORDER:${orderId}`;

/**
 * Estados de orden de los que tiene sentido descontar insumos: sólo los que
 * representan una venta consumada. Descontar de una CANCELLED baja el stock
 * sin que la orden cuente como vendida, y el reporte de exactitud lo lee
 * después como merma — el módulo fabricaría el descuadre que existe para
 * detectar.
 */
const DEDUCTIBLE_ORDER_STATUSES = ['SERVED', 'COMPLETED'];

interface PlannedDeduction {
  recipe_id: string;
  recipe_name: string;
  product_id: string;
  units_sold: number;
  inventory_item_id: string;
  inventory_item_name: string;
  unit: string;
  recipe_unit: string;
  quantity_to_deduct: number;
  unit_cost: number;
  current_stock: number;
  stock_after_deduction: number;
  will_go_negative: boolean;
}

export interface FailedDeduction {
  recipe_id: string | null;
  inventory_item_id: string | null;
  reason: string;
}

/** Resultado del descuento automático disparado por el ciclo de vida de la orden. */
export type AutoDeductOutcome =
  | { status: 'deducted'; items_deducted: number; failures: FailedDeduction[] }
  | { status: 'disabled' }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; message: string };

@Injectable()
export class InventoryAutomationService {
  private readonly logger = new Logger(InventoryAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AutoDeductConfigService,
  ) {}

  /** Reexportado para no romper a quien ya llamaba al servicio de automatizacion. */
  getConfig(organizationId: string): Promise<AutoDeductConfig> {
    return this.config.getConfig(organizationId);
  }

  updateConfig(
    organizationId: string,
    patch: Partial<AutoDeductConfig>,
    updatedBy?: string,
  ): Promise<AutoDeductConfig> {
    return this.config.updateConfig(organizationId, patch, updatedBy);
  }

  // ==========================================================================
  // DEDUCTION PLANNING
  // ==========================================================================

  private async loadOrder(orderId: string, organizationId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    // Order has no organizationId column: it is derived through its location.
    const location = await this.prisma.location.findUnique({
      where: { id: order.locationId },
      select: { organizationId: true },
    });
    if (!location || location.organizationId !== organizationId) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    return order;
  }

  private async planDeduction(orderId: string, organizationId: string) {
    const order = await this.loadOrder(orderId, organizationId);

    const unitsByProduct = new Map<string, number>();
    for (const line of order.items) {
      unitsByProduct.set(
        line.productId,
        (unitsByProduct.get(line.productId) ?? 0) + line.quantity,
      );
    }

    const recipes = await this.prisma.recipe.findMany({
      where: {
        organizationId,
        active: true,
        productId: { in: [...unitsByProduct.keys()] },
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      include: { ingredients: { include: { inventoryItem: true } } },
    });

    const recipeByProduct = new Map<string, (typeof recipes)[number]>();
    for (const recipe of recipes) {
      if (recipe.productId && !recipeByProduct.has(recipe.productId)) {
        recipeByProduct.set(recipe.productId, recipe);
      }
    }

    const lines: PlannedDeduction[] = [];
    const failures: FailedDeduction[] = [];
    const warnings: string[] = [];
    // Running projection so two lines hitting the same item see each other.
    const projected = new Map<string, number>();

    for (const [productId, unitsSold] of unitsByProduct) {
      const recipe = recipeByProduct.get(productId);
      if (!recipe) {
        warnings.push(
          `Product ${productId} has no active recipe; nothing to deduct for it`,
        );
        continue;
      }
      if (recipe.ingredients.length === 0) {
        warnings.push(`Recipe "${recipe.name}" has no ingredients`);
        continue;
      }

      const yieldQty = recipe.yield > 0 ? recipe.yield : 1;

      for (const ingredient of recipe.ingredients) {
        const item = ingredient.inventoryItem;
        const raw = (ingredient.quantity / yieldQty) * unitsSold;
        const converted = convertQuantity(
          raw,
          ingredient.unit,
          item.unitOfMeasure,
        );

        if (!converted.ok) {
          failures.push({
            recipe_id: recipe.id,
            inventory_item_id: item.id,
            reason: converted.reason,
          });
          continue;
        }

        const quantity = roundQuantity(converted.value);
        if (quantity <= 0) continue;

        const currentStock = projected.get(item.id) ?? item.currentStock;
        const after = roundQuantity(currentStock - quantity);
        projected.set(item.id, after);

        lines.push({
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          product_id: productId,
          units_sold: unitsSold,
          inventory_item_id: item.id,
          inventory_item_name: item.name,
          unit: item.unitOfMeasure,
          recipe_unit: ingredient.unit,
          quantity_to_deduct: quantity,
          unit_cost: item.costPerUnit,
          current_stock: currentStock,
          stock_after_deduction: after,
          will_go_negative: after < 0,
        });
      }
    }

    return { order, lines, failures, warnings };
  }

  /** How many deductions for this order are still in force (not reversed). */
  private async deductionState(orderId: string) {
    const [deducted, reversed] = await Promise.all([
      this.prisma.inventoryMovement.count({
        where: { reference: orderRef(orderId), reason: DEDUCTION_REASON },
      }),
      this.prisma.inventoryMovement.count({
        where: { reference: orderRef(orderId), reason: REVERSAL_REASON },
      }),
    ]);
    return { deducted, reversed, active: deducted - reversed };
  }

  // ==========================================================================
  // DEDUCTION
  // ==========================================================================

  async previewDeduction(orderId: string, organizationId: string) {
    const [{ order, lines, failures, warnings }, config, state] =
      await Promise.all([
        this.planDeduction(orderId, organizationId),
        this.getConfig(organizationId),
        this.deductionState(orderId),
      ]);

    const allWarnings = [...warnings];
    if (state.active > 0) {
      allWarnings.push(
        `Order ${orderId} already has ${state.active} active deduction movement(s); deducting again would double-count`,
      );
    }
    if (!config.allow_negative_stock) {
      for (const line of lines.filter((l) => l.will_go_negative)) {
        allWarnings.push(
          `Insufficient stock for ${line.inventory_item_name}: ${line.current_stock} ${line.unit} available, ${line.quantity_to_deduct} ${line.unit} required`,
        );
      }
    }

    return {
      order_id: order.id,
      order_status: order.status,
      already_deducted: state.active > 0,
      auto_deduct_enabled: config.enabled,
      items: lines.map((line) => ({
        inventory_item_id: line.inventory_item_id,
        inventory_item_name: line.inventory_item_name,
        recipe_id: line.recipe_id,
        recipe_name: line.recipe_name,
        unit: line.unit,
        current_stock: line.current_stock,
        quantity_to_deduct: line.quantity_to_deduct,
        stock_after_deduction: line.stock_after_deduction,
        will_go_negative: line.will_go_negative,
      })),
      failed_deductions: failures,
      warnings: allWarnings,
    };
  }

  /**
   * Deduct the ingredients of every product in the order.
   *
   * Idempotent: a second call for the same order is rejected with 409 unless
   * the previous deduction was reversed first.
   */
  async deductForOrder(
    orderId: string,
    organizationId: string,
    opts: { requireSaleStatus?: boolean } = {},
  ) {
    const config = await this.getConfig(organizationId);
    const { order, lines, failures, warnings } = await this.planDeduction(
      orderId,
      organizationId,
    );

    // El flag persistido tiene que MANDAR: antes se leía y se devolvía en la
    // respuesta ("auto_deduct_enabled": false) mientras el descuento se
    // ejecutaba igual. Guardar enabled:false era una promesa incumplida.
    if (!config.enabled) {
      throw new ConflictException(
        'El descuento automático de inventario está desactivado para esta organización ' +
          '(inventory.auto_deduct.enabled = false). Actívalo antes de descontar.',
      );
    }

    // Sólo se descuenta de órdenes que realmente se vendieron. Descontar una
    // CANCELLED fabricaba una discrepancia permanente: el stock bajaba pero la
    // orden no cuenta como vendida, así que el reporte de exactitud lo
    // registraba como merma inexistente.
    // `requireSaleStatus: false` lo usa el cobro del POS: ahí la orden todavía
    // está PENDING en cocina, pero el ticket acaba de pagarse y eso ES la venta
    // consumada. La guarda sigue activa para el endpoint manual, que es donde
    // hace falta impedir que alguien descuente de una orden CANCELLED.
    const requireSaleStatus = opts.requireSaleStatus ?? true;
    if (
      requireSaleStatus &&
      !DEDUCTIBLE_ORDER_STATUSES.includes(order.status)
    ) {
      throw new ConflictException(
        `No se puede descontar inventario de una orden en estado ${order.status}. ` +
          `Estados válidos: ${DEDUCTIBLE_ORDER_STATUSES.join(', ')}.`,
      );
    }

    const state = await this.deductionState(orderId);
    if (state.active > 0) {
      throw new ConflictException(
        `Stock was already deducted for order ${orderId}. Reverse it first (POST /inventory/automation/deduct/order/${orderId}/reverse).`,
      );
    }

    const allFailures = [...failures];
    const executable: PlannedDeduction[] = [];
    for (const line of lines) {
      if (line.will_go_negative && !config.allow_negative_stock) {
        allFailures.push({
          recipe_id: line.recipe_id,
          inventory_item_id: line.inventory_item_id,
          reason: `Insufficient stock: ${line.current_stock} ${line.unit} available, ${line.quantity_to_deduct} ${line.unit} required (allow_negative_stock is off)`,
        });
        continue;
      }
      executable.push(line);
    }

    // El chequeo de `deductionState` de arriba es check-then-act: dos
    // peticiones simultáneas lo pasan las dos y descuentan por duplicado
    // (reproducido con 12 POST en paralelo). La garantía real la da el índice
    // único parcial sobre (reference, inventory_item_id) para
    // reason='RECIPE_DEDUCTION'; aquí sólo se traduce su violación a un 409.
    let created;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const movements = [];
        for (const line of executable) {
          const movement = await tx.inventoryMovement.create({
            data: {
              locationId: order.locationId,
              inventoryItemId: line.inventory_item_id,
              type: 'OUT',
              quantity: line.quantity_to_deduct,
              unitCost: line.unit_cost,
              reason: DEDUCTION_REASON,
              reference: orderRef(order.id),
              notes: `recipe=${line.recipe_id}; product=${line.product_id}; units_sold=${line.units_sold}; recipe_unit=${line.recipe_unit}`,
            },
          });
          await tx.inventoryItem.update({
            where: { id: line.inventory_item_id },
            // Se redondea el resultado, no sólo la cantidad planificada: el
            // `decrement` en coma flotante dejaba valores como
            // 6.928000000000001 que ensucian las comparaciones de discrepancia.
            data: {
              currentStock: roundQuantity(
                line.current_stock - line.quantity_to_deduct,
              ),
            },
          });
          movements.push(movement);
        }
        return movements;
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Stock was already deducted for order ${orderId} by a concurrent request. ` +
            `Reverse it first (POST /inventory/automation/deduct/order/${orderId}/reverse).`,
        );
      }
      throw err;
    }

    const lowStockAlerts = config.send_low_stock_alerts
      ? await this.collectLowStock(executable.map((l) => l.inventory_item_id))
      : [];

    this.logger.log(
      `Order ${orderId}: deducted ${created.length} ingredient line(s), ${allFailures.length} failure(s)`,
    );

    return {
      order_id: order.id,
      auto_deduct_enabled: config.enabled,
      deductions: created.map((movement, index) => ({
        id: movement.id,
        order_id: order.id,
        recipe_id: executable[index].recipe_id,
        inventory_item_id: movement.inventoryItemId,
        quantity_deducted: movement.quantity,
        unit: executable[index].unit,
        deducted_at: movement.createdAt,
        status: 'completed' as const,
      })),
      total_items_deducted: created.length,
      failed_deductions: allFailures,
      low_stock_alerts: lowStockAlerts,
      warnings,
    };
  }

  /**
   * Punto de entrada del ciclo de vida de la orden: se llama al pasar a
   * SERVED/COMPLETED.
   *
   * **Nunca lanza.** El descuento no puede bloquear la venta: cuando una orden
   * se marca servida el café ya salió por la barra, y negarse a registrar ese
   * hecho porque el inventario no cuadra es peor que registrarlo con el
   * inventario descuadrado. Por eso no comparte transacción con el cambio de
   * estado: no queremos "ambas o ninguna", queremos que el estado gane y que
   * el fallo del descuento sea ruidoso en vez de silencioso.
   *
   * Que no lance no significa que se pierda: el resultado viaja en la
   * respuesta, los fallos quedan en el log a nivel error, y el reporte de
   * exactitud de `stock-reconciliation` delata cualquier descuadre.
   */
  async autoDeductOnSale(
    orderId: string,
    organizationId: string,
    opts: { requireSaleStatus?: boolean } = {},
  ): Promise<AutoDeductOutcome> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config.enabled) {
        return { status: 'disabled' };
      }

      const result = await this.deductForOrder(orderId, organizationId, opts);
      return {
        status: 'deducted',
        items_deducted: result.total_items_deducted,
        failures: result.failed_deductions,
      };
    } catch (err) {
      if (err instanceof ConflictException) {
        // Condiciones esperadas: ya se había descontado (SERVED -> COMPLETED
        // pasa por aquí dos veces) o una petición concurrente ganó la carrera.
        // El índice único parcial garantiza que en ningún caso hubo doble
        // descuento, así que esto es la idempotencia funcionando, no un error.
        this.logger.warn(
          `Orden ${orderId}: descuento automático omitido — ${err.message}`,
        );
        return { status: 'skipped', reason: err.message };
      }
      this.logger.error(
        `Orden ${orderId}: el descuento automático de inventario falló`,
        err instanceof Error ? err.stack : String(err),
      );
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async collectLowStock(itemIds: string[]) {
    if (itemIds.length === 0) return [];
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderPoint: true,
        unitOfMeasure: true,
      },
    });
    return items
      .filter((i) => i.currentStock <= i.reorderPoint)
      .map((i) => ({
        inventory_item_id: i.id,
        inventory_item_name: i.name,
        current_stock: i.currentStock,
        reorder_point: i.reorderPoint,
        unit: i.unitOfMeasure,
      }));
  }

  /** Compensate a previous deduction (order cancelled / refunded). */
  async reverseDeduction(orderId: string, organizationId: string) {
    await this.loadOrder(orderId, organizationId);

    const [originals, reversals] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: { reference: orderRef(orderId), reason: DEDUCTION_REASON },
      }),
      this.prisma.inventoryMovement.findMany({
        where: { reference: orderRef(orderId), reason: REVERSAL_REASON },
        select: { notes: true },
      }),
    ]);

    const alreadyReversed = new Set(
      reversals
        .map((r) => /reverses=([^;\s]+)/.exec(r.notes ?? '')?.[1])
        .filter((id): id is string => Boolean(id)),
    );
    const pending = originals.filter((m) => !alreadyReversed.has(m.id));

    if (pending.length === 0) {
      return { order_id: orderId, reversed: 0, failed: 0, movements: [] };
    }

    const movements = await this.prisma.$transaction(async (tx) => {
      const out = [];
      for (const original of pending) {
        const movement = await tx.inventoryMovement.create({
          data: {
            locationId: original.locationId,
            inventoryItemId: original.inventoryItemId,
            type: 'IN',
            quantity: original.quantity,
            unitCost: original.unitCost,
            reason: REVERSAL_REASON,
            reference: orderRef(orderId),
            notes: `reverses=${original.id}`,
          },
        });
        await tx.inventoryItem.update({
          where: { id: original.inventoryItemId },
          data: { currentStock: { increment: original.quantity } },
        });
        out.push(movement);
      }
      return out;
    });

    this.logger.log(
      `Order ${orderId}: reversed ${movements.length} deduction movement(s)`,
    );

    return {
      order_id: orderId,
      reversed: movements.length,
      failed: 0,
      movements: movements.map((m) => ({
        id: m.id,
        inventory_item_id: m.inventoryItemId,
        quantity: m.quantity,
        created_at: m.createdAt,
      })),
    };
  }

  async getDeductionLogs(
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      inventory_item_id?: string;
      order_id?: string;
      status?: string;
      limit?: string;
    } = {},
  ) {
    const take = Math.min(Number(filters.limit) || 200, 500);
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.start_date) createdAt.gte = new Date(filters.start_date);
    if (filters.end_date) createdAt.lte = new Date(filters.end_date);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        inventoryItem: { organizationId },
        reason: { in: [DEDUCTION_REASON, REVERSAL_REASON] },
        ...(filters.inventory_item_id
          ? { inventoryItemId: filters.inventory_item_id }
          : {}),
        ...(filters.order_id ? { reference: orderRef(filters.order_id) } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        inventoryItem: { select: { name: true, unitOfMeasure: true } },
      },
    });

    const reversedIds = new Set(
      movements
        .filter((m) => m.reason === REVERSAL_REASON)
        .map((m) => /reverses=([^;\s]+)/.exec(m.notes ?? '')?.[1])
        .filter((id): id is string => Boolean(id)),
    );

    const logs = movements.map((m) => ({
      id: m.id,
      order_id: m.reference?.startsWith('ORDER:')
        ? m.reference.slice('ORDER:'.length)
        : null,
      recipe_id: /recipe=([^;\s]+)/.exec(m.notes ?? '')?.[1] ?? null,
      inventory_item_id: m.inventoryItemId,
      inventory_item_name: m.inventoryItem.name,
      quantity_deducted: m.quantity,
      unit: m.inventoryItem.unitOfMeasure,
      deducted_at: m.createdAt,
      status:
        m.reason === REVERSAL_REASON
          ? ('reversed' as const)
          : reversedIds.has(m.id)
            ? ('reversed' as const)
            : ('completed' as const),
    }));

    return filters.status
      ? logs.filter((l) => l.status === filters.status)
      : logs;
  }
}
