import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { FileUploadService } from '../upload/file-upload.service';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from './dto';
import {
  BulkDeleteDto,
  BulkUpdateCategoryDto,
  BulkUpdateStatusDto,
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
  constructor(
    private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

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
  async findAll(
    @Query() query: QueryProductsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.productsService.findAll(query, user.organizationId);
  }

  /**
   * Obtener estadísticas de productos
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@CurrentUser() user: CurrentUserType) {
    return this.productsService.getStats(user.organizationId);
  }

  /**
   * Analizar rentabilidad de productos
   */
  @Get('profitability')
  @HttpCode(HttpStatus.OK)
  async analyzeProfitability(@CurrentUser() user: CurrentUserType) {
    return this.productsService.analyzeProfitability(user.organizationId);
  }

  /**
   * Obtener producto por SKU
   */
  @Get('sku/:sku')
  @HttpCode(HttpStatus.OK)
  async findBySku(
    @Param('sku') sku: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.productsService.findBySku(sku, user.organizationId);
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
   * Eliminar múltiples productos
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar múltiples productos' })
  @ApiResponse({
    status: 200,
    description: 'Productos eliminados exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    const result = await this.productsService.bulkDelete(
      bulkDeleteDto.productIds,
    );
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
  @ApiResponse({
    status: 200,
    description: 'Estados actualizados exitosamente',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Categorías actualizadas exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  async bulkUpdateCategory(
    @Body() bulkUpdateCategoryDto: BulkUpdateCategoryDto,
  ) {
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

  /**
   * Subir imagen de producto
   */
  @Post(':id/upload-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de producto' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    // Verificar que el producto existe
    const product = await this.productsService.findById(id);

    // Eliminar imagen anterior si existe
    if (product.image) {
      const oldFilename = product.image.split('/').pop();
      if (oldFilename) {
        await this.fileUploadService.deleteProductImage(oldFilename);
      }
    }

    // Subir nueva imagen
    const uploadedFile = await this.fileUploadService.uploadProductImage(file);

    // Actualizar producto con la nueva URL
    const updatedProduct = await this.productsService.update(id, {
      image_url: uploadedFile.url,
    });

    return {
      success: true,
      data: {
        product: updatedProduct,
        image: {
          url: uploadedFile.url,
          thumbnails: {
            small: this.fileUploadService.getThumbnailUrl(
              uploadedFile.filename,
              'small',
            ),
            medium: this.fileUploadService.getThumbnailUrl(
              uploadedFile.filename,
              'medium',
            ),
            large: this.fileUploadService.getThumbnailUrl(
              uploadedFile.filename,
              'large',
            ),
          },
        },
      },
      message: 'Imagen subida exitosamente',
    };
  }

  /**
   * Eliminar imagen de producto
   */
  @Delete(':id/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar imagen de producto' })
  @ApiResponse({ status: 200, description: 'Imagen eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async deleteImage(@Param('id') id: string) {
    const product = await this.productsService.findById(id);

    if (product.image) {
      const filename = product.image.split('/').pop();
      if (filename) {
        await this.fileUploadService.deleteProductImage(filename);
      }

      await this.productsService.update(id, { image_url: null });
    }

    return {
      success: true,
      message: 'Imagen eliminada exitosamente',
    };
  }
}
