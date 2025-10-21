/**
 * Enums para waste tracking y sostenibilidad
 */

export enum WasteCategory {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  PACKAGING = 'packaging',
  PAPER = 'paper',
  PLASTIC = 'plastic',
  GLASS = 'glass',
  METAL = 'metal',
  ORGANIC = 'organic',
  HAZARDOUS = 'hazardous',
  OTHER = 'other',
}

export enum WasteReason {
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
  OVERPRODUCTION = 'overproduction',
  SPILLAGE = 'spillage',
  CUSTOMER_RETURN = 'customer_return',
  QUALITY_ISSUE = 'quality_issue',
  PREPARATION_ERROR = 'preparation_error',
  EQUIPMENT_FAILURE = 'equipment_failure',
  OTHER = 'other',
}

export enum DisposalMethod {
  TRASH = 'trash',
  RECYCLING = 'recycling',
  COMPOST = 'compost',
  DONATION = 'donation',
  BIODIGESTER = 'biodigester',
  INCINERATION = 'incineration',
  SPECIAL_HANDLING = 'special_handling',
}

export enum SustainabilityMetricType {
  CARBON_FOOTPRINT = 'carbon_footprint', // kg CO2e
  WATER_USAGE = 'water_usage', // liters
  ENERGY_CONSUMPTION = 'energy_consumption', // kWh
  WASTE_GENERATED = 'waste_generated', // kg
  RECYCLING_RATE = 'recycling_rate', // %
  COMPOST_RATE = 'compost_rate', // %
  SINGLE_USE_PLASTIC = 'single_use_plastic', // count
  REUSABLE_CONTAINERS = 'reusable_containers', // count
}

/**
 * Registro de desperdicio
 */
export interface WasteLog {
  id: string;
  organization_id: string;
  location_id?: string;
  
  // Item info
  inventory_item_id?: string;
  product_id?: string;
  item_name: string;
  
  // Waste details
  category: WasteCategory;
  reason: WasteReason;
  quantity: number;
  unit: string;
  
  // Financial impact
  cost_per_unit?: number;
  total_cost?: number;
  
  // Disposal
  disposal_method: DisposalMethod;
  disposal_date?: Date;
  
  // Metadata
  recorded_by: string; // user_id
  notes?: string;
  image_url?: string;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Métrica de sostenibilidad
 */
export interface SustainabilityMetric {
  id: string;
  organization_id: string;
  location_id?: string;
  
  // Metric details
  metric_type: SustainabilityMetricType;
  value: number;
  unit: string;
  
  // Period
  period_start: Date;
  period_end: Date;
  
  // Context
  notes?: string;
  source?: string; // 'manual' | 'calculated' | 'sensor'
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Target/objetivo de sostenibilidad
 */
export interface SustainabilityTarget {
  id: string;
  organization_id: string;
  location_id?: string;
  
  // Target details
  metric_type: SustainabilityMetricType;
  target_value: number;
  current_value?: number;
  unit: string;
  
  // Timeline
  start_date: Date;
  end_date: Date;
  
  // Status
  is_active: boolean;
  achieved: boolean;
  achieved_at?: Date;
  
  // Metadata
  description?: string;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Estadísticas de desperdicio
 */
export interface WasteStats {
  total_logs: number;
  total_cost: number;
  total_weight_kg: number;
  
  by_category: Record<WasteCategory, number>;
  by_reason: Record<WasteReason, number>;
  by_disposal: Record<DisposalMethod, number>;
  
  top_items: Array<{
    item_name: string;
    quantity: number;
    cost: number;
  }>;
  
  trends: {
    daily_average: number;
    weekly_average: number;
    monthly_average: number;
  };
}

/**
 * Reporte de sostenibilidad
 */
export interface SustainabilityReport {
  organization_id: string;
  location_id?: string;
  period_start: Date;
  period_end: Date;
  
  metrics: {
    carbon_footprint_kg_co2e: number;
    water_usage_liters: number;
    energy_consumption_kwh: number;
    waste_generated_kg: number;
    recycling_rate_percentage: number;
    compost_rate_percentage: number;
  };
  
  targets_progress: Array<{
    metric_type: SustainabilityMetricType;
    target_value: number;
    current_value: number;
    progress_percentage: number;
    on_track: boolean;
  }>;
  
  improvements: Array<{
    metric_type: SustainabilityMetricType;
    change_percentage: number;
    trend: 'improving' | 'worsening' | 'stable';
  }>;
}
