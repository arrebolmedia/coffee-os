import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventoryItemDto: CreateInventoryItemDto) {
    // Check if code already exists
    const existingItem = await this.prisma.inventoryItem.findUnique({
      where: { code: createInventoryItemDto.code },
    });

    if (existingItem) {
      throw new ConflictException(
        `Inventory item with code ${createInventoryItemDto.code} already exists`,
      );
    }

    // Verify supplier exists if provided
    if (createInventoryItemDto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: createInventoryItemDto.supplierId },
      });

      if (!supplier) {
        throw new BadRequestException(
          `Supplier with ID ${createInventoryItemDto.supplierId} not found`,
        );
      }
    }

    return this.prisma.inventoryItem.create({
      data: createInventoryItemDto,
      include: {
        supplier: true,
        _count: {
          select: {
            recipeIngredients: true,
            inventoryMovements: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryInventoryItemsDto) {
    const {
      skip = 0,
      take = 50,
      active,
      category,
      search,
      supplierId,
      lowStock,
    } = query;

    const where: any = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (category) {
      where.category = category;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Low stock filter: items where current stock < reorder point
    // This would require inventory movements aggregation in a real scenario
    // For now, we'll use a simpler approach

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              contactName: true,
            },
          },
          _count: {
            select: {
              recipeIngredients: true,
              inventoryMovements: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findAllActive() {
    return this.prisma.inventoryItem.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findLowStock() {
    // Find items where reorderPoint > 0 (meaning they have stock tracking)
    // In a real implementation, you'd compare with actual stock levels
    return this.prisma.inventoryItem.findMany({
      where: {
        active: true,
        reorderPoint: {
          gt: 0,
        },
      },
      orderBy: {
        reorderPoint: 'desc',
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactName: true,
            leadTime: true,
          },
        },
      },
    });
  }

  async findByCategory(category: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        category: {
          equals: category,
          mode: 'insensitive',
        },
        active: true,
      },
      orderBy: { name: 'asc' },
      include: {
        supplier: true,
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        supplier: true,
        recipeIngredients: {
          include: {
            recipe: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            inventoryMovements: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  async findByCode(code: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { code },
      include: {
        supplier: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Inventory item with code ${code} not found`,
      );
    }

    return item;
  }

  async update(id: string, updateInventoryItemDto: UpdateInventoryItemDto) {
    // Check if item exists
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    // If updating code, check for conflicts
    if (updateInventoryItemDto.code && updateInventoryItemDto.code !== item.code) {
      const existingItem = await this.prisma.inventoryItem.findUnique({
        where: { code: updateInventoryItemDto.code },
      });

      if (existingItem) {
        throw new ConflictException(
          `Inventory item with code ${updateInventoryItemDto.code} already exists`,
        );
      }
    }

    // If updating supplier, verify it exists
    if (updateInventoryItemDto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: updateInventoryItemDto.supplierId },
      });

      if (!supplier) {
        throw new BadRequestException(
          `Supplier with ID ${updateInventoryItemDto.supplierId} not found`,
        );
      }
    }

    return this.prisma.inventoryItem.update({
      where: { id },
      data: updateInventoryItemDto,
      include: {
        supplier: true,
      },
    });
  }

  async remove(id: string) {
    // Check if item exists
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recipeIngredients: true,
            inventoryMovements: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    // Soft delete if item is being used
    if (
      item._count.recipeIngredients > 0 ||
      item._count.inventoryMovements > 0
    ) {
      return this.prisma.inventoryItem.update({
        where: { id },
        data: { active: false },
      });
    }

    // Hard delete if item is not being used
    return this.prisma.inventoryItem.delete({
      where: { id },
    });
  }
}
