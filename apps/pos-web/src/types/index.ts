/**
 * CoffeeOS POS Web - Type Definitions
 * Tipos TypeScript para el sistema POS
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationContext {
  organization_id: UUID;
  location_id: UUID;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export enum ProductType {
  SIMPLE = 'SIMPLE',
  BUNDLE = 'BUNDLE',
  VARIABLE = 'VARIABLE',
}

export interface Product extends BaseEntity, OrganizationContext {
  sku: string;
  name: string;
  description?: string;
  type: ProductType;
  categoryId: UUID;
  category?: Category;
  price: number;
  cost?: number;
  status: ProductStatus;
  image?: string;
  barcode?: string;
  trackInventory?: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  modifiers?: Modifier[];
  tags?: string[];
}

export interface Category extends BaseEntity, OrganizationContext {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  parent_id?: UUID;
  active: boolean;
  products?: Array<{ id: string; name: string }>; // Incluido en respuestas del backend
}

export enum ModifierType {
  SIZE = 'SIZE',
  MILK = 'MILK',
  EXTRA = 'EXTRA',
  SYRUP = 'SYRUP',
  DECAF = 'DECAF',
}

export interface Modifier {
  id: string;
  name: string;
  type: ModifierType;
  priceDelta: number;
  active: boolean;
  productId: string;
}

// ============================================================================
// CART & ORDER TYPES
// ============================================================================

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  MIXED = 'MIXED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELED = 'CANCELED',
}

export interface CartItem {
  id: UUID;
  product: Product;
  quantity: number;
  unit_price: number;
  selected_modifiers: SelectedModifier[];
  subtotal: number;
  notes?: string;
}

export interface SelectedModifier {
  modifier_id: UUID;
  modifier_name: string;
  option_id: UUID;
  option_name: string;
  price_adjustment: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customer_id?: UUID;
  notes?: string;
}

export interface Order extends BaseEntity, OrganizationContext {
  order_number: string;
  status: OrderStatus;
  customer_id?: UUID;
  customer?: Customer;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  payments: Payment[];
  cashier_id: UUID;
  cashier_name: string;
  notes?: string;
  ticket_url?: string;
}

export interface OrderItem {
  id: UUID;
  product_id: UUID;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  modifiers: SelectedModifier[];
  subtotal: number;
  notes?: string;
}

export interface Payment {
  id: UUID;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  created_at: Date;
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export interface Customer extends BaseEntity, OrganizationContext {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: string;
  preferredLanguage?: string;
  notes?: string;
  // LFPDPPP Consent
  consentMarketing: boolean;
  consentWhatsapp: boolean;
  consentEmail: boolean;
  consentSms: boolean;
  consentDate?: Date;
  // Preferences
  favoriteDrink?: string;
  dietaryRestrictions?: string;
  allergies?: string;
  // Status
  status: CustomerStatus;
  blockedReason?: string;
  // Loyalty
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: Date;
  // RFM Segmentation
  rfmSegment?: string;
  recencyScore?: number;
  frequencyScore?: number;
  monetaryScore?: number;
  active: boolean;
}

// ============================================================================
// USER TYPES
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  BARISTA = 'BARISTA',
  VIEWER = 'VIEWER',
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  organizationId: UUID;
  locationId?: UUID;
  active: boolean;
  avatar?: string;
  phone?: string;
  isSuperAdmin?: boolean;
  emailVerified?: Date;
  twoFactorEnabled?: boolean;
  lastLoginAt?: Date;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// ============================================================================
// SHIFT & CASH DRAWER TYPES
// ============================================================================

export interface Shift extends BaseEntity, OrganizationContext {
  shiftNumber: string;
  user_id: UUID;
  status: 'OPEN' | 'CLOSED';
  // Cash float
  openingFloat: number;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  countedCash?: number;
  variance?: number;
  // Totals
  totalExpected?: number;
  totalClosing?: number;
  // Notes
  openingNotes?: string;
  closingNotes?: string;
  // Timestamps
  openedAt: Date;
  closedAt?: Date;
}

export interface CashMovement {
  id: UUID;
  shift_id: UUID;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  created_by: UUID;
  created_at: Date;
}

// ============================================================================
// SYNC & OFFLINE TYPES
// ============================================================================

export interface SyncQueueItem {
  id: UUID;
  type: 'ORDER' | 'PRODUCT' | 'CUSTOMER' | 'SHIFT';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  created_at: Date;
  attempts: number;
  last_error?: string;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'ERROR';
}

export interface OfflineData {
  products: Product[];
  categories: Category[];
  modifiers: Modifier[];
  last_sync: Date;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface Toast {
  id: UUID;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface Modal {
  id: string;
  isOpen: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ProductFilters {
  search?: string;
  category_id?: UUID;
  status?: ProductStatus;
  type?: ProductType;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

export interface OrderFilters {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  customer_id?: UUID;
  date_from?: Date;
  date_to?: Date;
  cashier_id?: UUID;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// RECIPE TYPES
// ============================================================================

export enum RecipeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export enum BrewMethod {
  ESPRESSO = 'ESPRESSO',
  FILTER = 'FILTER',
  FRENCH_PRESS = 'FRENCH_PRESS',
  AEROPRESS = 'AEROPRESS',
  V60 = 'V60',
  CHEMEX = 'CHEMEX',
  COLD_BREW = 'COLD_BREW',
  MOKAPOT = 'MOKAPOT',
}

export enum GrindSize {
  EXTRA_FINE = 'EXTRA_FINE',
  FINE = 'FINE',
  MEDIUM_FINE = 'MEDIUM_FINE',
  MEDIUM = 'MEDIUM',
  MEDIUM_COARSE = 'MEDIUM_COARSE',
  COARSE = 'COARSE',
  EXTRA_COARSE = 'EXTRA_COARSE',
}

export enum MeasurementUnit {
  GRAMS = 'g',
  MILLILITERS = 'ml',
  OUNCES = 'oz',
  CUPS = 'cup',
  TABLESPOONS = 'tbsp',
  TEASPOONS = 'tsp',
  PIECES = 'pcs',
  PUMPS = 'pumps',
  SHOTS = 'shots',
}

export interface Recipe extends BaseEntity, OrganizationContext {
  name: string;
  description?: string;
  product_id?: UUID;
  product?: Product;
  category: string;
  brew_method?: BrewMethod;
  status: RecipeStatus;
  preparation_time: number; // minutes
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  servings: number;
  image_url?: string;
  video_url?: string;
  instructions?: string;
  total_cost?: number;
  ingredients?: RecipeIngredient[];
  parameters?: RecipeParameter[];
  allergens?: string[];
  tags?: string[];
}

export interface RecipeIngredient extends BaseEntity {
  recipe_id: UUID;
  inventory_item_id?: UUID;
  inventory_item_name?: string;
  name: string;
  quantity: number;
  unit: MeasurementUnit;
  unit_cost?: number;
  subtotal_cost?: number;
  is_optional: boolean;
  notes?: string;
  order: number;
}

export interface RecipeParameter extends BaseEntity {
  recipe_id: UUID;
  parameter_name: string;
  parameter_value: string;
  unit?: string;
  notes?: string;
}

export interface RecipeFilters {
  search?: string;
  category?: string;
  brew_method?: BrewMethod;
  status?: RecipeStatus;
  difficulty?: string;
  product_id?: UUID;
}

// Common recipe parameters
export interface BrewParameters {
  coffee_weight?: number; // grams
  water_weight?: number; // grams or ml
  water_temp?: number; // celsius
  brew_time?: number; // seconds
  grind_size?: GrindSize;
  ratio?: string; // e.g., "1:15"
  pressure?: number; // bars (for espresso)
  bloom_time?: number; // seconds
  bloom_water?: number; // ml
}

// ============================================================================
// EXPENSE TYPES
// ============================================================================

export enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  LABOR = 'LABOR',
  SUPPLIES = 'SUPPLIES',
  MARKETING = 'MARKETING',
  EQUIPMENT = 'EQUIPMENT',
  INSURANCE = 'INSURANCE',
  TAXES = 'TAXES',
  PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES',
  PERMITS_LICENSES = 'PERMITS_LICENSES',
  WASTE_MANAGEMENT = 'WASTE_MANAGEMENT',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum ExpensePaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
}

export interface Expense extends BaseEntity, OrganizationContext {
  category: ExpenseCategory;
  description: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  due_date?: Date;
  status: ExpenseStatus;
  vendor_name?: string;
  vendor_rfc?: string;
  invoice_number?: string;
  payment_method?: ExpensePaymentMethod;
  paid_date?: Date;
  payment_reference?: string;
  attachment_url?: string;
  notes?: string;
  created_by_user_id?: string;
}

// ============================================================================
// P&L TYPES
// ============================================================================

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
  ebitda: number;
  depreciation: number;
  amortization: number;
  ebit: number;
  interest_expense: number;
  ebt: number;
  taxes: number;
  net_profit: number;
  net_margin_percent: number;

  // Key Metrics
  labor_percent: number;
  prime_cost: number;
  prime_cost_percent: number;
  break_even_point: number;
}

export interface PnLComparison {
  period1: ProfitAndLoss;
  period2: ProfitAndLoss;
  changes: {
    revenue_change: number;
    revenue_change_percent: number;
    profit_change: number;
    profit_change_percent: number;
    margin_change: number;
  };
}

// ============================================================================
// HR ONBOARDING TYPES
// ============================================================================

export enum OnboardingPeriod {
  DAY_30 = 'DAY_30',
  DAY_60 = 'DAY_60',
  DAY_90 = 'DAY_90',
}

export enum TaskCategory {
  TRAINING = 'TRAINING',
  DOCUMENTATION = 'DOCUMENTATION',
  EQUIPMENT = 'EQUIPMENT',
  SYSTEMS = 'SYSTEMS',
  POLICIES = 'POLICIES',
  SAFETY = 'SAFETY',
  CULTURE = 'CULTURE',
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  period: OnboardingPeriod;
  assigned_to?: string;
  required: boolean;
  completed: boolean;
  completed_by?: string;
  completed_at?: Date;
  notes?: string;
}

export interface OnboardingPlan {
  id: string;
  employee_id: string;
  organization_id: string;
  tasks: OnboardingTask[];
  completion_percentage: number;
  day_30_completed: boolean;
  day_60_completed: boolean;
  day_90_completed: boolean;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  notes?: string;
}

export interface OnboardingStats {
  total: number;
  completed: number;
  in_progress: number;
  day_30_completed: number;
  day_60_completed: number;
  day_90_completed: number;
  avg_completion_percentage: number;
}

// ============================================================================
// EVALUATIONS TYPES
// ============================================================================

export enum EvaluationPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
}

export enum PerformanceRating {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  SATISFACTORY = 'SATISFACTORY',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  UNSATISFACTORY = 'UNSATISFACTORY',
}

export interface Evaluation {
  id: string;
  employee_id: string;
  organization_id: string;
  evaluator_user_id: string;
  period: EvaluationPeriod;
  evaluation_date: string;
  overall_rating: PerformanceRating;
  punctuality_score: number;
  quality_of_work_score: number;
  customer_service_score: number;
  teamwork_score: number;
  initiative_score: number;
  average_score: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  employee_comments?: string;
  evaluator_comments?: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationStats {
  total: number;
  by_rating: Record<PerformanceRating, number>;
  avg_overall_score: number;
  avg_punctuality: number;
  avg_quality_of_work: number;
  avg_customer_service: number;
  avg_teamwork: number;
  avg_initiative: number;
}

// ============================================================================
// PERMITS TYPES (COMPLIANCE)
// ============================================================================

export enum PermitType {
  USO_SUELO = 'USO_SUELO',
  FUNCIONAMIENTO = 'FUNCIONAMIENTO',
  PROTECCION_CIVIL = 'PROTECCION_CIVIL',
  ANUNCIO = 'ANUNCIO',
  SALUBRIDAD = 'SALUBRIDAD',
  BOMBEROS = 'BOMBEROS',
  ECOLOGIA = 'ECOLOGIA',
  ALCOHOL = 'ALCOHOL',
  IMSS = 'IMSS',
  SAT = 'SAT',
  INFONAVIT = 'INFONAVIT',
  STPS = 'STPS',
  OTHER = 'OTHER',
}

export enum PermitStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  RENEWAL_DUE = 'RENEWAL_DUE',
  CANCELLED = 'CANCELLED',
}

export interface Permit {
  id: string;
  organization_id: string;
  location_id: string;
  type: PermitType;
  permit_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  status: PermitStatus;
  cost?: number;
  renewal_frequency?: string;
  next_renewal_date?: string;
  last_renewal_date?: string;
  renewal_cost?: number;
  responsible_person?: string;
  notes?: string;
  document_url?: string;
  days_until_expiry?: number;
  is_expiring_soon?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermitStats {
  total_permits: number;
  active: number;
  renewal_due: number;
  expired: number;
  by_type: Record<string, number>;
  expiring_soon: number;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export enum AuditType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  SANITARY = 'SANITARY',
  FIRE_SAFETY = 'FIRE_SAFETY',
  TAX = 'TAX',
  LABOR = 'LABOR',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  FOOD_SAFETY = 'FOOD_SAFETY',
  OTHER = 'OTHER',
}

export enum AuditResult {
  APPROVED = 'APPROVED',
  APPROVED_WITH_OBSERVATIONS = 'APPROVED_WITH_OBSERVATIONS',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export interface Audit {
  id: string;
  organization_id: string;
  location_id: string;
  type: AuditType;
  audit_date: string;
  auditor_name: string;
  auditor_organization?: string;
  result: AuditResult;
  score?: number;
  findings: string;
  corrective_actions: string;
  completion_deadline?: string;
  completion_date?: string;
  is_completed: boolean;
  documents_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditStats {
  total_audits: number;
  approved: number;
  with_observations: number;
  rejected: number;
  pending: number;
  by_type: Record<string, number>;
  open_actions: number;
  average_score?: number;
}

// ============================================================================
// ANALYTICS & KPI TYPES
// ============================================================================

export interface DashboardKPIs {
  period_start: string;
  period_end: string;
  organization_id: string;
  location_id?: string;

  // Profitability
  gross_margin_percent: number;
  net_margin_percent: number;
  ebitda_margin_percent: number;

  // Efficiency
  prime_cost_percent: number;
  labor_percent: number;
  cogs_percent: number;

  // Operations
  avg_order_value: number;
  orders_per_day: number;
  revenue_per_hour: number;

  // Customer
  customer_retention_rate: number;
  avg_customer_visits: number;
  nps_score: number;

  // Inventory
  inventory_turnover: number;
  days_of_inventory: number;
  waste_percent: number;

  // Status indicators
  status: {
    gross_margin: 'GOOD' | 'WARNING' | 'CRITICAL';
    labor_percent: 'GOOD' | 'WARNING' | 'CRITICAL';
    prime_cost: 'GOOD' | 'WARNING' | 'CRITICAL';
    waste: 'GOOD' | 'WARNING' | 'CRITICAL';
    inventory_turnover: 'GOOD' | 'WARNING' | 'CRITICAL';
  };
}

export type AlertType = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertCategory =
  | 'INVENTORY'
  | 'SALES'
  | 'LABOR'
  | 'QUALITY'
  | 'COMPLIANCE';

export interface DashboardAlert {
  type: AlertType;
  category: AlertCategory;
  message: string;
  value?: number;
  threshold?: number;
  action_required?: string;
}

export interface DashboardSummary {
  organization_id: string;
  location_id?: string;
  generated_at: string;
  period_start: string;
  period_end: string;

  // Quick metrics
  today_sales: number;
  today_orders: number;
  today_customers: number;
  today_avg_order_value: number;

  // Alerts
  alerts: DashboardAlert[];

  // Top performers
  top_products: any[];
  top_employees: any[];

  // Trends
  sales_trend: TrendData[];
  customer_trend: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// ============================================================================
// WASTE & SUSTAINABILITY TYPES
// ============================================================================

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
  CARBON_FOOTPRINT = 'carbon_footprint',
  WATER_USAGE = 'water_usage',
  ENERGY_CONSUMPTION = 'energy_consumption',
  WASTE_GENERATED = 'waste_generated',
  RECYCLING_RATE = 'recycling_rate',
  COMPOST_RATE = 'compost_rate',
  SINGLE_USE_PLASTIC = 'single_use_plastic',
  REUSABLE_CONTAINERS = 'reusable_containers',
}

export interface WasteLog {
  id: string;
  organization_id: string;
  location_id?: string;
  inventory_item_id?: string;
  product_id?: string;
  item_name: string;
  category: WasteCategory;
  reason: WasteReason;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  total_cost?: number;
  disposal_method: DisposalMethod;
  disposal_date?: string;
  recorded_by: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WasteStats {
  total_logs: number;
  total_cost: number;
  total_weight_kg: number;
  by_category: Record<string, number>;
  by_reason: Record<string, number>;
  by_disposal: Record<string, number>;
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

export interface SustainabilityMetric {
  id: string;
  organization_id: string;
  location_id?: string;
  metric_type: SustainabilityMetricType;
  value: number;
  unit: string;
  period_start: string;
  period_end: string;
  notes?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface SustainabilityTarget {
  id: string;
  organization_id: string;
  location_id?: string;
  metric_type: SustainabilityMetricType;
  target_value: number;
  current_value?: number;
  unit: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  achieved: boolean;
  achieved_at?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
