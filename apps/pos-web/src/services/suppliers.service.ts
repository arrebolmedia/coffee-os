/**
 * CoffeeOS - Suppliers Service
 * Servicio para gestión de proveedores
 */

import { api } from '@/lib/api';

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  business_name: string;
  rfc?: string;
  category: string;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  contact_name: string;
  contact_email?: string;
  contact_phone: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  payment_terms?: string;
  products_supplied?: string[];
  total_purchases: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierDTO {
  organization_id: string;
  name: string;
  business_name: string;
  rfc?: string;
  category: string;
  rating?: number;
  status?: 'active' | 'inactive' | 'pending';
  contact_name: string;
  contact_email?: string;
  contact_phone: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  payment_terms?: string;
  products_supplied?: string[];
}

export interface UpdateSupplierDTO {
  name?: string;
  business_name?: string;
  rfc?: string;
  category?: string;
  rating?: number;
  status?: 'active' | 'inactive' | 'pending';
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  payment_terms?: string;
  products_supplied?: string[];
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  pending_suppliers: number;
  total_purchases: number;
  average_rating: number;
  suppliers_by_category: {
    category: string;
    count: number;
  }[];
}

export class SuppliersService {
  /**
   * Get all suppliers for organization
   */
  static async getSuppliers(
    organizationId: string,
    filters?: {
      category?: string;
      status?: string;
      search?: string;
    },
  ): Promise<Supplier[]> {
    let url = `/suppliers/organization/${organizationId}`;
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return await api.get<Supplier[]>(url);
  }

  /**
   * Get supplier by ID
   */
  static async getSupplier(supplierId: string): Promise<Supplier> {
    return await api.get<Supplier>(`/suppliers/${supplierId}`);
  }

  /**
   * Get supplier statistics
   */
  static async getSupplierStats(
    organizationId: string,
  ): Promise<SupplierStats> {
    return await api.get<SupplierStats>(
      `/suppliers/organization/${organizationId}/stats`,
    );
  }

  /**
   * Create new supplier
   */
  static async createSupplier(data: CreateSupplierDTO): Promise<Supplier> {
    return await api.post<Supplier>('/suppliers', data);
  }

  /**
   * Update supplier
   */
  static async updateSupplier(
    supplierId: string,
    data: UpdateSupplierDTO,
  ): Promise<Supplier> {
    return await api.put<Supplier>(`/suppliers/${supplierId}`, data);
  }

  /**
   * Delete supplier
   */
  static async deleteSupplier(supplierId: string): Promise<void> {
    await api.delete(`/suppliers/${supplierId}`);
  }

  /**
   * Get supplier purchase history
   */
  static async getSupplierPurchases(supplierId: string): Promise<any[]> {
    return await api.get<any[]>(`/suppliers/${supplierId}/purchases`);
  }

  /**
   * Update supplier rating
   */
  static async updateSupplierRating(
    supplierId: string,
    rating: number,
  ): Promise<Supplier> {
    return await api.patch<Supplier>(`/suppliers/${supplierId}/rating`, {
      rating,
    });
  }

  /**
   * Get suppliers by category
   */
  static async getSuppliersByCategory(
    organizationId: string,
    category: string,
  ): Promise<Supplier[]> {
    return await api.get<Supplier[]>(
      `/suppliers/organization/${organizationId}/category/${category}`,
    );
  }

  /**
   * Search suppliers
   */
  static async searchSuppliers(
    organizationId: string,
    query: string,
  ): Promise<Supplier[]> {
    return await api.get<Supplier[]>(
      `/suppliers/organization/${organizationId}/search?q=${encodeURIComponent(query)}`,
    );
  }
}
