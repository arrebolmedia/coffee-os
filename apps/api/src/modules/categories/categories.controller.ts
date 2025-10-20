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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Crear categoría
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Listar categorías con filtros
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAll(query);
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
    @Body('new_display_order') new_display_order: number | undefined,
  ) {
    return this.categoriesService.move(id, new_parent_id, new_display_order);
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
  async getStats(@Param('organization_id') organization_id: string) {
    return this.categoriesService.getStats(organization_id);
  }
}
