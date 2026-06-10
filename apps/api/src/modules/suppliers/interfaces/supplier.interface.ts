/**
 * Supplier interface — mirrors the Prisma `Supplier` model.
 *
 * Fields not in the schema (code, status enum, rating, is_preferred, tax_id,
 * credit_limit, discount_percentage, website, geographic fields) were removed.
 */
export interface Supplier {
  id: string;
  organization_id: string;
  name: string;

  // Contact
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;

  // Terms
  payment_terms?: string;
  lead_time_days?: number;

  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SupplierStats {
  total_suppliers: number;
  active_count: number;
  inactive_count: number;
}
