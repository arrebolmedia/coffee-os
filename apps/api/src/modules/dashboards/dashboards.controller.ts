import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import {
  AddWidgetDto,
  CreateAlertDto,
  CreateDashboardDto,
  UpdateDashboardDto,
  UpdateWidgetDto,
} from './dto';
import { DashboardCategory } from './interfaces/dashboard.interface';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

// IMPORTANT: NestJS matches routes in declaration order. Every route whose first
// segment is a literal ('alerts', 'widgets', 'system', ...) MUST be declared
// BEFORE the parameterised routes (':id', ':dashboard_id/...'), otherwise the
// literal is swallowed as an :id value and the endpoint becomes unreachable.
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  // ==================== COLLECTION ROOT ====================

  @Post()
  async createDashboard(@Body() createDashboardDto: CreateDashboardDto) {
    return this.dashboardsService.createDashboard(createDashboardDto);
  }

  @Get()
  async findAllDashboards(
    @CurrentOrg() organization_id: string,
    @Query('category') category?: DashboardCategory,
    @Query('is_template') is_template?: string,
    @Query('is_public') is_public?: string,
    @Query('created_by') created_by?: string,
    @Query('is_active') is_active?: string,
  ) {
    return this.dashboardsService.findAllDashboards(
      organization_id,
      category,
      is_template === 'true',
      is_public === 'true',
      created_by,
      is_active === 'true',
    );
  }

  // ==================== WIDGET MANAGEMENT (literal) ====================

  @Post('widgets')
  async addWidget(@Body() addWidgetDto: AddWidgetDto) {
    return this.dashboardsService.addWidget(addWidgetDto);
  }

  @Patch('widgets')
  async updateWidget(@Body() updateWidgetDto: UpdateWidgetDto) {
    return this.dashboardsService.updateWidget(updateWidgetDto);
  }

  // ==================== SYSTEM KPIs ====================

  @Get('system/kpis')
  async getSystemKPIs(@Query('category') category?: DashboardCategory) {
    return this.dashboardsService.getSystemKPIs(category);
  }

  @Get('system/kpis/:code')
  async getSystemKPIByCode(@Param('code') code: string) {
    return this.dashboardsService.getSystemKPIByCode(code);
  }

  // ==================== ALERTS ====================

  @Post('alerts')
  async createAlert(@Body() createAlertDto: CreateAlertDto) {
    return this.dashboardsService.createAlert(createAlertDto);
  }

  @Get('alerts')
  async findAllAlerts(
    @CurrentOrg() organization_id: string,
    @Query('is_active') is_active?: string,
  ) {
    return this.dashboardsService.findAllAlerts(
      organization_id,
      is_active === 'true',
    );
  }

  @Get('alerts/:id')
  async findAlertById(@Param('id') id: string) {
    return this.dashboardsService.findAlertById(id);
  }

  @Patch('alerts/:id/deactivate')
  async deactivateAlert(@Param('id') id: string) {
    return this.dashboardsService.deactivateAlert(id);
  }

  @Delete('alerts/:id')
  async deleteAlert(@Param('id') id: string) {
    return this.dashboardsService.deleteAlert(id);
  }

  // ==================== FAVORITES ====================

  @Post('favorites')
  async addToFavorites(
    @Body() body: { user_id: string; dashboard_id: string },
  ) {
    return this.dashboardsService.addToFavorites(
      body.user_id,
      body.dashboard_id,
    );
  }

  @Get('favorites/user/:user_id')
  async getUserFavorites(@Param('user_id') user_id: string) {
    return this.dashboardsService.getUserFavorites(user_id);
  }

  @Delete('favorites/:id')
  async removeFromFavorites(@Param('id') id: string) {
    return this.dashboardsService.removeFromFavorites(id);
  }

  // ==================== SNAPSHOTS (literal) ====================

  @Get('snapshots/:id')
  async getSnapshotById(@Param('id') id: string) {
    return this.dashboardsService.getSnapshotById(id);
  }

  // ==================== STATISTICS ====================

  @Get('stats/:organization_id')
  async getDashboardStats(@CurrentOrg() organization_id: string) {
    return this.dashboardsService.getDashboardStats(organization_id);
  }

  // ==================== DASHBOARD CRUD (parameterised) ====================

  @Get(':id')
  async findDashboardById(@Param('id') id: string) {
    return this.dashboardsService.findDashboardById(id);
  }

  @Patch(':id')
  async updateDashboard(
    @Param('id') id: string,
    @Body() updateDashboardDto: UpdateDashboardDto,
  ) {
    return this.dashboardsService.updateDashboard(id, updateDashboardDto);
  }

  @Delete(':id')
  async deleteDashboard(@Param('id') id: string) {
    return this.dashboardsService.deleteDashboard(id);
  }

  @Post(':id/clone')
  async cloneDashboard(
    @Param('id') id: string,
    @Body() body: { new_name: string; created_by: string },
  ) {
    return this.dashboardsService.cloneDashboard(
      id,
      body.new_name,
      body.created_by,
    );
  }

  // ==================== DASHBOARD DATA ====================

  @Get(':id/data')
  async getDashboardWithData(@Param('id') id: string) {
    return this.dashboardsService.getDashboardWithData(id);
  }

  // ==================== WIDGETS OF A DASHBOARD ====================

  @Delete(':dashboard_id/widgets/:widget_id')
  async removeWidget(
    @Param('dashboard_id') dashboard_id: string,
    @Param('widget_id') widget_id: string,
  ) {
    return this.dashboardsService.removeWidget(dashboard_id, widget_id);
  }

  @Post(':dashboard_id/widgets/reorder')
  async reorderWidgets(
    @Param('dashboard_id') dashboard_id: string,
    @Body() body: { widget_positions: Array<{ id: string; position: any }> },
  ) {
    return this.dashboardsService.reorderWidgets(
      dashboard_id,
      body.widget_positions,
    );
  }

  @Get(':dashboard_id/widgets/:widget_id/refresh')
  async refreshWidgetData(
    @Param('dashboard_id') dashboard_id: string,
    @Param('widget_id') widget_id: string,
  ) {
    return this.dashboardsService.refreshWidgetData(dashboard_id, widget_id);
  }

  // ==================== SNAPSHOTS OF A DASHBOARD ====================

  @Post(':dashboard_id/snapshots')
  async createSnapshot(
    @Param('dashboard_id') dashboard_id: string,
    @Body() body: { created_by: string; notes?: string },
  ) {
    return this.dashboardsService.createSnapshot(
      dashboard_id,
      body.created_by,
      body.notes,
    );
  }

  @Get(':dashboard_id/snapshots')
  async getDashboardSnapshots(@Param('dashboard_id') dashboard_id: string) {
    return this.dashboardsService.getDashboardSnapshots(dashboard_id);
  }
}
