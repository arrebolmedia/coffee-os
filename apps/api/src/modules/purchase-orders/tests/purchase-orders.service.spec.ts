import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrdersService } from '../purchase-orders.service';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseOrderDto } from '../dto';
import { PurchaseOrderStatus } from '../interfaces';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;

  const orgId = 'org-123';
  const supplierId = 'supplier-123';

  const createDto: CreatePurchaseOrderDto = {
    organization_id: orgId,
    supplier_id: supplierId,
    items: [
      {
        inventory_item_id: 'item-1',
        quantity_ordered: 10,
        unit_price: 50,
        notes: 'Item 1',
      },
      {
        inventory_item_id: 'item-2',
        quantity_ordered: 5,
        unit_price: 100,
      },
    ],
    tax_amount: 80,
    discount_amount: 10,
    shipping_cost: 30,
    expected_delivery_date: new Date('2025-11-01'),
    requested_by: 'John Doe',
    notes: 'Urgent order',
  };

  // ---------------------------------------------------------------------------
  // Helpers to build Prisma-shaped rows (camelCase, UPPERCASE status).
  // ---------------------------------------------------------------------------
  const prismaItem = (
    overrides: Partial<{
      id: string;
      inventoryItemId: string;
      quantityOrdered: number;
      quantityReceived: number;
      unitPrice: number;
      subtotal: number;
      inventoryItem: { id: string; name: string };
    }> = {},
  ) => ({
    id: overrides.id ?? 'poi-1',
    purchaseOrderId: 'po-1',
    inventoryItemId: overrides.inventoryItemId ?? 'item-1',
    quantityOrdered: overrides.quantityOrdered ?? 10,
    quantityReceived: overrides.quantityReceived ?? 0,
    unitPrice: overrides.unitPrice ?? 50,
    subtotal: overrides.subtotal ?? 500,
    notes: null,
    inventoryItem: overrides.inventoryItem ?? { id: 'item-1', name: 'Coffee' },
  });

  const prismaPO = (overrides: any = {}) => ({
    id: overrides.id ?? 'po-1',
    organizationId: overrides.organizationId ?? orgId,
    locationId: null,
    supplierId: overrides.supplierId ?? supplierId,
    poNumber: overrides.poNumber ?? 'PO-20250115-abc12345',
    status: overrides.status ?? 'DRAFT',
    requestedBy: overrides.requestedBy ?? 'John Doe',
    approvedBy: overrides.approvedBy ?? null,
    orderDate: overrides.orderDate ?? new Date('2025-01-15'),
    expectedDate: overrides.expectedDate ?? null,
    receivedDate: overrides.receivedDate ?? null,
    subtotal: overrides.subtotal ?? 1000,
    tax: overrides.tax ?? 80,
    total: overrides.total ?? 1100,
    notes: overrides.notes ?? null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    supplier: overrides.supplier ?? { id: supplierId, name: 'Acme Supplies' },
    items: overrides.items ?? [
      prismaItem({ id: 'poi-1', inventoryItemId: 'item-1' }),
      prismaItem({
        id: 'poi-2',
        inventoryItemId: 'item-2',
        quantityOrdered: 5,
        unitPrice: 100,
        subtotal: 500,
        inventoryItem: { id: 'item-2', name: 'Milk' },
      }),
    ],
  });

  const prismaMock = {
    purchaseOrder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    purchaseOrderItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    goodsReceipt: {
      create: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    inventoryItem: {
      update: jest.fn(),
    },
    // $transaction(callback) → run callback with a tx that proxies to prismaMock
    $transaction: jest.fn((cb: any) => cb(prismaMock)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  describe('create', () => {
    it('should create a purchase order and map it to the API shape', async () => {
      prismaMock.purchaseOrder.create.mockResolvedValue(prismaPO());

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('po-1');
      expect(result.order_number).toBe('PO-20250115-abc12345');
      expect(result.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBe(1000);
      expect(result.tax_amount).toBe(80);
      expect(result.total_amount).toBe(1100);
      expect(result.items[0].quantity_ordered).toBe(10);
      expect(result.items[0].unit_price).toBe(50);
      expect(result.items[0].subtotal).toBe(500);
    });

    it('should persist a generated PO number (PO-YYYYMMDD-xxxxxxxx) and DRAFT status', async () => {
      prismaMock.purchaseOrder.create.mockResolvedValue(prismaPO());

      await service.create(createDto);

      const arg = prismaMock.purchaseOrder.create.mock.calls[0][0];
      expect(arg.data.status).toBe('DRAFT');
      expect(arg.data.poNumber).toMatch(/^PO-\d{8}-[0-9a-f]{8}$/);
      expect(arg.data.organizationId).toBe(orgId);
      expect(arg.data.supplierId).toBe(supplierId);
    });

    it('should compute subtotal/tax/total from items and dto', async () => {
      prismaMock.purchaseOrder.create.mockResolvedValue(prismaPO());

      await service.create(createDto);

      const arg = prismaMock.purchaseOrder.create.mock.calls[0][0];
      // 10*50 + 5*100 = 1000
      expect(arg.data.subtotal).toBe(1000);
      expect(arg.data.tax).toBe(80);
      // 1000 + 80 - 10 + 30 = 1100
      expect(arg.data.total).toBe(1100);
      expect(arg.data.items.create).toHaveLength(2);
    });

    it('should default tax to 0 with minimal dto', async () => {
      prismaMock.purchaseOrder.create.mockResolvedValue(
        prismaPO({ subtotal: 200, tax: 0, total: 200 }),
      );

      await service.create({
        organization_id: orgId,
        supplier_id: supplierId,
        items: [
          { inventory_item_id: 'item-1', quantity_ordered: 2, unit_price: 100 },
        ],
      });

      const arg = prismaMock.purchaseOrder.create.mock.calls[0][0];
      expect(arg.data.tax).toBe(0);
      expect(arg.data.subtotal).toBe(200);
      expect(arg.data.total).toBe(200);
    });
  });

  describe('findAll', () => {
    it('should return mapped purchase orders', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([
        prismaPO(),
        prismaPO({ id: 'po-2', poNumber: 'PO-20250116-def67890' }),
      ]);

      const result = await service.findAll({ organization_id: orgId });

      expect(result).toHaveLength(2);
      expect(result[0].order_number).toBe('PO-20250115-abc12345');
      expect(result[0].status).toBe(PurchaseOrderStatus.DRAFT);
    });

    it('should filter by organizationId', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);

      await service.findAll({ organization_id: orgId });

      const arg = prismaMock.purchaseOrder.findMany.mock.calls[0][0];
      expect(arg.where.organizationId).toBe(orgId);
    });

    it('should filter by supplier_id', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);

      await service.findAll({ supplier_id: 'supplier-456' });

      const arg = prismaMock.purchaseOrder.findMany.mock.calls[0][0];
      expect(arg.where.supplierId).toBe('supplier-456');
    });

    it('should map lowercase status filter to UPPERCASE Prisma enum', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);

      await service.findAll({ status: PurchaseOrderStatus.PARTIALLY_RECEIVED });

      const arg = prismaMock.purchaseOrder.findMany.mock.calls[0][0];
      expect(arg.where.status).toBe('PARTIALLY_RECEIVED');
    });

    it('should filter by date range on orderDate', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      await service.findAll({ from_date: from, to_date: to });

      const arg = prismaMock.purchaseOrder.findMany.mock.calls[0][0];
      expect(arg.where.orderDate.gte).toBe(from);
      expect(arg.where.orderDate.lte).toBe(to);
    });

    it('should pass a case-insensitive search filter on poNumber', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'PO-2025' });

      const arg = prismaMock.purchaseOrder.findMany.mock.calls[0][0];
      expect(arg.where.poNumber).toEqual({
        contains: 'PO-2025',
        mode: 'insensitive',
      });
    });
  });

  describe('findById', () => {
    it('should return purchase order by id', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());

      const result = await service.findById('po-1');

      expect(result.id).toBe('po-1');
      expect(result.supplier_name).toBe('Acme Supplies');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update fields and recompute total', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ notes: 'Updated notes', total: 1080 }),
      );

      const result = await service.update('po-1', {
        notes: 'Updated notes',
        tax_amount: 80,
      });

      expect(result.notes).toBe('Updated notes');
      const arg = prismaMock.purchaseOrder.update.mock.calls[0][0];
      // subtotal (1000) + tax (80) - 0 + 0 = 1080
      expect(arg.data.total).toBe(1080);
      expect(arg.data.tax).toBe(80);
    });

    it('should replace items in a transaction when items provided', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());
      prismaMock.purchaseOrder.update.mockResolvedValue(prismaPO());

      await service.update('po-1', {
        items: [
          { inventory_item_id: 'item-9', quantity_ordered: 2, unit_price: 25 },
        ],
      });

      expect(prismaMock.purchaseOrderItem.deleteMany).toHaveBeenCalledWith({
        where: { purchaseOrderId: 'po-1' },
      });
      expect(prismaMock.purchaseOrderItem.createMany).toHaveBeenCalled();
      const updateArg = prismaMock.purchaseOrder.update.mock.calls[0][0];
      // new subtotal 2*25 = 50
      expect(updateArg.data.subtotal).toBe(50);
    });

    it('should throw BadRequestException if order is received', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'RECEIVED' }),
      );

      await expect(service.update('po-1', { notes: 'Test' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'CANCELLED' }),
      );

      await expect(service.update('po-1', { notes: 'Test' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a draft purchase order', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());
      prismaMock.purchaseOrder.delete.mockResolvedValue(prismaPO());

      await service.delete('po-1');

      expect(prismaMock.purchaseOrder.delete).toHaveBeenCalledWith({
        where: { id: 'po-1' },
      });
    });

    it('should throw BadRequestException if not draft', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'APPROVED' }),
      );

      await expect(service.delete('po-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve a draft purchase order', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ status: 'APPROVED', approvedBy: 'Manager' }),
      );

      const result = await service.approve('po-1', 'Manager');

      expect(result.status).toBe(PurchaseOrderStatus.APPROVED);
      expect(result.approved_by).toBe('Manager');
      const arg = prismaMock.purchaseOrder.update.mock.calls[0][0];
      expect(arg.data).toMatchObject({
        status: 'APPROVED',
        approvedBy: 'Manager',
      });
    });

    it('should approve a pending purchase order', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'PENDING' }),
      );
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ status: 'APPROVED' }),
      );

      const result = await service.approve('po-1', 'Manager');
      expect(result.status).toBe(PurchaseOrderStatus.APPROVED);
    });

    it('should throw BadRequestException if not draft or pending', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'RECEIVED' }),
      );

      await expect(service.approve('po-1', 'Manager')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendToSupplier', () => {
    it('should send approved order to supplier', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'APPROVED' }),
      );
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ status: 'ORDERED' }),
      );

      const result = await service.sendToSupplier('po-1');

      expect(result.status).toBe(PurchaseOrderStatus.ORDERED);
    });

    it('should throw BadRequestException if not approved', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());

      await expect(service.sendToSupplier('po-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('receive', () => {
    it('should partially receive order and update inventory', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'ORDERED' }),
      );
      // After receiving 5 of item-1 (ordered 10), not all received.
      prismaMock.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', quantityOrdered: 10, quantityReceived: 5 },
        { id: 'poi-2', quantityOrdered: 5, quantityReceived: 0 },
      ]);
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ status: 'PARTIALLY_RECEIVED' }),
      );

      const result = await service.receive('po-1', {
        items: [{ inventory_item_id: 'item-1', quantity_received: 5 }],
        received_by: 'Warehouse',
      });

      expect(result.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);

      // Inventory integration assertions
      expect(prismaMock.purchaseOrderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'poi-1' },
          data: expect.objectContaining({
            quantityReceived: { increment: 5 },
          }),
        }),
      );
      expect(prismaMock.goodsReceipt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseOrderId: 'po-1',
            inventoryItemId: 'item-1',
            quantity: 5,
            unitCost: 50,
          }),
        }),
      );
      expect(prismaMock.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inventoryItemId: 'item-1',
            type: 'IN',
            quantity: 5,
            reason: 'PURCHASE',
          }),
        }),
      );
      expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { currentStock: { increment: 5 } },
        }),
      );
    });

    it('should fully receive order and set RECEIVED with receivedDate', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'ORDERED' }),
      );
      prismaMock.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', quantityOrdered: 10, quantityReceived: 10 },
        { id: 'poi-2', quantityOrdered: 5, quantityReceived: 5 },
      ]);
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ status: 'RECEIVED', receivedDate: new Date() }),
      );

      const result = await service.receive('po-1', {
        items: [
          { inventory_item_id: 'item-1', quantity_received: 10 },
          { inventory_item_id: 'item-2', quantity_received: 5 },
        ],
        received_by: 'Warehouse',
      });

      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED);
      const updateArg = prismaMock.purchaseOrder.update.mock.calls[0][0];
      expect(updateArg.data.status).toBe('RECEIVED');
      expect(updateArg.data.receivedDate).toBeInstanceOf(Date);
      expect(prismaMock.inventoryItem.update).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException if not ordered or partially received', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());

      await expect(
        service.receive('po-1', {
          items: [{ inventory_item_id: 'item-1', quantity_received: 1 }],
          received_by: 'Warehouse',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject items not in the purchase order', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'ORDERED' }),
      );

      await expect(
        service.receive('po-1', {
          items: [{ inventory_item_id: 'unknown-item', quantity_received: 1 }],
          received_by: 'Warehouse',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a purchase order', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(prismaPO());
      prismaMock.purchaseOrder.update.mockResolvedValue(
        prismaPO({ status: 'CANCELLED' }),
      );

      const result = await service.cancel('po-1');

      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should throw BadRequestException if already received', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'RECEIVED' }),
      );

      await expect(service.cancel('po-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already cancelled', async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(
        prismaPO({ status: 'CANCELLED' }),
      );

      await expect(service.cancel('po-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should aggregate purchase order statistics by status', async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([
        { status: 'ORDERED', total: 1100, expectedDate: null },
        {
          status: 'DRAFT',
          total: 1100,
          expectedDate: new Date('2020-01-01'),
        },
      ]);

      const result = await service.getStats(orgId);

      expect(result.total_orders).toBe(2);
      expect(result.total_amount).toBe(2200);
      expect(result.by_status[PurchaseOrderStatus.ORDERED]).toBe(1);
      expect(result.by_status[PurchaseOrderStatus.DRAFT]).toBe(1);
      expect(result.pending_approval_count).toBe(1); // the DRAFT one
      expect(result.overdue_count).toBe(1); // DRAFT with past expectedDate
    });
  });
});
