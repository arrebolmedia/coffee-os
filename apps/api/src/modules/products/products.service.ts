import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  CreateModifierDto,
  UpdateModifierDto,
} from './dto';
import {
  Product,
  ProductModifier,
  ProductStats,
  ProductProfitability,
  ProductType,
  ProductStatus,
  PricingStrategy,
  ModifierType,
} from './interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private products: Map<string, Product> = new Map();
  private modifiers: Map<string, ProductModifier> = new Map();

  /**
   * Crear un nuevo producto
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Verificar SKU único
    const existingBySku = Array.from(this.products.values()).find(
      (p) => p.sku === createProductDto.sku && 
             p.organization_id === createProductDto.organization_id,
    );

    if (existingBySku) {
      throw new ConflictException(
        `Producto con SKU ${createProductDto.sku} ya existe`,
      );
    }

    const product: Product = {
      id: uuidv4(),
      organization_id: createProductDto.organization_id,
      category_id: createProductDto.category_id,
      recipe_id: createProductDto.recipe_id,
      sku: createProductDto.sku,
      name: createProductDto.name,
      description: createProductDto.description,
      image_url: createProductDto.image_url,
      barcode: createProductDto.barcode,
      type: createProductDto.type || ProductType.SIMPLE,
      status: createProductDto.status || ProductStatus.ACTIVE,
      base_price: createProductDto.base_price,
      cost: createProductDto.cost,
      pricing_strategy: createProductDto.pricing_strategy || PricingStrategy.FIXED,
      target_margin_percentage: createProductDto.target_margin_percentage,
      tax_rate: createProductDto.tax_rate || 0,
      tax_included: createProductDto.tax_included ?? false,
      allow_modifiers: createProductDto.allow_modifiers ?? true,
      allow_discounts: createProductDto.allow_discounts ?? true,
      track_inventory: createProductDto.track_inventory ?? false,
      require_preparation: createProductDto.require_preparation ?? false,
      stock_quantity: createProductDto.stock_quantity,
      minimum_stock: createProductDto.minimum_stock,
      reorder_point: createProductDto.reorder_point,
      display_order: createProductDto.display_order,
      is_featured: createProductDto.is_featured ?? false,
      is_available: createProductDto.is_available ?? true,
      tags: createProductDto.tags,
      preparation_time_minutes: createProductDto.preparation_time_minutes,
      calories: createProductDto.calories,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.products.set(product.id, product);
    this.logger.log(`Producto creado: ${product.name} (${product.sku})`);

    return product;
  }

  /**
   * Obtener todos los productos con filtros
   */
  async findAll(query?: QueryProductsDto): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (!query) {
      return products.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Filtrar por organización
    if (query.organization_id) {
      products = products.filter((p) => p.organization_id === query.organization_id);
    }

    // Filtrar por categoría
    if (query.category_id) {
      products = products.filter((p) => p.category_id === query.category_id);
    }

    // Buscar por texto
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.barcode?.toLowerCase().includes(searchLower),
      );
    }

    // Filtrar por tipo
    if (query.type) {
      products = products.filter((p) => p.type === query.type);
    }

    // Filtrar por status
    if (query.status) {
      products = products.filter((p) => p.status === query.status);
    }

    // Filtrar por disponibilidad
    if (query.is_available !== undefined) {
      const isAvailable = query.is_available === 'true';
      products = products.filter((p) => p.is_available === isAvailable);
    }

    // Filtrar por destacados
    if (query.is_featured !== undefined) {
      const isFeatured = query.is_featured === 'true';
      products = products.filter((p) => p.is_featured === isFeatured);
    }

    // Filtrar por tracking de inventario
    if (query.track_inventory !== undefined) {
      const trackInventory = query.track_inventory === 'true';
      products = products.filter((p) => p.track_inventory === trackInventory);
    }

    // Filtrar productos con bajo stock
    if (query.low_stock === 'true') {
      products = products.filter(
        (p) =>
          p.track_inventory &&
          p.stock_quantity !== undefined &&
          p.reorder_point !== undefined &&
          p.stock_quantity <= p.reorder_point,
      );
    }

    // Filtrar por rango de precios
    if (query.min_price !== undefined) {
      products = products.filter((p) => p.base_price >= query.min_price!);
    }

    if (query.max_price !== undefined) {
      products = products.filter((p) => p.base_price <= query.max_price!);
    }

    // Ordenar
    const sortBy = query.sort_by || 'name';
    const order = query.order || 'asc';

    products.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'price':
          aValue = a.base_price;
          bValue = b.base_price;
          break;
        case 'display_order':
          aValue = a.display_order || 9999;
          bValue = b.display_order || 9999;
          break;
        case 'created_at':
          aValue = a.created_at.getTime();
          bValue = b.created_at.getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return products;
  }

  /**
   * Obtener un producto por ID
   */
  async findById(id: string): Promise<Product> {
    const product = this.products.get(id);
    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return product;
  }

  /**
   * Obtener producto por SKU
   */
  async findBySku(sku: string, organization_id: string): Promise<Product> {
    const product = Array.from(this.products.values()).find(
      (p) => p.sku === sku && p.organization_id === organization_id,
    );

    if (!product) {
      throw new NotFoundException(
        `Producto con SKU ${sku} no encontrado`,
      );
    }

    return product;
  }

  /**
   * Actualizar un producto
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    // Verificar SKU único si se está actualizando
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingBySku = Array.from(this.products.values()).find(
        (p) => p.sku === updateProductDto.sku && 
               p.organization_id === product.organization_id &&
               p.id !== id,
      );

      if (existingBySku) {
        throw new ConflictException(
          `Producto con SKU ${updateProductDto.sku} ya existe`,
        );
      }
    }

    const updatedProduct: Product = {
      ...product,
      ...updateProductDto,
      updated_at: new Date(),
    };

    this.products.set(id, updatedProduct);
    this.logger.log(`Producto actualizado: ${updatedProduct.name}`);

    return updatedProduct;
  }

  /**
   * Eliminar un producto
   */
  async delete(id: string): Promise<void> {
    const product = await this.findById(id);
    this.products.delete(id);
    this.logger.log(`Producto eliminado: ${product.name}`);
  }

  /**
   * Obtener modificadores de un producto
   */
  async getModifiers(productId: string): Promise<ProductModifier[]> {
    await this.findById(productId); // Verificar que existe

    return Array.from(this.modifiers.values()).filter(
      (m) => m.product_id === productId && m.is_available,
    );
  }

  /**
   * Crear modificador para un producto
   */
  async createModifier(
    createModifierDto: CreateModifierDto,
  ): Promise<ProductModifier> {
    await this.findById(createModifierDto.product_id);

    const modifier: ProductModifier = {
      id: uuidv4(),
      ...createModifierDto,
      is_required: createModifierDto.is_required ?? false,
      is_default: createModifierDto.is_default ?? false,
      is_available: createModifierDto.is_available ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.modifiers.set(modifier.id, modifier);
    this.logger.log(
      `Modificador creado: ${modifier.name} para producto ${modifier.product_id}`,
    );

    return modifier;
  }

  /**
   * Actualizar modificador
   */
  async updateModifier(
    id: string,
    updateModifierDto: UpdateModifierDto,
  ): Promise<ProductModifier> {
    const modifier = this.modifiers.get(id);
    if (!modifier) {
      throw new NotFoundException(`Modificador ${id} no encontrado`);
    }

    const updatedModifier: ProductModifier = {
      ...modifier,
      ...updateModifierDto,
      updated_at: new Date(),
    };

    this.modifiers.set(id, updatedModifier);
    return updatedModifier;
  }

  /**
   * Eliminar modificador
   */
  async deleteModifier(id: string): Promise<void> {
    const modifier = this.modifiers.get(id);
    if (!modifier) {
      throw new NotFoundException(`Modificador ${id} no encontrado`);
    }

    this.modifiers.delete(id);
    this.logger.log(`Modificador eliminado: ${modifier.name}`);
  }

  /**
   * Obtener estadísticas de productos
   */
  async getStats(organization_id: string): Promise<ProductStats> {
    const products = Array.from(this.products.values()).filter(
      (p) => p.organization_id === organization_id,
    );

    const byType: any = {};
    const byStatus: any = {};
    let totalValue = 0;
    let totalPrice = 0;
    let totalMargin = 0;
    let countWithMargin = 0;
    let lowStockCount = 0;

    products.forEach((product) => {
      // Por tipo
      byType[product.type] = (byType[product.type] || 0) + 1;

      // Por status
      byStatus[product.status] = (byStatus[product.status] || 0) + 1;

      // Valor total
      if (product.stock_quantity && product.cost) {
        totalValue += product.stock_quantity * product.cost;
      }

      // Precio promedio
      totalPrice += product.base_price;

      // Margen promedio
      if (product.cost) {
        const margin = ((product.base_price - product.cost) / product.base_price) * 100;
        totalMargin += margin;
        countWithMargin++;
      }

      // Bajo stock
      if (
        product.track_inventory &&
        product.stock_quantity !== undefined &&
        product.reorder_point !== undefined &&
        product.stock_quantity <= product.reorder_point
      ) {
        lowStockCount++;
      }
    });

    return {
      total_products: products.length,
      by_type: byType,
      by_status: byStatus,
      total_value: Math.round(totalValue * 100) / 100,
      average_price: products.length > 0 ? Math.round((totalPrice / products.length) * 100) / 100 : 0,
      average_margin: countWithMargin > 0 ? Math.round((totalMargin / countWithMargin) * 100) / 100 : 0,
      low_stock_count: lowStockCount,
    };
  }

  /**
   * Analizar rentabilidad de productos
   */
  async analyzeProfitability(
    organization_id: string,
  ): Promise<ProductProfitability[]> {
    const products = await this.findAll({ organization_id });

    return products
      .filter((p) => p.cost !== undefined && p.cost > 0)
      .map((product) => {
        const cost = product.cost!;
        const marginAmount = product.base_price - cost;
        const marginPercentage = (marginAmount / product.base_price) * 100;

        // Profitability score: combina margen % con volumen de precio
        // Productos con alto margen y buen precio son más rentables
        const profitabilityScore =
          marginPercentage * 0.6 + (product.base_price / 100) * 0.4;

        return {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          base_price: product.base_price,
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
    quantity: number,
    operation: 'add' | 'subtract' | 'set',
  ): Promise<Product> {
    const product = await this.findById(id);

    if (!product.track_inventory) {
      throw new BadRequestException(
        `Producto ${product.name} no tiene tracking de inventario habilitado`,
      );
    }

    let newQuantity: number;

    switch (operation) {
      case 'add':
        newQuantity = (product.stock_quantity || 0) + quantity;
        break;
      case 'subtract':
        newQuantity = (product.stock_quantity || 0) - quantity;
        if (newQuantity < 0) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}. Disponible: ${product.stock_quantity}`,
          );
        }
        break;
      case 'set':
        newQuantity = quantity;
        break;
    }

    const updatedProduct: Product = {
      ...product,
      stock_quantity: newQuantity,
      updated_at: new Date(),
    };

    this.products.set(id, updatedProduct);
    this.logger.log(
      `Stock actualizado para ${product.name}: ${product.stock_quantity} → ${newQuantity}`,
    );

    return updatedProduct;
  }
}
