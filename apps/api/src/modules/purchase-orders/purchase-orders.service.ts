import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStats,
  PurchaseOrderStatus,
} from './interfaces';

/**
 * Prisma stores PurchaseOrderStatus in UPPERCASE; the API/frontend contract is
 * lowercase. These two maps are the single source of truth for the conversion.
 */
const STATUS_TO_API: Record<string, PurchaseOrderStatus> = {
  DRAFT: PurchaseOrderStatus.DRAFT,
  PENDING: PurchaseOrderStatus.PENDING,
  APPROVED: PurchaseOrderStatus.APPROVED,
  ORDERED: PurchaseOrderStatus.ORDERED,
  PARTIALLY_RECEIVED: PurchaseOrderStatus.PARTIALLY_RECEIVED,
  RECEIVED: PurchaseOrderStatus.RECEIVED,
  CANCELLED: PurchaseOrderStatus.CANCELLED,
};

const STATUS_TO_PRISMA: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.DRAFT]: 'DRAFT',
  [PurchaseOrderStatus.PENDING]: 'PENDING',
  [PurchaseOrderStatus.APPROVED]: 'APPROVED',
  [PurchaseOrderStatus.ORDERED]: 'ORDERED',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'PARTIALLY_RECEIVED',
  [PurchaseOrderStatus.RECEIVED]: 'RECEIVED',
  [PurchaseOrderStatus.CANCELLED]: 'CANCELLED',
};

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Mapper: Prisma row (camelCase, UPPERCASE status) → API shape (snake_case,
  // lowercase status). The frontend (pos-web) depends on this shape verbatim.
  //
  // NOTE on financials: the Prisma schema only persists subtotal/tax/total.
  // discount_amount and shipping_cost are not columns, so they are reported as
  // 0; their effect is already folded into `total` at write time.
  // ---------------------------------------------------------------------------
  private toApi(po: any): PurchaseOrder {
    const items: PurchaseOrderItem[] = (po.items ?? []).map((item: any) => ({
      id: item.id,
      purchase_order_id: item.purchaseOrderId,
      inventory_item_id: item.inventoryItemId,
      inventory_item_name: item.inventoryItem?.name,
      quantity_ordered: item.quantityOrdered,
      quantity_received: item.quantityReceived,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      notes: item.notes ?? undefined,
    }));

    return {
      id: po.id,
      organization_id: po.organizationId,
      supplier_id: po.supplierId,
      supplier_name: po.supplier?.name,
      order_number: po.poNumber,
      status: STATUS_TO_API[po.status] ?? PurchaseOrderStatus.DRAFT,

      items,

      subtotal: po.subtotal,
      tax_amount: po.tax,
      discount_amount: 0,
      shipping_cost: 0,
      total_amount: po.total,

      order_date: po.orderDate,
      expected_delivery_date: po.expectedDate ?? undefined,
      delivery_date: po.receivedDate ?? undefined,

      requested_by: po.requestedBy ?? undefined,
      approved_by: po.approvedBy ?? undefined,
      approved_at: undefined,

      received_by: undefined,
      received_at: po.receivedDate ?? undefined,

      notes: po.notes ?? undefined,
      created_at: po.createdAt,
      updated_at: po.updatedAt,
    };
  }

  private readonly includeFull = {
    items: { include: { inventoryItem: { select: { id: true, name: true } } } },
    supplier: { select: { id: true, name: true } },
  };

  /** Generate a collision-resistant PO number without an in-memory counter. */
  private generatePoNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PO-${datePart}-${randomUUID().slice(0, 8)}`;
  }

  async create(createDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const itemsData = createDto.items.map((item) => ({
      inventoryItemId: item.inventory_item_id,
      quantityOrdered: item.quantity_ordered,
      quantityReceived: 0,
      unitPrice: item.unit_price,
      subtotal: item.quantity_ordered * item.unit_price,
      notes: item.notes,
    }));

    const subtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = createDto.tax_amount || 0;
    const discountAmount = createDto.discount_amount || 0;
    const shippingCost = createDto.shipping_cost || 0;
    const total = subtotal + taxAmount - discountAmount + shippingCost;

    const created = await this.prisma.purchaseOrder.create({
      data: {
        organizationId: createDto.organization_id,
        supplierId: createDto.supplier_id,
        poNumber: this.generatePoNumber(),
        status: 'DRAFT',
        requestedBy: createDto.requested_by,
        expectedDate: createDto.expected_delivery_date,
        subtotal,
        tax: taxAmount,
        total,
        notes: createDto.notes,
        items: { create: itemsData },
      },
      include: this.includeFull,
    });

    return this.toApi(created);
  }

  async findAll(query: QueryPurchaseOrdersDto): Promise<PurchaseOrder[]> {
    const where: any = {};

    if (query.organization_id) {
      where.organizationId = query.organization_id;
    }

    if (query.supplier_id) {
      where.supplierId = query.supplier_id;
    }

    if (query.status) {
      where.status = STATUS_TO_PRISMA[query.status];
    }

    if (query.from_date || query.to_date) {
      where.orderDate = {};
      if (query.from_date) where.orderDate.gte = query.from_date;
      if (query.to_date) where.orderDate.lte = query.to_date;
    }

    if (query.search) {
      where.poNumber = { contains: query.search, mode: 'insensitive' };
    }

    const sortBy = query.sort_by || 'order_date';
    const order = query.order === 'asc' ? 'asc' : 'desc';
    const orderByField =
      sortBy === 'order_date'
        ? 'orderDate'
        : sortBy === 'total_amount'
          ? 'total'
          : sortBy === 'created_at'
            ? 'createdAt'
            : 'orderDate';

    const orders = await this.prisma.purchaseOrder.findMany({
      where,
      include: this.includeFull,
      orderBy: { [orderByField]: order },
    });

    return orders.map((po) => this.toApi(po));
  }

  /** Internal helper — fetch the raw Prisma row (with items) or throw 404. */
  private async getRawOrThrow(id: string): Promise<any> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.includeFull,
    });
    if (!order) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }
    return order;
  }

  async findById(id: string): Promise<PurchaseOrder> {
    return this.toApi(await this.getRawOrThrow(id));
  }

  async findByOrderNumber(
    orderNumber: string,
  ): Promise<PurchaseOrder | undefined> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { poNumber: orderNumber },
      include: this.includeFull,
    });
    return order ? this.toApi(order) : undefined;
  }

  async update(
    id: string,
    updateDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const order = await this.getRawOrThrow(id);

    if (order.status === 'RECEIVED') {
      throw new BadRequestException('Cannot update a received purchase order');
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled purchase order');
    }

    const data: any = {};

    if (updateDto.supplier_id) data.supplierId = updateDto.supplier_id;
    if (updateDto.expected_delivery_date)
      data.expectedDate = updateDto.expected_delivery_date;
    if (updateDto.requested_by) data.requestedBy = updateDto.requested_by;
    if (updateDto.notes !== undefined) data.notes = updateDto.notes;

    // Recompute financial fields. Tax/discount/shipping all fold into `total`.
    const taxAmount =
      updateDto.tax_amount !== undefined ? updateDto.tax_amount : order.tax;
    const discountAmount = updateDto.discount_amount ?? 0;
    const shippingCost = updateDto.shipping_cost ?? 0;

    let newSubtotal: number = order.subtotal;
    let replaceItems: any[] | undefined;

    if (updateDto.items) {
      replaceItems = updateDto.items.map((item: any) => ({
        inventoryItemId: item.inventory_item_id,
        quantityOrdered: item.quantity_ordered,
        quantityReceived: 0,
        unitPrice: item.unit_price,
        subtotal: item.quantity_ordered * item.unit_price,
        notes: item.notes,
      }));
      newSubtotal = replaceItems.reduce((sum, it) => sum + it.subtotal, 0);
    }

    data.subtotal = newSubtotal;
    data.tax = taxAmount;
    data.total = newSubtotal + taxAmount - discountAmount + shippingCost;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (replaceItems) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });
        await tx.purchaseOrderItem.createMany({
          data: replaceItems.map((it) => ({ ...it, purchaseOrderId: id })),
        });
      }
      return tx.purchaseOrder.update({
        where: { id },
        data,
        include: this.includeFull,
      });
    });

    return this.toApi(updated);
  }

  async delete(id: string): Promise<void> {
    const order = await this.getRawOrThrow(id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete draft purchase orders');
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });
  }

  async approve(id: string, approvedBy: string): Promise<PurchaseOrder> {
    const order = await this.getRawOrThrow(id);

    if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
      throw new BadRequestException(
        'Only draft or pending orders can be approved',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy },
      include: this.includeFull,
    });

    return this.toApi(updated);
  }

  async sendToSupplier(id: string): Promise<PurchaseOrder> {
    const order = await this.getRawOrThrow(id);

    if (order.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved orders can be sent to supplier',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'ORDERED' },
      include: this.includeFull,
    });

    return this.toApi(updated);
  }

  /**
   * Receive goods against a PO. CRITICAL inventory integration: for each
   * received line, in ONE transaction we (a) bump quantityReceived, (b) create a
   * GoodsReceipt, (c) create an IN InventoryMovement (reason PURCHASE), and
   * (d) increment InventoryItem.currentStock — keeping stock consistent with
   * inventory-movements.service semantics.
   */
  async receive(
    id: string,
    receiveDto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const order = await this.getRawOrThrow(id);

    if (order.status !== 'ORDERED' && order.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(
        'Only ordered or partially received orders can be received',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const received of receiveDto.items) {
        const line = order.items.find(
          (it: any) => it.inventoryItemId === received.inventory_item_id,
        );

        if (!line) {
          throw new BadRequestException(
            `Item ${received.inventory_item_id} is not part of this purchase order`,
          );
        }

        // (a) increment received quantity on the PO line
        await tx.purchaseOrderItem.update({
          where: { id: line.id },
          data: {
            quantityReceived: { increment: received.quantity_received },
            ...(received.notes ? { notes: received.notes } : {}),
          },
        });

        // (b) goods receipt record
        await tx.goodsReceipt.create({
          data: {
            purchaseOrderId: id,
            inventoryItemId: received.inventory_item_id,
            quantity: received.quantity_received,
            unitCost: line.unitPrice,
            receivedAt: new Date(),
            notes: received.notes,
          },
        });

        // (c) IN inventory movement (matches inventory-movements.service shape)
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: received.inventory_item_id,
            type: 'IN',
            quantity: received.quantity_received,
            unitCost: line.unitPrice,
            reason: 'PURCHASE',
            reference: order.poNumber,
            notes: `Goods receipt for PO ${order.poNumber}`,
          },
        });

        // (d) increment current stock
        await tx.inventoryItem.update({
          where: { id: received.inventory_item_id },
          data: { currentStock: { increment: received.quantity_received } },
        });
      }

      // Re-read items inside the tx to compute the resulting status.
      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allReceived = items.every(
        (it) => it.quantityReceived >= it.quantityOrdered,
      );
      const anyReceived = items.some((it) => it.quantityReceived > 0);

      const newStatus = allReceived
        ? 'RECEIVED'
        : anyReceived
          ? 'PARTIALLY_RECEIVED'
          : order.status;

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          ...(allReceived ? { receivedDate: new Date() } : {}),
        },
        include: this.includeFull,
      });
    });

    return this.toApi(updated);
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const order = await this.getRawOrThrow(id);

    if (order.status === 'RECEIVED') {
      throw new BadRequestException('Cannot cancel a received purchase order');
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Purchase order is already cancelled');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.includeFull,
    });

    return this.toApi(updated);
  }

  async getStats(organizationId: string): Promise<PurchaseOrderStats> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      select: {
        status: true,
        total: true,
        expectedDate: true,
      },
    });

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

    for (const order of orders) {
      const apiStatus =
        STATUS_TO_API[order.status] ?? PurchaseOrderStatus.DRAFT;
      byStatus[apiStatus]++;
      totalAmount += order.total;

      if (order.status === 'PENDING' || order.status === 'DRAFT') {
        pendingApprovalCount++;
      }

      if (
        order.expectedDate &&
        order.expectedDate < now &&
        order.status !== 'RECEIVED' &&
        order.status !== 'CANCELLED'
      ) {
        overdueCount++;
      }
    }

    return {
      total_orders: orders.length,
      by_status: byStatus,
      total_amount: totalAmount,
      pending_approval_count: pendingApprovalCount,
      overdue_count: overdueCount,
    };
  }
}
