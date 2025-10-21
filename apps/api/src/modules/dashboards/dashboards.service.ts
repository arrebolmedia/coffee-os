import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  DashboardLayout,
  Dashboard,
  DashboardCategory,
  WidgetConfig,
  WidgetData,
  WidgetType,
  SystemKPI,
  DashboardAlert,
  DashboardSnapshot,
  DashboardFavorite,
  DashboardStats,
  TimePeriod,
  ComparisonType,
  RefreshInterval,
  WidgetSize,
} from './interfaces/dashboard.interface';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  AddWidgetDto,
  UpdateWidgetDto,
  CreateAlertDto,
} from './dto';

@Injectable()
export class DashboardsService {
  private dashboards: Map<string, DashboardLayout> = new Map();
  private alerts: Map<string, DashboardAlert> = new Map();
  private favorites: Map<string, DashboardFavorite> = new Map();
  private snapshots: Map<string, DashboardSnapshot> = new Map();
  private systemKPIs: Map<string, SystemKPI> = new Map();

  constructor() {
    this.initializeSystemKPIs();
    this.createDefaultDashboards();
  }

  // ==================== DASHBOARD CRUD ====================

  /**
   * Crear dashboard
   */
  async createDashboard(dto: CreateDashboardDto): Promise<DashboardLayout> {
    const id = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const dashboard: DashboardLayout = {
      id,
      name: dto.name,
      organization_id: dto.organization_id,
      category: dto.category,
      description: dto.description,
      widgets: dto.widgets || [],
      filters: dto.filters,
      is_template: dto.is_template || false,
      is_public: dto.is_public || false,
      allowed_roles: dto.allowed_roles,
      created_by: dto.created_by,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  /**
   * Obtener todos los dashboards con filtros
   */
  async findAllDashboards(
    organization_id?: string,
    category?: DashboardCategory,
    is_template?: boolean,
    is_public?: boolean,
    created_by?: string,
    is_active?: boolean,
  ): Promise<DashboardLayout[]> {
    let dashboards = Array.from(this.dashboards.values());

    if (organization_id) {
      dashboards = dashboards.filter((d) => d.organization_id === organization_id);
    }

    if (category) {
      dashboards = dashboards.filter((d) => d.category === category);
    }

    if (is_template !== undefined) {
      dashboards = dashboards.filter((d) => d.is_template === is_template);
    }

    if (is_public !== undefined) {
      dashboards = dashboards.filter((d) => d.is_public === is_public);
    }

    if (created_by) {
      dashboards = dashboards.filter((d) => d.created_by === created_by);
    }

    if (is_active !== undefined) {
      dashboards = dashboards.filter((d) => d.is_active === is_active);
    }

    return dashboards.sort(
      (a, b) => b.updated_at.getTime() - a.updated_at.getTime(),
    );
  }

  /**
   * Obtener dashboard por ID
   */
  async findDashboardById(id: string): Promise<DashboardLayout> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }
    return dashboard;
  }

  /**
   * Actualizar dashboard
   */
  async updateDashboard(
    id: string,
    dto: UpdateDashboardDto,
  ): Promise<DashboardLayout> {
    const dashboard = await this.findDashboardById(id);

    const updated: DashboardLayout = {
      ...dashboard,
      ...dto,
      updated_at: new Date(),
    };

    this.dashboards.set(id, updated);
    return updated;
  }

  /**
   * Eliminar dashboard
   */
  async deleteDashboard(id: string): Promise<void> {
    await this.findDashboardById(id);
    this.dashboards.delete(id);
  }

  /**
   * Clonar dashboard
   */
  async cloneDashboard(
    id: string,
    new_name: string,
    created_by: string,
  ): Promise<DashboardLayout> {
    const original = await this.findDashboardById(id);

    const cloned: CreateDashboardDto = {
      name: new_name,
      organization_id: original.organization_id,
      category: original.category,
      description: `Copia de: ${original.name}`,
      widgets: JSON.parse(JSON.stringify(original.widgets)), // Deep clone
      filters: original.filters,
      is_template: false,
      is_public: false,
      created_by,
    };

    return this.createDashboard(cloned);
  }

  // ==================== WIDGET MANAGEMENT ====================

  /**
   * Agregar widget a dashboard
   */
  async addWidget(dto: AddWidgetDto): Promise<DashboardLayout> {
    const dashboard = await this.findDashboardById(dto.dashboard_id);

    // Generar ID para el widget si no tiene
    if (!dto.widget.id) {
      dto.widget.id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    dashboard.widgets.push(dto.widget);
    dashboard.updated_at = new Date();

    this.dashboards.set(dto.dashboard_id, dashboard);
    return dashboard;
  }

  /**
   * Actualizar widget
   */
  async updateWidget(dto: UpdateWidgetDto): Promise<DashboardLayout> {
    const dashboard = await this.findDashboardById(dto.dashboard_id);

    const widgetIndex = dashboard.widgets.findIndex(
      (w) => w.id === dto.widget_id,
    );

    if (widgetIndex === -1) {
      throw new NotFoundException(
        `Widget ${dto.widget_id} not found in dashboard`,
      );
    }

    dashboard.widgets[widgetIndex] = {
      ...dashboard.widgets[widgetIndex],
      ...dto.updates,
    };

    dashboard.updated_at = new Date();
    this.dashboards.set(dto.dashboard_id, dashboard);
    return dashboard;
  }

  /**
   * Eliminar widget
   */
  async removeWidget(
    dashboard_id: string,
    widget_id: string,
  ): Promise<DashboardLayout> {
    const dashboard = await this.findDashboardById(dashboard_id);

    dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widget_id);
    dashboard.updated_at = new Date();

    this.dashboards.set(dashboard_id, dashboard);
    return dashboard;
  }

  /**
   * Reordenar widgets
   */
  async reorderWidgets(
    dashboard_id: string,
    widget_positions: Array<{ id: string; position: any }>,
  ): Promise<DashboardLayout> {
    const dashboard = await this.findDashboardById(dashboard_id);

    widget_positions.forEach(({ id, position }) => {
      const widget = dashboard.widgets.find((w) => w.id === id);
      if (widget) {
        widget.position = position;
      }
    });

    dashboard.updated_at = new Date();
    this.dashboards.set(dashboard_id, dashboard);
    return dashboard;
  }

  // ==================== DASHBOARD DATA ====================

  /**
   * Obtener dashboard con datos
   */
  async getDashboardWithData(id: string): Promise<Dashboard> {
    const startTime = Date.now();
    const layout = await this.findDashboardById(id);

    const data: { [widgetId: string]: WidgetData } = {};

    // Cargar datos para cada widget
    for (const widget of layout.widgets) {
      data[widget.id] = await this.getWidgetData(widget);
    }

    return {
      layout,
      data,
      metadata: {
        last_updated: new Date(),
        loading_time_ms: Date.now() - startTime,
      },
    };
  }

  /**
   * Obtener datos de un widget específico
   */
  private async getWidgetData(widget: WidgetConfig): Promise<WidgetData> {
    // Aquí se llamaría al data_source real
    // Por ahora generamos datos de ejemplo según el tipo

    const baseData: WidgetData = {
      widget_id: widget.id,
      type: widget.type,
      last_updated: new Date(),
    };

    try {
      switch (widget.type) {
        case WidgetType.KPI:
        case WidgetType.STAT:
        case WidgetType.METRIC_CARD:
          return {
            ...baseData,
            value: this.generateRandomValue(1000, 10000),
            comparison: widget.comparison !== ComparisonType.NONE
              ? this.generateComparison()
              : undefined,
          };

        case WidgetType.LINE_CHART:
        case WidgetType.AREA_CHART:
          return {
            ...baseData,
            series: [
              {
                name: 'Ventas',
                data: this.generateTimeSeriesData(7),
              },
            ],
          };

        case WidgetType.BAR_CHART:
        case WidgetType.PIE_CHART:
        case WidgetType.DOUGHNUT_CHART:
          return {
            ...baseData,
            values: [
              { label: 'Producto A', value: 450, color: '#4F46E5' },
              { label: 'Producto B', value: 320, color: '#10B981' },
              { label: 'Producto C', value: 280, color: '#F59E0B' },
              { label: 'Producto D', value: 180, color: '#EF4444' },
            ],
          };

        case WidgetType.TABLE:
        case WidgetType.RANKING:
          return {
            ...baseData,
            rows: [
              { rank: 1, name: 'Espresso', count: 145, revenue: 2900 },
              { rank: 2, name: 'Latte', count: 98, revenue: 3920 },
              { rank: 3, name: 'Cappuccino', count: 87, revenue: 3480 },
            ],
          };

        case WidgetType.GAUGE_CHART:
          return {
            ...baseData,
            value: this.generateRandomValue(60, 90),
          };

        case WidgetType.PROGRESS_BAR:
          return {
            ...baseData,
            value: this.generateRandomValue(70, 95),
          };

        default:
          return {
            ...baseData,
            value: 0,
          };
      }
    } catch (error) {
      return {
        ...baseData,
        error: error.message,
      };
    }
  }

  /**
   * Actualizar datos de widget en tiempo real
   */
  async refreshWidgetData(
    dashboard_id: string,
    widget_id: string,
  ): Promise<WidgetData> {
    const dashboard = await this.findDashboardById(dashboard_id);
    const widget = dashboard.widgets.find((w) => w.id === widget_id);

    if (!widget) {
      throw new NotFoundException(`Widget ${widget_id} not found`);
    }

    return this.getWidgetData(widget);
  }

  // ==================== SYSTEM KPIs ====================

  /**
   * Obtener todos los KPIs del sistema
   */
  async getSystemKPIs(category?: DashboardCategory): Promise<SystemKPI[]> {
    let kpis = Array.from(this.systemKPIs.values());

    if (category) {
      kpis = kpis.filter((k) => k.category === category);
    }

    return kpis;
  }

  /**
   * Obtener KPI por código
   */
  async getSystemKPIByCode(code: string): Promise<SystemKPI> {
    const kpi = this.systemKPIs.get(code);
    if (!kpi) {
      throw new NotFoundException(`KPI with code ${code} not found`);
    }
    return kpi;
  }

  // ==================== ALERTS ====================

  /**
   * Crear alerta
   */
  async createAlert(dto: CreateAlertDto): Promise<DashboardAlert> {
    // Validar que el KPI existe
    await this.getSystemKPIByCode(dto.kpi_code);

    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: DashboardAlert = {
      id,
      organization_id: dto.organization_id,
      name: dto.name,
      description: dto.description,
      kpi_code: dto.kpi_code,
      condition: dto.condition,
      filters: dto.filters,
      notification_channels: dto.notification_channels,
      recipients: dto.recipients,
      is_active: true,
      trigger_count: 0,
      created_by: dto.created_by,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.alerts.set(id, alert);
    return alert;
  }

  /**
   * Obtener alertas
   */
  async findAllAlerts(
    organization_id?: string,
    is_active?: boolean,
  ): Promise<DashboardAlert[]> {
    let alerts = Array.from(this.alerts.values());

    if (organization_id) {
      alerts = alerts.filter((a) => a.organization_id === organization_id);
    }

    if (is_active !== undefined) {
      alerts = alerts.filter((a) => a.is_active === is_active);
    }

    return alerts.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
  }

  /**
   * Obtener alerta por ID
   */
  async findAlertById(id: string): Promise<DashboardAlert> {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }
    return alert;
  }

  /**
   * Desactivar alerta
   */
  async deactivateAlert(id: string): Promise<DashboardAlert> {
    const alert = await this.findAlertById(id);
    alert.is_active = false;
    alert.updated_at = new Date();
    this.alerts.set(id, alert);
    return alert;
  }

  /**
   * Eliminar alerta
   */
  async deleteAlert(id: string): Promise<void> {
    await this.findAlertById(id);
    this.alerts.delete(id);
  }

  // ==================== FAVORITES ====================

  /**
   * Agregar a favoritos
   */
  async addToFavorites(
    user_id: string,
    dashboard_id: string,
  ): Promise<DashboardFavorite> {
    await this.findDashboardById(dashboard_id);

    const id = `favorite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const favorite: DashboardFavorite = {
      id,
      user_id,
      dashboard_id,
      order: this.getFavoritesCountForUser(user_id) + 1,
      created_at: new Date(),
    };

    this.favorites.set(id, favorite);
    return favorite;
  }

  /**
   * Obtener favoritos de usuario
   */
  async getUserFavorites(user_id: string): Promise<DashboardFavorite[]> {
    return Array.from(this.favorites.values())
      .filter((f) => f.user_id === user_id)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Eliminar de favoritos
   */
  async removeFromFavorites(id: string): Promise<void> {
    const favorite = this.favorites.get(id);
    if (!favorite) {
      throw new NotFoundException(`Favorite with ID ${id} not found`);
    }
    this.favorites.delete(id);
  }

  // ==================== SNAPSHOTS ====================

  /**
   * Crear snapshot de dashboard
   */
  async createSnapshot(
    dashboard_id: string,
    created_by: string,
    notes?: string,
  ): Promise<DashboardSnapshot> {
    const dashboard = await this.getDashboardWithData(dashboard_id);

    const id = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: DashboardSnapshot = {
      id,
      dashboard_id,
      data: dashboard,
      created_by,
      notes,
      created_at: new Date(),
    };

    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  /**
   * Obtener snapshots de dashboard
   */
  async getDashboardSnapshots(dashboard_id: string): Promise<DashboardSnapshot[]> {
    return Array.from(this.snapshots.values())
      .filter((s) => s.dashboard_id === dashboard_id)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * Obtener snapshot por ID
   */
  async getSnapshotById(id: string): Promise<DashboardSnapshot> {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      throw new NotFoundException(`Snapshot with ID ${id} not found`);
    }
    return snapshot;
  }

  // ==================== STATISTICS ====================

  /**
   * Obtener estadísticas de dashboards
   */
  async getDashboardStats(organization_id: string): Promise<DashboardStats> {
    const orgDashboards = await this.findAllDashboards(organization_id);
    const orgAlerts = await this.findAllAlerts(organization_id);

    // Contar por categoría
    const by_category: Record<DashboardCategory, number> = {
      [DashboardCategory.EXECUTIVE]: 0,
      [DashboardCategory.OPERATIONS]: 0,
      [DashboardCategory.SALES]: 0,
      [DashboardCategory.INVENTORY]: 0,
      [DashboardCategory.FINANCE]: 0,
      [DashboardCategory.QUALITY]: 0,
      [DashboardCategory.HR]: 0,
      [DashboardCategory.CUSTOMER]: 0,
      [DashboardCategory.CUSTOM]: 0,
    };

    orgDashboards.forEach((d) => {
      by_category[d.category]++;
    });

    // Contar widgets por tipo
    const widgetTypeCounts: Map<WidgetType, number> = new Map();
    orgDashboards.forEach((d) => {
      d.widgets.forEach((w) => {
        widgetTypeCounts.set(w.type, (widgetTypeCounts.get(w.type) || 0) + 1);
      });
    });

    const most_used_widgets = Array.from(widgetTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const activeAlerts = orgAlerts.filter((a) => a.is_active);
    const orgSnapshots = Array.from(this.snapshots.values()).filter(
      (s) => {
        const dashboard = this.dashboards.get(s.dashboard_id);
        return dashboard?.organization_id === organization_id;
      },
    );

    return {
      organization_id,
      total_dashboards: orgDashboards.length,
      dashboards_by_category: by_category,
      most_viewed_dashboard: {
        dashboard_id: orgDashboards[0]?.id || '',
        name: orgDashboards[0]?.name || '',
        view_count: 0,
      },
      most_used_widgets,
      active_users_today: 0,
      active_users_this_week: 0,
      total_snapshots: orgSnapshots.length,
      total_alerts: orgAlerts.length,
      active_alerts: activeAlerts.length,
      alerts_triggered_today: 0,
    };
  }

  // ==================== HELPERS ====================

  private getFavoritesCountForUser(user_id: string): number {
    return Array.from(this.favorites.values()).filter(
      (f) => f.user_id === user_id,
    ).length;
  }

  private generateRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateComparison(): WidgetData['comparison'] {
    const current = this.generateRandomValue(1000, 10000);
    const previous = this.generateRandomValue(1000, 10000);
    const change_absolute = current - previous;
    const change_percent = (change_absolute / previous) * 100;

    return {
      previous_value: previous,
      change_percent: parseFloat(change_percent.toFixed(2)),
      change_absolute,
      trend: change_absolute > 0 ? 'up' : change_absolute < 0 ? 'down' : 'stable',
      is_favorable: change_absolute > 0,
    };
  }

  private generateTimeSeriesData(days: number): Array<{ x: any; y: number }> {
    const data: Array<{ x: any; y: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        x: date.toISOString().split('T')[0],
        y: this.generateRandomValue(500, 2000),
      });
    }

    return data;
  }

  /**
   * Inicializar KPIs del sistema
   */
  private initializeSystemKPIs(): void {
    const kpis: SystemKPI[] = [
      // Sales KPIs
      {
        id: 'kpi-1',
        code: 'daily_sales',
        name: 'Ventas del Día',
        description: 'Total de ventas en el día actual',
        category: DashboardCategory.SALES,
        widget_type: WidgetType.KPI,
        data_source: '/api/analytics/sales/daily',
        default_time_period: TimePeriod.TODAY,
        default_comparison: ComparisonType.PREVIOUS_PERIOD,
        unit: 'MXN',
        decimal_places: 2,
        favorable_direction: 'up',
      },
      {
        id: 'kpi-2',
        code: 'average_ticket',
        name: 'Ticket Promedio',
        description: 'Valor promedio por transacción',
        category: DashboardCategory.SALES,
        widget_type: WidgetType.METRIC_CARD,
        data_source: '/api/analytics/sales/average-ticket',
        default_time_period: TimePeriod.TODAY,
        default_comparison: ComparisonType.PREVIOUS_PERIOD,
        unit: 'MXN',
        decimal_places: 2,
        favorable_direction: 'up',
      },
      // Operations KPIs
      {
        id: 'kpi-3',
        code: 'order_fulfillment_time',
        name: 'Tiempo de Preparación',
        description: 'Tiempo promedio de preparación de órdenes',
        category: DashboardCategory.OPERATIONS,
        widget_type: WidgetType.GAUGE_CHART,
        data_source: '/api/analytics/operations/fulfillment-time',
        default_time_period: TimePeriod.TODAY,
        default_comparison: ComparisonType.PREVIOUS_PERIOD,
        unit: 'min',
        decimal_places: 1,
        favorable_direction: 'down',
        target: 3,
      },
      // Inventory KPIs
      {
        id: 'kpi-4',
        code: 'low_stock_items',
        name: 'Productos Bajo Stock',
        description: 'Número de productos por debajo del par level',
        category: DashboardCategory.INVENTORY,
        widget_type: WidgetType.STAT,
        data_source: '/api/analytics/inventory/low-stock',
        default_time_period: TimePeriod.TODAY,
        default_comparison: ComparisonType.NONE,
        unit: 'items',
        decimal_places: 0,
        favorable_direction: 'down',
      },
    ];

    kpis.forEach((kpi) => this.systemKPIs.set(kpi.code, kpi));
  }

  /**
   * Crear dashboards por defecto
   */
  private createDefaultDashboards(): void {
    // Este método crearía dashboards de ejemplo
    // Por ahora lo dejamos vacío para tests
  }
}
