/**
 * Location interface — mirrors the Prisma `Location` model.
 *
 * Fields NOT in the schema were removed (code, type, status enum, coordinates,
 * hours, capacity, allow_* flags). When the schema is extended, re-add them
 * here and in the DTOs.
 */
export interface Location {
  id: string;
  organization_id: string;
  name: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;

  // Contact
  phone?: string;
  email?: string;

  // Business
  timezone: string;
  tax_rate: number;
  currency: string;
  active: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface LocationStats {
  total_locations: number;
  active_count: number;
  inactive_count: number;
}
