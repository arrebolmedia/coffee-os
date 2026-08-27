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
    // findOneTicket() at the end of createTicket: consulta acotada por
    // organizacion, asi que va por findFirst.
    ticket: { findFirst: jest.fn() },
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
    mockPrisma.ticket.findFirst.mockResolvedValue({ id: 'tk1' });
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

    // El descuento reduce la base gravable: subtotal 100, descuento 50, así que
    // el IVA va sobre 50 -> 8, y el total es 58.
    //
    // Antes se afirmaba tax 16 y total 66, es decir, el IVA calculado sobre el
    // subtotal sin descontar: $8 de más al cliente en cada canje de lealtad. Y
    // el carrito del POS sí descontaba antes de calcular, de modo que la
    // pantalla y el cobro no coincidían.
    const ticketArg = tx.ticket.create.mock.calls[0][0].data;
    expect(ticketArg.subtotal).toBe(100);
    expect(ticketArg.tax).toBe(8);
    expect(ticketArg.discount).toBe(50);
    expect(ticketArg.total).toBe(58);

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

  describe('numero de ticket', () => {
    // El numero se imprime en el ticket del cliente. Salia de
    // `toISOString()`, o sea en UTC: una venta de las 19:25 se numeraba con la
    // fecha del dia siguiente. En la base de desarrollo hay seis asi, cobrados
    // la tarde del 26 de agosto y sellados TKT-20260827.
    afterEach(() => jest.useRealTimers());

    it('lleva la fecha de la cafeteria, no la de UTC', async () => {
      jest.useFakeTimers({ now: new Date('2026-08-27T01:25:00.000Z') });

      await service.createTicket({ ...baseData });

      expect(tx.ticket.create.mock.calls[0][0].data.ticketNumber).toMatch(
        /^TKT-20260826-/,
      );
    });

    it('a mediodia coincide con la fecha UTC, que es lo esperable', async () => {
      jest.useFakeTimers({ now: new Date('2026-08-27T18:00:00.000Z') });

      await service.createTicket({ ...baseData });

      expect(tx.ticket.create.mock.calls[0][0].data.ticketNumber).toMatch(
        /^TKT-20260827-/,
      );
    });
  });
});
