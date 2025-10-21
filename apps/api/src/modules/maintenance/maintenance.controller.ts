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
import { MaintenanceService } from './maintenance.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  CreateMaintenanceRecordDto,
  CompleteMaintenanceDto,
} from './dto';

/**
 * Controlador para gestión de activos y mantenimiento
 * 
 * Endpoints:
 * - POST /maintenance/assets - Crear activo
 * - GET /maintenance/assets - Listar activos
 * - GET /maintenance/assets/:id - Obtener activo
 * - PATCH /maintenance/assets/:id - Actualizar activo
 * - DELETE /maintenance/assets/:id - Eliminar activo
 * - POST /maintenance/records - Crear registro de mantenimiento
 * - GET /maintenance/records - Listar registros
 * - GET /maintenance/records/:id - Obtener registro
 * - PATCH /maintenance/records/:id/start - Iniciar mantenimiento
 * - PATCH /maintenance/records/:id/complete - Completar mantenimiento
 * - PATCH /maintenance/records/:id/cancel - Cancelar mantenimiento
 * - GET /maintenance/upcoming/:organization_id - Mantenimientos próximos
 * - GET /maintenance/overdue/:organization_id - Mantenimientos vencidos
 * - GET /maintenance/stats/:organization_id - Estadísticas
 * - GET /maintenance/depreciation/:organization_id - Reporte de depreciación
 */
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * ==================== ASSETS ====================
   */

  @Post('assets')
  @HttpCode(HttpStatus.CREATED)
  async createAsset(@Body() dto: CreateAssetDto) {
    return this.maintenanceService.createAsset(dto);
  }

  @Get('assets')
  @HttpCode(HttpStatus.OK)
  async findAllAssets(
    @Query('organization_id') organization_id?: string,
    @Query('location_id') location_id?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.maintenanceService.findAllAssets(
      organization_id,
      location_id,
      type as any,
      status as any,
    );
  }

  @Get('assets/:id')
  @HttpCode(HttpStatus.OK)
  async findAssetById(@Param('id') id: string) {
    return this.maintenanceService.findAssetById(id);
  }

  @Patch('assets/:id')
  @HttpCode(HttpStatus.OK)
  async updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.maintenanceService.updateAsset(id, dto);
  }

  @Delete('assets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAsset(@Param('id') id: string) {
    await this.maintenanceService.deleteAsset(id);
  }

  /**
   * ==================== MAINTENANCE RECORDS ====================
   */

  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  async createMaintenanceRecord(@Body() dto: CreateMaintenanceRecordDto) {
    return this.maintenanceService.createMaintenanceRecord(dto);
  }

  @Get('records')
  @HttpCode(HttpStatus.OK)
  async findAllMaintenanceRecords(
    @Query('organization_id') organization_id?: string,
    @Query('asset_id') asset_id?: string,
    @Query('status') status?: string,
  ) {
    return this.maintenanceService.findAllMaintenanceRecords(
      organization_id,
      asset_id,
      status as any,
    );
  }

  @Get('records/:id')
  @HttpCode(HttpStatus.OK)
  async findMaintenanceRecordById(@Param('id') id: string) {
    return this.maintenanceService.findMaintenanceRecordById(id);
  }

  @Patch('records/:id/start')
  @HttpCode(HttpStatus.OK)
  async startMaintenance(@Param('id') id: string) {
    return this.maintenanceService.startMaintenance(id);
  }

  @Patch('records/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeMaintenance(
    @Param('id') id: string,
    @Body() dto: CompleteMaintenanceDto,
  ) {
    return this.maintenanceService.completeMaintenance(id, dto);
  }

  @Patch('records/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelMaintenance(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.maintenanceService.cancelMaintenance(id, reason);
  }

  /**
   * ==================== REPORTS & STATS ====================
   */

  @Get('upcoming/:organization_id')
  @HttpCode(HttpStatus.OK)
  async getUpcomingMaintenance(
    @Param('organization_id') organization_id: string,
    @Query('days') days?: string,
  ) {
    return this.maintenanceService.getUpcomingMaintenance(
      organization_id,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('overdue/:organization_id')
  @HttpCode(HttpStatus.OK)
  async getOverdueMaintenance(
    @Param('organization_id') organization_id: string,
  ) {
    return this.maintenanceService.getOverdueMaintenance(organization_id);
  }

  @Get('stats/:organization_id')
  @HttpCode(HttpStatus.OK)
  async getMaintenanceStats(
    @Param('organization_id') organization_id: string,
  ) {
    return this.maintenanceService.getMaintenanceStats(organization_id);
  }

  @Get('depreciation/:organization_id')
  @HttpCode(HttpStatus.OK)
  async generateDepreciationReport(
    @Param('organization_id') organization_id: string,
    @Query('as_of_date') as_of_date?: string,
  ) {
    return this.maintenanceService.generateDepreciationReport(
      organization_id,
      as_of_date ? new Date(as_of_date) : new Date(),
    );
  }
}
