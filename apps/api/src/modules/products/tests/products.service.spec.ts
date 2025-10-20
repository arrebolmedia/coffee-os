import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../products.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import {
  ProductType,
  ProductStatus,
  PricingStrategy,
  ModifierType,
} from '../interfaces';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProductDto = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    category_id: 'cat-001',
    recipe_id: 'recipe-001',
    sku: 'CAFE-ESP-001',
    name: 'Espresso Doble',
    description: 'Espresso clásico italiano',
    base_price: 45,
    cost: 12,
    tax_rate: 16,
    tax_included: false,
    allow_modifiers: true,
    allow_discounts: true,
    track_inventory: true,
    stock_quantity: 100,
    minimum_stock: 20,
    reorder_point: 30,
    is_featured: true,
    is_available: true,
    tags: ['cafe', 'espresso', 'bebida-caliente'],
    preparation_time_minutes: 3,
    calories: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product with all fields', async () => {
      const product = await service.create(mockProductDto);

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('Espresso Doble');
      expect(product.sku).toBe('CAFE-ESP-001');
      expect(product.base_price).toBe(45);
      expect(product.cost).toBe(12);
      expect(product.type).toBe(ProductType.SIMPLE);
      expect(product.status).toBe(ProductStatus.ACTIVE);
      expect(product.pricing_strategy).toBe(PricingStrategy.FIXED);
      expect(product.track_inventory).toBe(true);
      expect(product.stock_quantity).toBe(100);
      expect(product.tags).toEqual(['cafe', 'espresso', 'bebida-caliente']);
    });

    it('should throw ConflictException if SKU already exists', async () => {
      await service.create(mockProductDto);

      await expect(service.create(mockProductDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create product with minimal fields', async () => {
      const minimalDto = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: 'cat-002',
        sku: 'CAFE-CAP-001',
        name: 'Cappuccino',
        base_price: 55,
      };

      const product = await service.create(minimalDto);

      expect(product).toBeDefined();
      expect(product.name).toBe('Cappuccino');
      expect(product.type).toBe(ProductType.SIMPLE);
      expect(product.status).toBe(ProductStatus.ACTIVE);
      expect(product.is_available).toBe(true);
      expect(product.allow_modifiers).toBe(true);
    });

    it('should set default values correctly', async () => {
      const product = await service.create({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: 'cat-003',
        sku: 'TEST-001',
        name: 'Test Product',
        base_price: 10,
      });

      expect(product.tax_rate).toBe(0);
      expect(product.tax_included).toBe(false);
      expect(product.allow_modifiers).toBe(true);
      expect(product.allow_discounts).toBe(true);
      expect(product.track_inventory).toBe(false);
      expect(product.is_featured).toBe(false);
      expect(product.is_available).toBe(true);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(mockProductDto);
      await service.create({
        ...mockProductDto,
        sku: 'CAFE-LAT-001',
        name: 'Latte',
        category_id: 'cat-002',
        base_price: 55,
        is_featured: false,
        track_inventory: false, // No inventory tracking
      });
      await service.create({
        ...mockProductDto,
        sku: 'CAFE-MOC-001',
        name: 'Mocha',
        status: ProductStatus.INACTIVE,
        is_available: false,
        is_featured: false, // Set to false
        track_inventory: false,
      });
    });

    it('should return all products', async () => {
      const products = await service.findAll();
      expect(products).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const products = await service.findAll({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(products).toHaveLength(3);
    });

    it('should filter by category_id', async () => {
      const products = await service.findAll({ category_id: 'cat-002' });
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Latte');
    });

    it('should search by text', async () => {
      const products = await service.findAll({ search: 'Latte' });
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Latte');
    });

    it('should filter by status', async () => {
      const products = await service.findAll({ status: ProductStatus.ACTIVE });
      expect(products).toHaveLength(2);
    });

    it('should filter by availability', async () => {
      const available = await service.findAll({ is_available: 'true' });
      expect(available).toHaveLength(2);

      const unavailable = await service.findAll({ is_available: 'false' });
      expect(unavailable).toHaveLength(1);
    });

    it('should filter by featured', async () => {
      const featured = await service.findAll({ is_featured: 'true' });
      expect(featured).toHaveLength(1);
      expect(featured[0].name).toBe('Espresso Doble');
    });

    it('should filter by price range', async () => {
      const products = await service.findAll({
        min_price: 50,
        max_price: 60,
      });
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Latte');
    });

    it('should sort by name ascending', async () => {
      const products = await service.findAll({
        sort_by: 'name',
        order: 'asc',
      });
      expect(products[0].name).toBe('Espresso Doble');
      expect(products[2].name).toBe('Mocha');
    });

    it('should sort by price descending', async () => {
      const products = await service.findAll({
        sort_by: 'price',
        order: 'desc',
      });
      expect(products[0].base_price).toBe(55);
      expect(products[2].base_price).toBe(45);
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const created = await service.create(mockProductDto);
      const found = await service.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Espresso Doble');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      await service.create(mockProductDto);
      const found = await service.findBySku(
        'CAFE-ESP-001',
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(found).toBeDefined();
      expect(found.sku).toBe('CAFE-ESP-001');
      expect(found.name).toBe('Espresso Doble');
    });

    it('should throw NotFoundException for non-existent SKU', async () => {
      await expect(
        service.findBySku('NON-EXISTENT', '123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const product = await service.create(mockProductDto);
      const updated = await service.update(product.id, {
        name: 'Espresso Triple',
        base_price: 60,
      });

      expect(updated.name).toBe('Espresso Triple');
      expect(updated.base_price).toBe(60);
      expect(updated.sku).toBe('CAFE-ESP-001'); // Unchanged
    });

    it('should update SKU if unique', async () => {
      const product = await service.create(mockProductDto);
      const updated = await service.update(product.id, {
        sku: 'CAFE-ESP-002',
      });

      expect(updated.sku).toBe('CAFE-ESP-002');
    });

    it('should throw ConflictException when updating to existing SKU', async () => {
      const product1 = await service.create(mockProductDto);
      await service.create({
        ...mockProductDto,
        sku: 'CAFE-ESP-002',
        name: 'Another Espresso',
      });

      await expect(
        service.update(product1.id, { sku: 'CAFE-ESP-002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      const product = await service.create(mockProductDto);
      await service.delete(product.id);

      await expect(service.findById(product.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('modifiers', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await service.create(mockProductDto);
      productId = product.id;
    });

    it('should create a modifier', async () => {
      const modifier = await service.createModifier({
        product_id: productId,
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Shot',
        type: ModifierType.EXTRA,
        price: 10,
      });

      expect(modifier).toBeDefined();
      expect(modifier.id).toBeDefined();
      expect(modifier.name).toBe('Extra Shot');
      expect(modifier.type).toBe(ModifierType.EXTRA);
      expect(modifier.price).toBe(10);
      expect(modifier.is_available).toBe(true);
    });

    it('should get modifiers for a product', async () => {
      await service.createModifier({
        product_id: productId,
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Shot',
        type: ModifierType.EXTRA,
        price: 10,
      });

      await service.createModifier({
        product_id: productId,
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Leche de Almendras',
        type: ModifierType.SUBSTITUTION,
        price: 15,
      });

      const modifiers = await service.getModifiers(productId);
      expect(modifiers).toHaveLength(2);
    });

    it('should update a modifier', async () => {
      const modifier = await service.createModifier({
        product_id: productId,
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Shot',
        type: ModifierType.EXTRA,
        price: 10,
      });

      const updated = await service.updateModifier(modifier.id, {
        price: 12,
        is_required: true,
      });

      expect(updated.price).toBe(12);
      expect(updated.is_required).toBe(true);
    });

    it('should delete a modifier', async () => {
      const modifier = await service.createModifier({
        product_id: productId,
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Shot',
        type: ModifierType.EXTRA,
        price: 10,
      });

      await service.deleteModifier(modifier.id);

      await expect(service.updateModifier(modifier.id, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStock', () => {
    it('should add stock', async () => {
      const product = await service.create(mockProductDto);
      const updated = await service.updateStock(product.id, 50, 'add');

      expect(updated.stock_quantity).toBe(150); // 100 + 50
    });

    it('should subtract stock', async () => {
      const product = await service.create(mockProductDto);
      const updated = await service.updateStock(product.id, 30, 'subtract');

      expect(updated.stock_quantity).toBe(70); // 100 - 30
    });

    it('should set stock', async () => {
      const product = await service.create(mockProductDto);
      const updated = await service.updateStock(product.id, 200, 'set');

      expect(updated.stock_quantity).toBe(200);
    });

    it('should throw BadRequestException when subtracting more than available', async () => {
      const product = await service.create(mockProductDto);

      await expect(
        service.updateStock(product.id, 150, 'subtract'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-tracked inventory', async () => {
      const product = await service.create({
        ...mockProductDto,
        sku: 'NO-TRACK',
        track_inventory: false,
      });

      await expect(service.updateStock(product.id, 10, 'add')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        ...mockProductDto,
        type: ProductType.SIMPLE,
        status: ProductStatus.ACTIVE,
        stock_quantity: 50,
        reorder_point: 30,
      });
      await service.create({
        ...mockProductDto,
        sku: 'VAR-001',
        name: 'Variable Product',
        type: ProductType.VARIABLE,
        status: ProductStatus.DRAFT,
        base_price: 80,
        cost: 20,
      });
      await service.create({
        ...mockProductDto,
        sku: 'LOW-STOCK',
        name: 'Low Stock Product',
        stock_quantity: 10,
        reorder_point: 30,
      });
    });

    it('should return product statistics', async () => {
      const stats = await service.getStats('123e4567-e89b-12d3-a456-426614174000');

      expect(stats.total_products).toBe(3);
      expect(stats.by_type[ProductType.SIMPLE]).toBe(2);
      expect(stats.by_type[ProductType.VARIABLE]).toBe(1);
      expect(stats.by_status[ProductStatus.ACTIVE]).toBe(2);
      expect(stats.by_status[ProductStatus.DRAFT]).toBe(1);
      expect(stats.low_stock_count).toBe(1);
      expect(stats.average_price).toBeGreaterThan(0);
      expect(stats.average_margin).toBeGreaterThan(0);
    });
  });

  describe('analyzeProfitability', () => {
    it('should return profitability analysis sorted by score', async () => {
      // Producto con alto margen
      await service.create({
        ...mockProductDto,
        name: 'High Margin Product',
        base_price: 100,
        cost: 20, // 80% margin
      });

      // Producto con bajo margen
      await service.create({
        ...mockProductDto,
        sku: 'LOW-MARGIN',
        name: 'Low Margin Product',
        base_price: 50,
        cost: 45, // 10% margin
      });

      const profitability = await service.analyzeProfitability(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(profitability).toHaveLength(2);
      expect(profitability[0].profitability_score).toBeGreaterThan(
        profitability[1].profitability_score,
      );
      expect(profitability[0].margin_percentage).toBeGreaterThan(
        profitability[1].margin_percentage,
      );
    });

    it('should calculate margins correctly', async () => {
      await service.create({
        ...mockProductDto,
        base_price: 100,
        cost: 40,
      });

      const profitability = await service.analyzeProfitability(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(profitability[0].margin_amount).toBe(60); // 100 - 40
      expect(profitability[0].margin_percentage).toBe(60); // (60/100) * 100
    });

    it('should exclude products without cost', async () => {
      await service.create({
        ...mockProductDto,
        cost: undefined,
      });

      const profitability = await service.analyzeProfitability(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(profitability).toHaveLength(0);
    });
  });
});
