/**
 * CoffeeOS - POS Service
 * Servicio para operaciones del punto de venta
 */

import { api } from '@/lib/api';
import { PaymentMethod } from '@/types';

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  notes?: string;
}

export interface CreateOrderDTO {
  organization_id: string;
  customer_id?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_details?: {
    cash?: number;
    card?: number;
    transfer?: number;
    reference?: string;
  };
  notes?: string;
}

export interface Order {
  id: string;
  organization_id: string;
  customer_id?: string;
  order_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface DailySalesStats {
  date: string;
  total_sales: number;
  total_orders: number;
  average_ticket: number;
  payment_methods: {
    cash: number;
    card: number;
    transfer: number;
    mixed: number;
  };
}

export class POSService {
  /**
   * Create new order
   */
  static async createOrder(data: CreateOrderDTO): Promise<Order> {
    return await api.post<Order>('/pos/orders', data);
  }

  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<Order> {
    return await api.get<Order>(`/pos/orders/${orderId}`);
  }

  /**
   * Get today's orders for organization
   */
  static async getTodayOrders(organizationId: string): Promise<Order[]> {
    return await api.get<Order[]>(
      `/pos/orders/organization/${organizationId}/today`,
    );
  }

  /**
   * Get orders by date range
   */
  static async getOrdersByDateRange(
    organizationId: string,
    startDate: string,
    endDate: string,
  ): Promise<Order[]> {
    return await api.get<Order[]>(
      `/pos/orders/organization/${organizationId}?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  /**
   * Get daily sales stats
   */
  static async getDailySalesStats(
    organizationId: string,
    date?: string,
  ): Promise<DailySalesStats> {
    const url = date
      ? `/pos/stats/daily/${organizationId}?date=${date}`
      : `/pos/stats/daily/${organizationId}`;
    return await api.get<DailySalesStats>(url);
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string, reason: string): Promise<Order> {
    return await api.post<Order>(`/pos/orders/${orderId}/cancel`, {
      reason,
    });
  }

  /**
   * Refund order
   */
  static async refundOrder(
    orderId: string,
    reason: string,
    amount?: number,
  ): Promise<Order> {
    return await api.post<Order>(`/pos/orders/${orderId}/refund`, {
      reason,
      amount,
    });
  }

  /**
   * Print receipt
   */
  static async printReceipt(orderId: string): Promise<{ receipt: string }> {
    return await api.get<{ receipt: string }>(`/pos/orders/${orderId}/receipt`);
  }

  /**
   * Get payment methods for organization
   */
  static async getPaymentMethods(organizationId: string): Promise<string[]> {
    return await api.get<string[]>(`/pos/payment-methods/${organizationId}`);
  }

  /**
   * Open cash register
   */
  static async openCashRegister(
    organizationId: string,
    initialAmount: number,
    userId: string,
  ): Promise<{ id: string; opened_at: string }> {
    return await api.post<{ id: string; opened_at: string }>(
      '/pos/cash-register/open',
      {
        organization_id: organizationId,
        initial_amount: initialAmount,
        user_id: userId,
      },
    );
  }

  /**
   * Close cash register
   */
  static async closeCashRegister(
    registerId: string,
    finalAmount: number,
    notes?: string,
  ): Promise<{ id: string; closed_at: string; difference: number }> {
    return await api.post<{
      id: string;
      closed_at: string;
      difference: number;
    }>(`/pos/cash-register/${registerId}/close`, {
      final_amount: finalAmount,
      notes,
    });
  }

  /**
   * Get current cash register session
   */
  static async getCurrentCashRegister(
    organizationId: string,
  ): Promise<{ id: string; initial_amount: number; opened_at: string } | null> {
    return await api.get<{
      id: string;
      initial_amount: number;
      opened_at: string;
    } | null>(`/pos/cash-register/current/${organizationId}`);
  }
}
