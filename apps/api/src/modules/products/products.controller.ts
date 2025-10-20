import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  CreateModifierDto,
  UpdateModifierDto,
} from './dto';

/**
 * Controlador para gestión de productos
 * 
 * Endpoints:
 * - POST / - Crear producto
 * - GET / - Listar productos con filtros
 * - GET /:id - Obtener producto por ID
 * - GET /sku/:sku/:organization_id - Obtener por SKU
 * - PATCH /:id - Actualizar producto
 * - DELETE /:id - Eliminar producto
 * - GET /:id/modifiers - Obtener modificadores
 * - POST /:id/modifiers - Crear modificador
 * - PATCH /modifiers/:id - Actualizar modificador
 * - DELETE /modifiers/:id - Eliminar modificador
 * - PATCH /:id/stock - Actualizar stock
 * - GET /organization/:id/stats - Estadísticas
 * - GET /organization/:id/profitability - Rentabilidad
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Crear un nuevo producto
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  /**
   * Obtener todos los productos con filtros
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  /**
   * Obtener un producto por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  /**
   * Obtener producto por SKU
   */
  @Get('sku/:sku/:organization_id')
  @HttpCode(HttpStatus.OK)
  async findBySku(
    @Param('sku') sku: string,
    @Param('organization_id') organization_id: string,
  ) {
    return this.productsService.findBySku(sku, organization_id);
  }

  /**
   * Actualizar un producto
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * Eliminar un producto
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
  }

  /**
   * Obtener modificadores de un producto
   */
  @Get(':id/modifiers')
  @HttpCode(HttpStatus.OK)
  async getModifiers(@Param('id') id: string) {
    return this.productsService.getModifiers(id);
  }

  /**
   * Crear modificador para un producto
   */
  @Post(':id/modifiers')
  @HttpCode(HttpStatus.CREATED)
  async createModifier(@Body() createModifierDto: CreateModifierDto) {
    return this.productsService.createModifier(createModifierDto);
  }

  /**
   * Actualizar modificador
   */
  @Patch('modifiers/:id')
  @HttpCode(HttpStatus.OK)
  async updateModifier(
    @Param('id') id: string,
    @Body() updateModifierDto: UpdateModifierDto,
  ) {
    return this.productsService.updateModifier(id, updateModifierDto);
  }

  /**
   * Eliminar modificador
   */
  @Delete('modifiers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteModifier(@Param('id') id: string) {
    await this.productsService.deleteModifier(id);
  }

  /**
   * Actualizar stock de un producto
   */
  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; operation: 'add' | 'subtract' | 'set' },
  ) {
    return this.productsService.updateStock(id, body.quantity, body.operation);
  }

  /**
   * Obtener estadísticas de productos por organización
   */
  @Get('organization/:organization_id/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Param('organization_id') organization_id: string) {
    return this.productsService.getStats(organization_id);
  }

  /**
   * Analizar rentabilidad de productos por organización
   */
  @Get('organization/:organization_id/profitability')
  @HttpCode(HttpStatus.OK)
  async analyzeProfitability(
    @Param('organization_id') organization_id: string,
  ) {
    return this.productsService.analyzeProfitability(organization_id);
  }
}
