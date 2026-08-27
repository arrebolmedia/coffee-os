import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { rangoEntreDias } from '../../common/time/day-range';
import { zonaDelNegocio } from '../../common/time/zona-negocio';
import { PrismaService } from '../database/prisma.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { UpdateInventoryMovementDto } from './dto/update-inventory-movement.dto';
import { QueryInventoryMovementsDto } from './dto/query-inventory-movements.dto';

export enum MovementType {
  IN = 'IN', // Purchase, stock addition
  OUT = 'OUT', // Sale, usage
  ADJUSTMENT = 'ADJUSTMENT', // Inventory adjustment (count, damage, expiry)
  TRANSFER = 'TRANSFER', // Between locations
}

export enum MovementReason {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  USAGE = 'USAGE',
  WASTE = 'WASTE',
  DAMAGE = 'DAMAGE',
  EXPIRY = 'EXPIRY',
  COUNT_ADJUSTMENT = 'COUNT_ADJUSTMENT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RETURN = 'RETURN',
}

@Injectable()
export class InventoryMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createInventoryMovementDto: CreateInventoryMovementDto,
    organizationId?: string,
  ) {
    // Verify inventory item exists (and belongs to the caller's org).
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: createInventoryMovementDto.inventoryItemId },
    });

    if (
      !inventoryItem ||
      (organizationId && inventoryItem.organizationId !== organizationId)
    ) {
      throw new BadRequestException(
        `Inventory item with ID ${createInventoryMovementDto.inventoryItemId} not found`,
      );
    }

    // Map DTO to schema fields
    const locationId =
      createInventoryMovementDto.locationId ??
      (createInventoryMovementDto as any).location;

    // Transactionally create movement + update InventoryItem.currentStock so
    // stock is always consistent with movement history.
    const created = await this.prisma.$transaction(async (tx) => {
      // Stock check for OUT movements happens INSIDE the transaction (reading
      // InventoryItem.currentStock, which is kept up-to-date transactionally)
      // to avoid TOCTOU races between the check and the decrement.
      if (createInventoryMovementDto.type === MovementType.OUT) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: createInventoryMovementDto.inventoryItemId },
          select: { currentStock: true },
        });
        const currentStock = item?.currentStock ?? 0;
        if (currentStock < createInventoryMovementDto.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${currentStock}, Requested: ${createInventoryMovementDto.quantity}`,
          );
        }
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          ...(locationId !== undefined && { locationId }),
          inventoryItemId: createInventoryMovementDto.inventoryItemId,
          type: createInventoryMovementDto.type,
          quantity: createInventoryMovementDto.quantity,
          unitCost: createInventoryMovementDto.unitCost,
          reason: createInventoryMovementDto.reason,
          reference: (createInventoryMovementDto as any).referenceNumber,
          notes: createInventoryMovementDto.notes,
        },
        include: {
          inventoryItem: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      // Persist currentStock based on movement type.
      // IN  → increment by quantity
      // OUT → decrement by quantity
      // ADJUSTMENT → quantity is the ABSOLUTE final stock value (see
      //              getCurrentStock for the matching read-side semantics).
      // TRANSFER → no current-stock change for the receiving end here; treated
      //              as net-zero for the item (out-of-scope without to/from).
      const type = createInventoryMovementDto.type;
      const quantity = createInventoryMovementDto.quantity;
      if (type === MovementType.IN) {
        await tx.inventoryItem.update({
          where: { id: createInventoryMovementDto.inventoryItemId },
          data: { currentStock: { increment: quantity } },
        });
      } else if (type === MovementType.OUT) {
        await tx.inventoryItem.update({
          where: { id: createInventoryMovementDto.inventoryItemId },
          data: { currentStock: { decrement: quantity } },
        });
      } else if (type === MovementType.ADJUSTMENT) {
        await tx.inventoryItem.update({
          where: { id: createInventoryMovementDto.inventoryItemId },
          data: { currentStock: quantity },
        });
      }
      // TRANSFER: documented as no-op without explicit from/to fields.

      return movement;
    });

    // Attach computed currentStock for callers.
    const currentStock = await this.getCurrentStock(
      createInventoryMovementDto.inventoryItemId,
    );
    return {
      ...created,
      inventoryItem: { ...created.inventoryItem, currentStock },
    };
  }

  async findAll(query: QueryInventoryMovementsDto, organizationId?: string) {
    const { skip = 0, take = 50, type, reason, inventoryItemId } = query;

    const where: any = {};

    // Multi-tenant filter via inventoryItem.organizationId (the movement
    // itself has no organizationId column).
    if (organizationId) {
      where.inventoryItem = { organizationId };
    }

    if (type) {
      where.type = type;
    }

    if (reason) {
      where.reason = reason;
    }

    if (inventoryItemId) {
      where.inventoryItemId = inventoryItemId;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          inventoryItem: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findByType(type: string, organizationId?: string) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        type: type as MovementType,
        ...(organizationId ? { inventoryItem: { organizationId } } : {}),
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByItem(itemId: string, organizationId?: string) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        inventoryItemId: itemId,
        ...(organizationId ? { inventoryItem: { organizationId } } : {}),
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
    organizationId?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    // El final del rango tiene que ser el final de su dia: con
    // `new Date('2026-08-31')` el informe se quedaba en la medianoche y perdia
    // los movimientos de ese dia entero.
    const zona = await zonaDelNegocio(this.prisma, { organizationId });
    const rango = rangoEntreDias(startDate, endDate, zona);
    if (!rango) {
      throw new BadRequestException('Invalid start date or end date');
    }

    return this.prisma.inventoryMovement.findMany({
      where: {
        createdAt: rango,
        ...(organizationId ? { inventoryItem: { organizationId } } : {}),
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId?: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: { inventoryItem: true },
    });

    // Ownership via inventoryItem.organizationId: movements from another org
    // are reported as not found (404).
    if (
      !movement ||
      (organizationId &&
        movement.inventoryItem?.organizationId !== organizationId)
    ) {
      throw new NotFoundException(`Inventory movement with ID ${id} not found`);
    }

    return movement;
  }

  async update(
    id: string,
    updateInventoryMovementDto: UpdateInventoryMovementDto,
  ) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new NotFoundException(`Inventory movement with ID ${id} not found`);
    }

    // Block mutating type/quantity because they change stock semantics.
    // Allow only notes/reason updates to preserve audit integrity.
    if (
      updateInventoryMovementDto.type !== undefined &&
      updateInventoryMovementDto.type !== movement.type
    ) {
      throw new BadRequestException(
        'Movement type cannot be changed; create a reversing movement instead.',
      );
    }
    if (
      updateInventoryMovementDto.quantity !== undefined &&
      updateInventoryMovementDto.quantity !== movement.quantity
    ) {
      throw new BadRequestException(
        'Movement quantity cannot be changed; create a reversing movement instead.',
      );
    }

    const updateData: any = {};
    if (updateInventoryMovementDto.unitCost !== undefined)
      updateData.unitCost = updateInventoryMovementDto.unitCost;
    if (updateInventoryMovementDto.reason)
      updateData.reason = updateInventoryMovementDto.reason;
    if ((updateInventoryMovementDto as any).referenceNumber)
      updateData.reference = (
        updateInventoryMovementDto as any
      ).referenceNumber;
    if (updateInventoryMovementDto.notes !== undefined)
      updateData.notes = updateInventoryMovementDto.notes;

    const updated = await this.prisma.inventoryMovement.update({
      where: { id },
      data: updateData,
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const currentStock = await this.getCurrentStock(updated.inventoryItemId);
    return {
      ...updated,
      inventoryItem: { ...updated.inventoryItem, currentStock },
    };
  }

  /**
   * Instead of hard-deleting movements (which corrupts stock history), create a
   * reversing movement and annotate the original as voided in its notes.
   */
  async remove(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new NotFoundException(`Inventory movement with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Append void marker to notes (schema has no voidedBy field).
      await tx.inventoryMovement.update({
        where: { id },
        data: {
          notes:
            (movement.notes ?? '') + `\n[VOIDED ${new Date().toISOString()}]`,
        },
      });

      // Reverse: IN→OUT, OUT→IN, ADJUSTMENT→ADJUSTMENT (no auto inverse).
      const inverseType =
        movement.type === MovementType.IN
          ? MovementType.OUT
          : movement.type === MovementType.OUT
            ? MovementType.IN
            : null;

      if (inverseType) {
        await tx.inventoryMovement.create({
          data: {
            locationId: movement.locationId ?? undefined,
            inventoryItemId: movement.inventoryItemId,
            type: inverseType,
            quantity: movement.quantity,
            reason: 'REVERSAL',
            reference: movement.id,
            notes: `Reversal of movement ${movement.id}`,
          },
        });

        // Apply reverse stock update to inventoryItem.currentStock.
        if (inverseType === MovementType.IN) {
          await tx.inventoryItem.update({
            where: { id: movement.inventoryItemId },
            data: { currentStock: { increment: movement.quantity } },
          });
        } else {
          await tx.inventoryItem.update({
            where: { id: movement.inventoryItemId },
            data: { currentStock: { decrement: movement.quantity } },
          });
        }
      }
    });
  }

  /**
   * Compute current stock from movement history.
   *
   * Movement semantics (single source of truth, mirrored by `create()`):
   *   IN          → +quantity (delta)
   *   OUT         → -quantity (delta)
   *   ADJUSTMENT  → quantity is the ABSOLUTE final stock value at that moment.
   *                 The most recent ADJUSTMENT RESETS the base; only IN/OUT
   *                 movements created AFTER it are applied on top:
   *                 stock = lastAdjustment.quantity + sum(IN after) - sum(OUT after)
   *   TRANSFER    → ignored (no from/to fields on schema)
   *
   * With no ADJUSTMENT present, stock = sum(IN) - sum(OUT).
   */
  private async getCurrentStock(inventoryItemId: string): Promise<number> {
    const lastAdjustment = await this.prisma.inventoryMovement.findFirst({
      where: { inventoryItemId, type: 'ADJUSTMENT' },
      orderBy: { createdAt: 'desc' },
    });

    const afterAdjustment = lastAdjustment
      ? { createdAt: { gt: lastAdjustment.createdAt } }
      : {};

    const [inResult, outResult] = await Promise.all([
      this.prisma.inventoryMovement.aggregate({
        where: { inventoryItemId, type: 'IN', ...afterAdjustment },
        _sum: { quantity: true },
      }),
      this.prisma.inventoryMovement.aggregate({
        where: { inventoryItemId, type: 'OUT', ...afterAdjustment },
        _sum: { quantity: true },
      }),
    ]);

    return (
      (lastAdjustment?.quantity ?? 0) +
      (inResult._sum.quantity ?? 0) -
      (outResult._sum.quantity ?? 0)
    );
  }
}
