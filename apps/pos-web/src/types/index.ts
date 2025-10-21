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
  created_at: Date;
  updated_at: Date;
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
// CART & ORDER TYPES
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

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED',
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

export interface Customer extends BaseEntity, OrganizationContext {
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
  birthday?: Date;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  rfm_segment?: string;
  tags?: string[];
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
  name: string;
  role: UserRole;
  organization_id: UUID;
  location_id?: UUID;
  is_active: boolean;
  avatar_url?: string;
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
  shift_number: string;
  user_id: UUID;
  user_name: string;
  started_at: Date;
  ended_at?: Date;
  initial_cash: number;
  final_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  total_sales: number;
  total_orders: number;
  status: 'OPEN' | 'CLOSED';
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
