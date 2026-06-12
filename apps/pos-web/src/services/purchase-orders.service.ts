/**
 * CoffeeOS - Purchase Orders Service
 * Servicio para gestión de órdenes de compra a proveedores.
 *
 * Alineado al contrato real del backend
 * (apps/api/src/modules/purchase-orders):
 * - POST   /purchase-orders
 * - GET    /purchase-orders (query: supplier_id, status, from_date, to_date, search, sort_by, order)
 * - GET    /purchase-orders/stats/:organizationId
 * - GET    /purchase-orders/:id
 * - PUT    /purchase-orders/:id
 * - PATCH  /purchase-orders/:id/approve | /send | /receive | /cancel
 * - DELETE /purchase-orders/:id
 *
 * Endpoints fantasma eliminados: /supplier/:id, /suggested-reorder y el
 * fetch local /api/purchase-orders/:id/pdf no existen en el backend.
 */

import { api } from '@/lib/api';

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  inventory_item_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  supplier_id: string;
  supplier_name?: string;
  order_number: string;
  status: PurchaseOrderStatus;

  items: PurchaseOrderItem[];

  // Financial
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_cost: number;
  total_amount: number;

  // Dates
  order_date: string;
  expected_delivery_date?: string;
  delivery_date?: string;

  // Approval
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;

  // Receiving
  received_by?: string;
  received_at?: string;

  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderItemDTO {
  inventory_item_id: string;
  quantity_ordered: number;
  unit_price: number;
  notes?: string;
}

export interface CreatePurchaseOrderDTO {
  organization_id: string;
  supplier_id: string;
  items: CreatePurchaseOrderItemDTO[];
  tax_amount?: number;
  discount_amount?: number;
  shipping_cost?: number;
  expected_delivery_date?: string;
  requested_by?: string;
  notes?: string;
}

/** PUT /purchase-orders/:id — el backend usa PartialType(CreatePurchaseOrderDto). */
export type UpdatePurchaseOrderDTO = Partial<CreatePurchaseOrderDTO>;

export interface ReceiveItemDTO {
  inventory_item_id: string;
  quantity_received: number;
  notes?: string;
}

export interface ReceivePurchaseOrderDTO {
  items: ReceiveItemDTO[];
  received_by: string;
  notes?: string;
}

export interface PurchaseOrderStats {
  total_orders: number;
  by_status: Record<PurchaseOrderStatus, number>;
  total_amount: number;
  pending_approval_count: number;
  overdue_count: number;
}

export class PurchaseOrdersService {
  /**
   * Get all purchase orders for organization.
   * El backend toma la organización del JWT, no de la query.
   */
  static async getPurchaseOrders(
    _organizationId: string,
    filters?: {
      supplier_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<PurchaseOrder[]> {
    const params = new URLSearchParams();

    if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
    if (filters?.status) params.append('status', filters.status);
    // El backend (QueryPurchaseOrdersDto) usa from_date / to_date.
    if (filters?.date_from) params.append('from_date', filters.date_from);
    if (filters?.date_to) params.append('to_date', filters.date_to);

    const url = `/purchase-orders${params.toString() ? `?${params.toString()}` : ''}`;
    return await api.get<PurchaseOrder[]>(url);
  }

  /**
   * Get purchase order by ID
   */
  static async getPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    return await api.get<PurchaseOrder>(`/purchase-orders/${poId}`);
  }

  /**
   * Get purchase order statistics
   */
  static async getPurchaseOrderStats(
    organizationId: string,
  ): Promise<PurchaseOrderStats> {
    return await api.get<PurchaseOrderStats>(
      `/purchase-orders/stats/${organizationId}`,
    );
  }

  /**
   * Create new purchase order
   */
  static async createPurchaseOrder(
    data: CreatePurchaseOrderDTO,
  ): Promise<PurchaseOrder> {
    return await api.post<PurchaseOrder>('/purchase-orders', data);
  }

  /**
   * Update purchase order
   */
  static async updatePurchaseOrder(
    poId: string,
    data: UpdatePurchaseOrderDTO,
  ): Promise<PurchaseOrder> {
    return await api.put<PurchaseOrder>(`/purchase-orders/${poId}`, data);
  }

  /**
   * Delete purchase order
   */
  static async deletePurchaseOrder(poId: string): Promise<void> {
    await api.delete(`/purchase-orders/${poId}`);
  }

  /**
   * Approve purchase order
   */
  static async approvePurchaseOrder(
    poId: string,
    approvedBy: string,
  ): Promise<PurchaseOrder> {
    return await api.patch<PurchaseOrder>(`/purchase-orders/${poId}/approve`, {
      approved_by: approvedBy,
    });
  }

  /**
   * Send purchase order to supplier
   */
  static async sendPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    return await api.patch<PurchaseOrder>(`/purchase-orders/${poId}/send`);
  }

  /**
   * Receive purchase order
   */
  static async receivePurchaseOrder(
    poId: string,
    data: ReceivePurchaseOrderDTO,
  ): Promise<PurchaseOrder> {
    return await api.patch<PurchaseOrder>(
      `/purchase-orders/${poId}/receive`,
      data,
    );
  }

  /**
   * Cancel purchase order
   */
  static async cancelPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    return await api.patch<PurchaseOrder>(`/purchase-orders/${poId}/cancel`);
  }
}
