// Profit & Loss Statement
export interface ProfitAndLoss {
  organization_id: string;
  location_id?: string;
  period_start: Date;
  period_end: Date;
  
  // Revenue
  gross_revenue: number;
  discounts: number;
  returns: number;
  net_revenue: number;
  
  // Cost of Goods Sold
  cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  
  // Operating Expenses
  labor_cost: number;
  rent: number;
  utilities: number;
  marketing: number;
  supplies: number;
  equipment_maintenance: number;
  insurance: number;
  permits_licenses: number;
  professional_services: number;
  waste_management: number;
  security: number;
  other_expenses: number;
  total_operating_expenses: number;
  
  // Profitability
  ebitda: number; // Earnings Before Interest, Taxes, Depreciation, Amortization
  depreciation: number;
  amortization: number;
  ebit: number; // Earnings Before Interest and Taxes
  interest_expense: number;
  ebt: number; // Earnings Before Taxes
  taxes: number;
  net_profit: number;
  net_margin_percent: number;
  
  // Key Metrics
  labor_percent: number; // labor_cost / net_revenue
  prime_cost: number; // cogs + labor_cost
  prime_cost_percent: number;
  break_even_point: number; // Revenue needed to break even
}

// Balance metrics
export interface FinancialMetrics {
  // Liquidity
  current_ratio: number;
  quick_ratio: number;
  cash_on_hand: number;
  
  // Profitability
  roi: number; // Return on Investment
  roe: number; // Return on Equity
  roa: number; // Return on Assets
  
  // Efficiency
  inventory_turnover: number;
  avg_collection_period: number; // days
  payables_period: number; // days
  
  // Leverage
  debt_to_equity: number;
  debt_to_assets: number;
}
