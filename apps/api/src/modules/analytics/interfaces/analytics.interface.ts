// Sales Analytics
export interface SalesMetrics {
  period_start: Date;
  period_end: Date;
  organization_id: string;
  location_id?: string;
  
  // Revenue
  gross_sales: number;
  net_sales: number;
  discounts: number;
  refunds: number;
  taxes: number;
  
  // Orders
  total_orders: number;
  avg_order_value: number;
  avg_items_per_order: number;
  
  // Customers
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  
  // Time-based
  peak_hour: string;
  peak_day: string;
  hourly_breakdown?: HourlyMetric[];
  daily_breakdown?: DailyMetric[];
  
  // Comparison
  vs_previous_period?: {
    gross_sales_change: number;
    gross_sales_change_percent: number;
    orders_change: number;
    orders_change_percent: number;
    avg_order_value_change: number;
    avg_order_value_change_percent: number;
  };
}

export interface HourlyMetric {
  hour: number; // 0-23
  sales: number;
  orders: number;
  avg_order_value: number;
}

export interface DailyMetric {
  date: Date;
  sales: number;
  orders: number;
  customers: number;
  avg_order_value: number;
}

// Product Analytics
export interface ProductPerformance {
  product_id: string;
  product_name: string;
  category?: string;
  
  // Sales
  total_sold: number;
  revenue: number;
  profit: number;
  profit_margin_percent: number;
  
  // Ranking
  rank_by_quantity: number;
  rank_by_revenue: number;
  rank_by_profit: number;
  
  // Trends
  trend: 'UP' | 'DOWN' | 'STABLE';
  vs_previous_period_percent: number;
}

export interface CategoryPerformance {
  category: string;
  total_products: number;
  total_sold: number;
  revenue: number;
  avg_price: number;
  top_products: ProductPerformance[];
}

// Inventory Analytics
export interface InventoryMetrics {
  period_start: Date;
  period_end: Date;
  organization_id: string;
  location_id?: string;
  
  // Stock
  total_items: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  
  // Turnover
  inventory_turnover: number; // COGS / Average Inventory
  days_of_inventory: number; // 365 / Inventory Turnover
  
  // Waste
  total_waste_value: number;
  waste_percent: number;
  top_waste_items: WasteItem[];
  
  // Movement
  total_received: number;
  total_consumed: number;
  total_adjusted: number;
}

export interface WasteItem {
  item_name: string;
  quantity_wasted: number;
  value_wasted: number;
  waste_reason?: string;
}

// Labor Analytics
export interface LaborMetrics {
  period_start: Date;
  period_end: Date;
  organization_id: string;
  location_id?: string;
  
  // Hours
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  
  // Cost
  total_labor_cost: number;
  avg_hourly_rate: number;
  
  // Productivity
  sales_per_labor_hour: number; // Revenue / Total Hours
  labor_percent: number; // Labor Cost / Revenue
  
  // Headcount
  total_employees: number;
  active_employees: number;
  avg_hours_per_employee: number;
  
  // By position
  by_position: PositionMetrics[];
}

export interface PositionMetrics {
  position: string;
  employee_count: number;
  total_hours: number;
  total_cost: number;
  avg_hourly_rate: number;
}

// Financial KPIs
export interface FinancialKPIs {
  period_start: Date;
  period_end: Date;
  organization_id: string;
  location_id?: string;
  
  // Profitability
  gross_profit: number;
  gross_margin_percent: number;
  net_profit: number;
  net_margin_percent: number;
  ebitda: number;
  ebitda_margin_percent: number;
  
  // Efficiency
  prime_cost: number;
  prime_cost_percent: number;
  labor_percent: number;
  cogs_percent: number;
  
  // Break-even
  break_even_sales: number;
  break_even_orders: number;
  margin_of_safety_percent: number;
  
  // Cash flow
  cash_collected: number;
  cash_paid: number;
  net_cash_flow: number;
  
  // Benchmarks
  vs_target?: {
    gross_margin_target: number;
    gross_margin_actual: number;
    labor_percent_target: number;
    labor_percent_actual: number;
    prime_cost_target: number;
    prime_cost_actual: number;
  };
}

// Dashboard Summary
export interface DashboardSummary {
  organization_id: string;
  location_id?: string;
  generated_at: Date;
  period_start: Date;
  period_end: Date;
  
  // Quick metrics
  today_sales: number;
  today_orders: number;
  today_customers: number;
  today_avg_order_value: number;
  
  // Alerts
  alerts: DashboardAlert[];
  
  // Top performers
  top_products: ProductPerformance[];
  top_employees: EmployeePerformance[];
  
  // Trends
  sales_trend: TrendData[];
  customer_trend: TrendData[];
}

export interface DashboardAlert {
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'INVENTORY' | 'SALES' | 'LABOR' | 'QUALITY' | 'COMPLIANCE';
  message: string;
  value?: number;
  threshold?: number;
  action_required?: string;
}

export interface EmployeePerformance {
  employee_id: string;
  employee_name: string;
  position: string;
  sales_generated: number;
  orders_served: number;
  avg_order_value: number;
  customer_rating?: number;
}

export interface TrendData {
  date: Date;
  value: number;
  label?: string;
}
