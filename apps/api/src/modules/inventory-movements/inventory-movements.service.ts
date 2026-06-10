import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async create(createInventoryMovementDto: CreateInventoryMovementDto) {
    // Verify inventory item exists
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: createInventoryMovementDto.inventoryItemId },
    });

    if (!inventoryItem) {
      throw new BadRequestException(
        `Inventory item with ID ${createInventoryMovementDto.inventoryItemId} not found`,
      );
    }

    // Validate quantity based on movement type
    if (createInventoryMovementDto.type === MovementType.OUT) {
      const currentStock = await this.getCurrentStock(
        createInventoryMovementDto.inventoryItemId,
      );
      if (currentStock < createInventoryMovementDto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentStock}, Requested: ${createInventoryMovementDto.quantity}`,
        );
      }
    }

    // Map DTO to schema fields
    const locationId =
      createInventoryMovementDto.locationId ??
      (createInventoryMovementDto as any).location;

    // Transactionally create movement + update InventoryItem.currentStock so
    // stock is always consistent with movement history.
    const created = await this.prisma.$transaction(async (tx) => {
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
      // ADJUSTMENT → set absolute (quantity is the new value if non-negative);
      //              if a signed delta semantic is desired, this can change.
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

  async findAll(query: QueryInventoryMovementsDto) {
    const { skip = 0, take = 50, type, reason, inventoryItemId } = query;

    const where: any = {};

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

  async findByType(type: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { type: type as MovementType },
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByItem(itemId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId: itemId },
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDateRange(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    return this.prisma.inventoryMovement.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: { inventoryItem: true },
    });

    if (!movement) {
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
   * Compute current stock by summing movements with signed semantics:
   *   IN          → +quantity
   *   OUT         → -quantity
   *   ADJUSTMENT  → +quantity (treated as the absolute new amount delta;
   *                 historical adjustments were not stored as net deltas, so
   *                 we sum the raw values consistently)
   *   TRANSFER    → ignored (no from/to fields on schema)
   */
  private async getCurrentStock(inventoryItemId: string): Promise<number> {
    const [inResult, outResult, adjResult] = await Promise.all([
      this.prisma.inventoryMovement.aggregate({
        where: { inventoryItemId, type: 'IN' },
        _sum: { quantity: true },
      }),
      this.prisma.inventoryMovement.aggregate({
        where: { inventoryItemId, type: 'OUT' },
        _sum: { quantity: true },
      }),
      this.prisma.inventoryMovement.aggregate({
        where: { inventoryItemId, type: 'ADJUSTMENT' },
        _sum: { quantity: true },
      }),
    ]);
    return (
      (inResult._sum.quantity ?? 0) -
      (outResult._sum.quantity ?? 0) +
      (adjResult._sum.quantity ?? 0)
    );
  }
}
