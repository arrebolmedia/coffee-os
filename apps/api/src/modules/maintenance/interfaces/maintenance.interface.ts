/**
 * Enums para gestión de activos y mantenimiento
 */

export enum AssetType {
  ESPRESSO_MACHINE = 'espresso_machine',
  GRINDER = 'grinder',
  BREWER = 'brewer',
  BLENDER = 'blender',
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer',
  OVEN = 'oven',
  DISHWASHER = 'dishwasher',
  POS_TERMINAL = 'pos_terminal',
  FURNITURE = 'furniture',
  VEHICLE = 'vehicle',
  OTHER = 'other',
}

export enum AssetStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  REPAIR = 'repair',
  RETIRED = 'retired',
  DISPOSED = 'disposed',
}

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  INSPECTION = 'inspection',
  CALIBRATION = 'calibration',
  CLEANING = 'cleaning',
  UPGRADE = 'upgrade',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Activo/Equipo
 */
export interface Asset {
  id: string;
  organization_id: string;
  location_id?: string;
  
  // Asset details
  name: string;
  type: AssetType;
  brand?: string;
  model?: string;
  serial_number?: string;
  
  // Purchase info
  purchase_date?: Date;
  purchase_price?: number;
  supplier_id?: string;
  warranty_months?: number;
  warranty_expires_at?: Date;
  
  // Depreciation
  useful_life_years?: number;
  depreciation_method?: 'straight_line' | 'declining_balance';
  residual_value?: number;
  current_value?: number;
  
  // Status
  status: AssetStatus;
  installation_date?: Date;
  last_maintenance_date?: Date;
  next_maintenance_date?: Date;
  
  // Metadata
  notes?: string;
  image_url?: string;
  qr_code?: string;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Registro de mantenimiento
 */
export interface MaintenanceRecord {
  id: string;
  organization_id: string;
  asset_id: string;
  
  // Maintenance details
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  
  // Scheduling
  scheduled_date: Date;
  started_at?: Date;
  completed_at?: Date;
  
  // Work details
  description: string;
  work_performed?: string;
  parts_replaced?: string[];
  
  // Personnel
  assigned_to?: string; // user_id
  performed_by?: string; // user_id or external technician name
  
  // Cost
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  
  // External service
  is_external: boolean;
  external_provider?: string;
  external_invoice?: string;
  
  // Follow-up
  next_maintenance_date?: Date;
  recurring_interval_days?: number;
  
  // Metadata
  notes?: string;
  attachments?: string[];
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Parte/Componente
 */
export interface AssetPart {
  id: string;
  organization_id: string;
  asset_id: string;
  
  // Part details
  name: string;
  part_number?: string;
  description?: string;
  
  // Installation
  installed_date: Date;
  expected_lifespan_days?: number;
  replacement_due_date?: Date;
  
  // Cost
  cost?: number;
  supplier_id?: string;
  
  // Status
  is_active: boolean;
  replaced_date?: Date;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Estadísticas de mantenimiento
 */
export interface MaintenanceStats {
  total_assets: number;
  assets_by_type: Record<AssetType, number>;
  assets_by_status: Record<AssetStatus, number>;
  
  total_maintenance_records: number;
  maintenance_by_type: Record<MaintenanceType, number>;
  maintenance_by_status: Record<MaintenanceStatus, number>;
  
  upcoming_maintenance: number;
  overdue_maintenance: number;
  
  total_cost: number;
  average_cost_per_maintenance: number;
  
  assets_under_warranty: number;
  assets_warranty_expiring_soon: number; // within 30 days
}

/**
 * Reporte de depreciación
 */
export interface DepreciationReport {
  organization_id: string;
  as_of_date: Date;
  
  total_assets: number;
  total_purchase_value: number;
  total_current_value: number;
  total_depreciation: number;
  
  assets: Array<{
    asset_id: string;
    asset_name: string;
    purchase_date: Date;
    purchase_price: number;
    current_value: number;
    accumulated_depreciation: number;
    depreciation_percentage: number;
  }>;
}
