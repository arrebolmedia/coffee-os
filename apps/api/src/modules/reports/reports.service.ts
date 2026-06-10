import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Report,
  ReportCategory,
  ReportResult,
  ReportSchedule,
  ReportStats,
  ReportStatus,
  ReportTemplate,
  ReportType,
  ScheduleFrequency,
} from './interfaces/report.interface';
import {
  CreateReportScheduleDto,
  CreateReportTemplateDto,
  GenerateReportDto,
  UpdateReportTemplateDto,
} from './dto';

@Injectable()
export class ReportsService {
  private templates: Map<string, ReportTemplate> = new Map();
  private reports: Map<string, Report> = new Map();
  private schedules: Map<string, ReportSchedule> = new Map();

  // ==================== TEMPLATES ====================

  /**
   * Crear template de reporte
   */
  async createReportTemplate(
    dto: CreateReportTemplateDto,
  ): Promise<ReportTemplate> {
    const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: ReportTemplate = {
      id,
      ...dto,
      is_active: dto.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.templates.set(id, template);
    return template;
  }

  /**
   * Obtener todos los templates
   */
  async findAllReportTemplates(
    organization_id?: string,
    category?: ReportCategory,
    type?: ReportType,
    is_active?: boolean,
  ): Promise<ReportTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (organization_id) {
      templates = templates.filter(
        (t) => t.organization_id === organization_id,
      );
    }
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    if (type) {
      templates = templates.filter((t) => t.type === type);
    }
    if (is_active !== undefined) {
      templates = templates.filter((t) => t.is_active === is_active);
    }

    return templates.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
  }

  /**
   * Obtener template por ID
   */
  async findReportTemplateById(id: string): Promise<ReportTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new NotFoundException(`Report template with ID ${id} not found`);
    }
    return template;
  }

  /**
   * Actualizar template
   */
  async updateReportTemplate(
    id: string,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplate> {
    const template = await this.findReportTemplateById(id);

    const updated: ReportTemplate = {
      ...template,
      ...dto,
      updated_at: new Date(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  /**
   * Eliminar template
   */
  async deleteReportTemplate(id: string): Promise<void> {
    // Verificar que existe
    await this.findReportTemplateById(id);

    // Verificar que no haya schedules activos
    const activeSchedules = Array.from(this.schedules.values()).filter(
      (s) => s.template_id === id && s.is_active,
    );

    if (activeSchedules.length > 0) {
      throw new BadRequestException(
        'Cannot delete template with active schedules. Disable schedules first.',
      );
    }

    this.templates.delete(id);
  }

  // ==================== REPORT GENERATION ====================

  /**
   * Generar reporte
   */
  async generateReport(dto: GenerateReportDto): Promise<Report> {
    const id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Si hay template_id, validar que existe
    if (dto.template_id) {
      await this.findReportTemplateById(dto.template_id);
    }

    const report: Report = {
      id,
      organization_id: dto.organization_id,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      type: dto.type,
      template_id: dto.template_id,
      parameters: dto.parameters,
      status: ReportStatus.PENDING,
      requested_by: dto.requested_by,
      export_format: dto.export_format,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.reports.set(id, report);

    // Simular generación asíncrona
    setTimeout(async () => {
      await this.executeReportGeneration(id, startTime);
    }, 100);

    return report;
  }

  /**
   * Ejecutar generación de reporte (simulado)
   */
  private async executeReportGeneration(
    reportId: string,
    startTime: number,
  ): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) return;

    try {
      // Cambiar estado a GENERATING
      report.status = ReportStatus.GENERATING;
      report.updated_at = new Date();
      this.reports.set(reportId, report);

      // Simular consulta y generación de datos
      const data = await this.generateReportData(report);
      const rowCount = Array.isArray(data) ? data.length : 0;

      // Simular exportación si se requiere
      let fileUrl: string | undefined;
      let fileSize: number | undefined;

      if (report.export_format) {
        const exportResult = await this.exportReport(report, data);
        fileUrl = exportResult.url;
        fileSize = exportResult.size;
      }

      // Completar reporte
      const generationTimeMs = Date.now() - startTime;
      const completed: Report = {
        ...report,
        status: ReportStatus.COMPLETED,
        data,
        row_count: rowCount,
        file_url: fileUrl,
        file_size: fileSize,
        generated_at: new Date(),
        generation_time_ms: generationTimeMs,
        updated_at: new Date(),
      };

      this.reports.set(reportId, completed);
    } catch (error) {
      // Marcar como fallido
      const failed: Report = {
        ...report,
        status: ReportStatus.FAILED,
        error_message:
          error.message || 'Unknown error during report generation',
        updated_at: new Date(),
      };
      this.reports.set(reportId, failed);
    }
  }

  /**
   * Generar datos del reporte (simulado)
   */
  private async generateReportData(report: Report): Promise<any> {
    // Simular diferentes tipos de datos según el tipo de reporte
    switch (report.type) {
      case ReportType.DAILY_SALES:
        return this.generateDailySalesData(report);
      case ReportType.INVENTORY_LEVELS:
        return this.generateInventoryLevelsData(report);
      case ReportType.PROFIT_LOSS:
        return this.generateProfitLossData(report);
      case ReportType.EMPLOYEE_PERFORMANCE:
        return this.generateEmployeePerformanceData(report);
      default:
        return this.generateGenericData(report);
    }
  }

  /**
   * Generar datos de ventas diarias (simulado)
   */
  private generateDailySalesData(_report: Report): any[] {
    // TODO: Query actual sales data from transactions
    return [];
  }

  /**
   * Generar datos de niveles de inventario (simulado)
   */
  private generateInventoryLevelsData(_report: Report): any[] {
    // TODO: Query actual inventory data
    return [];
  }

  /**
   * Generar datos de P&L (simulado)
   */
  private generateProfitLossData(_report: Report): any {
    // TODO: Calculate actual P&L from transactions and expenses
    return {
      revenue: {
        total: 0,
        by_category: {},
      },
      costs: {
        total: 0,
        cogs: 0,
        labor: 0,
        rent: 0,
        utilities: 0,
        other: 0,
      },
      profit: 0,
      profit_margin: 0,
    };
  }

  /**
   * Generar datos de performance de empleados (simulado)
   */
  /**
   * Generar datos de performance de empleados (simulado)
   */
  private generateEmployeePerformanceData(_report: Report): any[] {
    // TODO: Query actual employee performance metrics
    return [];
  }

  /**
   * Generar datos genéricos (simulado)
   */
  private generateGenericData(_report: Report): any[] {
    const data = [];

    for (let i = 0; i < 20; i++) {
      data.push({
        id: i + 1,
        value: Math.random() * 1000,
        timestamp: new Date(),
      });
    }

    return data;
  }

  /**
   * Exportar reporte a archivo (simulado)
   */
  private async exportReport(
    report: Report,
    _data: any,
  ): Promise<{ url: string; size: number }> {
    // Simular exportación
    const format = report.export_format!;
    const filename = `${report.name.replace(/\s+/g, '_')}_${Date.now()}.${format}`;
    const url = `https://storage.example.com/reports/${filename}`;
    const size = Math.floor(Math.random() * 500000) + 50000; // 50KB - 550KB

    return { url, size };
  }

  /**
   * Obtener todos los reportes
   */
  async findAllReports(
    organization_id?: string,
    category?: ReportCategory,
    status?: ReportStatus,
    requested_by?: string,
  ): Promise<Report[]> {
    let reports = Array.from(this.reports.values());

    if (organization_id) {
      reports = reports.filter((r) => r.organization_id === organization_id);
    }
    if (category) {
      reports = reports.filter((r) => r.category === category);
    }
    if (status) {
      reports = reports.filter((r) => r.status === status);
    }
    if (requested_by) {
      reports = reports.filter((r) => r.requested_by === requested_by);
    }

    return reports.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
  }

  /**
   * Obtener reporte por ID
   */
  async findReportById(id: string): Promise<Report> {
    const report = this.reports.get(id);
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  /**
   * Obtener resultado de reporte con metadatos
   */
  async getReportResult(id: string): Promise<ReportResult> {
    const report = await this.findReportById(id);

    if (report.status !== ReportStatus.COMPLETED) {
      throw new BadRequestException('Report is not completed yet');
    }

    return {
      report,
      columns: this.generateColumns(report),
      summary: this.generateSummary(report),
      charts: report.parameters.include_charts
        ? this.generateCharts(report)
        : undefined,
      total_rows: report.row_count,
      page: report.parameters.page || 1,
      total_pages: report.row_count
        ? Math.ceil(report.row_count / (report.parameters.limit || 100))
        : 1,
    };
  }

  /**
   * Generar columnas del reporte
   */
  private generateColumns(report: Report): any[] {
    // Generar columnas basadas en el tipo de reporte
    switch (report.type) {
      case ReportType.DAILY_SALES:
        return [
          { name: 'date', label: 'Date', type: 'date' },
          {
            name: 'total_sales',
            label: 'Total Sales',
            type: 'number',
            format: 'currency',
          },
          { name: 'transactions', label: 'Transactions', type: 'number' },
          {
            name: 'average_ticket',
            label: 'Avg Ticket',
            type: 'number',
            format: 'currency',
          },
        ];
      case ReportType.INVENTORY_LEVELS:
        return [
          { name: 'item_name', label: 'Item', type: 'string' },
          { name: 'current_stock', label: 'Stock', type: 'number' },
          { name: 'par_level', label: 'Par Level', type: 'number' },
          { name: 'unit', label: 'Unit', type: 'string' },
          { name: 'status', label: 'Status', type: 'string' },
        ];
      default:
        return [];
    }
  }

  /**
   * Generar resumen del reporte
   */
  private generateSummary(report: Report): any {
    if (!report.data || !Array.isArray(report.data)) {
      return {};
    }

    // Calcular totales y promedios según el tipo
    if (report.type === ReportType.DAILY_SALES) {
      const totalSales = report.data.reduce(
        (sum, row) => sum + (row.total_sales || 0),
        0,
      );
      const totalTransactions = report.data.reduce(
        (sum, row) => sum + (row.transactions || 0),
        0,
      );

      return {
        totals: {
          sales: totalSales,
          transactions: totalTransactions,
        },
        averages: {
          daily_sales: totalSales / report.data.length,
          daily_transactions: totalTransactions / report.data.length,
        },
      };
    }

    return {};
  }

  /**
   * Generar gráficos del reporte
   */
  private generateCharts(report: Report): any[] {
    if (!report.data) return [];

    const charts = [];

    if (report.type === ReportType.DAILY_SALES && Array.isArray(report.data)) {
      charts.push({
        type: 'line',
        title: 'Daily Sales Trend',
        data: {
          labels: report.data.map((row) => row.date),
          datasets: [
            {
              label: 'Total Sales',
              data: report.data.map((row) => row.total_sales),
            },
          ],
        },
      });
    }

    return charts;
  }

  /**
   * Eliminar reporte
   */
  async deleteReport(id: string): Promise<void> {
    this.reports.delete(id);
  }

  // ==================== SCHEDULES ====================

  /**
   * Crear schedule de reporte
   */
  async createReportSchedule(
    dto: CreateReportScheduleDto,
  ): Promise<ReportSchedule> {
    // Validar que el template existe
    await this.findReportTemplateById(dto.template_id);

    const id = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calcular next_run_date basado en frequency
    const next_run_date = this.calculateNextRunDate(
      dto.start_date,
      dto.frequency,
    );

    const schedule: ReportSchedule = {
      id,
      organization_id: dto.organization_id,
      name: dto.name,
      description: dto.description,
      template_id: dto.template_id,
      export_format: dto.export_format,
      frequency: dto.frequency,
      start_date: dto.start_date,
      end_date: dto.end_date,
      next_run_date,
      cron_expression: dto.cron_expression,
      recipients: dto.recipients,
      is_active: dto.is_active ?? true,
      run_count: 0,
      failure_count: 0,
      created_by: dto.created_by,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.schedules.set(id, schedule);
    return schedule;
  }

  /**
   * Calcular próxima fecha de ejecución
   */
  private calculateNextRunDate(
    startDate: Date,
    frequency: ScheduleFrequency,
  ): Date {
    const next = new Date(startDate);

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ScheduleFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case ScheduleFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case ScheduleFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case ScheduleFrequency.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Obtener todos los schedules
   */
  async findAllReportSchedules(
    organization_id?: string,
    is_active?: boolean,
  ): Promise<ReportSchedule[]> {
    let schedules = Array.from(this.schedules.values());

    if (organization_id) {
      schedules = schedules.filter(
        (s) => s.organization_id === organization_id,
      );
    }
    if (is_active !== undefined) {
      schedules = schedules.filter((s) => s.is_active === is_active);
    }

    return schedules.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
  }

  /**
   * Obtener schedule por ID
   */
  async findReportScheduleById(id: string): Promise<ReportSchedule> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new NotFoundException(`Report schedule with ID ${id} not found`);
    }
    return schedule;
  }

  /**
   * Ejecutar schedule manualmente
   */
  async executeSchedule(id: string): Promise<Report> {
    const schedule = await this.findReportScheduleById(id);
    const template = await this.findReportTemplateById(schedule.template_id);

    // Generar reporte usando el template
    const report = await this.generateReport({
      organization_id: schedule.organization_id,
      name: `${schedule.name} - ${new Date().toISOString()}`,
      category: template.category,
      type: template.type,
      template_id: template.id,
      parameters: template.parameters,
      export_format: schedule.export_format,
      requested_by: schedule.created_by,
    });

    // Asignar schedule_id al reporte
    const updatedReport = await this.findReportById(report.id);
    updatedReport.schedule_id = id;
    this.reports.set(report.id, updatedReport);

    // Actualizar schedule
    const updated: ReportSchedule = {
      ...schedule,
      last_run_date: new Date(),
      next_run_date: this.calculateNextRunDate(new Date(), schedule.frequency),
      run_count: schedule.run_count + 1,
      updated_at: new Date(),
    };

    this.schedules.set(id, updated);

    return updatedReport;
  }

  /**
   * Desactivar schedule
   */
  async deactivateSchedule(id: string): Promise<ReportSchedule> {
    const schedule = await this.findReportScheduleById(id);

    const updated: ReportSchedule = {
      ...schedule,
      is_active: false,
      updated_at: new Date(),
    };

    this.schedules.set(id, updated);
    return updated;
  }

  /**
   * Eliminar schedule
   */
  async deleteReportSchedule(id: string): Promise<void> {
    this.schedules.delete(id);
  }

  // ==================== STATS ====================

  /**
   * Obtener estadísticas de reportes
   */
  async getReportStats(organization_id: string): Promise<ReportStats> {
    const orgReports = await this.findAllReports(organization_id);
    const orgSchedules = await this.findAllReportSchedules(organization_id);

    const reportsByCategory = {} as Record<ReportCategory, number>;
    Object.values(ReportCategory).forEach((cat) => {
      reportsByCategory[cat] = orgReports.filter(
        (r) => r.category === cat,
      ).length;
    });

    const reportsByType = {} as Record<string, number>;
    orgReports.forEach((r) => {
      reportsByType[r.type] = (reportsByType[r.type] || 0) + 1;
    });

    const reportsByStatus = {} as Record<ReportStatus, number>;
    Object.values(ReportStatus).forEach((status) => {
      reportsByStatus[status] = orgReports.filter(
        (r) => r.status === status,
      ).length;
    });

    const completedReports = orgReports.filter(
      (r) => r.status === ReportStatus.COMPLETED,
    );
    const avgGenerationTime =
      completedReports.length > 0
        ? completedReports.reduce(
            (sum, r) => sum + (r.generation_time_ms || 0),
            0,
          ) / completedReports.length
        : 0;

    const totalFileSize =
      completedReports.reduce((sum, r) => sum + (r.file_size || 0), 0) /
      (1024 * 1024); // Convert to MB

    // Most generated type
    let mostGeneratedType = ReportType.DAILY_SALES;
    let maxCount = 0;
    Object.entries(reportsByType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostGeneratedType = type as ReportType;
      }
    });

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      organization_id,
      total_reports: orgReports.length,
      reports_by_category: reportsByCategory,
      reports_by_type: reportsByType,
      reports_by_status: reportsByStatus,
      active_schedules: orgSchedules.filter((s) => s.is_active).length,
      total_scheduled_runs: orgSchedules.reduce(
        (sum, s) => sum + s.run_count,
        0,
      ),
      average_generation_time_ms: Math.round(avgGenerationTime),
      total_file_size_mb: Math.round(totalFileSize * 100) / 100,
      most_generated_type: mostGeneratedType,
      reports_today: orgReports.filter((r) => r.created_at >= todayStart)
        .length,
      reports_this_week: orgReports.filter((r) => r.created_at >= weekStart)
        .length,
      reports_this_month: orgReports.filter((r) => r.created_at >= monthStart)
        .length,
    };
  }
}
