/**
 * Reports Module Interfaces
 *
 * Sistema de generación de reportes avanzados con filtros, exportación y scheduling
 */

/**
 * Categoría de reporte
 */
export enum ReportCategory {
  SALES = 'sales',
  INVENTORY = 'inventory',
  FINANCE = 'finance',
  QUALITY = 'quality',
  HR = 'hr',
  OPERATIONS = 'operations',
  CUSTOMER = 'customer',
  CUSTOM = 'custom',
}

/**
 * Tipo de reporte
 */
export enum ReportType {
  // Sales
  DAILY_SALES = 'daily_sales',
  SALES_BY_PRODUCT = 'sales_by_product',
  SALES_BY_CATEGORY = 'sales_by_category',
  SALES_BY_EMPLOYEE = 'sales_by_employee',
  SALES_BY_HOUR = 'sales_by_hour',

  // Inventory
  INVENTORY_LEVELS = 'inventory_levels',
  INVENTORY_MOVEMENTS = 'inventory_movements',
  LOW_STOCK = 'low_stock',
  WASTE_REPORT = 'waste_report',

  // Finance
  PROFIT_LOSS = 'profit_loss',
  CASH_FLOW = 'cash_flow',
  EXPENSES = 'expenses',
  TAX_REPORT = 'tax_report',

  // Quality
  QUALITY_CHECKS = 'quality_checks',
  COMPLIANCE = 'compliance',
  TEMPERATURE_LOGS = 'temperature_logs',

  // HR
  EMPLOYEE_PERFORMANCE = 'employee_performance',
  ATTENDANCE = 'attendance',
  TRAINING_PROGRESS = 'training_progress',

  // Operations
  SHIFT_SUMMARY = 'shift_summary',
  ORDER_TIMES = 'order_times',
  MAINTENANCE_LOG = 'maintenance_log',

  // Customer
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
  LOYALTY_PROGRAM = 'loyalty_program',

  // Custom
  CUSTOM_QUERY = 'custom_query',
}

/**
 * Formato de exportación
 */
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * Estado de reporte
 */
export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
}

/**
 * Frecuencia de scheduling
 */
export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

/**
 * Operadores de filtro
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_OR_EQUAL = 'greater_or_equal',
  LESS_OR_EQUAL = 'less_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
}

/**
 * Filtro de reporte
 */
export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Ordenamiento de reporte
 */
export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Agrupación de reporte
 */
export interface ReportGroupBy {
  field: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

/**
 * Parámetros de reporte
 */
export interface ReportParameters {
  // Filtros de fecha
  start_date?: Date;
  end_date?: Date;

  // Filtros de ubicación
  organization_id?: string;
  location_id?: string;

  // Filtros adicionales
  filters?: ReportFilter[];

  // Ordenamiento
  sort?: ReportSort[];

  // Agrupación
  group_by?: ReportGroupBy[];

  // Paginación
  page?: number;
  limit?: number;

  // Opciones de visualización
  include_charts?: boolean;
  include_summary?: boolean;

  // Custom query (para CUSTOM_QUERY type)
  custom_query?: string;
  custom_params?: Record<string, any>;
}

/**
 * Template de reporte
 */
export interface ReportTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: ReportCategory;
  type: ReportType;

  // Template configuration
  parameters: ReportParameters;

  // Layout and styling
  layout?: 'portrait' | 'landscape';
  header_template?: string;
  footer_template?: string;
  styles?: Record<string, any>;

  // Permissions
  is_public: boolean;
  allowed_roles?: string[];

  // Meta
  created_by: string;
  is_active: boolean;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Reporte generado
 */
export interface Report {
  id: string;
  organization_id: string;

  // Report details
  name: string;
  description?: string;
  category: ReportCategory;
  type: ReportType;

  // Template reference
  template_id?: string;

  // Parameters used
  parameters: ReportParameters;

  // Status
  status: ReportStatus;

  // Results
  data?: any;
  row_count?: number;

  // Export
  export_format?: ExportFormat;
  file_url?: string;
  file_size?: number; // bytes

  // Timing
  generated_at?: Date;
  generation_time_ms?: number;

  // Schedule reference
  schedule_id?: string;

  // Errors
  error_message?: string;

  // User
  requested_by: string;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Schedule de reporte
 */
export interface ReportSchedule {
  id: string;
  organization_id: string;

  // Schedule details
  name: string;
  description?: string;

  // Report configuration
  template_id: string;
  export_format: ExportFormat;

  // Schedule settings
  frequency: ScheduleFrequency;

  // Timing
  start_date: Date;
  end_date?: Date;
  next_run_date?: Date;
  last_run_date?: Date;

  // For CUSTOM frequency
  cron_expression?: string;

  // Distribution
  recipients: string[]; // email addresses

  // Status
  is_active: boolean;
  run_count: number;
  failure_count: number;

  // Created by
  created_by: string;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Estadísticas de reportes
 */
export interface ReportStats {
  organization_id: string;

  // Counts
  total_reports: number;
  reports_by_category: Record<ReportCategory, number>;
  reports_by_type: Record<string, number>;
  reports_by_status: Record<ReportStatus, number>;

  // Schedules
  active_schedules: number;
  total_scheduled_runs: number;

  // Performance
  average_generation_time_ms: number;
  total_file_size_mb: number;

  // Most popular
  most_generated_type: ReportType;
  most_used_template?: string;

  // Recent activity
  reports_today: number;
  reports_this_week: number;
  reports_this_month: number;
}

/**
 * Resultado de reporte con metadatos
 */
export interface ReportResult {
  report: Report;

  // Metadata
  columns?: ReportColumn[];
  summary?: ReportSummary;
  charts?: ReportChart[];

  // Pagination info
  total_rows?: number;
  page?: number;
  total_pages?: number;
}

/**
 * Columna de reporte
 */
export interface ReportColumn {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Resumen de reporte
 */
export interface ReportSummary {
  totals?: Record<string, number>;
  averages?: Record<string, number>;
  counts?: Record<string, number>;
  custom?: Record<string, any>;
}

/**
 * Gráfico de reporte
 */
export interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title: string;
  data: any;
  options?: Record<string, any>;
}
