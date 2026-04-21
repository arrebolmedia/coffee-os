/**
 * CoffeeOS POS Web - Customers Service
 * Servicio para gestión de clientes y CRM
 */

import { api } from '@/lib/api';
import { Customer, PaginationParams, PaginatedResponse } from '@/types';

class CustomersService {
  private readonly baseUrl = '/customers';

  // ============================================================================
  // CUSTOMERS CRUD
  // ============================================================================

  async getCustomers(
    organizationId: string,
    filters?: {
      search?: string;
      loyalty_tier?: string;
      rfm_segment?: string;
    },
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.search) params.append('search', filters.search);
    if (filters?.loyalty_tier)
      params.append('loyalty_tier', filters.loyalty_tier);
    if (filters?.rfm_segment) params.append('rfm_segment', filters.rfm_segment);

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order)
      params.append('sort_order', pagination.sort_order);

    return await api.get<PaginatedResponse<Customer>>(
      `${this.baseUrl}?${params.toString()}`,
    );
  }

  async getCustomerById(id: string): Promise<Customer> {
    return await api.get<Customer>(`${this.baseUrl}/${id}`);
  }

  async getCustomerByPhone(
    phone: string,
    organizationId: string,
  ): Promise<Customer> {
    return await api.get<Customer>(
      `${this.baseUrl}/phone/${phone}?organization_id=${organizationId}`,
    );
  }

  async getCustomerByEmail(
    email: string,
    organizationId: string,
  ): Promise<Customer> {
    return await api.get<Customer>(
      `${this.baseUrl}/email/${email}?organization_id=${organizationId}`,
    );
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    return await api.post<Customer>(this.baseUrl, data);
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return await api.put<Customer>(`${this.baseUrl}/${id}`, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // LOYALTY PROGRAM
  // ============================================================================

  async getLoyaltyPoints(
    customerId: string,
  ): Promise<{ points: number; tier: string }> {
    return await api.get<{ points: number; tier: string }>(
      `${this.baseUrl}/${customerId}/loyalty`,
    );
  }

  async addLoyaltyPoints(
    customerId: string,
    points: number,
    reason?: string,
  ): Promise<Customer> {
    return await api.post<Customer>(
      `${this.baseUrl}/${customerId}/loyalty/add`,
      {
        points,
        reason,
      },
    );
  }

  async redeemLoyaltyPoints(
    customerId: string,
    points: number,
    reason?: string,
  ): Promise<Customer> {
    return await api.post<Customer>(
      `${this.baseUrl}/${customerId}/loyalty/redeem`,
      { points, reason },
    );
  }

  async getLoyaltyHistory(customerId: string): Promise<
    Array<{
      id: string;
      type: 'EARN' | 'REDEEM';
      points: number;
      reason: string;
      created_at: Date;
    }>
  > {
    return await api.get<any>(`${this.baseUrl}/${customerId}/loyalty/history`);
  }

  // ============================================================================
  // CUSTOMER INSIGHTS
  // ============================================================================

  async getCustomerStats(customerId: string): Promise<{
    total_orders: number;
    total_spent: number;
    average_order: number;
    last_visit: Date;
    favorite_products: Array<{ product_name: string; times_ordered: number }>;
    rfm_score: { recency: number; frequency: number; monetary: number };
  }> {
    return await api.get<any>(`${this.baseUrl}/${customerId}/stats`);
  }

  async searchCustomers(
    organizationId: string,
    query: string,
  ): Promise<Customer[]> {
    return await api.get<Customer[]>(
      `${this.baseUrl}/search?organization_id=${organizationId}&q=${encodeURIComponent(query)}`,
    );
  }
}

export const customersService = new CustomersService();
export default CustomersService;
