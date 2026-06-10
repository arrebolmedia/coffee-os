/**
 * CoffeeOS - Purchase Orders Service
 * Servicio para gestión de órdenes de compra a proveedores
 */

import { api } from '@/lib/api';

export interface PurchaseOrderItem {
  id?: string;
  inventory_item_id: string;
  inventory_item_name?: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  subtotal: number;
  tax?: number;
  total: number;
  received_quantity?: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  supplier_id: string;
  supplier_name?: string;
  po_number: string;
  status:
    | 'draft'
    | 'pending'
    | 'approved'
    | 'ordered'
    | 'partial'
    | 'received'
    | 'cancelled';
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shipping_cost?: number;
  total: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  received_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderDTO {
  organization_id: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  items: Omit<PurchaseOrderItem, 'id' | 'inventory_item_name'>[];
  shipping_cost?: number;
  notes?: string;
  created_by: string;
}

export interface UpdatePurchaseOrderDTO {
  supplier_id?: string;
  status?: PurchaseOrder['status'];
  order_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  items?: PurchaseOrderItem[];
  shipping_cost?: number;
  payment_status?: PurchaseOrder['payment_status'];
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  approved_by?: string;
  received_by?: string;
}

export interface ReceivePurchaseOrderDTO {
  items: {
    id: string;
    received_quantity: number;
    notes?: string;
  }[];
  received_by: string;
  actual_delivery_date: string;
}

export interface PurchaseOrderStats {
  total_orders: number;
  by_status: {
    draft: number;
    pending: number;
    approved: number;
    ordered: number;
    partially_received: number;
    received: number;
    cancelled: number;
  };
  total_amount: number;
  pending_approval_count: number;
  overdue_count: number;
}

export class PurchaseOrdersService {
  /**
   * Get all purchase orders for organization
   */
  static async getPurchaseOrders(
    organizationId: string,
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
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

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
   * Get purchase orders by supplier
   */
  static async getPurchaseOrdersBySupplier(
    supplierId: string,
  ): Promise<PurchaseOrder[]> {
    return await api.get<PurchaseOrder[]>(
      `/purchase-orders/supplier/${supplierId}`,
    );
  }

  /**
   * Get purchase order statistics
   */
  static async getPurchaseOrderStats(
    organizationId: string,
    dateRange?: { from: string; to: string },
  ): Promise<PurchaseOrderStats> {
    let url = `/purchase-orders/stats/${organizationId}`;

    if (dateRange) {
      url += `?from=${dateRange.from}&to=${dateRange.to}`;
    }

    return await api.get<PurchaseOrderStats>(url);
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
    return await api.post<PurchaseOrder>(`/purchase-orders/${poId}/approve`, {
      approved_by: approvedBy,
    });
  }

  /**
   * Send purchase order to supplier
   */
  static async sendPurchaseOrder(
    poId: string,
    email?: string,
  ): Promise<PurchaseOrder> {
    return await api.post<PurchaseOrder>(`/purchase-orders/${poId}/send`, {
      email,
    });
  }

  /**
   * Receive purchase order
   */
  static async receivePurchaseOrder(
    poId: string,
    data: ReceivePurchaseOrderDTO,
  ): Promise<PurchaseOrder> {
    return await api.post<PurchaseOrder>(
      `/purchase-orders/${poId}/receive`,
      data,
    );
  }

  /**
   * Cancel purchase order
   */
  static async cancelPurchaseOrder(
    poId: string,
    reason?: string,
  ): Promise<PurchaseOrder> {
    return await api.post<PurchaseOrder>(`/purchase-orders/${poId}/cancel`, {
      reason,
    });
  }

  /**
   * Generate PDF for purchase order
   */
  static async generatePurchaseOrderPDF(poId: string): Promise<Blob> {
    const response = await fetch(`/api/purchase-orders/${poId}/pdf`);
    return await response.blob();
  }

  /**
   * Get suggested reorder items
   */
  static async getSuggestedReorder(organizationId: string): Promise<
    {
      inventory_item_id: string;
      inventory_item_name: string;
      current_stock: number;
      reorder_point: number;
      suggested_quantity: number;
      preferred_supplier_id?: string;
      preferred_supplier_name?: string;
      last_unit_cost?: number;
    }[]
  > {
    return await api.get(
      `/purchase-orders/organization/${organizationId}/suggested-reorder`,
    );
  }
}
