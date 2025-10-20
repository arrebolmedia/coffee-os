import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrdersService } from '../purchase-orders.service';
import { CreatePurchaseOrderDto } from '../dto';
import { PurchaseOrderStatus } from '../interfaces';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchaseOrdersService],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    (service as any).purchaseOrders.clear();
    (service as any).orderCounter = 1;
  });

  describe('create', () => {
    it('should create a purchase order with full data', async () => {
      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.order_number).toMatch(/^PO-\d{4}-\d{6}$/);
      expect(result.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBe(1000); // 10*50 + 5*100
      expect(result.tax_amount).toBe(80);
      expect(result.discount_amount).toBe(10);
      expect(result.shipping_cost).toBe(30);
      expect(result.total_amount).toBe(1100); // 1000 + 80 - 10 + 30
    });

    it('should create order with defaults', async () => {
      const minimalDto: CreatePurchaseOrderDto = {
        organization_id: orgId,
        supplier_id: supplierId,
        items: [
          {
            inventory_item_id: 'item-1',
            quantity_ordered: 2,
            unit_price: 100,
          },
        ],
      };

      const result = await service.create(minimalDto);

      expect(result.tax_amount).toBe(0);
      expect(result.discount_amount).toBe(0);
      expect(result.shipping_cost).toBe(0);
      expect(result.total_amount).toBe(200);
    });

    it('should generate sequential order numbers', async () => {
      const po1 = await service.create(createDto);
      const po2 = await service.create(createDto);

      expect(po1.order_number).toBe(`PO-${new Date().getFullYear()}-000001`);
      expect(po2.order_number).toBe(`PO-${new Date().getFullYear()}-000002`);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        supplier_id: 'supplier-456',
      });
      await service.create({
        ...createDto,
        organization_id: 'org-456',
      });
    });

    it('should return all purchase orders', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: orgId });
      expect(result).toHaveLength(2);
    });

    it('should filter by supplier_id', async () => {
      const result = await service.findAll({ supplier_id: 'supplier-456' });
      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const result = await service.findAll({ status: PurchaseOrderStatus.DRAFT });
      expect(result).toHaveLength(3);
    });

    it('should filter by date range', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      const result = await service.findAll({ from_date: from, to_date: to });
      expect(result).toHaveLength(3);
    });

    it('should search by order number', async () => {
      const po = await service.create(createDto);
      const result = await service.findAll({ search: po.order_number });
      expect(result).toHaveLength(1);
    });

    it('should sort by order_date descending', async () => {
      const result = await service.findAll({ sort_by: 'order_date', order: 'desc' });
      expect(result[0].order_date.getTime()).toBeGreaterThanOrEqual(
        result[result.length - 1].order_date.getTime(),
      );
    });
  });

  describe('findById', () => {
    it('should return purchase order by id', async () => {
      const created = await service.create(createDto);
      const result = await service.findById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update purchase order fields', async () => {
      const created = await service.create(createDto);
      const result = await service.update(created.id, {
        shipping_cost: 50,
        notes: 'Updated notes',
      });

      expect(result.shipping_cost).toBe(50);
      expect(result.notes).toBe('Updated notes');
      expect(result.total_amount).toBe(1120); // 1000 + 80 - 10 + 50
    });

    it('should throw BadRequestException if order is received', async () => {
      const created = await service.create(createDto);
      (service as any).purchaseOrders.get(created.id).status =
        PurchaseOrderStatus.RECEIVED;

      await expect(
        service.update(created.id, { notes: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      const created = await service.create(createDto);
      (service as any).purchaseOrders.get(created.id).status =
        PurchaseOrderStatus.CANCELLED;

      await expect(
        service.update(created.id, { notes: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a draft purchase order', async () => {
      const created = await service.create(createDto);
      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not draft', async () => {
      const created = await service.create(createDto);
      (service as any).purchaseOrders.get(created.id).status =
        PurchaseOrderStatus.APPROVED;

      await expect(service.delete(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should approve a draft purchase order', async () => {
      const created = await service.create(createDto);
      const result = await service.approve(created.id, 'Manager');

      expect(result.status).toBe(PurchaseOrderStatus.APPROVED);
      expect(result.approved_by).toBe('Manager');
      expect(result.approved_at).toBeInstanceOf(Date);
    });

    it('should approve a pending purchase order', async () => {
      const created = await service.create(createDto);
      (service as any).purchaseOrders.get(created.id).status =
        PurchaseOrderStatus.PENDING;

      const result = await service.approve(created.id, 'Manager');
      expect(result.status).toBe(PurchaseOrderStatus.APPROVED);
    });

    it('should throw BadRequestException if not draft or pending', async () => {
      const created = await service.create(createDto);
      (service as any).purchaseOrders.get(created.id).status =
        PurchaseOrderStatus.RECEIVED;

      await expect(service.approve(created.id, 'Manager')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendToSupplier', () => {
    it('should send approved order to supplier', async () => {
      const created = await service.create(createDto);
      await service.approve(created.id, 'Manager');
      const result = await service.sendToSupplier(created.id);

      expect(result.status).toBe(PurchaseOrderStatus.ORDERED);
    });

    it('should throw BadRequestException if not approved', async () => {
      const created = await service.create(createDto);

      await expect(service.sendToSupplier(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('receive', () => {
    it('should partially receive order', async () => {
      const created = await service.create(createDto);
      await service.approve(created.id, 'Manager');
      await service.sendToSupplier(created.id);

      const result = await service.receive(created.id, {
        items: [
          {
            inventory_item_id: 'item-1',
            quantity_received: 5,
          },
        ],
        received_by: 'Warehouse',
      });

      expect(result.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
      expect(result.items[0].quantity_received).toBe(5);
      expect(result.received_by).toBe('Warehouse');
    });

    it('should fully receive order', async () => {
      const created = await service.create(createDto);
      await service.approve(created.id, 'Manager');
      await service.sendToSupplier(created.id);

      const result = await service.receive(created.id, {
        items: [
          {
            inventory_item_id: 'item-1',
            quantity_received: 10,
          },
          {
            inventory_item_id: 'item-2',
            quantity_received: 5,
          },
        ],
        received_by: 'Warehouse',
      });

      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(result.received_at).toBeInstanceOf(Date);
      expect(result.delivery_date).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not ordered', async () => {
      const created = await service.create(createDto);

      await expect(
        service.receive(created.id, {
          items: [],
          received_by: 'Warehouse',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a purchase order', async () => {
      const created = await service.create(createDto);
      const result = await service.cancel(created.id);

      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should throw BadRequestException if already received', async () => {
      const created = await service.create(createDto);
      (service as any).purchaseOrders.get(created.id).status =
        PurchaseOrderStatus.RECEIVED;

      await expect(service.cancel(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already cancelled', async () => {
      const created = await service.create(createDto);
      await service.cancel(created.id);

      await expect(service.cancel(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const po1 = await service.create(createDto);
      const po2 = await service.create({
        ...createDto,
        expected_delivery_date: new Date('2020-01-01'),
      });
      await service.create({
        ...createDto,
        organization_id: 'org-456',
      });

      await service.approve(po1.id, 'Manager');
      await service.sendToSupplier(po1.id);
    });

    it('should return purchase order statistics', async () => {
      const result = await service.getStats(orgId);

      expect(result.total_orders).toBe(2);
      expect(result.by_status[PurchaseOrderStatus.DRAFT]).toBe(1);
      expect(result.by_status[PurchaseOrderStatus.ORDERED]).toBe(1);
      expect(result.total_amount).toBe(2200);
      expect(result.pending_approval_count).toBe(1);
      expect(result.overdue_count).toBe(1);
    });
  });
});
