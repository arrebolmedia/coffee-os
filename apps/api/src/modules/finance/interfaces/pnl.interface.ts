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
  break_even_point: number | null; // Revenue needed to break even (null if unreachable)

  /**
   * La tasa de ISR aplicada, como fracción (0.30 es el 30 %).
   *
   * Va en la respuesta porque la pantalla la escribía a mano en la etiqueta
   * («Impuestos (30% ISR)»): en cuanto la tasa se configura por organización,
   * ese texto miente. El informe tiene que decir con qué tasa está hecho.
   */
  tax_rate: number;

  // Diagnostic flags
  cogs_estimated?: boolean; // true if any product cost is missing
  /** No hay tasa configurada: la cifra de impuestos es un supuesto, no un dato. */
  tax_rate_default_used?: boolean;
  break_even_not_reachable?: boolean; // true when variableCostRatio >= 1
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
