export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum PaymentTerms {
  IMMEDIATE = 'immediate',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
}

export interface Supplier {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  legal_name?: string;
  status: SupplierStatus;
  
  // Contact
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  
  // Business
  tax_id?: string;
  payment_terms?: PaymentTerms;
  credit_limit?: number;
  discount_percentage?: number;
  
  // Performance
  rating?: number;
  on_time_delivery_rate?: number;
  
  // Flags
  is_preferred?: boolean;
  
  tags?: string[];
  notes?: string;
  
  created_at: Date;
  updated_at: Date;
}

export interface SupplierStats {
  total_suppliers: number;
  by_status: Record<SupplierStatus, number>;
  preferred_count: number;
  average_rating: number;
}
