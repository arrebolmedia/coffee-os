export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  ORDERED = 'ordered',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

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
  
  // Items
  items: PurchaseOrderItem[];
  
  // Financial
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_cost: number;
  total_amount: number;
  
  // Dates
  order_date: Date;
  expected_delivery_date?: Date;
  delivery_date?: Date;
  
  // Approval
  requested_by?: string;
  approved_by?: string;
  approved_at?: Date;
  
  // Receiving
  received_by?: string;
  received_at?: Date;
  
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrderStats {
  total_orders: number;
  by_status: Record<PurchaseOrderStatus, number>;
  total_amount: number;
  pending_approval_count: number;
  overdue_count: number;
}

export interface ReceiveItemDto {
  inventory_item_id: string;
  quantity_received: number;
  notes?: string;
}
