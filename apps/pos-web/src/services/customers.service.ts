/**
 * CoffeeOS POS Web - Customers Service
 * Servicio para gestión de clientes y CRM
 */

import { apiClient } from '@/lib/api-client';
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
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.search) params.append('search', filters.search);
    if (filters?.loyalty_tier) params.append('loyalty_tier', filters.loyalty_tier);
    if (filters?.rfm_segment) params.append('rfm_segment', filters.rfm_segment);

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order) params.append('sort_order', pagination.sort_order);

    const response = await apiClient.get<PaginatedResponse<Customer>>(
      `${this.baseUrl}?${params.toString()}`
    );
    return response.data;
  }

  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getCustomerByPhone(phone: string, organizationId: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(
      `${this.baseUrl}/phone/${phone}?organization_id=${organizationId}`
    );
    return response.data;
  }

  async getCustomerByEmail(email: string, organizationId: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(
      `${this.baseUrl}/email/${email}?organization_id=${organizationId}`
    );
    return response.data;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.post<Customer>(this.baseUrl, data);
    return response.data;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.put<Customer>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // LOYALTY PROGRAM
  // ============================================================================

  async getLoyaltyPoints(customerId: string): Promise<{ points: number; tier: string }> {
    const response = await apiClient.get<{ points: number; tier: string }>(
      `${this.baseUrl}/${customerId}/loyalty`
    );
    return response.data;
  }

  async addLoyaltyPoints(customerId: string, points: number, reason?: string): Promise<Customer> {
    const response = await apiClient.post<Customer>(`${this.baseUrl}/${customerId}/loyalty/add`, {
      points,
      reason,
    });
    return response.data;
  }

  async redeemLoyaltyPoints(
    customerId: string,
    points: number,
    reason?: string
  ): Promise<Customer> {
    const response = await apiClient.post<Customer>(
      `${this.baseUrl}/${customerId}/loyalty/redeem`,
      { points, reason }
    );
    return response.data;
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
    const response = await apiClient.get<any>(`${this.baseUrl}/${customerId}/loyalty/history`);
    return response.data;
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
    const response = await apiClient.get<any>(`${this.baseUrl}/${customerId}/stats`);
    return response.data;
  }

  async searchCustomers(organizationId: string, query: string): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>(
      `${this.baseUrl}/search?organization_id=${organizationId}&q=${encodeURIComponent(query)}`
    );
    return response.data;
  }
}

export const customersService = new CustomersService();
export default CustomersService;
