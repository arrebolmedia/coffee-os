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
  location_id: string;
  user_id: string;
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

/**
 * Backend contract: POST /pos/tickets (CreateTicketDto, camelCase)
 */
interface CreateTicketPayload {
  locationId: string;
  userId: string;
  customerId?: string;
  discount?: number;
  notes?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    modifiers?: Array<{ modifierId: string; priceDelta: number }>;
    notes?: string;
  }>;
}

/**
 * Backend contract: PATCH /pos/tickets/:id/close (CloseTicketDto)
 */
interface TicketPayment {
  method: string; // Prisma PaymentMethod: CASH | CARD | DIGITAL_WALLET | BANK_TRANSFER | LOYALTY_POINTS
  amount: number;
  reference?: string;
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
   * Create new order.
   *
   * Flujo de cobro real del backend (no existe POST /pos/orders):
   * 1. POST  /pos/tickets           → crea el ticket (CreateTicketDto camelCase)
   * 2. PATCH /pos/tickets/:id/close → cierra el ticket y registra los pagos
   */
  static async createOrder(data: CreateOrderDTO): Promise<Order> {
    const ticketPayload: CreateTicketPayload = {
      locationId: data.location_id,
      userId: data.user_id,
      customerId: data.customer_id,
      discount: data.discount > 0 ? data.discount : undefined,
      notes: data.notes,
      lines: data.items.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        modifiers: item.modifiers?.map((m) => ({
          modifierId: m.id,
          priceDelta: m.price,
        })),
        notes: item.notes,
      })),
    };

    const ticket = await api.post<any>('/pos/tickets', ticketPayload);

    // Cobrar contra el total calculado por el backend (fuente de verdad).
    const total = Number(ticket?.total ?? data.total);
    const payments = POSService.buildTicketPayments(data, total);

    const closed = await api.patch<any>(`/pos/tickets/${ticket.id}/close`, {
      payments,
    });

    return POSService.mapTicketToOrder(closed ?? ticket, data);
  }

  /**
   * Map frontend payment method + details to the backend payments breakdown.
   */
  private static buildTicketPayments(
    data: CreateOrderDTO,
    total: number,
  ): TicketPayment[] {
    const details = data.payment_details;

    if (data.payment_method === PaymentMethod.MIXED) {
      const card = Math.min(details?.card ?? 0, total);
      const cash = Math.max(0, total - card);
      const payments: TicketPayment[] = [];
      if (card > 0) payments.push({ method: 'CARD', amount: card });
      if (cash > 0) payments.push({ method: 'CASH', amount: cash });
      return payments;
    }

    // CASH | CARD | DIGITAL_WALLET | BANK_TRANSFER | LOYALTY_POINTS map 1:1
    // al enum del backend. El monto cobrado es el total (el cambio de un pago
    // en efectivo no se registra como pago).
    return [
      {
        method: data.payment_method,
        amount: total,
        reference: details?.reference,
      },
    ];
  }

  private static mapTicketToOrder(ticket: any, data: CreateOrderDTO): Order {
    const isClosed = ticket?.status === 'CLOSED';
    return {
      id: ticket.id,
      organization_id: data.organization_id,
      customer_id: ticket.customerId ?? data.customer_id,
      order_number: ticket.ticketNumber,
      subtotal: Number(ticket.subtotal ?? data.subtotal),
      tax: Number(ticket.tax ?? data.tax),
      discount: Number(ticket.discount ?? data.discount ?? 0),
      total: Number(ticket.total ?? data.total),
      status: isClosed ? 'completed' : 'pending',
      payment_method: data.payment_method,
      payment_status: isClosed ? 'paid' : 'pending',
      created_at: ticket.openedAt ?? new Date().toISOString(),
      updated_at:
        ticket.closedAt ?? ticket.openedAt ?? new Date().toISOString(),
    };
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
