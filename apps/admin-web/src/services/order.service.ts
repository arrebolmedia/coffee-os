/**
 * CoffeeOS Admin - Order Service
 * Handles order operations and statistics
 */

import { apiClient } from '@/lib/api-client';
import { Order, PaginatedResponse, ListParams } from '@/types';

export interface OrderStats {
  total_sales: number;
  total_orders: number;
  total_customers: number;
  average_ticket: number;
}

export interface CreateOrderData {
  items: OrderItemData[];
  customer_id?: string;
  notes?: string;
  payment_method: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';
  payment_details?: any;
}

export interface OrderItemData {
  product_id: string;
  quantity: number;
  selected_modifiers?: any[];
  notes?: string;
}

export interface UpdateOrderStatusData {
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  cancellation_reason?: string;
}

class OrderService {
  private readonly basePath = '/orders';

  /**
   * Get paginated list of orders
   */
  async getOrders(params?: ListParams): Promise<PaginatedResponse<Order>> {
    try {
      const queryParams: any = {
        page: params?.page || 1,
        per_page: params?.per_page || 10,
      };

      if (params?.search) {
        queryParams.search = params.search;
      }

      if (params?.sort_by) {
        queryParams.sort_by = params.sort_by;
        queryParams.sort_order = params.sort_order || 'desc';
      }

      if (params?.filters) {
        Object.assign(queryParams, params.filters);
      }

      return await apiClient.get<PaginatedResponse<Order>>(this.basePath, queryParams);
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  /**
   * Get single order by ID
   */
  async getOrder(id: string): Promise<Order> {
    try {
      return await apiClient.get<Order>(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  /**
   * Create new order
   */
  async createOrder(data: CreateOrderData): Promise<Order> {
    try {
      return await apiClient.post<Order>(this.basePath, data);
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id: string, data: UpdateOrderStatusData): Promise<Order> {
    try {
      return await apiClient.patch<Order>(`${this.basePath}/${id}/status`, data);
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(id: string, reason: string): Promise<Order> {
    try {
      return await apiClient.post<Order>(`${this.basePath}/${id}/cancel`, {
        reason,
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getStats(startDate?: string, endDate?: string): Promise<OrderStats> {
    try {
      const params: any = {};
      
      if (startDate) {
        params.start_date = startDate;
      }
      if (endDate) {
        params.end_date = endDate;
      }

      return await apiClient.get<OrderStats>(`${this.basePath}/stats`, params);
    } catch (error) {
      console.error('Get order stats error:', error);
      throw error;
    }
  }

  /**
   * Get today's orders
   */
  async getTodayOrders(): Promise<Order[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.getOrders({
        filters: {
          date: today,
        },
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      console.error('Get today orders error:', error);
      throw error;
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10): Promise<Order[]> {
    try {
      const response = await this.getOrders({
        per_page: limit,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      return response.data;
    } catch (error) {
      console.error('Get recent orders error:', error);
      throw error;
    }
  }
}

export const orderService = new OrderService();
