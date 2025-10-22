/**
 * CoffeeOS Admin - Type Definitions
 * Tipos compartidos con el backend
 */

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationContext {
  organization_id: UUID;
  location_id: UUID;
}

// ============================================================================
// USER & AUTH
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  LOCATION_MANAGER = 'LOCATION_MANAGER',
  CASHIER = 'CASHIER',
  BARISTA = 'BARISTA',
  WAITER = 'WAITER',
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  organization_id?: UUID;
  location_id?: UUID;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  last_login?: Date;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ============================================================================
// ORGANIZATION & LOCATION
// ============================================================================

export interface Organization extends BaseEntity {
  name: string;
  legal_name: string;
  tax_id: string;
  logo_url?: string;
  email: string;
  phone: string;
  address: Address;
  settings: OrganizationSettings;
  subscription_tier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  is_active: boolean;
}

export interface Location extends BaseEntity, OrganizationContext {
  name: string;
  code: string;
  address: Address;
  phone: string;
  email?: string;
  manager_id?: UUID;
  is_active: boolean;
  opening_hours: OpeningHours;
}

export interface Address {
  street: string;
  number: string;
  colony: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  reference?: string;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  is_open: boolean;
  open_time?: string;
  close_time?: string;
}

export interface OrganizationSettings {
  currency: string;
  timezone: string;
  language: string;
  tax_rate: number;
  enable_loyalty: boolean;
  enable_inventory: boolean;
  enable_reservations: boolean;
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface DashboardStats {
  today: DailyStats;
  week: WeeklyStats;
  month: MonthlyStats;
  top_products: TopProduct[];
  recent_orders: OrderSummary[];
  sales_chart: SalesChartData[];
}

export interface DailyStats {
  sales: number;
  orders: number;
  customers: number;
  average_ticket: number;
  growth: number; // percentage vs yesterday
}

export interface WeeklyStats {
  sales: number;
  orders: number;
  customers: number;
  average_ticket: number;
  growth: number; // percentage vs last week
}

export interface MonthlyStats {
  sales: number;
  orders: number;
  customers: number;
  average_ticket: number;
  growth: number; // percentage vs last month
}

export interface TopProduct {
  product_id: UUID;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
  image_url?: string;
}

export interface OrderSummary {
  id: UUID;
  order_number: string;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  customer_name?: string;
  created_at: Date;
}

export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
}

// ============================================================================
// PRODUCTS
// ============================================================================

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum ProductType {
  SIMPLE = 'SIMPLE',
  COMBO = 'COMBO',
  VARIABLE = 'VARIABLE',
}

export interface Product extends BaseEntity, OrganizationContext {
  sku: string;
  name: string;
  description?: string;
  type: ProductType;
  category_id: UUID;
  category?: Category;
  price: number;
  cost?: number;
  status: ProductStatus;
  image_url?: string;
  barcode?: string;
  track_inventory: boolean;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  modifiers?: Modifier[];
  tags?: string[];
}

export interface Category extends BaseEntity, OrganizationContext {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  parent_id?: UUID;
  is_active: boolean;
}

export interface Modifier extends BaseEntity, OrganizationContext {
  name: string;
  type: 'SINGLE' | 'MULTIPLE';
  required: boolean;
  min_selections: number;
  max_selections: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: UUID;
  name: string;
  price_adjustment: number;
  is_default: boolean;
}

// ============================================================================
// ORDERS
// ============================================================================

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MIXED = 'MIXED',
}

export interface Order extends BaseEntity, OrganizationContext {
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_details?: PaymentDetails;
  customer_id?: UUID;
  customer?: Customer;
  cashier_id: UUID;
  cashier?: User;
  notes?: string;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

export interface OrderItem {
  id: UUID;
  product_id: UUID;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  selected_modifiers: SelectedModifier[];
  notes?: string;
}

export interface SelectedModifier {
  modifier_id: UUID;
  modifier_name: string;
  option_id: UUID;
  option_name: string;
  price_adjustment: number;
}

export interface PaymentDetails {
  cash_received?: number;
  change_given?: number;
  card_last_four?: string;
  card_type?: string;
  authorization_code?: string;
  reference_number?: string;
  payments?: SplitPayment[];
}

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface Customer extends BaseEntity, OrganizationContext {
  name: string;
  email?: string;
  phone?: string;
  birthday?: Date;
  loyalty_points: number;
  total_spent: number;
  total_orders: number;
  last_order_date?: Date;
  tags?: string[];
  notes?: string;
  preferences?: CustomerPreferences;
}

export interface CustomerPreferences {
  favorite_products?: UUID[];
  allergies?: string[];
  dietary_restrictions?: string[];
  preferred_payment_method?: PaymentMethod;
}

// ============================================================================
// INVENTORY
// ============================================================================

export interface InventoryItem extends BaseEntity, OrganizationContext {
  product_id: UUID;
  product?: Product;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit_of_measure: string;
  last_restock_date?: Date;
  last_count_date?: Date;
}

export interface StockMovement extends BaseEntity, OrganizationContext {
  product_id: UUID;
  product?: Product;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference?: string;
  user_id: UUID;
  user?: User;
}

// ============================================================================
// REPORTS
// ============================================================================

export interface SalesReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_sales: number;
    total_orders: number;
    total_customers: number;
    average_ticket: number;
  };
  by_day: DailySales[];
  by_product: ProductSales[];
  by_category: CategorySales[];
  by_payment_method: PaymentMethodSales[];
}

export interface DailySales {
  date: Date;
  sales: number;
  orders: number;
  customers: number;
}

export interface ProductSales {
  product_id: UUID;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CategorySales {
  category_id: UUID;
  category_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface PaymentMethodSales {
  method: PaymentMethod;
  count: number;
  total: number;
}

// ============================================================================
// PAGINATION & FILTERS
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface ListParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// ============================================================================
// API RESPONSE
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
