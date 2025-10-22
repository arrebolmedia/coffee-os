import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import {
  BulkDeleteCategoriesDto,
  BulkUpdateStatusDto,
  ReorderCategoriesDto,
} from './dto/bulk-operations.dto';
import { CategoryStatus } from './interfaces';

/**
 * CategoriesService con Prisma ORM
 * 
 * Nota: El schema actual de Prisma es simplificado:
 * - No incluye parent_id (jerarquías)
 * - No incluye organization_id (multi-tenant)
 * - Campos básicos: id, name, description, color, icon, sortOrder, active
 * 
 * Este servicio se adapta al schema existente.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear categoría
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<any> {
    // Validar nombre único
    const existing = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: createCategoryDto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists`,
      );
    }

    // Crear categoría
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        icon: createCategoryDto.icon,
        color: createCategoryDto.color,
        sortOrder: createCategoryDto.display_order ?? 0,
        active: createCategoryDto.status === CategoryStatus.ACTIVE,
      },
      include: {
        products: true,
      },
    });

    this.logger.log(`Categoría creada: ${category.name}`);
    return category;
  }

  /**
   * Listar categorías con filtros
   */
  async findAll(query?: QueryCategoriesDto): Promise<any[]> {
    const where: any = {};

    // Filtro por estado activo
    if (query?.status) {
      where.active = query.status === CategoryStatus.ACTIVE;
    }

    // Búsqueda por texto
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Ordenamiento
    const sortBy = query?.sort_by || 'sortOrder';
    const order = query?.order || 'asc';

    const orderBy: any = {};
    orderBy[sortBy === 'display_order' ? 'sortOrder' : sortBy] = order;

    const categories = await this.prisma.category.findMany({
      where,
      orderBy,
      include: {
        products: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return categories;
  }

  /**
   * Obtener categoría por ID
   */
  async findById(id: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Actualizar categoría
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<any> {
    await this.findById(id);

    // Validar nombre único si está cambiando
    if (updateCategoryDto.name) {
      const existing = await this.prisma.category.findFirst({
        where: {
          name: {
            equals: updateCategoryDto.name,
            mode: 'insensitive',
          },
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(updateCategoryDto.name !== undefined && {
          name: updateCategoryDto.name,
        }),
        ...(updateCategoryDto.description !== undefined && {
          description: updateCategoryDto.description,
        }),
        ...(updateCategoryDto.icon !== undefined && {
          icon: updateCategoryDto.icon,
        }),
        ...(updateCategoryDto.color !== undefined && {
          color: updateCategoryDto.color,
        }),
        ...(updateCategoryDto.display_order !== undefined && {
          sortOrder: updateCategoryDto.display_order,
        }),
        ...(updateCategoryDto.status !== undefined && {
          active: updateCategoryDto.status === CategoryStatus.ACTIVE,
        }),
      },
      include: {
        products: true,
      },
    });

    this.logger.log(`Categoría actualizada: ${category.name}`);
    return category;
  }

  /**
   * Eliminar categoría
   */
  async delete(id: string): Promise<void> {
    const category = await this.findById(id);

    // Verificar que no tenga productos
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${productCount} product(s)`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    this.logger.log(`Categoría eliminada: ${category.name}`);
  }

  /**
   * Obtener estadísticas de categorías
   */
  async getStats(): Promise<any> {
    const [total, active, inactive, productsCount] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.category.count({ where: { active: true } }),
      this.prisma.category.count({ where: { active: false } }),
      this.prisma.product.count(),
    ]);

    return {
      total_categories: total,
      active_categories: active,
      inactive_categories: inactive,
      total_products: productsCount,
      avg_products_per_category: total > 0 ? productsCount / total : 0,
    };
  }

  /**
   * Reordenar categorías
   */
  async reorder(reorderDto: ReorderCategoriesDto): Promise<any> {
    const updates = reorderDto.items.map((item) =>
      this.prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );

    await Promise.all(updates);

    this.logger.log(`Reordenadas ${reorderDto.items.length} categorías`);

    return {
      success: true,
      data: {
        count: reorderDto.items.length,
      },
      message: 'Categories reordered successfully',
    };
  }

  /**
   * Eliminar múltiples categorías
   */
  async bulkDelete(bulkDeleteDto: BulkDeleteCategoriesDto): Promise<any> {
    // Verificar que ninguna tenga productos
    for (const id of bulkDeleteDto.categoryIds) {
      const productCount = await this.prisma.product.count({
        where: { categoryId: id },
      });

      if (productCount > 0) {
        const category = await this.prisma.category.findUnique({
          where: { id },
          select: { name: true },
        });
        throw new BadRequestException(
          `Cannot delete category "${category?.name}" because it has ${productCount} product(s)`,
        );
      }
    }

    const result = await this.prisma.category.deleteMany({
      where: {
        id: {
          in: bulkDeleteDto.categoryIds,
        },
      },
    });

    this.logger.log(`Eliminadas ${result.count} categorías en lote`);

    return {
      success: true,
      data: {
        count: result.count,
      },
      message: `${result.count} categories deleted successfully`,
    };
  }

  /**
   * Actualizar estado de múltiples categorías
   */
  async bulkUpdateStatus(bulkUpdateDto: BulkUpdateStatusDto): Promise<any> {
    const result = await this.prisma.category.updateMany({
      where: {
        id: {
          in: bulkUpdateDto.categoryIds,
        },
      },
      data: {
        active: bulkUpdateDto.status === 'active',
      },
    });

    this.logger.log(
      `Actualizado estado de ${result.count} categorías a ${bulkUpdateDto.status}`,
    );

    return {
      success: true,
      data: {
        count: result.count,
        status: bulkUpdateDto.status,
      },
      message: `${result.count} categories updated to ${bulkUpdateDto.status}`,
    };
  }

  // ========================================
  // Métodos de compatibilidad (no implementados en schema actual)
  // ========================================

  /**
   * Obtener categoría por slug
   * Nota: El schema no tiene campo slug
   */
  async findBySlug(slug: string, organization_id?: string): Promise<any> {
    this.logger.warn('findBySlug not implemented: schema has no slug field');
    throw new BadRequestException(
      'Slug lookup not supported in current schema',
    );
  }

  /**
   * Obtener árbol de categorías
   * Nota: El schema no tiene parent_id para jerarquías
   */
  async getTree(organization_id?: string): Promise<any[]> {
    this.logger.warn('getTree not implemented: schema has no parent_id field');
    const categories = await this.findAll();
    return categories; // Retorna lista plana
  }

  /**
   * Obtener breadcrumbs
   * Nota: El schema no tiene parent_id para jerarquías
   */
  async getBreadcrumbs(id: string): Promise<any[]> {
    this.logger.warn(
      'getBreadcrumbs not implemented: schema has no parent_id field',
    );
    const category = await this.findById(id);
    return [category]; // Solo la categoría misma
  }
}
