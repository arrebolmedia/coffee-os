import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PosService } from '../pos.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryAutomationService } from '../../inventory/inventory-automation.service';

/**
 * Unit coverage for the loyalty 9+1 redemption wired into createTicket().
 *
 * The discount is validated and applied SERVER-SIDE inside the ticket
 * transaction (never trusting a client-supplied amount), points are decremented
 * with a race-safe guard, and a REDEEM LoyaltyTransaction is written for audit.
 */
describe('PosService.createTicket loyalty redemption', () => {
  let service: PosService;

  // Transaction-scoped mock (the callback receives this as `tx`).
  const tx = {
    customer: { findUnique: jest.fn(), updateMany: jest.fn() },
    ticket: { create: jest.fn() },
    loyaltyTransaction: { create: jest.fn() },
    product: { findUnique: jest.fn() },
    order: { create: jest.fn() },
  };

  const mockPrisma = {
    // taxRate lookup happens on the root client, before the transaction.
    product: { findUnique: jest.fn() },
    // findOneTicket() at the end of createTicket.
    ticket: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(tx)),
  };

  const mockInventoryAutomation = {
    autoDeductOnSale: jest.fn(),
  };

  const baseData = {
    locationId: 'loc1',
    userId: 'u1',
    customerId: 'c1',
    lines: [{ productId: 'p1', quantity: 1, unitPrice: 100 }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockInventoryAutomation.autoDeductOnSale.mockResolvedValue({
      status: 'disabled',
    });

    mockPrisma.product.findUnique.mockResolvedValue({ taxRate: 0.16 });
    mockPrisma.ticket.findUnique.mockResolvedValue({ id: 'tk1' });
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(tx));

    tx.ticket.create.mockResolvedValue({
      id: 'tk1',
      locationId: 'loc1',
      userId: 'u1',
      lines: [{ productId: 'p1', quantity: 1, notes: undefined }],
    });
    tx.customer.updateMany.mockResolvedValue({ count: 1 });
    tx.product.findUnique.mockResolvedValue({ preparationTimeMinutes: 0 });
    tx.order.create.mockResolvedValue({ orderNumber: 'ORD-1' });
    tx.loyaltyTransaction.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: InventoryAutomationService,
          useValue: mockInventoryAutomation,
        },
      ],
    }).compile();

    service = module.get<PosService>(PosService);
  });

  it('applies the $50 discount and decrements 9 points when the customer is eligible', async () => {
    tx.customer.findUnique.mockResolvedValue({
      loyaltyPoints: 10,
      organizationId: 'org1',
    });

    await service.createTicket({ ...baseData, redeemLoyalty: true });

    // subtotal 100, tax 16, discount +50 -> total 66.
    const ticketArg = tx.ticket.create.mock.calls[0][0].data;
    expect(ticketArg.subtotal).toBe(100);
    expect(ticketArg.tax).toBe(16);
    expect(ticketArg.discount).toBe(50);
    expect(ticketArg.total).toBe(66);

    // Race-safe decrement guarded by the current balance.
    const decArg = tx.customer.updateMany.mock.calls[0][0];
    expect(decArg.where.loyaltyPoints.gte).toBe(9);
    expect(decArg.data.loyaltyPoints.decrement).toBe(9);

    // Audit REDEEM transaction.
    const txnArg = tx.loyaltyTransaction.create.mock.calls[0][0].data;
    expect(txnArg.type).toBe('REDEEM');
    expect(txnArg.points).toBe(9);
    expect(txnArg.balanceAfter).toBe(1);
    expect(txnArg.organizationId).toBe('org1');
    expect(txnArg.orderId).toBe('tk1');
  });

  it('rejects redemption when the customer has insufficient points', async () => {
    tx.customer.findUnique.mockResolvedValue({
      loyaltyPoints: 5,
      organizationId: 'org1',
    });

    await expect(
      service.createTicket({ ...baseData, redeemLoyalty: true }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.ticket.create).not.toHaveBeenCalled();
    expect(tx.customer.updateMany).not.toHaveBeenCalled();
  });

  it('rejects redemption without a customer', async () => {
    await expect(
      service.createTicket({
        ...baseData,
        customerId: undefined,
        redeemLoyalty: true,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.customer.findUnique).not.toHaveBeenCalled();
  });

  it('does not touch loyalty when redeemLoyalty is not set', async () => {
    await service.createTicket({ ...baseData });

    expect(tx.customer.findUnique).not.toHaveBeenCalled();
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled();

    const ticketArg = tx.ticket.create.mock.calls[0][0].data;
    expect(ticketArg.discount).toBe(0);
    expect(ticketArg.total).toBe(116);
  });
});
