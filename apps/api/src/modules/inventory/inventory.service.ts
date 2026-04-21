import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';
import {
  InventoryItem,
  InventoryItemStats,
  InventoryItemValuation,
  StockMovement,
  ItemType,
  ItemStatus,
} from './interfaces';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private items = new Map<string, InventoryItem>();
  private movements = new Map<string, StockMovement>();

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateInventoryItemDto): Promise<InventoryItem> {
    // Validar SKU único
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

    const mappedItem: InventoryItem = {
      id: newItem.id,
      organization_id: newItem.organizationId,
      category_id: newItem.category || '',
      supplier_id: newItem.supplierId || undefined,
      sku: newItem.code,
      name: newItem.name,
      description: newItem.description || undefined,
      brand: undefined,
      type: ItemType.INGREDIENT,
      status: newItem.active ? ItemStatus.ACTIVE : ItemStatus.INACTIVE,
      unit_of_measure: newItem.unitOfMeasure as any,
      units_per_package: 1,
      package_size: undefined,
      cost_per_unit: newItem.costPerUnit,
      average_cost: newItem.costPerUnit,
      track_inventory: true,
      current_stock: newItem.currentStock,
      minimum_stock: newItem.reorderPoint,
      maximum_stock: newItem.parLevel,
      par_level: newItem.parLevel,
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
      tags: [],
      barcode: undefined,
      image_url: undefined,
      notes: undefined,
      created_at: newItem.createdAt,
      updated_at: newItem.updatedAt,
    };

    // Cache in memory Map so findById works without DB
    this.items.set(mappedItem.id, mappedItem);
    return mappedItem;
  }

  async findAll(
    query?: QueryInventoryItemsDto,
    user?: any,
  ): Promise<InventoryItem[]> {
    // Primero intentar cargar de base de datos
    try {
      const whereClause: any = {
        organizationId: user?.organizationId,
        ...(query?.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
        ...(query?.status && {
          active: query.status === ItemStatus.ACTIVE,
        }),
      };

      const items = await this.prisma.inventoryItem.findMany({
        where: whereClause,
        include: {
          supplier: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Mapear a formato InventoryItem
      return items.map((item: any) => ({
        id: item.id,
        organization_id: item.organizationId,
        category_id: item.category || '',
        supplier_id: item.supplierId || undefined,
        sku: item.code,
        name: item.name,
        description: item.description || undefined,
        brand: undefined,
        type: 'INGREDIENT' as ItemType,
        status: item.active ? ItemStatus.ACTIVE : ItemStatus.INACTIVE,
        unit_of_measure: item.unitOfMeasure,
        units_per_package: 1,
        package_size: undefined,
        cost_per_unit: item.costPerUnit,
        average_cost: item.costPerUnit,
        track_inventory: true,
        current_stock: item.currentStock,
        minimum_stock: item.reorderPoint,
        maximum_stock: item.parLevel,
        par_level: item.parLevel,
        conversion_factor: undefined,
        conversion_unit: undefined,
        lead_time_days: undefined,
        order_frequency_days: undefined,
        is_perishable:
          item.category === 'DAIRY' || item.category === 'PASTRIES',
        is_taxable: true,
        requires_refrigeration: item.category === 'DAIRY',
        storage_location: undefined,
        storage_temperature_min: undefined,
        storage_temperature_max: undefined,
        tags: item.category ? [item.category] : [],
        barcode: undefined,
        image_url: undefined,
        notes: undefined,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Error cargando inventory items de DB:', error);
      // Continuar con fallback
    }

    // Fallback a Map en memoria
    let items = Array.from(this.items.values());

    if (query) {
      if (query.organization_id) {
        items = items.filter(
          (i) => i.organization_id === query.organization_id,
        );
      }

      if (query.category_id) {
        items = items.filter((i) => i.category_id === query.category_id);
      }

      if (query.supplier_id) {
        items = items.filter((i) => i.supplier_id === query.supplier_id);
      }

      if (query.type) {
        items = items.filter((i) => i.type === query.type);
      }

      if (query.status) {
        items = items.filter((i) => i.status === query.status);
      }

      if (query.track_inventory === 'true') {
        items = items.filter((i) => i.track_inventory);
      } else if (query.track_inventory === 'false') {
        items = items.filter((i) => !i.track_inventory);
      }

      if (query.low_stock === 'true') {
        items = items.filter((i) => i.current_stock <= i.minimum_stock);
      }

      if (query.out_of_stock === 'true') {
        items = items.filter((i) => i.current_stock === 0);
      }

      if (query.is_perishable === 'true') {
        items = items.filter((i) => i.is_perishable);
      } else if (query.is_perishable === 'false') {
        items = items.filter((i) => !i.is_perishable);
      }

      if (query.requires_refrigeration === 'true') {
        items = items.filter((i) => i.requires_refrigeration);
      } else if (query.requires_refrigeration === 'false') {
        items = items.filter((i) => !i.requires_refrigeration);
      }

      if (query.min_cost !== undefined) {
        items = items.filter((i) => i.cost_per_unit >= query.min_cost!);
      }

      if (query.max_cost !== undefined) {
        items = items.filter((i) => i.cost_per_unit <= query.max_cost!);
      }

      if (query.search) {
        const search = query.search.toLowerCase();
        items = items.filter(
          (i) =>
            i.name.toLowerCase().includes(search) ||
            i.sku.toLowerCase().includes(search) ||
            i.description?.toLowerCase().includes(search) ||
            i.brand?.toLowerCase().includes(search) ||
            i.barcode?.toLowerCase().includes(search),
        );
      }

      const sortBy = query.sort_by || 'name';
      const order = query.order || 'asc';

      items.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'cost_per_unit':
            comparison = a.cost_per_unit - b.cost_per_unit;
            break;
          case 'current_stock':
            comparison = a.current_stock - b.current_stock;
            break;
          case 'created_at':
            comparison = a.created_at.getTime() - b.created_at.getTime();
            break;
        }

        return order === 'asc' ? comparison : -comparison;
      });
    }

    return items;
  }

  async findById(id: string): Promise<InventoryItem> {
    const item = this.items.get(id);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  async findBySku(
    sku: string,
    organization_id: string,
  ): Promise<InventoryItem> {
    const item = Array.from(this.items.values()).find(
      (i) => i.sku === sku && i.organization_id === organization_id,
    );

    if (!item) {
      throw new NotFoundException(
        `Inventory item with SKU "${sku}" not found in organization`,
      );
    }

    return item;
  }

  async update(
    id: string,
    updateDto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const item = await this.findById(id);

    // Validar SKU único si se cambia
    if (updateDto.sku && updateDto.sku !== item.sku) {
      const existing = Array.from(this.items.values()).find(
        (i) =>
          i.organization_id === item.organization_id &&
          i.sku === updateDto.sku &&
          i.id !== id,
      );

      if (existing) {
        throw new ConflictException(
          `Item with SKU "${updateDto.sku}" already exists`,
        );
      }
    }

    const updated: InventoryItem = {
      ...item,
      ...updateDto,
      updated_at: new Date(),
    };

    this.items.set(id, updated);
    this.logger.log(`Updated inventory item: ${updated.name} (${id})`);

    return updated;
  }

  async delete(id: string): Promise<void> {
    const item = await this.findById(id);

    this.items.delete(id);
    this.logger.log(`Deleted inventory item: ${item.name} (${id})`);
  }

  async adjustStock(
    id: string,
    quantity: number,
    operation: 'add' | 'subtract' | 'set',
    notes?: string,
  ): Promise<InventoryItem> {
    const item = await this.findById(id);

    if (!item.track_inventory) {
      throw new BadRequestException('Item does not track inventory');
    }

    let newStock = item.current_stock;

    switch (operation) {
      case 'add':
        newStock += quantity;
        break;
      case 'subtract':
        newStock -= quantity;
        if (newStock < 0) {
          throw new BadRequestException('Insufficient stock');
        }
        break;
      case 'set':
        newStock = quantity;
        break;
    }

    const updated = await this.update(id, { current_stock: newStock });

    // Registrar movimiento
    const movement: StockMovement = {
      id: uuidv4(),
      item_id: id,
      type: 'adjustment',
      quantity:
        operation === 'set'
          ? newStock - item.current_stock
          : quantity * (operation === 'subtract' ? -1 : 1),
      notes,
      created_at: new Date(),
    };

    this.movements.set(movement.id, movement);

    this.logger.log(
      `Adjusted stock for ${item.name}: ${operation} ${quantity} = ${newStock}`,
    );

    return updated;
  }

  async getMovements(item_id: string): Promise<StockMovement[]> {
    return Array.from(this.movements.values())
      .filter((m) => m.item_id === item_id)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async getStats(organization_id: string): Promise<InventoryItemStats> {
    const items = await this.findAll({ organization_id });

    const by_type: Record<ItemType, number> = {
      [ItemType.INGREDIENT]: 0,
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
    let perishable_count = 0;

    items.forEach((item) => {
      by_type[item.type] = (by_type[item.type] || 0) + 1;
      by_status[item.status] = (by_status[item.status] || 0) + 1;

      total_value += item.current_stock * item.cost_per_unit;

      if (item.current_stock <= item.minimum_stock) low_stock_count++;
      if (item.current_stock === 0) out_of_stock_count++;
      if (item.is_perishable) perishable_count++;
    });

    return {
      total_items: items.length,
      by_type,
      by_status,
      total_value,
      low_stock_count,
      out_of_stock_count,
      perishable_count,
    };
  }

  async getValuation(
    organization_id: string,
  ): Promise<InventoryItemValuation[]> {
    const items = await this.findAll({ organization_id });

    const valuations = items.map((item) => ({
      item_id: item.id,
      name: item.name,
      sku: item.sku,
      current_stock: item.current_stock,
      cost_per_unit: item.cost_per_unit,
      total_value: item.current_stock * item.cost_per_unit,
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
