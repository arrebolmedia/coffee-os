import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../categories.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryType, CategoryStatus } from '../interfaces';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockCategoryDto = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Bebidas',
    description: 'Todas las bebidas',
    type: CategoryType.PRODUCT,
    icon: 'coffee',
    color: '#FF5733',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category with all fields', async () => {
      const category = await service.create(mockCategoryDto);

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe('Bebidas');
      expect(category.slug).toBe('bebidas');
      expect(category.type).toBe(CategoryType.PRODUCT);
      expect(category.status).toBe(CategoryStatus.ACTIVE);
      expect(category.level).toBe(0);
      expect(category.path).toBe('/bebidas');
      expect(category.is_featured).toBe(false);
      expect(category.show_in_menu).toBe(true);
      expect(category.allow_products).toBe(true);
    });

    it('should throw ConflictException if name already exists', async () => {
      await service.create(mockCategoryDto);

      await expect(service.create(mockCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create category with custom slug', async () => {
      const category = await service.create({
        ...mockCategoryDto,
        name: 'Cafés Calientes',
        slug: 'cafes-calientes',
      });

      expect(category.slug).toBe('cafes-calientes');
      expect(category.path).toBe('/cafes-calientes');
    });

    it('should create subcategory with parent', async () => {
      const parent = await service.create(mockCategoryDto);

      const child = await service.create({
        organization_id: mockCategoryDto.organization_id,
        name: 'Café',
        parent_id: parent.id,
      });

      expect(child.parent_id).toBe(parent.id);
      expect(child.level).toBe(1);
      expect(child.path).toBe('/bebidas/cafe');
    });

    it('should throw NotFoundException if parent not found', async () => {
      await expect(
        service.create({
          ...mockCategoryDto,
          parent_id: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should auto-generate slug from name', async () => {
      const category = await service.create({
        ...mockCategoryDto,
        name: 'Cafés Calientes!!!',
      });

      expect(category.slug).toBe('cafes-calientes');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        ...mockCategoryDto,
        name: 'Bebidas',
        type: CategoryType.PRODUCT,
      });
      await service.create({
        ...mockCategoryDto,
        name: 'Alimentos',
        type: CategoryType.PRODUCT,
        is_featured: true,
      });
      await service.create({
        ...mockCategoryDto,
        name: 'Ingredientes',
        type: CategoryType.INVENTORY,
        show_in_menu: false,
      });
    });

    it('should return all categories', async () => {
      const categories = await service.findAll();
      expect(categories).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const categories = await service.findAll({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(categories).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const categories = await service.findAll({
        type: CategoryType.PRODUCT,
      });
      expect(categories).toHaveLength(2);
    });

    it('should filter by is_featured', async () => {
      const featured = await service.findAll({ is_featured: 'true' });
      expect(featured).toHaveLength(1);
      expect(featured[0].name).toBe('Alimentos');
    });

    it('should filter by show_in_menu', async () => {
      const inMenu = await service.findAll({ show_in_menu: 'true' });
      expect(inMenu).toHaveLength(2);

      const notInMenu = await service.findAll({ show_in_menu: 'false' });
      expect(notInMenu).toHaveLength(1);
    });

    it('should search by text', async () => {
      const categories = await service.findAll({ search: 'alimentos' });
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Alimentos');
    });

    it('should sort by name', async () => {
      const categories = await service.findAll({
        sort_by: 'name',
        order: 'asc',
      });
      expect(categories[0].name).toBe('Alimentos');
      expect(categories[2].name).toBe('Ingredientes');
    });

    it('should sort by display_order', async () => {
      const categories = await service.findAll({
        sort_by: 'display_order',
        order: 'asc',
      });
      expect(categories).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should return category by id', async () => {
      const created = await service.create(mockCategoryDto);
      const found = await service.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Bebidas');
    });

    it('should throw NotFoundException for non-existent id', async () => {
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      await service.create(mockCategoryDto);
      const found = await service.findBySlug(
        'bebidas',
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(found.slug).toBe('bebidas');
      expect(found.name).toBe('Bebidas');
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      await expect(
        service.findBySlug('non-existent', '123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTree', () => {
    it('should build category tree', async () => {
      const bebidas = await service.create({
        ...mockCategoryDto,
        name: 'Bebidas',
      });

      const cafe = await service.create({
        ...mockCategoryDto,
        name: 'Café',
        parent_id: bebidas.id,
      });

      await service.create({
        ...mockCategoryDto,
        name: 'Espresso',
        parent_id: cafe.id,
      });

      const tree = await service.getTree(mockCategoryDto.organization_id);

      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('Bebidas');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe('Café');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].name).toBe('Espresso');
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return breadcrumbs for category', async () => {
      const bebidas = await service.create({
        ...mockCategoryDto,
        name: 'Bebidas',
      });

      const cafe = await service.create({
        ...mockCategoryDto,
        name: 'Café',
        parent_id: bebidas.id,
      });

      const espresso = await service.create({
        ...mockCategoryDto,
        name: 'Espresso',
        parent_id: cafe.id,
      });

      const breadcrumbs = await service.getBreadcrumbs(espresso.id);

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].name).toBe('Bebidas');
      expect(breadcrumbs[1].name).toBe('Café');
      expect(breadcrumbs[2].name).toBe('Espresso');
    });
  });

  describe('getChildren', () => {
    it('should return direct children', async () => {
      const parent = await service.create({
        ...mockCategoryDto,
        name: 'Bebidas',
      });

      await service.create({
        ...mockCategoryDto,
        name: 'Café',
        parent_id: parent.id,
      });

      await service.create({
        ...mockCategoryDto,
        name: 'Té',
        parent_id: parent.id,
      });

      const children = await service.getChildren(parent.id);

      expect(children).toHaveLength(2);
      expect(children.map((c) => c.name).sort()).toEqual(['Café', 'Té']);
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants recursively', async () => {
      const bebidas = await service.create({
        ...mockCategoryDto,
        name: 'Bebidas',
      });

      const cafe = await service.create({
        ...mockCategoryDto,
        name: 'Café',
        parent_id: bebidas.id,
      });

      await service.create({
        ...mockCategoryDto,
        name: 'Espresso',
        parent_id: cafe.id,
      });

      await service.create({
        ...mockCategoryDto,
        name: 'Americano',
        parent_id: cafe.id,
      });

      const descendants = await service.getDescendants(bebidas.id);

      expect(descendants).toHaveLength(3);
      expect(descendants.map((c) => c.name).sort()).toEqual([
        'Americano',
        'Café',
        'Espresso',
      ]);
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      const category = await service.create(mockCategoryDto);
      const updated = await service.update(category.id, {
        name: 'Bebidas Frías',
        description: 'Bebidas frías y refrescantes',
      });

      expect(updated.name).toBe('Bebidas Frías');
      expect(updated.description).toBe('Bebidas frías y refrescantes');
    });

    it('should throw ConflictException when updating to existing name', async () => {
      const category1 = await service.create(mockCategoryDto);
      await service.create({
        ...mockCategoryDto,
        name: 'Alimentos',
      });

      await expect(
        service.update(category1.id, { name: 'Alimentos' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update parent_id and recalculate level/path', async () => {
      const bebidas = await service.create({
        ...mockCategoryDto,
        name: 'Bebidas',
      });

      const cafe = await service.create({
        ...mockCategoryDto,
        name: 'Café',
      });

      const updated = await service.update(cafe.id, {
        parent_id: bebidas.id,
      });

      expect(updated.parent_id).toBe(bebidas.id);
      expect(updated.level).toBe(1);
      expect(updated.path).toBe('/bebidas/cafe');
    });

    it('should throw BadRequestException for circular reference', async () => {
      const parent = await service.create({
        ...mockCategoryDto,
        name: 'Parent',
      });

      const child = await service.create({
        ...mockCategoryDto,
        name: 'Child',
        parent_id: parent.id,
      });

      await expect(
        service.update(parent.id, { parent_id: child.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category is its own parent', async () => {
      const category = await service.create(mockCategoryDto);

      await expect(
        service.update(category.id, { parent_id: category.id }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('move', () => {
    it('should move category to new parent', async () => {
      const parent1 = await service.create({
        ...mockCategoryDto,
        name: 'Parent 1',
      });

      const parent2 = await service.create({
        ...mockCategoryDto,
        name: 'Parent 2',
      });

      const child = await service.create({
        ...mockCategoryDto,
        name: 'Child',
        parent_id: parent1.id,
      });

      const moved = await service.move(child.id, parent2.id);

      expect(moved.parent_id).toBe(parent2.id);
      expect(moved.level).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete category without children', async () => {
      const category = await service.create(mockCategoryDto);
      await service.delete(category.id);

      await expect(service.findById(category.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if category has children', async () => {
      const parent = await service.create({
        ...mockCategoryDto,
        name: 'Parent',
      });

      await service.create({
        ...mockCategoryDto,
        name: 'Child',
        parent_id: parent.id,
      });

      await expect(service.delete(parent.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        ...mockCategoryDto,
        type: CategoryType.PRODUCT,
        status: CategoryStatus.ACTIVE,
      });
      await service.create({
        ...mockCategoryDto,
        name: 'Category 2',
        type: CategoryType.INVENTORY,
        status: CategoryStatus.ACTIVE,
      });
      await service.create({
        ...mockCategoryDto,
        name: 'Category 3',
        type: CategoryType.RECIPE,
        status: CategoryStatus.INACTIVE,
      });
    });

    it('should return category statistics', async () => {
      const stats = await service.getStats(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(stats.total_categories).toBe(3);
      expect(stats.by_type[CategoryType.PRODUCT]).toBe(1);
      expect(stats.by_type[CategoryType.INVENTORY]).toBe(1);
      expect(stats.by_type[CategoryType.RECIPE]).toBe(1);
      expect(stats.by_status[CategoryStatus.ACTIVE]).toBe(2);
      expect(stats.by_status[CategoryStatus.INACTIVE]).toBe(1);
    });
  });
});
