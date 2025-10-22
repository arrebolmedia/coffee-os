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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  CreateModifierDto,
  UpdateModifierDto,
} from './dto';
import {
  BulkDeleteDto,
  BulkUpdateStatusDto,
  BulkUpdateCategoryDto,
} from './dto/bulk-operations.dto';

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
 * - POST /bulk-delete - Eliminar múltiples productos
 * - POST /bulk-update-status - Actualizar estado de múltiples productos
 * - POST /bulk-update-category - Actualizar categoría de múltiples productos
 * - GET /:id/modifiers - Obtener modificadores de un producto
 * - POST /:id/modifiers - Crear modificador para un producto
 * - PATCH /modifiers/:id - Actualizar modificador
 * - DELETE /modifiers/:id - Eliminar modificador
 * - PATCH /:id/stock - Actualizar stock
 * - GET /organization/:id/stats - Estadísticas de productos
 * - GET /organization/:id/profitability - Análisis de rentabilidad
 */
@ApiTags('products')
@ApiBearerAuth()
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
   * Analizar rentabilidad de productos
   */
  @Get('organization/:organization_id/profitability')
  @HttpCode(HttpStatus.OK)
  async analyzeProfitability(
    @Param('organization_id') organization_id: string,
  ) {
    return this.productsService.analyzeProfitability(organization_id);
  }

  /**
   * Eliminar múltiples productos
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar múltiples productos' })
  @ApiResponse({ status: 200, description: 'Productos eliminados exitosamente' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    const result = await this.productsService.bulkDelete(bulkDeleteDto.productIds);
    return {
      success: true,
      data: result,
      message: `${result.count} productos eliminados exitosamente`,
    };
  }

  /**
   * Actualizar estado de múltiples productos
   */
  @Post('bulk-update-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado de múltiples productos' })
  @ApiResponse({ status: 200, description: 'Estados actualizados exitosamente' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  async bulkUpdateStatus(@Body() bulkUpdateStatusDto: BulkUpdateStatusDto) {
    const result = await this.productsService.bulkUpdateStatus(
      bulkUpdateStatusDto.productIds,
      bulkUpdateStatusDto.isActive,
    );
    return {
      success: true,
      data: result,
      message: `${result.count} productos ${bulkUpdateStatusDto.isActive ? 'activados' : 'desactivados'} exitosamente`,
    };
  }

  /**
   * Actualizar categoría de múltiples productos
   */
  @Post('bulk-update-category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar categoría de múltiples productos' })
  @ApiResponse({ status: 200, description: 'Categorías actualizadas exitosamente' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  async bulkUpdateCategory(@Body() bulkUpdateCategoryDto: BulkUpdateCategoryDto) {
    const result = await this.productsService.bulkUpdateCategory(
      bulkUpdateCategoryDto.productIds,
      bulkUpdateCategoryDto.categoryId,
    );
    return {
      success: true,
      data: result,
      message: `${result.count} productos actualizados exitosamente`,
    };
  }
}
