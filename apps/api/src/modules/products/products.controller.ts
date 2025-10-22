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
  @Get('sku/:sku')
  @HttpCode(HttpStatus.OK)
  async findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
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
  @Post(':id/modifiers/:modifierId')
  @HttpCode(HttpStatus.CREATED)
  async createModifier(
    @Param('id') id: string,
    @Param('modifierId') modifierId: string,
  ) {
    return this.productsService.createModifier(id, modifierId);
  }

  /**
   * Eliminar modificador de producto
   */
  @Delete(':id/modifiers/:modifierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteModifier(
    @Param('id') id: string,
    @Param('modifierId') modifierId: string,
  ) {
    await this.productsService.deleteModifier(id, modifierId);
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
   * Obtener estadísticas de productos
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.productsService.getStats();
  }

  /**
   * Analizar rentabilidad de productos
   */
  @Get('profitability')
  @HttpCode(HttpStatus.OK)
  async analyzeProfitability() {
    return this.productsService.analyzeProfitability();
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
