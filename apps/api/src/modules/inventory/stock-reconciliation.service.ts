/**
 * StockReconciliationService — physical counts against theoretical stock.
 *
 * A reconciliation writes an ADJUSTMENT movement whose `quantity` is the
 * ABSOLUTE counted stock (same semantics as
 * `InventoryMovementsService.getCurrentStock`) and sets
 * `inventory_items.current_stock` to the counted value, in one transaction.
 * The ADJUSTMENT also becomes the new baseline of the theoretical-stock
 * window.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { roundQuantity } from './unit-conversion';
import {
  RECONCILIATION_REASON,
  TheoreticalStockService,
} from './theoretical-stock.service';

@Injectable()
export class StockReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theoreticalStock: TheoreticalStockService,
  ) {}

  async createReconciliation(
    organizationId: string,
    data: {
      inventory_item_id: string;
      physical_count: number;
      reason?: string;
      notes?: string;
      performed_by?: string;
    },
  ) {
    if (!data?.inventory_item_id) {
      throw new BadRequestException('inventory_item_id is required');
    }
    const physicalCount = Number(data.physical_count);
    if (!Number.isFinite(physicalCount) || physicalCount < 0) {
      throw new BadRequestException(
        'physical_count must be a number greater than or equal to 0',
      );
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: data.inventory_item_id, organizationId },
    });
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${data.inventory_item_id} not found`,
      );
    }

    const before = await this.theoreticalStock.forItem(item.id, organizationId);
    const adjustment = roundQuantity(physicalCount - before.theoretical_stock);

    const movement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: 'ADJUSTMENT',
          quantity: physicalCount,
          unitCost: item.costPerUnit,
          reason: RECONCILIATION_REASON,
          reference: 'RECONCILIATION',
          notes: `performed_by=${data.performed_by ?? 'unknown'}; theoretical=${before.theoretical_stock}; adjustment=${adjustment}; reason=${data.reason ?? ''}; notes=${data.notes ?? ''}`,
        },
      });
      // ADJUSTMENT quantity is the ABSOLUTE stock value (same semantics as
      // InventoryMovementsService.getCurrentStock).
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: physicalCount },
      });
      return created;
    });

    return {
      id: movement.id,
      inventory_item_id: item.id,
      inventory_item_name: item.name,
      physical_count: physicalCount,
      theoretical_count: before.theoretical_stock,
      previous_stock: before.physical_stock,
      adjustment,
      unit: item.unitOfMeasure,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      performed_by: data.performed_by ?? null,
      performed_at: movement.createdAt,
    };
  }

  async getReconciliationHistory(
    inventoryItemId: string,
    organizationId: string,
    limit = 10,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, organizationId },
      select: { id: true, unitOfMeasure: true },
    });
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${inventoryItemId} not found`,
      );
    }

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId, type: 'ADJUSTMENT' },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    const field = (notes: string | null, key: string) =>
      new RegExp(`${key}=([^;]*)`).exec(notes ?? '')?.[1]?.trim() || null;

    return movements.map((m) => ({
      id: m.id,
      inventory_item_id: m.inventoryItemId,
      physical_count: m.quantity,
      theoretical_count: Number(field(m.notes, 'theoretical') ?? m.quantity),
      adjustment: Number(field(m.notes, 'adjustment') ?? 0),
      unit: item.unitOfMeasure,
      reason: field(m.notes, 'reason'),
      notes: field(m.notes, 'notes'),
      performed_by: field(m.notes, 'performed_by'),
      performed_at: m.createdAt,
    }));
  }

  async bulkReconciliation(
    organizationId: string,
    body: {
      items?: Array<{
        inventory_item_id: string;
        physical_count: number;
        notes?: string;
      }>;
      performed_by?: string;
      reason?: string;
    },
  ) {
    const items = body?.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    const results = [];
    const errors = [];
    for (const entry of items) {
      try {
        results.push(
          await this.createReconciliation(organizationId, {
            inventory_item_id: entry.inventory_item_id,
            physical_count: entry.physical_count,
            reason: body.reason ?? 'BULK_COUNT',
            notes: entry.notes,
            performed_by: body.performed_by,
          }),
        );
      } catch (error) {
        errors.push({
          inventory_item_id: entry.inventory_item_id,
          reason: (error as Error).message,
        });
      }
    }

    return {
      reconciled: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
