/**
 * Dashboard Interfaces
 * Sistema completo de dashboards personalizables con KPIs en tiempo real
 */

// ==================== ENUMS ====================

/**
 * Categorías de dashboard por rol/función
 */
export enum DashboardCategory {
  EXECUTIVE = 'executive', // Propietario/CEO - métricas estratégicas
  OPERATIONS = 'operations', // Gerente - operaciones diarias
  SALES = 'sales', // Ventas y transacciones
  INVENTORY = 'inventory', // Inventario y compras
  FINANCE = 'finance', // Finanzas y P&L
  QUALITY = 'quality', // Calidad y compliance
  HR = 'hr', // Recursos humanos
  CUSTOMER = 'customer', // CRM y satisfacción
  CUSTOM = 'custom', // Dashboards personalizados
}

/**
 * Tipos de widgets disponibles
 */
export enum WidgetType {
  // Métricas simples
  KPI = 'kpi', // Número grande con comparación
  STAT = 'stat', // Estadística simple
  METRIC_CARD = 'metric_card', // Tarjeta con métrica y tendencia

  // Gráficas
  LINE_CHART = 'line_chart', // Gráfica de líneas (tendencias)
  BAR_CHART = 'bar_chart', // Gráfica de barras
  PIE_CHART = 'pie_chart', // Gráfica circular
  DOUGHNUT_CHART = 'doughnut_chart', // Gráfica de dona
  AREA_CHART = 'area_chart', // Gráfica de área
  SCATTER_CHART = 'scatter_chart', // Gráfica de dispersión
  GAUGE_CHART = 'gauge_chart', // Medidor/gauge

  // Tablas y listas
  TABLE = 'table', // Tabla de datos
  RANKING = 'ranking', // Lista de ranking/top items
  RECENT_ACTIVITIES = 'recent_activities', // Actividades recientes

  // Especializados
  MAP = 'map', // Mapa (múltiples ubicaciones)
  HEATMAP = 'heatmap', // Mapa de calor
  PROGRESS_BAR = 'progress_bar', // Barra de progreso
  TIMELINE = 'timeline', // Línea de tiempo
  CALENDAR = 'calendar', // Calendario de eventos
}

/**
 * Tamaños de widget en grid
 */
export enum WidgetSize {
  SMALL = 'small', // 1x1
  MEDIUM = 'medium', // 2x1
  LARGE = 'large', // 2x2
  WIDE = 'wide', // 3x1
  FULL = 'full', // Full width
}

/**
 * Período de tiempo para datos
 */
export enum TimePeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  CUSTOM = 'custom',
}

/**
 * Tipo de comparación para KPIs
 */
export enum ComparisonType {
  NONE = 'none',
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  BUDGET = 'budget',
  TARGET = 'target',
}

/**
 * Frecuencia de actualización de datos
 */
export enum RefreshInterval {
  MANUAL = 'manual', // Solo al cargar
  REAL_TIME = 'real_time', // WebSocket en tiempo real
  EVERY_MINUTE = 'every_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_HOUR = 'every_hour',
}

// ==================== INTERFACES ====================

/**
 * Configuración de un widget
 */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  position: {
    x: number; // Posición en grid
    y: number;
    w: number; // Ancho en unidades de grid
    h: number; // Alto en unidades de grid
  };
  data_source: string; // Endpoint o query para obtener datos
  filters?: Record<string, any>; // Filtros aplicados
  time_period?: TimePeriod;
  custom_dates?: {
    start_date: Date;
    end_date: Date;
  };
  refresh_interval: RefreshInterval;
  comparison?: ComparisonType;
  styling?: {
    color_scheme?: string[];
    show_legend?: boolean;
    show_labels?: boolean;
    decimal_places?: number;
    prefix?: string; // Ej: "$", "Kg"
    suffix?: string; // Ej: "%", "pts"
  };
  drill_down?: {
    enabled: boolean;
    target_dashboard?: string;
    target_report?: string;
  };
}

/**
 * Layout de dashboard
 */
export interface DashboardLayout {
  id: string;
  name: string;
  organization_id: string;
  category: DashboardCategory;
  description?: string;
  widgets: WidgetConfig[];
  filters?: {
    location_ids?: string[];
    date_range?: {
      start: Date;
      end: Date;
    };
    custom_filters?: Record<string, any>;
  };
  is_template: boolean; // Si es plantilla predefinida
  is_public: boolean; // Compartido con toda la org
  allowed_roles?: string[]; // Roles que pueden ver
  created_by: string;
  updated_by?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Dashboard con datos
 */
export interface Dashboard {
  layout: DashboardLayout;
  data: {
    [widgetId: string]: WidgetData;
  };
  metadata: {
    last_updated: Date;
    next_refresh?: Date;
    loading_time_ms: number;
  };
}

/**
 * Datos de un widget
 */
export interface WidgetData {
  widget_id: string;
  type: WidgetType;
  value?: number | string | null; // Para KPIs y stats
  values?: Array<{
    label: string;
    value: number;
    color?: string;
  }>; // Para gráficas y rankings
  series?: Array<{
    name: string;
    data: Array<{
      x: any; // Fecha, categoría, etc.
      y: number;
    }>;
  }>; // Para gráficas de serie temporal
  rows?: Array<Record<string, any>>; // Para tablas
  comparison?: {
    previous_value: number | null;
    change_percent: number | null;
    change_absolute: number | null;
    trend: 'up' | 'down' | 'stable';
    is_favorable: boolean; // Si el cambio es positivo según contexto
  };
  error?: string;
  /** false when no real data source is wired for this widget */
  available?: boolean;
  /** Reason code when `available` is false, e.g. 'not_implemented' */
  reason?: string;
  last_updated: Date;
}

/**
 * KPI predefinido del sistema
 */
export interface SystemKPI {
  id: string;
  code: string; // Identificador único (ej: "daily_sales")
  name: string;
  description: string;
  category: DashboardCategory;
  widget_type: WidgetType;
  data_source: string;
  default_time_period: TimePeriod;
  default_comparison: ComparisonType;
  formula?: string; // Fórmula de cálculo
  unit?: string;
  decimal_places: number;
  favorable_direction: 'up' | 'down' | 'neutral'; // Si más es mejor o peor
  benchmark?: number; // Valor de referencia
  target?: number; // Meta esperada
}

/**
 * Favorito de usuario
 */
export interface DashboardFavorite {
  id: string;
  user_id: string;
  dashboard_id: string;
  order: number; // Orden en la lista de favoritos
  created_at: Date;
}

/**
 * Compartir dashboard
 */
export interface DashboardShare {
  id: string;
  dashboard_id: string;
  shared_by: string;
  shared_with?: string[]; // User IDs específicos
  shared_with_roles?: string[]; // Roles con acceso
  is_public: boolean; // Público para toda la org
  can_edit: boolean;
  expires_at?: Date;
  created_at: Date;
}

/**
 * Snapshot de dashboard para histórico
 */
export interface DashboardSnapshot {
  id: string;
  dashboard_id: string;
  data: Dashboard;
  created_by: string;
  notes?: string;
  created_at: Date;
}

/**
 * Alerta basada en KPI
 */
export interface DashboardAlert {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  kpi_code: string; // KPI del sistema a monitorear
  condition: {
    operator: 'greater_than' | 'less_than' | 'equals' | 'between';
    value: number;
    value2?: number; // Para "between"
  };
  filters?: Record<string, any>;
  notification_channels: Array<'email' | 'sms' | 'push' | 'webhook'>;
  recipients: string[]; // User IDs o emails
  is_active: boolean;
  last_triggered?: Date;
  trigger_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Estadísticas de uso de dashboard
 */
export interface DashboardStats {
  organization_id: string;
  total_dashboards: number;
  dashboards_by_category: Record<DashboardCategory, number>;
  most_viewed_dashboard: {
    dashboard_id: string;
    name: string;
    view_count: number;
  };
  most_used_widgets: Array<{
    type: WidgetType;
    count: number;
  }>;
  active_users_today: number;
  active_users_this_week: number;
  total_snapshots: number;
  total_alerts: number;
  active_alerts: number;
  alerts_triggered_today: number;
}

/**
 * Request para crear/actualizar dashboard
 */
export interface CreateDashboardDto {
  name: string;
  organization_id: string;
  category: DashboardCategory;
  description?: string;
  widgets?: WidgetConfig[];
  filters?: DashboardLayout['filters'];
  is_template?: boolean;
  is_public?: boolean;
  allowed_roles?: string[];
  created_by: string;
}

/**
 * Request para actualizar dashboard
 */
export interface UpdateDashboardDto extends Partial<CreateDashboardDto> {
  updated_by?: string;
  is_active?: boolean;
}

/**
 * Request para agregar widget
 */
export interface AddWidgetDto {
  dashboard_id: string;
  widget: WidgetConfig;
}

/**
 * Request para actualizar widget
 */
export interface UpdateWidgetDto {
  dashboard_id: string;
  widget_id: string;
  updates: Partial<WidgetConfig>;
}

/**
 * Filtros para query de dashboards
 */
export interface DashboardFilters {
  organization_id?: string;
  category?: DashboardCategory;
  is_template?: boolean;
  is_public?: boolean;
  created_by?: string;
  is_active?: boolean;
  search?: string; // Búsqueda por nombre/descripción
}

/**
 * Opciones de exportación
 */
export interface DashboardExportOptions {
  format: 'pdf' | 'png' | 'xlsx' | 'json';
  include_filters: boolean;
  include_timestamps: boolean;
  page_size?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
}
