import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
} from './dto';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseOrderStats,
} from './interfaces';

@Injectable()
export class PurchaseOrdersService {
  private readonly purchaseOrders = new Map<string, PurchaseOrder>();
  private orderCounter = 1;

  async create(createDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const items: PurchaseOrderItem[] = createDto.items.map((item) => ({
      id: `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      purchase_order_id: '',
      inventory_item_id: item.inventory_item_id,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
      unit_price: item.unit_price,
      subtotal: item.quantity_ordered * item.unit_price,
      notes: item.notes,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = createDto.tax_amount || 0;
    const discountAmount = createDto.discount_amount || 0;
    const shippingCost = createDto.shipping_cost || 0;
    const totalAmount = subtotal + taxAmount - discountAmount + shippingCost;

    const purchaseOrder: PurchaseOrder = {
      id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organization_id: createDto.organization_id,
      supplier_id: createDto.supplier_id,
      order_number: this.generateOrderNumber(),
      status: PurchaseOrderStatus.DRAFT,
      items,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      order_date: new Date(),
      expected_delivery_date: createDto.expected_delivery_date,
      requested_by: createDto.requested_by,
      notes: createDto.notes,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Update item references
    items.forEach((item) => {
      item.purchase_order_id = purchaseOrder.id;
    });

    this.purchaseOrders.set(purchaseOrder.id, purchaseOrder);
    return purchaseOrder;
  }

  async findAll(query: QueryPurchaseOrdersDto): Promise<PurchaseOrder[]> {
    let orders = Array.from(this.purchaseOrders.values());

    if (query.organization_id) {
      orders = orders.filter(
        (po) => po.organization_id === query.organization_id,
      );
    }

    if (query.supplier_id) {
      orders = orders.filter((po) => po.supplier_id === query.supplier_id);
    }

    if (query.status) {
      orders = orders.filter((po) => po.status === query.status);
    }

    if (query.from_date) {
      orders = orders.filter((po) => po.order_date >= query.from_date!);
    }

    if (query.to_date) {
      orders = orders.filter((po) => po.order_date <= query.to_date!);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      orders = orders.filter(
        (po) =>
          po.order_number.toLowerCase().includes(search) ||
          po.supplier_name?.toLowerCase().includes(search) ||
          po.notes?.toLowerCase().includes(search),
      );
    }

    const sortBy = query.sort_by || 'order_date';
    const order = query.order || 'desc';

    orders.sort((a, b) => {
      let aValue: any = a[sortBy as keyof PurchaseOrder];
      let bValue: any = b[sortBy as keyof PurchaseOrder];

      if (aValue === undefined) aValue = order === 'asc' ? '' : Number.MIN_VALUE;
      if (bValue === undefined) bValue = order === 'asc' ? '' : Number.MIN_VALUE;

      if (aValue instanceof Date && bValue instanceof Date) {
        return order === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return orders;
  }

  async findById(id: string): Promise<PurchaseOrder> {
    const order = this.purchaseOrders.get(id);
    if (!order) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }
    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | undefined> {
    return Array.from(this.purchaseOrders.values()).find(
      (po) => po.order_number === orderNumber,
    );
  }

  async update(id: string, updateDto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const order = await this.findById(id);

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot update a received purchase order');
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled purchase order');
    }

    // Start with current order
    let updatedOrder: PurchaseOrder = {
      ...order,
      updated_at: new Date(),
    };

    // Apply updates
    if (updateDto.supplier_id) updatedOrder.supplier_id = updateDto.supplier_id;
    if (updateDto.tax_amount !== undefined) updatedOrder.tax_amount = updateDto.tax_amount;
    if (updateDto.discount_amount !== undefined) updatedOrder.discount_amount = updateDto.discount_amount;
    if (updateDto.shipping_cost !== undefined) updatedOrder.shipping_cost = updateDto.shipping_cost;
    if (updateDto.expected_delivery_date) updatedOrder.expected_delivery_date = updateDto.expected_delivery_date;
    if (updateDto.requested_by) updatedOrder.requested_by = updateDto.requested_by;
    if (updateDto.notes !== undefined) updatedOrder.notes = updateDto.notes;

    // Recalculate if items changed
    if (updateDto.items) {
      const items: PurchaseOrderItem[] = updateDto.items.map((item: any) => ({
        id: `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        purchase_order_id: order.id,
        inventory_item_id: item.inventory_item_id,
        quantity_ordered: item.quantity_ordered,
        quantity_received: 0,
        unit_price: item.unit_price,
        subtotal: item.quantity_ordered * item.unit_price,
        notes: item.notes,
      }));

      updatedOrder.items = items;
      updatedOrder.subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    // Recalculate total
    updatedOrder.total_amount =
      updatedOrder.subtotal +
      updatedOrder.tax_amount -
      updatedOrder.discount_amount +
      updatedOrder.shipping_cost;

    this.purchaseOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async delete(id: string): Promise<void> {
    const order = await this.findById(id);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft purchase orders');
    }

    this.purchaseOrders.delete(id);
  }

  async approve(id: string, approvedBy: string): Promise<PurchaseOrder> {
    const order = await this.findById(id);

    if (order.status !== PurchaseOrderStatus.DRAFT && order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Only draft or pending orders can be approved');
    }

    const updatedOrder: PurchaseOrder = {
      ...order,
      status: PurchaseOrderStatus.APPROVED,
      approved_by: approvedBy,
      approved_at: new Date(),
      updated_at: new Date(),
    };

    this.purchaseOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async sendToSupplier(id: string): Promise<PurchaseOrder> {
    const order = await this.findById(id);

    if (order.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException('Only approved orders can be sent to supplier');
    }

    const updatedOrder: PurchaseOrder = {
      ...order,
      status: PurchaseOrderStatus.ORDERED,
      updated_at: new Date(),
    };

    this.purchaseOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async receive(id: string, receiveDto: ReceivePurchaseOrderDto): Promise<PurchaseOrder> {
    const order = await this.findById(id);

    if (order.status !== PurchaseOrderStatus.ORDERED && order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException('Only ordered or partially received orders can be received');
    }

    const updatedItems = order.items.map((item) => {
      const received = receiveDto.items.find(
        (r) => r.inventory_item_id === item.inventory_item_id,
      );

      if (received) {
        return {
          ...item,
          quantity_received: item.quantity_received + received.quantity_received,
          notes: received.notes || item.notes,
        };
      }

      return item;
    });

    const allReceived = updatedItems.every(
      (item) => item.quantity_received >= item.quantity_ordered,
    );

    const anyReceived = updatedItems.some((item) => item.quantity_received > 0);

    const newStatus = allReceived
      ? PurchaseOrderStatus.RECEIVED
      : anyReceived
      ? PurchaseOrderStatus.PARTIALLY_RECEIVED
      : order.status;

    const updatedOrder: PurchaseOrder = {
      ...order,
      items: updatedItems,
      status: newStatus,
      received_by: receiveDto.received_by,
      received_at: allReceived ? new Date() : order.received_at,
      delivery_date: allReceived ? new Date() : order.delivery_date,
      updated_at: new Date(),
    };

    this.purchaseOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const order = await this.findById(id);

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot cancel a received purchase order');
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Purchase order is already cancelled');
    }

    const updatedOrder: PurchaseOrder = {
      ...order,
      status: PurchaseOrderStatus.CANCELLED,
      updated_at: new Date(),
    };

    this.purchaseOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getStats(organizationId: string): Promise<PurchaseOrderStats> {
    const orders = Array.from(this.purchaseOrders.values()).filter(
      (po) => po.organization_id === organizationId,
    );

    const byStatus: Record<PurchaseOrderStatus, number> = {
      [PurchaseOrderStatus.DRAFT]: 0,
      [PurchaseOrderStatus.PENDING]: 0,
      [PurchaseOrderStatus.APPROVED]: 0,
      [PurchaseOrderStatus.ORDERED]: 0,
      [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 0,
      [PurchaseOrderStatus.RECEIVED]: 0,
      [PurchaseOrderStatus.CANCELLED]: 0,
    };

    let totalAmount = 0;
    let pendingApprovalCount = 0;
    let overdueCount = 0;
    const now = new Date();

    orders.forEach((order) => {
      byStatus[order.status]++;
      totalAmount += order.total_amount;

      if (order.status === PurchaseOrderStatus.PENDING || order.status === PurchaseOrderStatus.DRAFT) {
        pendingApprovalCount++;
      }

      if (
        order.expected_delivery_date &&
        order.expected_delivery_date < now &&
        order.status !== PurchaseOrderStatus.RECEIVED &&
        order.status !== PurchaseOrderStatus.CANCELLED
      ) {
        overdueCount++;
      }
    });

    return {
      total_orders: orders.length,
      by_status: byStatus,
      total_amount: totalAmount,
      pending_approval_count: pendingApprovalCount,
      overdue_count: overdueCount,
    };
  }

  private generateOrderNumber(): string {
    const num = this.orderCounter++;
    return `PO-${new Date().getFullYear()}-${String(num).padStart(6, '0')}`;
  }
}
