export enum ProductType {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
  BUNDLE = 'bundle',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum PricingStrategy {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
  COST_PLUS = 'cost_plus',
}

export interface Product {
  id: string;
  organization_id: string;
  category_id: string;
  recipe_id?: string;
  
  // Basic info
  sku: string;
  name: string;
  description?: string;
  image_url?: string;
  barcode?: string;
  
  // Type and status
  type: ProductType;
  status: ProductStatus;
  
  // Pricing
  base_price: number;
  cost?: number;
  pricing_strategy: PricingStrategy;
  target_margin_percentage?: number;
  
  // Tax
  tax_rate: number;
  tax_included: boolean;
  
  // Features
  allow_modifiers: boolean;
  allow_discounts: boolean;
  track_inventory: boolean;
  require_preparation: boolean;
  
  // Inventory
  stock_quantity?: number;
  minimum_stock?: number;
  reorder_point?: number;
  
  // Display
  display_order?: number;
  is_featured: boolean;
  is_available: boolean;
  
  // Metadata
  tags?: string[];
  preparation_time_minutes?: number;
  calories?: number;
  
  created_at: Date;
  updated_at: Date;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  organization_id: string;
  
  name: string;
  sku: string;
  price_adjustment: number; // Can be negative
  cost_adjustment?: number;
  
  attributes: VariantAttribute[];
  
  stock_quantity?: number;
  is_default: boolean;
  is_available: boolean;
  
  created_at: Date;
  updated_at: Date;
}

export interface VariantAttribute {
  name: string; // e.g., "Size", "Temperature"
  value: string; // e.g., "Grande", "Hot"
}

export interface ProductModifier {
  id: string;
  product_id: string;
  organization_id: string;
  
  name: string;
  type: ModifierType;
  price: number;
  
  is_required: boolean;
  is_default: boolean;
  is_available: boolean;
  
  max_selections?: number;
  
  created_at: Date;
  updated_at: Date;
}

export enum ModifierType {
  EXTRA = 'extra',
  SUBSTITUTION = 'substitution',
  REMOVAL = 'removal',
  SPECIAL_REQUEST = 'special_request',
}

export interface LocationPricing {
  id: string;
  product_id: string;
  location_id: string;
  organization_id: string;
  
  price_override?: number;
  is_available: boolean;
  stock_quantity?: number;
  
  created_at: Date;
  updated_at: Date;
}

export interface ProductStats {
  total_products: number;
  by_type: { [key in ProductType]?: number };
  by_status: { [key in ProductStatus]?: number };
  total_value: number;
  average_price: number;
  average_margin: number;
  low_stock_count: number;
}

export interface ProductProfitability {
  product_id: string;
  product_name: string;
  sku: string;
  base_price: number;
  cost: number;
  margin_amount: number;
  margin_percentage: number;
  units_sold?: number;
  revenue?: number;
  profit?: number;
  profitability_score: number;
}
