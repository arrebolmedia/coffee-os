import { Test, TestingModule } from '@nestjs/testing';
import { PnLService } from '../pnl.service';
import { ExpensesService } from '../expenses.service';
import { ExpenseCategory } from '../dto';

describe('PnLService', () => {
  let service: PnLService;
  let expensesService: ExpensesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PnLService, ExpensesService],
    }).compile();

    service = module.get<PnLService>(PnLService);
    expensesService = module.get<ExpensesService>(ExpensesService);
  });

  afterEach(() => {
    expensesService['expenses'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePnL', () => {
    beforeEach(async () => {
      // Create sample expenses
      await expensesService.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.RENT,
        description: 'Renta mensual',
        amount: 20000,
      });

      await expensesService.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.UTILITIES,
        description: 'Luz y agua',
        amount: 3000,
      });

      await expensesService.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.LABOR,
        description: 'Nómina',
        amount: 30000,
      });

      await expensesService.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.MARKETING,
        description: 'Facebook Ads',
        amount: 5000,
      });
    });

    it('should calculate P&L statement', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.net_revenue).toBeDefined();
      expect(pnl.cogs).toBeDefined();
      expect(pnl.gross_profit).toBeDefined();
      expect(pnl.gross_margin_percent).toBeDefined();
    });

    it('should calculate operating expenses', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.rent).toBeDefined();
      expect(pnl.utilities).toBeDefined();
      expect(pnl.labor_cost).toBeDefined();
      expect(pnl.marketing).toBeDefined();
      expect(pnl.total_operating_expenses).toBeDefined();
    });

    it('should calculate EBITDA', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.ebitda).toBeDefined();
      expect(pnl.ebitda).toBeGreaterThanOrEqual(0);
    });

    it('should calculate net profit', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.ebit).toBeDefined();
      expect(pnl.ebt).toBeDefined();
      expect(pnl.net_profit).toBeDefined();
      expect(pnl.net_margin_percent).toBeDefined();
    });

    it('should calculate labor percentage', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.labor_percent).toBeDefined();
      expect(pnl.labor_percent).toBeGreaterThanOrEqual(0);
    });

    it('should calculate prime cost', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.prime_cost).toBeDefined();
      expect(pnl.prime_cost_percent).toBeDefined();
      expect(pnl.prime_cost).toBeGreaterThanOrEqual(0);
    });

    it('should calculate break-even point', async () => {
      const pnl = await service.calculatePnL(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(pnl.break_even_point).toBeDefined();
      expect(pnl.break_even_point).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateMonthlyPnL', () => {
    it('should calculate P&L for a specific month', async () => {
      const pnl = await service.calculateMonthlyPnL('org_1', 2024, 1);

      expect(pnl).toBeDefined();
      expect(pnl.organization_id).toBe('org_1');
      expect(pnl.period_start).toBeDefined();
      expect(pnl.period_end).toBeDefined();
      expect(pnl.net_revenue).toBeDefined();
    });
  });

  describe('calculateYearlyPnL', () => {
    it('should calculate P&L for a full year', async () => {
      const pnl = await service.calculateYearlyPnL('org_1', 2024);

      expect(pnl).toBeDefined();
      expect(pnl.organization_id).toBe('org_1');
      expect(pnl.net_revenue).toBeDefined();
      expect(pnl.gross_profit).toBeDefined();
    });
  });

  describe('comparePeriods', () => {
    it('should compare two periods', async () => {
      const comparison = await service.comparePeriods(
        'org_1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-29'),
      );

      expect(comparison.period1).toBeDefined();
      expect(comparison.period2).toBeDefined();
      expect(comparison.changes).toBeDefined();
      expect(comparison.changes.revenue_change).toBeDefined();
      expect(comparison.changes.profit_change).toBeDefined();
    });
  });
});
