/**
 * CoffeeOS POS Web - Orders Service
 * Servicio para gestión de órdenes (kitchen orders).
 *
 * Contrato real del backend (apps/api/src/modules/orders):
 *   GET    /orders             → { data: Order[], meta: { page, perPage, total, totalPages } }
 *   GET    /orders/stats       → { total, byStatus }
 *   GET    /orders/:id         → Order
 *   POST   /orders             → Order (CreateOrderDto: locationId/ticketId/userId…)
 *   PATCH  /orders/:id/status  → Order
 *   POST   /orders/:id/cancel  → Order
 *   DELETE /orders/:id         → 204
 *
 * Los montos viven en `order.ticket` (subtotal/tax/total), no en Order.
 */

import { api } from '@/lib/api';
import {
  Cart,
  MetaPaginatedResponse,
  Order,
  OrderFilters,
  PaginationParams,
  PaymentMethod,
} from '@/types';

class OrdersService {
  private readonly baseUrl = '/orders';

  // ============================================================================
  // ORDERS CRUD
  // ============================================================================

  /**
   * El backend lee: page, per_page, search, status, date (un solo día),
   * sort_by, sort_order. La paginación usa `per_page` (NO `limit`) y la
   * respuesta viene como { data, meta }.
   */
  async getOrders(
    _organizationId: string,
    filters?: OrderFilters,
    pagination?: PaginationParams,
  ): Promise<MetaPaginatedResponse<Order>> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    // El backend solo soporta filtro por día exacto (`date`); colapsamos el
    // rango cuando start_date === end_date. Rangos multi-día no tienen
    // soporte server-side hoy.
    if (
      filters?.start_date &&
      filters?.end_date &&
      filters.start_date === filters.end_date
    ) {
      params.append('date', filters.start_date);
    }

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('per_page', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order)
      params.append('sort_order', pagination.sort_order);

    const query = params.toString();
    return await api.get<MetaPaginatedResponse<Order>>(
      query ? `${this.baseUrl}?${query}` : this.baseUrl,
    );
  }

  async getOrderById(id: string): Promise<Order> {
    return await api.get<Order>(`${this.baseUrl}/${id}`);
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

    return await api.post<Order>(this.baseUrl, orderData);
  }

  // ============================================================================
  // UPDATE ORDER
  // ============================================================================

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    return await api.patch<Order>(`${this.baseUrl}/${id}/status`, { status });
  }

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    return await api.post<Order>(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  // ============================================================================
  // ENDPOINTS NO IMPLEMENTADOS EN BACKEND
  // Apuntaban a rutas inexistentes (404 garantizado). Se dejan como throw
  // explícito para que el fallo sea visible en vez de silencioso.
  // ============================================================================

  // TODO: implementar cuando el backend exponga PUT /orders/:id
  async updateOrder(_id: string, _data: Partial<Order>): Promise<Order> {
    throw new Error('No implementado en backend: PUT /orders/:id');
  }

  // TODO: implementar cuando el backend exponga GET /orders/number/:n
  async getOrderByNumber(
    _orderNumber: string,
    _organizationId: string,
  ): Promise<Order> {
    throw new Error('No implementado en backend: GET /orders/number/:n');
  }

  // TODO: implementar cuando el backend exponga POST /orders/:id/payments
  // (los pagos viven en el Ticket: ver módulo POS)
  async addPayment(
    _orderId: string,
    _data: {
      method: PaymentMethod;
      amount: number;
      reference?: string;
    },
  ): Promise<Order> {
    throw new Error('No implementado en backend: POST /orders/:id/payments');
  }

  // TODO: implementar cuando el backend exponga POST /orders/:id/refund
  async refundOrder(
    _orderId: string,
    _amount?: number,
    _reason?: string,
  ): Promise<Order> {
    throw new Error('No implementado en backend: POST /orders/:id/refund');
  }

  // TODO: implementar cuando el backend exponga GET /orders/:id/receipt
  async getReceipt(_orderId: string): Promise<{ url: string; html: string }> {
    throw new Error('No implementado en backend: GET /orders/:id/receipt');
  }

  // TODO: implementar cuando el backend exponga POST /orders/:id/print
  async printReceipt(_orderId: string): Promise<void> {
    throw new Error('No implementado en backend: POST /orders/:id/print');
  }

  // TODO: implementar cuando el backend exponga POST /orders/:id/email
  async emailReceipt(_orderId: string, _email: string): Promise<void> {
    throw new Error('No implementado en backend: POST /orders/:id/email');
  }

  // TODO: implementar cuando el backend exponga POST /orders/:id/whatsapp
  async whatsappReceipt(_orderId: string, _phone: string): Promise<void> {
    throw new Error('No implementado en backend: POST /orders/:id/whatsapp');
  }

  // TODO: implementar cuando el backend exponga GET /orders/stats/daily
  // (hoy solo existe GET /orders/stats con start_date/end_date)
  async getDailySales(
    _organizationId: string,
    _date: Date,
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
    throw new Error('No implementado en backend: GET /orders/stats/daily');
  }

  // TODO: implementar cuando el backend exponga GET /orders/stats/weekly
  async getWeeklySales(
    _organizationId: string,
    _startDate: Date,
  ): Promise<any> {
    throw new Error('No implementado en backend: GET /orders/stats/weekly');
  }

  // TODO: implementar cuando el backend exponga GET /orders/stats/monthly
  async getMonthlySales(
    _organizationId: string,
    _year: number,
    _month: number,
  ): Promise<any> {
    throw new Error('No implementado en backend: GET /orders/stats/monthly');
  }
}

export const ordersService = new OrdersService();
export default OrdersService;
