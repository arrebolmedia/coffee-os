/**
 * InventoryService — Prisma-backed stock & movements service.
 *
 * Maps to `InventoryItem` and `InventoryMovement` models.
 *
 * Coordination notes:
 *   - The `inventory-items` module owns the catalog CRUD (create/findOne/etc.).
 *   - This module focuses on stock adjustments and movement history.
 *   - When overlap exists, prefer `InventoryItemsService` for catalog work and
 *     keep this service focused on `adjustStock` + movements.
 *
 * TODO migration: the legacy DTOs/interface contain many fields not in the
 * Prisma schema (brand, type enum, perishable flags, refrigeration, tags,
 * package_size, conversion_factor, etc.). They are NOT persisted; they exist
 * on the in-memory mapping for backwards-compatibility of the HTTP response,
 * but are populated with defaults/undefined. When the schema is extended,
 * map them properly here.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';
import {
  InventoryItem,
  InventoryItemStats,
  InventoryItemValuation,
  ItemStatus,
  ItemType,
  StockMovement,
} from './interfaces';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  /** Convert a Prisma InventoryItem row into the public InventoryItem shape. */
  private toItem(row: any): InventoryItem {
    return {
      id: row.id,
      organization_id: row.organizationId,
      category_id: row.category || '',
      supplier_id: row.supplierId || undefined,
      sku: row.code,
      name: row.name,
      description: row.description || undefined,
      brand: undefined,
      type: ItemType.INGREDIENT,
      status: row.active ? ItemStatus.ACTIVE : ItemStatus.INACTIVE,
      unit_of_measure: row.unitOfMeasure as any,
      units_per_package: 1,
      package_size: undefined,
      cost_per_unit: row.costPerUnit,
      average_cost: row.costPerUnit,
      track_inventory: true,
      current_stock: row.currentStock,
      minimum_stock: row.reorderPoint,
      maximum_stock: row.parLevel,
      par_level: row.parLevel,
      conversion_factor: undefined,
      conversion_unit: undefined,
      lead_time_days: undefined,
      order_frequency_days: undefined,
      is_perishable: false,
      is_taxable: true,
      requires_refrigeration: false,
      storage_location: undefined,
      storage_temperature_min: undefined,
      storage_temperature_max: undefined,
      tags: row.category ? [row.category] : [],
      barcode: undefined,
      image_url: undefined,
      notes: undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toMovement(row: any): StockMovement {
    let type: StockMovement['type'] = 'adjustment';
    switch (row.type) {
      case 'IN':
        type = 'purchase';
        break;
      case 'OUT':
        type = 'sale';
        break;
      case 'ADJUSTMENT':
        type = 'adjustment';
        break;
      case 'TRANSFER':
        type = 'transfer';
        break;
    }
    return {
      id: row.id,
      item_id: row.inventoryItemId,
      location_id: row.locationId || undefined,
      type,
      quantity: row.quantity,
      cost_per_unit: row.unitCost ?? undefined,
      reference_id: row.reference || undefined,
      notes: row.notes || undefined,
      created_at: row.createdAt,
    };
  }

  async create(createDto: CreateInventoryItemDto): Promise<InventoryItem> {
    // Validate SKU unique within org
    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        organizationId: createDto.organization_id,
        code: createDto.sku,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Item with SKU "${createDto.sku}" already exists`,
      );
    }

    const newItem = await this.prisma.inventoryItem.create({
      data: {
        organizationId: createDto.organization_id,
        code: createDto.sku,
        name: createDto.name,
        description: createDto.description,
        unitOfMeasure: createDto.unit_of_measure,
        costPerUnit: createDto.cost_per_unit,
        parLevel: createDto.par_level || 0,
        reorderPoint: createDto.minimum_stock || 0,
        category: createDto.category_id,
        supplierId: createDto.supplier_id,
        active: createDto.status !== ItemStatus.INACTIVE,
        currentStock: createDto.current_stock || 0,
      },
    });

    this.logger.log(`Created inventory item: ${newItem.name} (${newItem.id})`);
    return this.toItem(newItem);
  }

  async findAll(
    query?: QueryInventoryItemsDto,
    user?: any,
  ): Promise<InventoryItem[]> {
    const where: any = {};

    // Multi-tenant: only the authenticated user's organizationId is trusted.
    // The query.organization_id fallback was removed (cross-tenant leak).
    if (user?.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.status) {
      where.active = query.status === ItemStatus.ACTIVE;
    }

    if (query?.category_id) {
      where.category = query.category_id;
    }

    if (query?.supplier_id) {
      where.supplierId = query.supplier_id;
    }

    if (query?.min_cost !== undefined || query?.max_cost !== undefined) {
      where.costPerUnit = {};
      if (query?.min_cost !== undefined) where.costPerUnit.gte = query.min_cost;
      if (query?.max_cost !== undefined) where.costPerUnit.lte = query.max_cost;
    }

    if (query?.out_of_stock === 'true') {
      where.currentStock = 0;
    }

    // sort
    const sortByMap: Record<string, string> = {
      name: 'name',
      cost_per_unit: 'costPerUnit',
      current_stock: 'currentStock',
      created_at: 'createdAt',
    };
    const sortField = sortByMap[query?.sort_by || 'name'] || 'name';
    const orderBy: any = { [sortField]: query?.order || 'asc' };

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: { supplier: true },
      orderBy,
    });

    let mapped = items.map((i) => this.toItem(i));

    // low_stock requires a comparison that Prisma can't express directly
    if (query?.low_stock === 'true') {
      mapped = mapped.filter((i) => i.current_stock <= i.minimum_stock);
    }

    return mapped;
  }

  async findById(id: string, organizationId?: string): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
    });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    return this.toItem(item);
  }

  async findBySku(
    sku: string,
    organization_id: string,
  ): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { code: sku, organizationId: organization_id },
    });
    if (!item) {
      throw new NotFoundException(
        `Inventory item with SKU "${sku}" not found in organization`,
      );
    }
    return this.toItem(item);
  }

  async update(
    id: string,
    updateDto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    if (updateDto.sku && updateDto.sku !== item.code) {
      const conflict = await this.prisma.inventoryItem.findFirst({
        where: {
          organizationId: item.organizationId,
          code: updateDto.sku,
          id: { not: id },
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Item with SKU "${updateDto.sku}" already exists`,
        );
      }
    }

    const data: any = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.sku !== undefined) data.code = updateDto.sku;
    if (updateDto.description !== undefined)
      data.description = updateDto.description;
    if (updateDto.unit_of_measure !== undefined)
      data.unitOfMeasure = updateDto.unit_of_measure;
    if (updateDto.cost_per_unit !== undefined)
      data.costPerUnit = updateDto.cost_per_unit;
    if (updateDto.par_level !== undefined) data.parLevel = updateDto.par_level;
    if (updateDto.minimum_stock !== undefined)
      data.reorderPoint = updateDto.minimum_stock;
    if (updateDto.current_stock !== undefined)
      data.currentStock = updateDto.current_stock;
    if (updateDto.category_id !== undefined)
      data.category = updateDto.category_id;
    if (updateDto.supplier_id !== undefined)
      data.supplierId = updateDto.supplier_id;
    if (updateDto.status !== undefined)
      data.active = updateDto.status === ItemStatus.ACTIVE;

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data,
    });

    this.logger.log(`Updated inventory item: ${updated.name} (${id})`);
    return this.toItem(updated);
  }

  /**
   * Soft delete: mark active=false. We prefer soft delete because InventoryItem
   * is referenced by RecipeIngredient and InventoryMovement.
   */
  async delete(id: string): Promise<void> {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    await this.prisma.inventoryItem.update({
      where: { id },
      data: { active: false },
    });
    this.logger.log(`Soft-deleted inventory item: ${item.name} (${id})`);
  }

  /**
   * Adjust stock and record an InventoryMovement in a single transaction.
   */
  async adjustStock(
    id: string,
    quantity: number,
    operation: 'add' | 'subtract' | 'set',
    notes?: string,
  ): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    let newStock = item.currentStock;
    let movementType: 'IN' | 'OUT' | 'ADJUSTMENT' = 'ADJUSTMENT';
    let movementQuantity: number;

    switch (operation) {
      case 'add':
        newStock += quantity;
        movementType = 'IN';
        movementQuantity = quantity;
        break;
      case 'subtract':
        newStock -= quantity;
        if (newStock < 0) {
          throw new BadRequestException('Insufficient stock');
        }
        // OUT movements always carry POSITIVE quantities (the sign is implied
        // by the type), consistent with the rest of the system.
        movementType = 'OUT';
        movementQuantity = quantity;
        break;
      case 'set':
        // ADJUSTMENT quantity is the ABSOLUTE final stock value (see
        // InventoryMovementsService.getCurrentStock semantics).
        movementQuantity = quantity;
        newStock = quantity;
        movementType = 'ADJUSTMENT';
        break;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      this.prisma.inventoryMovement.create({
        data: {
          inventoryItemId: id,
          type: movementType,
          quantity: movementQuantity,
          notes,
        },
      }),
    ]);

    this.logger.log(
      `Adjusted stock for ${item.name}: ${operation} ${quantity} = ${newStock}`,
    );
    return this.toItem(updated);
  }

  async getMovements(item_id: string): Promise<StockMovement[]> {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId: item_id },
      orderBy: { createdAt: 'desc' },
    });
    return movements.map((m) => this.toMovement(m));
  }

  async getStats(organization_id: string): Promise<InventoryItemStats> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId: organization_id },
    });

    const by_type: Record<ItemType, number> = {
      [ItemType.INGREDIENT]: items.length,
      [ItemType.SUPPLY]: 0,
      [ItemType.MATERIAL]: 0,
      [ItemType.EQUIPMENT]: 0,
    };

    const by_status: Record<ItemStatus, number> = {
      [ItemStatus.ACTIVE]: 0,
      [ItemStatus.INACTIVE]: 0,
      [ItemStatus.DISCONTINUED]: 0,
    };

    let total_value = 0;
    let low_stock_count = 0;
    let out_of_stock_count = 0;

    items.forEach((item) => {
      if (item.active) {
        by_status[ItemStatus.ACTIVE]++;
      } else {
        by_status[ItemStatus.INACTIVE]++;
      }

      total_value += item.currentStock * item.costPerUnit;
      if (item.currentStock <= item.reorderPoint) low_stock_count++;
      if (item.currentStock === 0) out_of_stock_count++;
    });

    return {
      total_items: items.length,
      by_type,
      by_status,
      total_value,
      low_stock_count,
      out_of_stock_count,
      perishable_count: 0,
    };
  }

  async getValuation(
    organization_id: string,
  ): Promise<InventoryItemValuation[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId: organization_id },
    });

    const valuations = items.map((item) => ({
      item_id: item.id,
      name: item.name,
      sku: item.code,
      current_stock: item.currentStock,
      cost_per_unit: item.costPerUnit,
      total_value: item.currentStock * item.costPerUnit,
      percentage_of_total: 0,
    }));

    const total_value = valuations.reduce((sum, v) => sum + v.total_value, 0);
    valuations.forEach((v) => {
      v.percentage_of_total =
        total_value > 0 ? (v.total_value / total_value) * 100 : 0;
    });

    return valuations.sort((a, b) => b.total_value - a.total_value);
  }
}
