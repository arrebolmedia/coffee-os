/**
 * CoffeeOS - Suppliers Service
 * Servicio para gestión de proveedores
 *
 * Contrato alineado al backend Prisma-backed
 * (apps/api/src/modules/suppliers/suppliers.service.ts). El backend solo
 * expone: id, organization_id, name, contact_person, email, phone, address,
 * payment_terms, lead_time_days, active, created_at, updated_at.
 */

import { api } from '@/lib/api';

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierDTO {
  organization_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  active?: boolean;
}

export interface UpdateSupplierDTO {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  active?: boolean;
}

export interface SupplierStats {
  total_suppliers: number;
  active_count: number;
  inactive_count: number;
}

export class SuppliersService {
  /**
   * Get all suppliers for organization
   */
  static async getSuppliers(
    organizationId: string,
    filters?: {
      active?: boolean;
      search?: string;
    },
  ): Promise<Supplier[]> {
    const response = await api.get<any>(
      `/suppliers/organization/${organizationId}`,
    );
    const data = (response?.data ?? response) as Supplier[];
    if (filters?.active !== undefined) {
      // client-side filtering when filters provided (tests expect single-arg call)
      return data.filter((s) => s.active === filters.active);
    }
    return data;
  }

  /**
   * Get supplier by ID
   */
  static async getSupplier(supplierId: string): Promise<Supplier> {
    const response = await api.get<any>(`/suppliers/${supplierId}`);
    return response?.data ?? response;
  }

  /**
   * Get supplier statistics
   */
  static async getSupplierStats(
    organizationId: string,
  ): Promise<SupplierStats> {
    const response = await api.get<any>(
      `/suppliers/organization/${organizationId}/stats`,
    );
    return response?.data ?? response;
  }

  /**
   * Create new supplier
   */
  static async createSupplier(data: CreateSupplierDTO): Promise<Supplier> {
    const response = await api.post<any>('/suppliers', data);
    return response?.data ?? response;
  }

  /**
   * Update supplier
   */
  static async updateSupplier(
    supplierId: string,
    data: UpdateSupplierDTO,
  ): Promise<Supplier> {
    const response = await api.put<any>(`/suppliers/${supplierId}`, data);
    return response?.data ?? response;
  }

  /**
   * Delete supplier (soft delete: backend marks active=false)
   */
  static async deleteSupplier(supplierId: string): Promise<void> {
    await api.delete(`/suppliers/${supplierId}`);
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

  // NOTE (migración Prisma): los endpoints `/suppliers/:id/purchases` y
  // PATCH `/suppliers/:id/rating` fueron eliminados del backend junto con los
  // campos rating/category/total_purchases. Los métodos getSupplierPurchases,
  // updateSupplierRating y getSuppliersByCategory se removieron de este
  // servicio. TODO: reintroducirlos si el schema vuelve a soportarlos.
}
