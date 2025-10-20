import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { SalesAnalyticsService } from '../sales-analytics.service';
import { ProductAnalyticsService } from '../product-analytics.service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        SalesAnalyticsService,
        ProductAnalyticsService,
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return dashboard summary', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.organization_id).toBe('org_1');
      expect(dashboard.generated_at).toBeInstanceOf(Date);
      expect(dashboard.period_start).toBeInstanceOf(Date);
      expect(dashboard.period_end).toBeInstanceOf(Date);
    });

    it('should include today metrics', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard.today_sales).toBeDefined();
      expect(dashboard.today_orders).toBeDefined();
      expect(dashboard.today_customers).toBeDefined();
      expect(dashboard.today_avg_order_value).toBeDefined();
    });

    it('should include alerts', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard.alerts).toBeDefined();
      expect(Array.isArray(dashboard.alerts)).toBe(true);
      
      if (dashboard.alerts.length > 0) {
        expect(dashboard.alerts[0]).toHaveProperty('type');
        expect(dashboard.alerts[0]).toHaveProperty('category');
        expect(dashboard.alerts[0]).toHaveProperty('message');
      }
    });

    it('should include top products', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard.top_products).toBeDefined();
      expect(Array.isArray(dashboard.top_products)).toBe(true);
      expect(dashboard.top_products.length).toBeGreaterThan(0);
    });

    it('should include top employees', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard.top_employees).toBeDefined();
      expect(Array.isArray(dashboard.top_employees)).toBe(true);
      expect(dashboard.top_employees.length).toBeGreaterThan(0);
      
      if (dashboard.top_employees.length > 0) {
        expect(dashboard.top_employees[0]).toHaveProperty('employee_name');
        expect(dashboard.top_employees[0]).toHaveProperty('sales_generated');
      }
    });

    it('should include sales trend', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard.sales_trend).toBeDefined();
      expect(Array.isArray(dashboard.sales_trend)).toBe(true);
    });

    it('should include customer trend', async () => {
      const dashboard = await service.getDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(dashboard.customer_trend).toBeDefined();
      expect(Array.isArray(dashboard.customer_trend)).toBe(true);
    });
  });

  describe('getKPIDashboard', () => {
    it('should return KPI dashboard', async () => {
      const kpis = await service.getKPIDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(kpis).toBeDefined();
      expect(kpis.organization_id).toBe('org_1');
    });

    it('should include profitability metrics', async () => {
      const kpis = await service.getKPIDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(kpis.gross_margin_percent).toBeDefined();
      expect(kpis.net_margin_percent).toBeDefined();
      expect(kpis.ebitda_margin_percent).toBeDefined();
    });

    it('should include efficiency metrics', async () => {
      const kpis = await service.getKPIDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(kpis.prime_cost_percent).toBeDefined();
      expect(kpis.labor_percent).toBeDefined();
      expect(kpis.cogs_percent).toBeDefined();
    });

    it('should include operational metrics', async () => {
      const kpis = await service.getKPIDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(kpis.avg_order_value).toBeDefined();
      expect(kpis.orders_per_day).toBeDefined();
      expect(kpis.revenue_per_hour).toBeDefined();
    });

    it('should include inventory metrics', async () => {
      const kpis = await service.getKPIDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(kpis.inventory_turnover).toBeDefined();
      expect(kpis.days_of_inventory).toBeDefined();
      expect(kpis.waste_percent).toBeDefined();
    });

    it('should include status indicators', async () => {
      const kpis = await service.getKPIDashboard({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(kpis.status).toBeDefined();
      expect(kpis.status.gross_margin).toBeDefined();
      expect(kpis.status.labor_percent).toBeDefined();
      expect(kpis.status.prime_cost).toBeDefined();
    });
  });
});
