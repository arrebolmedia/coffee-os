import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear un nuevo producto
   */
  async create(createProductDto: CreateProductDto) {
    // Verificar SKU único en la organización
    const existingBySku = await this.prisma.product.findFirst({
      where: {
        organizationId: createProductDto.organization_id,
        sku: createProductDto.sku,
      },
    });

    if (existingBySku) {
      throw new ConflictException(
        `Producto con SKU ${createProductDto.sku} ya existe`,
      );
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          organizationId: createProductDto.organization_id,
          categoryId: createProductDto.category_id,
          sku: createProductDto.sku,
          name: createProductDto.name,
          description: createProductDto.description,
          image: createProductDto.image_url,
          price: createProductDto.base_price,
          basePrice: createProductDto.base_price,
          cost: createProductDto.cost || 0,
          taxRate: createProductDto.tax_rate || 0.16,
          allowModifiers: createProductDto.allow_modifiers ?? true,
          trackInventory: createProductDto.track_inventory ?? false,
          active: createProductDto.is_available ?? true,
        },
        include: {
          category: true,
          productModifiers: {
            include: {
              modifier: true,
            },
          },
        },
      });

      this.logger.log(`Producto creado: ${product.name} (${product.sku})`);
      return product;
    } catch (error) {
      // Cubre la race entre el pre-check findFirst y el create:
      // dos creates concurrentes con el mismo SKU.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Producto con SKU ${createProductDto.sku} ya existe`,
        );
      }
      throw error;
    }
  }

  /**
   * Obtener todos los productos con filtros
   */
  async findAll(query?: QueryProductsDto, organizationId?: string) {
    const where: any = {};

    // Multi-tenant: filtrar por organización del usuario autenticado
    if (organizationId) {
      where.organizationId = organizationId;
    }

    // Filtrar por categoría
    if (query?.category_id) {
      where.categoryId = query.category_id;
    }

    // Buscar por texto
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filtrar por disponibilidad/estado
    if (query?.is_available !== undefined) {
      where.active = query.is_available === 'true';
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products;
  }

  /**
   * Obtener un producto por ID
   */
  async findById(id: string, organizationId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });

    // Ownership: a product from another org is reported as not found (404).
    if (
      !product ||
      (organizationId && product.organizationId !== organizationId)
    ) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    return product;
  }

  /**
   * Obtener producto por SKU
   */
  async findBySku(sku: string, organizationId?: string) {
    const where: any = { sku };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const product = await this.prisma.product.findFirst({
      where,
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }

    return product;
  }

  /**
   * Actualizar un producto
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Verificar que existe
    await this.findById(id);

    // Verificar SKU único si se está actualizando (dentro de la misma org)
    if (updateProductDto.sku) {
      const current = await this.prisma.product.findUnique({
        where: { id },
        select: { organizationId: true },
      });

      const existingBySku = await this.prisma.product.findFirst({
        where: {
          sku: updateProductDto.sku,
          ...(current?.organizationId
            ? { organizationId: current.organizationId }
            : {}),
          NOT: { id },
        },
      });

      if (existingBySku) {
        throw new ConflictException(
          `Producto con SKU ${updateProductDto.sku} ya existe`,
        );
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(updateProductDto.category_id && {
          categoryId: updateProductDto.category_id,
        }),
        ...(updateProductDto.sku && { sku: updateProductDto.sku }),
        ...(updateProductDto.name && { name: updateProductDto.name }),
        ...(updateProductDto.description !== undefined && {
          description: updateProductDto.description,
        }),
        ...(updateProductDto.image_url !== undefined && {
          image: updateProductDto.image_url,
        }),
        ...(updateProductDto.base_price !== undefined && {
          price: updateProductDto.base_price,
          basePrice: updateProductDto.base_price,
        }),
        ...(updateProductDto.cost !== undefined && {
          cost: updateProductDto.cost,
        }),
        ...(updateProductDto.tax_rate !== undefined && {
          taxRate: updateProductDto.tax_rate,
        }),
        ...(updateProductDto.allow_modifiers !== undefined && {
          allowModifiers: updateProductDto.allow_modifiers,
        }),
        ...(updateProductDto.track_inventory !== undefined && {
          trackInventory: updateProductDto.track_inventory,
        }),
        ...(updateProductDto.is_available !== undefined && {
          active: updateProductDto.is_available,
        }),
      },
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });

    this.logger.log(`Producto actualizado: ${product.name}`);
    return product;
  }

  /**
   * Eliminar un producto
   */
  async delete(id: string): Promise<void> {
    const product = await this.findById(id);

    await this.prisma.product.delete({
      where: { id },
    });

    this.logger.log(`Producto eliminado: ${product.name}`);
  }

  /**
   * Obtener modificadores de un producto
   */
  async getModifiers(productId: string) {
    await this.findById(productId);

    const productModifiers = await this.prisma.productModifier.findMany({
      where: {
        productId,
      },
      include: {
        modifier: true,
      },
    });

    return productModifiers.map((pm) => pm.modifier);
  }

  /**
   * Crear modificador para un producto
   */
  async createModifier(productId: string, modifierId: string) {
    await this.findById(productId);

    const productModifier = await this.prisma.productModifier.create({
      data: {
        productId,
        modifierId,
      },
      include: {
        modifier: true,
        product: true,
      },
    });

    this.logger.log(
      `Modificador ${modifierId} agregado a producto ${productId}`,
    );

    return productModifier;
  }

  /**
   * Eliminar modificador de producto
   */
  async deleteModifier(productId: string, modifierId: string): Promise<void> {
    const productModifier = await this.prisma.productModifier.findFirst({
      where: {
        productId,
        modifierId,
      },
    });

    if (!productModifier) {
      throw new NotFoundException('Modificador no encontrado en producto');
    }

    await this.prisma.productModifier.delete({
      where: { id: productModifier.id },
    });

    this.logger.log(
      `Modificador ${modifierId} eliminado de producto ${productId}`,
    );
  }

  /**
   * Obtener estadísticas de productos
   */
  async getStats(organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;

    const total_products = await this.prisma.product.count({ where });

    const products = await this.prisma.product.findMany({
      where,
      select: {
        price: true,
        cost: true,
        active: true,
        trackInventory: true,
      },
    });

    const activeCount = products.filter((p) => p.active).length;
    const inactiveCount = products.filter((p) => !p.active).length;

    let totalPrice = 0;
    let totalMargin = 0;
    let countWithMargin = 0;

    products.forEach((product) => {
      totalPrice += product.price;

      if (product.cost && product.cost > 0) {
        const margin = ((product.price - product.cost) / product.price) * 100;
        totalMargin += margin;
        countWithMargin++;
      }
    });

    return {
      total_products,
      active_products: activeCount,
      inactive_products: inactiveCount,
      average_price:
        total_products > 0
          ? Math.round((totalPrice / total_products) * 100) / 100
          : 0,
      average_margin:
        countWithMargin > 0
          ? Math.round((totalMargin / countWithMargin) * 100) / 100
          : 0,
    };
  }

  /**
   * Analizar rentabilidad de productos
   */
  async analyzeProfitability(organizationId?: string) {
    const where: any = {
      cost: {
        gt: 0,
      },
    };
    if (organizationId) where.organizationId = organizationId;

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        cost: true,
      },
    });

    return products
      .map((product) => {
        const cost = product.cost!;
        const marginAmount = product.price - cost;
        const marginPercentage = (marginAmount / product.price) * 100;
        const profitabilityScore =
          marginPercentage * 0.6 + (product.price / 100) * 0.4;

        return {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          base_price: product.price,
          cost,
          margin_amount: Math.round(marginAmount * 100) / 100,
          margin_percentage: Math.round(marginPercentage * 100) / 100,
          profitability_score: Math.round(profitabilityScore * 100) / 100,
        };
      })
      .sort((a, b) => b.profitability_score - a.profitability_score);
  }

  /**
   * Actualizar stock de un producto
   */
  async updateStock(
    id: string,
    _quantity: number,
    _operation: 'add' | 'subtract' | 'set',
  ) {
    const product = await this.findById(id);

    if (!product.trackInventory) {
      throw new BadRequestException(
        `Producto ${product.name} no tiene tracking de inventario habilitado`,
      );
    }

    // Stock management is handled exclusively by the Inventory module
    throw new BadRequestException(
      'Stock updates must be done through the Inventory module. Use PATCH /inventory/items/:id or POST /inventory/movements.',
    );
  }

  /**
   * Eliminar múltiples productos
   */
  async bulkDelete(productIds: string[]): Promise<{ count: number }> {
    try {
      const result = await this.prisma.product.deleteMany({
        where: {
          id: {
            in: productIds,
          },
        },
      });

      this.logger.log(
        `Productos eliminados en masa: ${result.count}/${productIds.length}`,
      );

      return { count: result.count };
    } catch (error) {
      this.logger.error(`Error en eliminación masiva: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar estado de múltiples productos
   */
  async bulkUpdateStatus(
    productIds: string[],
    isActive: boolean,
  ): Promise<{ count: number }> {
    try {
      const result = await this.prisma.product.updateMany({
        where: {
          id: {
            in: productIds,
          },
        },
        data: {
          active: isActive,
        },
      });

      this.logger.log(
        `Estados actualizados en masa: ${result.count}/${productIds.length} a ${isActive ? 'activo' : 'inactivo'}`,
      );

      return { count: result.count };
    } catch (error) {
      this.logger.error(`Error actualizando estados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar categoría de múltiples productos
   */
  async bulkUpdateCategory(
    productIds: string[],
    categoryId: string,
  ): Promise<{ count: number }> {
    // Verificar que la categoría existe
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Categoría ${categoryId} no encontrada`);
    }

    try {
      const result = await this.prisma.product.updateMany({
        where: {
          id: {
            in: productIds,
          },
        },
        data: {
          categoryId,
        },
      });

      this.logger.log(
        `Categorías actualizadas en masa: ${result.count}/${productIds.length} a categoría ${categoryId}`,
      );

      return { count: result.count };
    } catch (error) {
      this.logger.error(`Error actualizando categorías: ${error.message}`);
      throw error;
    }
  }
}
