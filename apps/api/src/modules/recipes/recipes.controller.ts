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
import { RecipesService } from './recipes.service';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  QueryRecipesDto,
  ScaleRecipeDto,
} from './dto';

/**
 * Controlador para gestión de recetas y costeo
 * 
 * Endpoints:
 * - POST / - Crear nueva receta
 * - GET / - Listar recetas con filtros
 * - GET /:id - Obtener receta por ID
 * - GET /:id/cost - Calcular costo detallado
 * - POST /:id/scale - Escalar receta a diferentes porciones
 * - PATCH /:id - Actualizar receta
 * - DELETE /:id - Eliminar receta
 * - GET /organization/:id/stats - Estadísticas de recetas
 * - GET /organization/:id/profitability - Análisis de rentabilidad
 */
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  /**
   * Crear una nueva receta
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRecipeDto: CreateRecipeDto) {
    return this.recipesService.create(createRecipeDto);
  }

  /**
   * Obtener todas las recetas con filtros
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryRecipesDto) {
    return this.recipesService.findAll(query);
  }

  /**
   * Obtener una receta por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.recipesService.findById(id);
  }

  /**
   * Calcular el costo detallado de una receta
   */
  @Get(':id/cost')
  @HttpCode(HttpStatus.OK)
  async calculateCost(@Param('id') id: string) {
    return this.recipesService.calculateCost(id);
  }

  /**
   * Escalar una receta a diferentes porciones
   */
  @Post(':id/scale')
  @HttpCode(HttpStatus.OK)
  async scaleRecipe(
    @Param('id') id: string,
    @Body() scaleDto: ScaleRecipeDto,
  ) {
    return this.recipesService.scaleRecipe(id, scaleDto);
  }

  /**
   * Actualizar una receta
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(id, updateRecipeDto);
  }

  /**
   * Eliminar una receta
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.recipesService.delete(id);
  }

  /**
   * Obtener estadísticas de recetas por organización
   */
  @Get('organization/:organization_id/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Param('organization_id') organization_id: string) {
    return this.recipesService.getStats(organization_id);
  }

  /**
   * Analizar rentabilidad de recetas por organización
   */
  @Get('organization/:organization_id/profitability')
  @HttpCode(HttpStatus.OK)
  async analyzeProfitability(
    @Param('organization_id') organization_id: string,
  ) {
    return this.recipesService.analyzeProfitability(organization_id);
  }
}
