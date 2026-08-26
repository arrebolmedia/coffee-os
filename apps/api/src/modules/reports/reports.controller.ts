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
import { ReportsService } from './reports.service';
import {
  CreateReportScheduleDto,
  CreateReportTemplateDto,
  GenerateReportDto,
  UpdateReportTemplateDto,
} from './dto';
import {
  ReportCategory,
  ReportStatus,
  ReportType,
} from './interfaces/report.interface';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

// IMPORTANT: NestJS matches routes in declaration order. Every route whose first
// segment is a literal ('templates', 'schedules', 'stats', ...) MUST be declared
// BEFORE the parameterised routes (':id'), otherwise the literal is swallowed as
// an :id value and the endpoint becomes unreachable.
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ==================== COLLECTION ROOT ====================

  @Get()
  findAllReports(
    @CurrentOrg() organization_id: string,
    @Query('category') category?: ReportCategory,
    @Query('status') status?: ReportStatus,
    @Query('requested_by') requested_by?: string,
  ) {
    return this.reportsService.findAllReports(
      organization_id,
      category,
      status,
      requested_by,
    );
  }

  @Post('generate')
  generateReport(@Body() dto: GenerateReportDto) {
    return this.reportsService.generateReport(dto);
  }

  // ==================== TEMPLATES ====================

  @Post('templates')
  createReportTemplate(@Body() dto: CreateReportTemplateDto) {
    return this.reportsService.createReportTemplate(dto);
  }

  @Get('templates')
  findAllReportTemplates(
    @CurrentOrg() organization_id: string,
    @Query('category') category?: ReportCategory,
    @Query('type') type?: ReportType,
    @Query('is_active') is_active?: string,
  ) {
    const activeFilter =
      is_active !== undefined ? is_active === 'true' : undefined;
    return this.reportsService.findAllReportTemplates(
      organization_id,
      category,
      type,
      activeFilter,
    );
  }

  @Get('templates/:id')
  findReportTemplateById(@Param('id') id: string) {
    return this.reportsService.findReportTemplateById(id);
  }

  @Patch('templates/:id')
  updateReportTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.reportsService.updateReportTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteReportTemplate(@Param('id') id: string) {
    return this.reportsService.deleteReportTemplate(id);
  }

  // ==================== SCHEDULES ====================

  @Post('schedules')
  createReportSchedule(@Body() dto: CreateReportScheduleDto) {
    return this.reportsService.createReportSchedule(dto);
  }

  @Get('schedules')
  findAllReportSchedules(
    @CurrentOrg() organization_id: string,
    @Query('is_active') is_active?: string,
  ) {
    const activeFilter =
      is_active !== undefined ? is_active === 'true' : undefined;
    return this.reportsService.findAllReportSchedules(
      organization_id,
      activeFilter,
    );
  }

  @Get('schedules/:id')
  findReportScheduleById(@Param('id') id: string) {
    return this.reportsService.findReportScheduleById(id);
  }

  @Post('schedules/:id/execute')
  executeSchedule(@Param('id') id: string) {
    return this.reportsService.executeSchedule(id);
  }

  @Patch('schedules/:id/deactivate')
  deactivateSchedule(@Param('id') id: string) {
    return this.reportsService.deactivateSchedule(id);
  }

  @Delete('schedules/:id')
  deleteReportSchedule(@Param('id') id: string) {
    return this.reportsService.deleteReportSchedule(id);
  }

  // ==================== STATS ====================

  @Get('stats/:organization_id')
  getReportStats(@CurrentOrg() organization_id: string) {
    return this.reportsService.getReportStats(organization_id);
  }

  // ==================== REPORTS (parameterised) ====================

  @Get(':id')
  findReportById(@Param('id') id: string) {
    return this.reportsService.findReportById(id);
  }

  @Get(':id/result')
  getReportResult(@Param('id') id: string) {
    return this.reportsService.getReportResult(id);
  }

  @Delete(':id')
  deleteReport(@Param('id') id: string) {
    return this.reportsService.deleteReport(id);
  }
}
