import { Test, TestingModule } from '@nestjs/testing';
import { ProductAnalyticsService } from '../product-analytics.service';

describe('ProductAnalyticsService', () => {
  let service: ProductAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductAnalyticsService],
    }).compile();

    service = module.get<ProductAnalyticsService>(ProductAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductPerformance', () => {
    it('should return product performance metrics', async () => {
      const products = await service.getProductPerformance({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('product_name');
      expect(products[0]).toHaveProperty('total_sold');
      expect(products[0]).toHaveProperty('revenue');
      expect(products[0]).toHaveProperty('profit');
      expect(products[0]).toHaveProperty('profit_margin_percent');
      expect(products[0]).toHaveProperty('trend');
    });

    it('should include rankings', async () => {
      const products = await service.getProductPerformance({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(products[0]).toHaveProperty('rank_by_quantity');
      expect(products[0]).toHaveProperty('rank_by_revenue');
      expect(products[0]).toHaveProperty('rank_by_profit');
    });
  });

  describe('getCategoryPerformance', () => {
    it('should return category performance', async () => {
      const categories = await service.getCategoryPerformance({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('category');
      expect(categories[0]).toHaveProperty('total_products');
      expect(categories[0]).toHaveProperty('total_sold');
      expect(categories[0]).toHaveProperty('revenue');
    });

    it('should include top products per category', async () => {
      const categories = await service.getCategoryPerformance({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(categories[0]).toHaveProperty('top_products');
      expect(Array.isArray(categories[0].top_products)).toBe(true);
    });

    it('should sort categories by revenue', async () => {
      const categories = await service.getCategoryPerformance({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      for (let i = 1; i < categories.length; i++) {
        expect(categories[i - 1].revenue).toBeGreaterThanOrEqual(
          categories[i].revenue,
        );
      }
    });
  });

  describe('getTopProducts', () => {
    it('should return top products by revenue', async () => {
      const products = await service.getTopProducts({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    it('should sort by quantity when specified', async () => {
      const products = await service.getTopProducts(
        {
          organization_id: 'org_1',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
        'quantity',
      );

      for (let i = 1; i < products.length; i++) {
        expect(products[i - 1].total_sold).toBeGreaterThanOrEqual(
          products[i].total_sold,
        );
      }
    });

    it('should respect limit parameter', async () => {
      const products = await service.getTopProducts(
        {
          organization_id: 'org_1',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
        'revenue',
        3,
      );

      expect(products.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getLowPerformers', () => {
    it('should return low performing products', async () => {
      const products = await service.getLowPerformers({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(products)).toBe(true);
      
      // Check that returned products have declining trend
      if (products.length > 0) {
        const hasDecline = products.some(
          (p) => p.trend === 'DOWN' || p.vs_previous_period_percent < 0,
        );
        expect(hasDecline).toBe(true);
      }
    });
  });

  describe('getProductMix', () => {
    it('should return product mix analysis', async () => {
      const mix = await service.getProductMix({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(Array.isArray(mix)).toBe(true);
      expect(mix.length).toBeGreaterThan(0);
      expect(mix[0]).toHaveProperty('category');
      expect(mix[0]).toHaveProperty('percent_of_total');
    });

    it('should have percentages that sum to 100', async () => {
      const mix = await service.getProductMix({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      const total = mix.reduce((sum, item) => sum + item.percent_of_total, 0);
      expect(Math.round(total)).toBe(100);
    });
  });
});
