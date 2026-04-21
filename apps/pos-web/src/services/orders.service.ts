/**
 * CoffeeOS POS Web - Orders Service
 * Servicio para gestión de órdenes y ventas
 */

import { apiClient } from '@/lib/api-client';
import {
  Order,
  Cart,
  OrderFilters,
  PaginationParams,
  PaginatedResponse,
  PaymentMethod,
} from '@/types';

class OrdersService {
  private readonly baseUrl = '/orders';

  // ============================================================================
  // ORDERS CRUD
  // ============================================================================

  async getOrders(
    organizationId: string,
    filters?: OrderFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_status)
      params.append('payment_status', filters.payment_status);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.cashier_id) params.append('cashier_id', filters.cashier_id);
    if (filters?.date_from)
      params.append('date_from', filters.date_from.toISOString());
    if (filters?.date_to)
      params.append('date_to', filters.date_to.toISOString());

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order)
      params.append('sort_order', pagination.sort_order);

    const response = await apiClient.get<PaginatedResponse<Order>>(
      `${this.baseUrl}?${params.toString()}`,
    );
    return response.data;
  }

  async getOrderById(id: string): Promise<Order> {
    const response = await apiClient.get<Order>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getOrderByNumber(
    orderNumber: string,
    organizationId: string,
  ): Promise<Order> {
    const response = await apiClient.get<Order>(
      `${this.baseUrl}/number/${orderNumber}?organization_id=${organizationId}`,
    );
    return response.data;
  }

  // ============================================================================
  // CREATE ORDER
  // ============================================================================

  async createOrder(data: {
    organization_id: string;
    location_id: string;
    cashier_id?: string;
    cart: Cart;
    customer_id?: string;
    payment_method?: PaymentMethod;
    notes?: string;
  }): Promise<Order> {
    const orderData = {
      organizationId: data.organization_id,
      locationId: data.location_id,
      cashierId: data.cashier_id,
      customerId: data.customer_id,
      type: 'TAKE_OUT',
      items: data.cart.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
        modifiers: item.selected_modifiers,
        notes: item.notes,
      })),
      subtotal: data.cart.subtotal,
      tax: data.cart.tax,
      discount: data.cart.discount,
      total: data.cart.total,
      paymentMethod: data.payment_method,
      notes: data.notes ?? data.cart.notes,
    };

    const response = await apiClient.post<Order>(this.baseUrl, orderData);
    return response.data;
  }

  // ============================================================================
  // UPDATE ORDER
  // ============================================================================

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    const response = await apiClient.put<Order>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    const response = await apiClient.patch<Order>(
      `${this.baseUrl}/${id}/status`,
      { status },
    );
    return response.data;
  }

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const response = await apiClient.post<Order>(
      `${this.baseUrl}/${id}/cancel`,
      { reason },
    );
    return response.data;
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  async addPayment(
    orderId: string,
    data: {
      method: PaymentMethod;
      amount: number;
      reference?: string;
    },
  ): Promise<Order> {
    const response = await apiClient.post<Order>(
      `${this.baseUrl}/${orderId}/payments`,
      data,
    );
    return response.data;
  }

  async refundOrder(
    orderId: string,
    amount?: number,
    reason?: string,
  ): Promise<Order> {
    const response = await apiClient.post<Order>(
      `${this.baseUrl}/${orderId}/refund`,
      {
        amount,
        reason,
      },
    );
    return response.data;
  }

  // ============================================================================
  // RECEIPT
  // ============================================================================

  async getReceipt(orderId: string): Promise<{ url: string; html: string }> {
    const response = await apiClient.get<{ url: string; html: string }>(
      `${this.baseUrl}/${orderId}/receipt`,
    );
    return response.data;
  }

  async printReceipt(orderId: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${orderId}/print`);
  }

  async emailReceipt(orderId: string, email: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${orderId}/email`, { email });
  }

  async whatsappReceipt(orderId: string, phone: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${orderId}/whatsapp`, { phone });
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getDailySales(
    organizationId: string,
    date: Date,
  ): Promise<{
    total_sales: number;
    total_orders: number;
    average_ticket: number;
    cash_sales: number;
    card_sales: number;
    top_products: Array<{
      product_name: string;
      quantity: number;
      revenue: number;
    }>;
  }> {
    const response = await apiClient.get<any>(
      `${this.baseUrl}/stats/daily?organization_id=${organizationId}&date=${date.toISOString()}`,
    );
    return response.data;
  }

  async getWeeklySales(organizationId: string, startDate: Date): Promise<any> {
    const response = await apiClient.get<any>(
      `${this.baseUrl}/stats/weekly?organization_id=${organizationId}&start_date=${startDate.toISOString()}`,
    );
    return response.data;
  }

  async getMonthlySales(
    organizationId: string,
    year: number,
    month: number,
  ): Promise<any> {
    const response = await apiClient.get<any>(
      `${this.baseUrl}/stats/monthly?organization_id=${organizationId}&year=${year}&month=${month}`,
    );
    return response.data;
  }
}

export const ordersService = new OrdersService();
export default OrdersService;
