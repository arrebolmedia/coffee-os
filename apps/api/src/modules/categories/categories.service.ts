import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import {
  Category,
  CategoryTree,
  CategoryStats,
  CategoryType,
  CategoryStatus,
  CategoryBreadcrumb,
} from './interfaces';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private categories = new Map<string, Category>();

  /**
   * Crear categoría
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Validar nombre único en organización
    const existing = Array.from(this.categories.values()).find(
      (c) =>
        c.organization_id === createCategoryDto.organization_id &&
        c.name.toLowerCase() === createCategoryDto.name.toLowerCase(),
    );

    if (existing) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists`,
      );
    }

    // Validar parent_id si existe
    if (createCategoryDto.parent_id) {
      const parent = this.categories.get(createCategoryDto.parent_id);
      if (!parent) {
        throw new NotFoundException(
          `Parent category ${createCategoryDto.parent_id} not found`,
        );
      }

      // Validar misma organización
      if (parent.organization_id !== createCategoryDto.organization_id) {
        throw new BadRequestException(
          'Parent category must be in the same organization',
        );
      }
    }

    // Generar slug si no existe
    const slug =
      createCategoryDto.slug ||
      createCategoryDto.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // Calcular level y path
    const level = createCategoryDto.parent_id
      ? this.categories.get(createCategoryDto.parent_id)!.level + 1
      : 0;

    const path = createCategoryDto.parent_id
      ? `${this.categories.get(createCategoryDto.parent_id)!.path}/${slug}`
      : `/${slug}`;

    // Calcular display_order si no existe
    const display_order =
      createCategoryDto.display_order ?? this.getNextDisplayOrder();

    const category: Category = {
      id: uuidv4(),
      organization_id: createCategoryDto.organization_id,
      name: createCategoryDto.name,
      slug,
      description: createCategoryDto.description,
      type: createCategoryDto.type ?? CategoryType.PRODUCT,
      status: createCategoryDto.status ?? CategoryStatus.ACTIVE,
      parent_id: createCategoryDto.parent_id,
      level,
      path,
      display_order,
      icon: createCategoryDto.icon,
      color: createCategoryDto.color,
      image_url: createCategoryDto.image_url,
      is_featured: createCategoryDto.is_featured ?? false,
      show_in_menu: createCategoryDto.show_in_menu ?? true,
      allow_products: createCategoryDto.allow_products ?? true,
      tags: createCategoryDto.tags ?? [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.categories.set(category.id, category);
    this.logger.log(`Created category: ${category.name} (${category.id})`);

    return category;
  }

  /**
   * Listar categorías con filtros
   */
  async findAll(query?: QueryCategoriesDto): Promise<Category[]> {
    let categories = Array.from(this.categories.values());

    if (query) {
      // Filtrar por organization_id
      if (query.organization_id) {
        categories = categories.filter(
          (c) => c.organization_id === query.organization_id,
        );
      }

      // Filtrar por parent_id
      if (query.parent_id !== undefined) {
        categories = categories.filter((c) => c.parent_id === query.parent_id);
      }

      // Filtrar por type
      if (query.type) {
        categories = categories.filter((c) => c.type === query.type);
      }

      // Filtrar por status
      if (query.status) {
        categories = categories.filter((c) => c.status === query.status);
      }

      // Filtrar por level
      if (query.level !== undefined) {
        categories = categories.filter((c) => c.level === query.level);
      }

      // Filtrar por is_featured
      if (query.is_featured === 'true') {
        categories = categories.filter((c) => c.is_featured);
      } else if (query.is_featured === 'false') {
        categories = categories.filter((c) => !c.is_featured);
      }

      // Filtrar por show_in_menu
      if (query.show_in_menu === 'true') {
        categories = categories.filter((c) => c.show_in_menu);
      } else if (query.show_in_menu === 'false') {
        categories = categories.filter((c) => !c.show_in_menu);
      }

      // Filtrar por allow_products
      if (query.allow_products === 'true') {
        categories = categories.filter((c) => c.allow_products);
      } else if (query.allow_products === 'false') {
        categories = categories.filter((c) => !c.allow_products);
      }

      // Búsqueda por texto
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        categories = categories.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.slug.toLowerCase().includes(searchLower) ||
            c.description?.toLowerCase().includes(searchLower) ||
            c.path.toLowerCase().includes(searchLower),
        );
      }

      // Ordenamiento
      const sortBy = query.sort_by || 'display_order';
      const order = query.order || 'asc';

      categories.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'display_order':
            comparison = a.display_order - b.display_order;
            break;
          case 'created_at':
            comparison = a.created_at.getTime() - b.created_at.getTime();
            break;
        }

        return order === 'asc' ? comparison : -comparison;
      });
    }

    return categories;
  }

  /**
   * Obtener categoría por ID
   */
  async findById(id: string): Promise<Category> {
    const category = this.categories.get(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Obtener categoría por slug
   */
  async findBySlug(
    slug: string,
    organization_id: string,
  ): Promise<Category> {
    const category = Array.from(this.categories.values()).find(
      (c) => c.slug === slug && c.organization_id === organization_id,
    );

    if (!category) {
      throw new NotFoundException(
        `Category with slug "${slug}" not found in organization`,
      );
    }

    return category;
  }

  /**
   * Obtener árbol de categorías
   */
  async getTree(organization_id: string): Promise<CategoryTree[]> {
    const categories = await this.findAll({ organization_id });

    // Construir árbol recursivamente
    const buildTree = (parentId?: string): CategoryTree[] => {
      return categories
        .filter((c) => c.parent_id === parentId)
        .map((category) => ({
          ...category,
          children: buildTree(category.id),
        }))
        .sort((a, b) => a.display_order - b.display_order);
    };

    return buildTree();
  }

  /**
   * Obtener breadcrumbs (ruta de navegación)
   */
  async getBreadcrumbs(id: string): Promise<CategoryBreadcrumb[]> {
    const category = await this.findById(id);
    const breadcrumbs: CategoryBreadcrumb[] = [];

    // Construir breadcrumbs desde la raíz
    let current: Category | undefined = category;
    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
        level: current.level,
      });

      current = current.parent_id
        ? this.categories.get(current.parent_id)
        : undefined;
    }

    return breadcrumbs;
  }

  /**
   * Obtener hijos directos de una categoría
   */
  async getChildren(id: string): Promise<Category[]> {
    const category = await this.findById(id);

    return Array.from(this.categories.values())
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.display_order - b.display_order);
  }

  /**
   * Obtener todos los descendientes (recursivo)
   */
  async getDescendants(id: string): Promise<Category[]> {
    const category = await this.findById(id);
    const descendants: Category[] = [];

    const collectDescendants = (parentId: string) => {
      const children = Array.from(this.categories.values()).filter(
        (c) => c.parent_id === parentId,
      );

      for (const child of children) {
        descendants.push(child);
        collectDescendants(child.id);
      }
    };

    collectDescendants(id);

    return descendants;
  }

  /**
   * Actualizar categoría
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findById(id);

    // Validar nombre único si se cambia
    if (
      updateCategoryDto.name &&
      updateCategoryDto.name.toLowerCase() !== category.name.toLowerCase()
    ) {
      const existing = Array.from(this.categories.values()).find(
        (c) =>
          c.organization_id === category.organization_id &&
          c.name.toLowerCase() === updateCategoryDto.name.toLowerCase() &&
          c.id !== id,
      );

      if (existing) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    // Validar parent_id si se cambia
    if (updateCategoryDto.parent_id !== undefined) {
      if (updateCategoryDto.parent_id === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      if (updateCategoryDto.parent_id) {
        const parent = this.categories.get(updateCategoryDto.parent_id);
        if (!parent) {
          throw new NotFoundException(
            `Parent category ${updateCategoryDto.parent_id} not found`,
          );
        }

        // Verificar que no se cree ciclo
        const descendants = await this.getDescendants(id);
        if (descendants.some((d) => d.id === updateCategoryDto.parent_id)) {
          throw new BadRequestException(
            'Cannot set a descendant as parent (circular reference)',
          );
        }
      }
    }

    // Actualizar campos
    const updated: Category = {
      ...category,
      ...updateCategoryDto,
      updated_at: new Date(),
    };

    // Recalcular level y path si cambió parent_id
    if (updateCategoryDto.parent_id !== undefined) {
      updated.level = updated.parent_id
        ? this.categories.get(updated.parent_id)!.level + 1
        : 0;

      const slug =
        updateCategoryDto.slug ||
        category.slug ||
        updated.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      updated.path = updated.parent_id
        ? `${this.categories.get(updated.parent_id)!.path}/${slug}`
        : `/${slug}`;
    }

    this.categories.set(id, updated);
    this.logger.log(`Updated category: ${updated.name} (${id})`);

    return updated;
  }

  /**
   * Mover categoría a nuevo padre
   */
  async move(
    id: string,
    new_parent_id?: string,
    new_display_order?: number,
  ): Promise<Category> {
    return this.update(id, {
      parent_id: new_parent_id,
      display_order: new_display_order,
    });
  }

  /**
   * Eliminar categoría
   */
  async delete(id: string): Promise<void> {
    const category = await this.findById(id);

    // Verificar que no tenga hijos
    const children = await this.getChildren(id);
    if (children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with children. Delete or move children first.',
      );
    }

    this.categories.delete(id);
    this.logger.log(`Deleted category: ${category.name} (${id})`);
  }

  /**
   * Obtener estadísticas
   */
  async getStats(organization_id: string): Promise<CategoryStats> {
    const categories = await this.findAll({ organization_id });

    const by_type: Record<CategoryType, number> = {
      [CategoryType.PRODUCT]: 0,
      [CategoryType.INVENTORY]: 0,
      [CategoryType.RECIPE]: 0,
      [CategoryType.EXPENSE]: 0,
    };

    const by_status: Record<CategoryStatus, number> = {
      [CategoryStatus.ACTIVE]: 0,
      [CategoryStatus.INACTIVE]: 0,
      [CategoryStatus.ARCHIVED]: 0,
    };

    const by_level: Record<number, number> = {};

    categories.forEach((category) => {
      by_type[category.type] = (by_type[category.type] || 0) + 1;
      by_status[category.status] = (by_status[category.status] || 0) + 1;
      by_level[category.level] = (by_level[category.level] || 0) + 1;
    });

    return {
      total_categories: categories.length,
      by_type,
      by_status,
      by_level,
      total_products: 0, // TODO: Integrar con Products module
      average_products_per_category: 0,
      categories_without_products: categories.length,
    };
  }

  /**
   * Obtener siguiente display_order disponible
   */
  private getNextDisplayOrder(): number {
    const orders = Array.from(this.categories.values()).map(
      (c) => c.display_order,
    );
    return orders.length > 0 ? Math.max(...orders) + 1 : 0;
  }
}
