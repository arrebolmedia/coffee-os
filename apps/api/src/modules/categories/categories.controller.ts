import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import {
  BulkDeleteCategoriesDto,
  BulkUpdateStatusDto,
  ReorderCategoriesDto,
} from './dto/bulk-operations.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Crear categoría
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva categoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Nombre de categoría ya existe' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Listar categorías con filtros
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: QueryCategoriesDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.categoriesService.findAll(query, user.organizationId);
  }

  /**
   * Obtener categoría por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  /**
   * Obtener categoría por slug
   */
  @Get('slug/:slug/:organization_id')
  @HttpCode(HttpStatus.OK)
  async findBySlug(
    @Param('slug') slug: string,
    @Param('organization_id') organization_id: string,
  ) {
    return this.categoriesService.findBySlug(slug, organization_id);
  }

  /**
   * Obtener árbol de categorías
   */
  @Get('organization/:organization_id/tree')
  @HttpCode(HttpStatus.OK)
  async getTree(@Param('organization_id') organization_id: string) {
    return this.categoriesService.getTree(organization_id);
  }

  /**
   * Obtener breadcrumbs de categoría
   */
  @Get(':id/breadcrumbs')
  @HttpCode(HttpStatus.OK)
  async getBreadcrumbs(@Param('id') id: string) {
    return this.categoriesService.getBreadcrumbs(id);
  }

  /**
   * Obtener hijos directos
   */
  @Get(':id/children')
  @HttpCode(HttpStatus.OK)
  async getChildren(@Param('id') id: string) {
    return this.categoriesService.getChildren(id);
  }

  /**
   * Obtener todos los descendientes
   */
  @Get(':id/descendants')
  @HttpCode(HttpStatus.OK)
  async getDescendants(@Param('id') id: string) {
    return this.categoriesService.getDescendants(id);
  }

  /**
   * Actualizar categoría
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Mover categoría a nuevo padre
   */
  @Patch(':id/move')
  @HttpCode(HttpStatus.OK)
  async move(
    @Param('id') id: string,
    @Body('new_parent_id') new_parent_id: string | undefined,
    @Body('new_display_order') _new_display_order: number | undefined,
  ) {
    return this.categoriesService.move(id, new_parent_id ?? null);
  }

  /**
   * Eliminar categoría
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.categoriesService.delete(id);
  }

  /**
   * Obtener estadísticas
   */
  @Get('organization/:organization_id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener estadísticas de categorías' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStats(
    @Param('organization_id') _organization_id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    // El path param se ignora; siempre usamos el organizationId del JWT
    return this.categoriesService.getStats(user.organizationId);
  }

  /**
   * Reordenar múltiples categorías
   */
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reordenar múltiples categorías' })
  @ApiResponse({
    status: 200,
    description: 'Categorías reordenadas exitosamente',
  })
  async reorder(@Body() reorderDto: ReorderCategoriesDto) {
    await this.categoriesService.reorderCategories(reorderDto);
    return {
      success: true,
      message: `${reorderDto.orders.length} categorías reordenadas exitosamente`,
    };
  }

  /**
   * Eliminar múltiples categorías
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar múltiples categorías' })
  @ApiResponse({
    status: 200,
    description: 'Categorías eliminadas exitosamente',
  })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteCategoriesDto) {
    const result = await this.categoriesService.bulkDelete(bulkDeleteDto);
    return {
      success: true,
      data: result,
      message: `${result.count} categorías eliminadas exitosamente`,
    };
  }

  /**
   * Actualizar estado de múltiples categorías
   */
  @Post('bulk-update-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado de múltiples categorías' })
  @ApiResponse({
    status: 200,
    description: 'Estados actualizados exitosamente',
  })
  async bulkUpdateStatus(@Body() bulkUpdateStatusDto: BulkUpdateStatusDto) {
    const result =
      await this.categoriesService.bulkUpdateStatus(bulkUpdateStatusDto);
    return {
      success: true,
      data: result,
      message: `${result.count} categorías actualizadas a ${bulkUpdateStatusDto.status}`,
    };
  }
}
