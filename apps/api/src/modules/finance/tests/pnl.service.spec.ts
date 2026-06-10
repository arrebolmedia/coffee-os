import { Test, TestingModule } from '@nestjs/testing';
import { PnLService } from '../pnl.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  location: { findMany: jest.fn() },
  ticket: { aggregate: jest.fn() },
  ticketLine: { findMany: jest.fn() },
  expense: { groupBy: jest.fn() },
  organization: { findUnique: jest.fn() },
};

describe('PnLService', () => {
  let service: PnLService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PnLService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PnLService>(PnLService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePnL', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');

    beforeEach(() => {
      mockPrismaService.location.findMany.mockResolvedValue([{ id: 'loc_1' }]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { total: 150000, discount: 5000, subtotal: 145000 },
      });
      mockPrismaService.ticketLine.findMany.mockResolvedValue([
        { quantity: 1000, product: { cost: 45 } }, // 45,000 COGS
      ]);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { category: 'RENT', _sum: { totalAmount: 20000 } },
        { category: 'UTILITIES', _sum: { totalAmount: 3000 } },
        { category: 'MARKETING', _sum: { totalAmount: 2000 } },
      ]);
    });

    it('should calculate PnL with real data', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.organization_id).toBe('org_1');
      expect(pnl.gross_revenue).toBe(150000);
      expect(pnl.discounts).toBe(5000);
      expect(pnl.net_revenue).toBe(150000);
      expect(pnl.rent).toBe(20000);
      expect(pnl.utilities).toBe(3000);
      expect(pnl.marketing).toBe(2000);
    });

    it('should calculate COGS from ticket lines (quantity * product.cost)', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);

      // 1000 units * $45 cost = $45,000
      expect(pnl.cogs).toBe(45000);
      expect(pnl.gross_profit).toBe(pnl.net_revenue - 45000);
      expect(pnl.cogs_estimated).toBeUndefined();
    });

    it('should flag cogs_estimated when any product cost is null', async () => {
      mockPrismaService.ticketLine.findMany.mockResolvedValueOnce([
        { quantity: 10, product: { cost: 5 } },
        { quantity: 5, product: { cost: null } },
      ]);

      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.cogs).toBe(50); // only the one with cost counts
      expect(pnl.cogs_estimated).toBe(true);
    });

    it('should use default tax rate (0.30) when org has no setting and flag it', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);
      expect(pnl.tax_rate_default_used).toBe(true);
    });

    it('should handle zero revenue gracefully', async () => {
      mockPrismaService.ticket.aggregate.mockResolvedValueOnce({
        _sum: { total: 0, discount: 0, subtotal: 0 },
      });
      mockPrismaService.ticketLine.findMany.mockResolvedValueOnce([]);

      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.net_revenue).toBe(0);
      expect(pnl.gross_margin_percent).toBe(0);
      expect(pnl.net_margin_percent).toBe(0);
    });

    it('should return correct period dates', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.period_start).toEqual(start);
      expect(pnl.period_end).toEqual(end);
    });
  });

  describe('calculateMonthlyPnL', () => {
    it('should calculate for correct month range', async () => {
      mockPrismaService.location.findMany.mockResolvedValue([{ id: 'loc_1' }]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { total: 100000, discount: 0, subtotal: 100000 },
      });
      mockPrismaService.ticketLine.findMany.mockResolvedValue([]);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const pnl = await service.calculateMonthlyPnL('org_1', 2026, 4);

      expect(pnl.period_start.getMonth()).toBe(3); // April = index 3
      expect(pnl.period_start.getFullYear()).toBe(2026);
    });
  });

  describe('comparePeriods', () => {
    it('should return change calculations between two periods', async () => {
      mockPrismaService.location.findMany.mockResolvedValue([{ id: 'loc_1' }]);
      mockPrismaService.ticket.aggregate
        .mockResolvedValueOnce({
          _sum: { total: 100000, discount: 0, subtotal: 100000 },
        })
        .mockResolvedValueOnce({
          _sum: { total: 120000, discount: 0, subtotal: 120000 },
        });
      mockPrismaService.ticketLine.findMany.mockResolvedValue([]);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const result = await service.comparePeriods(
        'org_1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );

      expect(result.period1).toBeDefined();
      expect(result.period2).toBeDefined();
      expect(result.changes.revenue_change).toBe(20000);
      expect(result.changes.revenue_change_percent).toBeCloseTo(20, 0);
    });
  });
});
