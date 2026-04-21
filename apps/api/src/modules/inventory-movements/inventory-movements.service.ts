import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
    const created = await this.prisma.inventoryMovement.create({
      data: {
        locationId: createInventoryMovementDto.location || 'default-loc', // Schema needs locationId
        inventoryItemId: createInventoryMovementDto.inventoryItemId,
        type: createInventoryMovementDto.type,
        quantity: createInventoryMovementDto.quantity,
        unitCost: createInventoryMovementDto.unitCost,
        reason: createInventoryMovementDto.reason,
        reference: createInventoryMovementDto.referenceNumber,
        notes: createInventoryMovementDto.notes,
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Attach computed currentStock
    const currentStock = await this.getCurrentStock(createInventoryMovementDto.inventoryItemId);
    return { ...created, inventoryItem: { ...created.inventoryItem, currentStock } };
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
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
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
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByItem(itemId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId: itemId },
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: {
        inventoryItem: true,
      },
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

    // Map DTO to schema fields
    const updateData: any = {};
    if (updateInventoryMovementDto.type) updateData.type = updateInventoryMovementDto.type;
    if (updateInventoryMovementDto.quantity !== undefined) updateData.quantity = updateInventoryMovementDto.quantity;
    if (updateInventoryMovementDto.unitCost !== undefined) updateData.unitCost = updateInventoryMovementDto.unitCost;
    if (updateInventoryMovementDto.reason) updateData.reason = updateInventoryMovementDto.reason;
    if (updateInventoryMovementDto.referenceNumber) updateData.reference = updateInventoryMovementDto.referenceNumber;
    if (updateInventoryMovementDto.notes) updateData.notes = updateInventoryMovementDto.notes;

    const updated = await this.prisma.inventoryMovement.update({
      where: { id },
      data: updateData,
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const currentStock = await this.getCurrentStock(updated.inventoryItemId);
    return { ...updated, inventoryItem: { ...updated.inventoryItem, currentStock } };
  }

  async remove(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new NotFoundException(`Inventory movement with ID ${id} not found`);
    }

    await this.prisma.inventoryMovement.delete({
      where: { id },
    });
  }

  private async getCurrentStock(inventoryItemId: string): Promise<number> {
    // Sum movements to compute current stock: IN increases, OUT decreases
    const result = await this.prisma.inventoryMovement.aggregate({
      where: { inventoryItemId },
      _sum: {
        quantity: true,
      },
    });

    // If there are no movements, stock is 0
    return result._sum.quantity ?? 0;
  }
}
