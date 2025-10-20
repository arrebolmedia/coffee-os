import { Test, TestingModule } from '@nestjs/testing';
import { SalesAnalyticsService } from '../sales-analytics.service';
import { TimeGranularity } from '../dto';

describe('SalesAnalyticsService', () => {
  let service: SalesAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesAnalyticsService],
    }).compile();

    service = module.get<SalesAnalyticsService>(SalesAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesMetrics', () => {
    it('should return sales metrics for period', async () => {
      const metrics = await service.getSalesMetrics({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(metrics.gross_sales).toBeDefined();
      expect(metrics.net_sales).toBeDefined();
      expect(metrics.total_orders).toBeDefined();
      expect(metrics.avg_order_value).toBeDefined();
      expect(metrics.total_customers).toBeDefined();
    });

    it('should calculate net sales correctly', async () => {
      const metrics = await service.getSalesMetrics({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      const expectedNet = metrics.gross_sales - metrics.discounts - metrics.refunds;
      expect(metrics.net_sales).toBe(expectedNet);
    });

    it('should include hourly breakdown', async () => {
      const metrics = await service.getSalesMetrics({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(metrics.hourly_breakdown).toBeDefined();
      expect(metrics.hourly_breakdown!.length).toBeGreaterThan(0);
      expect(metrics.hourly_breakdown![0]).toHaveProperty('hour');
      expect(metrics.hourly_breakdown![0]).toHaveProperty('sales');
      expect(metrics.hourly_breakdown![0]).toHaveProperty('orders');
    });

    it('should include daily breakdown', async () => {
      const metrics = await service.getSalesMetrics({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      });

      expect(metrics.daily_breakdown).toBeDefined();
      expect(metrics.daily_breakdown!.length).toBe(7);
    });

    it('should include comparison with previous period', async () => {
      const metrics = await service.getSalesMetrics({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(metrics.vs_previous_period).toBeDefined();
      expect(metrics.vs_previous_period!.gross_sales_change).toBeDefined();
      expect(metrics.vs_previous_period!.gross_sales_change_percent).toBeDefined();
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return top products', async () => {
      const products = await service.getTopSellingProducts({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('product_name');
      expect(products[0]).toHaveProperty('quantity_sold');
      expect(products[0]).toHaveProperty('revenue');
    });

    it('should respect limit parameter', async () => {
      const products = await service.getTopSellingProducts(
        {
          organization_id: 'org_1',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
        5,
      );

      expect(products.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getSalesByCategory', () => {
    it('should return sales breakdown by category', async () => {
      const categories = await service.getSalesByCategory({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('category');
      expect(categories[0]).toHaveProperty('total_sold');
      expect(categories[0]).toHaveProperty('revenue');
      expect(categories[0]).toHaveProperty('percent_of_total');
    });
  });

  describe('getSalesTrend', () => {
    it('should return daily trend', async () => {
      const trend = await service.getSalesTrend({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      });

      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBe(7);
    });

    it('should handle different granularities', async () => {
      const trend = await service.getSalesTrend(
        {
          organization_id: 'org_1',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
        TimeGranularity.WEEKLY,
      );

      expect(Array.isArray(trend)).toBe(true);
    });
  });
});
