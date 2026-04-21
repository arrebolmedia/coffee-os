import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { SalesAnalyticsService } from '../sales-analytics.service';
import { ProductAnalyticsService } from '../product-analytics.service';

const defaultQuery = {
  organization_id: 'org_1',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
};

const mockSalesMetrics = {
  period_start: new Date('2024-01-01'),
  period_end: new Date('2024-01-31'),
  organization_id: 'org_1',
  gross_sales: 5000,
  net_sales: 4800,
  discounts: 200,
  refunds: 0,
  taxes: 800,
  total_orders: 50,
  avg_order_value: 100,
  avg_items_per_order: 2,
  total_customers: 40,
  new_customers: 10,
  returning_customers: 30,
  peak_hour: '10:00',
  peak_day: 'viernes',
  hourly_breakdown: [],
  daily_breakdown: [],
  vs_previous_period: {
    gross_sales_change: 500,
    gross_sales_change_percent: 11.1,
    orders_change: 5,
    orders_change_percent: 11.1,
    avg_order_value_change: 5,
    avg_order_value_change_percent: 5.3,
  },
};

const mockTopProducts = [
  {
    product_id: 'prod-1',
    product_name: 'Latte',
    category: 'Café',
    total_sold: 100,
    revenue: 5000,
    profit: 3000,
    profit_margin_percent: 60,
    rank_by_quantity: 1,
    rank_by_revenue: 1,
    rank_by_profit: 1,
    trend: 'UP',
    vs_previous_period_percent: 15,
  },
];

const mockSalesTrend: any[] = [
  { period: '2024-01-15', sales: 500, orders: 5, avg_order_value: 100 },
  { period: '2024-01-16', sales: 600, orders: 6, avg_order_value: 100 },
];

const mockSalesAnalyticsService = {
  getSalesMetrics: jest.fn(),
  getSalesTrend: jest.fn(),
  getTopSellingProducts: jest.fn(),
};

const mockProductAnalyticsService = {
  getTopProducts: jest.fn(),
  getCategoryPerformance: jest.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: SalesAnalyticsService, useValue: mockSalesAnalyticsService },
        { provide: ProductAnalyticsService, useValue: mockProductAnalyticsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);

    jest.clearAllMocks();

    // Default mock returns
    mockSalesAnalyticsService.getSalesMetrics.mockResolvedValue(mockSalesMetrics);
    mockSalesAnalyticsService.getSalesTrend.mockResolvedValue(mockSalesTrend);
    mockSalesAnalyticsService.getTopSellingProducts.mockResolvedValue([]);
    mockProductAnalyticsService.getTopProducts.mockResolvedValue(mockTopProducts);
    mockProductAnalyticsService.getCategoryPerformance.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return dashboard summary', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard).toBeDefined();
      expect(dashboard.organization_id).toBe('org_1');
      expect(dashboard.generated_at).toBeInstanceOf(Date);
      expect(dashboard.period_start).toBeInstanceOf(Date);
      expect(dashboard.period_end).toBeInstanceOf(Date);
    });

    it('should include today metrics', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard.today_sales).toBeDefined();
      expect(dashboard.today_orders).toBeDefined();
      expect(dashboard.today_customers).toBeDefined();
      expect(dashboard.today_avg_order_value).toBeDefined();
    });

    it('should include alerts array', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard.alerts).toBeDefined();
      expect(Array.isArray(dashboard.alerts)).toBe(true);

      if (dashboard.alerts.length > 0) {
        expect(dashboard.alerts[0]).toHaveProperty('type');
        expect(dashboard.alerts[0]).toHaveProperty('category');
        expect(dashboard.alerts[0]).toHaveProperty('message');
      }
    });

    it('should include top products', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard.top_products).toBeDefined();
      expect(Array.isArray(dashboard.top_products)).toBe(true);
      expect(dashboard.top_products.length).toBeGreaterThan(0);
    });

    it('should include top employees array', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard.top_employees).toBeDefined();
      expect(Array.isArray(dashboard.top_employees)).toBe(true);
    });

    it('should include sales trend', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard.sales_trend).toBeDefined();
      expect(Array.isArray(dashboard.sales_trend)).toBe(true);
    });

    it('should include customer trend', async () => {
      const dashboard = await service.getDashboard(defaultQuery);

      expect(dashboard.customer_trend).toBeDefined();
      expect(Array.isArray(dashboard.customer_trend)).toBe(true);
    });

    it('should call salesAnalyticsService with today query', async () => {
      await service.getDashboard(defaultQuery);

      expect(mockSalesAnalyticsService.getSalesMetrics).toHaveBeenCalled();
    });

    it('should call productAnalyticsService.getTopProducts', async () => {
      await service.getDashboard(defaultQuery);

      expect(mockProductAnalyticsService.getTopProducts).toHaveBeenCalled();
    });
  });

  describe('getKPIDashboard', () => {
    it('should return KPI dashboard', async () => {
      const kpis = await service.getKPIDashboard(defaultQuery);

      expect(kpis).toBeDefined();
      expect(kpis.organization_id).toBe('org_1');
    });

    it('should include profitability metrics', async () => {
      const kpis = await service.getKPIDashboard(defaultQuery);

      expect(kpis.gross_margin_percent).toBeDefined();
      expect(kpis.net_margin_percent).toBeDefined();
      expect(kpis.ebitda_margin_percent).toBeDefined();
    });

    it('should include efficiency metrics', async () => {
      const kpis = await service.getKPIDashboard(defaultQuery);

      expect(kpis.prime_cost_percent).toBeDefined();
      expect(kpis.labor_percent).toBeDefined();
      expect(kpis.cogs_percent).toBeDefined();
    });

    it('should include operational metrics', async () => {
      const kpis = await service.getKPIDashboard(defaultQuery);

      expect(kpis.avg_order_value).toBeDefined();
      expect(kpis.orders_per_day).toBeDefined();
      expect(kpis.revenue_per_hour).toBeDefined();
    });

    it('should include inventory metrics', async () => {
      const kpis = await service.getKPIDashboard(defaultQuery);

      expect(kpis.inventory_turnover).toBeDefined();
      expect(kpis.days_of_inventory).toBeDefined();
      expect(kpis.waste_percent).toBeDefined();
    });

    it('should include status indicators', async () => {
      const kpis = await service.getKPIDashboard(defaultQuery);

      expect(kpis.status).toBeDefined();
    });
  });
});
