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
import { WasteService } from './waste.service';
import {
  CreateWasteLogDto,
  UpdateWasteLogDto,
  CreateSustainabilityMetricDto,
  CreateSustainabilityTargetDto,
  QueryWasteLogsDto,
} from './dto';

/**
 * Controlador para gestión de desperdicios y sostenibilidad
 * 
 * Endpoints:
 * - POST /waste/logs - Crear waste log
 * - GET /waste/logs - Listar waste logs
 * - GET /waste/logs/:id - Obtener waste log
 * - PATCH /waste/logs/:id - Actualizar waste log
 * - DELETE /waste/logs/:id - Eliminar waste log
 * - GET /waste/stats/:organization_id - Estadísticas de desperdicio
 * - POST /waste/metrics - Crear métrica de sostenibilidad
 * - GET /waste/metrics - Listar métricas
 * - GET /waste/metrics/:id - Obtener métrica
 * - POST /waste/targets - Crear target de sostenibilidad
 * - GET /waste/targets - Listar targets
 * - GET /waste/targets/:id - Obtener target
 * - PATCH /waste/targets/:id/progress - Actualizar progreso
 * - GET /waste/reports/:organization_id - Generar reporte de sostenibilidad
 */
@Controller('waste')
export class WasteController {
  constructor(private readonly wasteService: WasteService) {}

  /**
   * ==================== WASTE LOGS ====================
   */

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  async createWasteLog(@Body() dto: CreateWasteLogDto) {
    return this.wasteService.createWasteLog(dto);
  }

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  async findAllWasteLogs(@Query() query: QueryWasteLogsDto) {
    return this.wasteService.findAllWasteLogs(query);
  }

  @Get('logs/:id')
  @HttpCode(HttpStatus.OK)
  async findWasteLogById(@Param('id') id: string) {
    return this.wasteService.findWasteLogById(id);
  }

  @Patch('logs/:id')
  @HttpCode(HttpStatus.OK)
  async updateWasteLog(
    @Param('id') id: string,
    @Body() dto: UpdateWasteLogDto,
  ) {
    return this.wasteService.updateWasteLog(id, dto);
  }

  @Delete('logs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWasteLog(@Param('id') id: string) {
    await this.wasteService.deleteWasteLog(id);
  }

  @Get('stats/:organization_id')
  @HttpCode(HttpStatus.OK)
  async getWasteStats(@Param('organization_id') organization_id: string) {
    return this.wasteService.getWasteStats(organization_id);
  }

  /**
   * ==================== SUSTAINABILITY METRICS ====================
   */

  @Post('metrics')
  @HttpCode(HttpStatus.CREATED)
  async createMetric(@Body() dto: CreateSustainabilityMetricDto) {
    return this.wasteService.createMetric(dto);
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async findAllMetrics(
    @Query('organization_id') organization_id?: string,
    @Query('metric_type') metric_type?: string,
  ) {
    return this.wasteService.findAllMetrics(organization_id, metric_type as any);
  }

  @Get('metrics/:id')
  @HttpCode(HttpStatus.OK)
  async findMetricById(@Param('id') id: string) {
    return this.wasteService.findMetricById(id);
  }

  /**
   * ==================== SUSTAINABILITY TARGETS ====================
   */

  @Post('targets')
  @HttpCode(HttpStatus.CREATED)
  async createTarget(@Body() dto: CreateSustainabilityTargetDto) {
    return this.wasteService.createTarget(dto);
  }

  @Get('targets')
  @HttpCode(HttpStatus.OK)
  async findAllTargets(
    @Query('organization_id') organization_id?: string,
    @Query('is_active') is_active?: string,
  ) {
    const active = is_active === 'true' ? true : is_active === 'false' ? false : undefined;
    return this.wasteService.findAllTargets(organization_id, active);
  }

  @Get('targets/:id')
  @HttpCode(HttpStatus.OK)
  async findTargetById(@Param('id') id: string) {
    return this.wasteService.findTargetById(id);
  }

  @Patch('targets/:id/progress')
  @HttpCode(HttpStatus.OK)
  async updateTargetProgress(
    @Param('id') id: string,
    @Body('current_value') current_value: number,
  ) {
    return this.wasteService.updateTargetProgress(id, current_value);
  }

  /**
   * ==================== REPORTS ====================
   */

  @Get('reports/:organization_id')
  @HttpCode(HttpStatus.OK)
  async generateSustainabilityReport(
    @Param('organization_id') organization_id: string,
    @Query('period_start') period_start: string,
    @Query('period_end') period_end: string,
  ) {
    return this.wasteService.generateSustainabilityReport(
      organization_id,
      new Date(period_start),
      new Date(period_end),
    );
  }
}
