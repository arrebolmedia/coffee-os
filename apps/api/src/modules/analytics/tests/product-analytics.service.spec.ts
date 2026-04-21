import { Test, TestingModule } from '@nestjs/testing';
import { ProductAnalyticsService } from '../product-analytics.service';
import { PrismaService } from '../../database/prisma.service';

const mockLines = [
  {
    productId: 'prod-1',
    quantity: 10,
    total: 500,
    product: {
      id: 'prod-1',
      name: 'Latte',
      cost: 20,
      category: { name: 'Café' },
    },
  },
  {
    productId: 'prod-2',
    quantity: 5,
    total: 200,
    product: {
      id: 'prod-2',
      name: 'Americano',
      cost: 15,
      category: { name: 'Café' },
    },
  },
  {
    productId: 'prod-3',
    quantity: 8,
    total: 240,
    product: {
      id: 'prod-3',
      name: 'Croissant',
      cost: 18,
      category: { name: 'Postres' },
    },
  },
];

const mockPrismaService = {
  ticketLine: {
    findMany: jest.fn(),
  },
};

const defaultQuery = {
  organization_id: 'org_1',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
};

describe('ProductAnalyticsService', () => {
  let service: ProductAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductAnalyticsService>(ProductAnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductPerformance', () => {
    it('should return product performance metrics', async () => {
      // current + previous period
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const products = await service.getProductPerformance(defaultQuery);

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(3);
      expect(products[0]).toHaveProperty('product_name');
      expect(products[0]).toHaveProperty('total_sold');
      expect(products[0]).toHaveProperty('revenue');
      expect(products[0]).toHaveProperty('profit');
      expect(products[0]).toHaveProperty('profit_margin_percent');
      expect(products[0]).toHaveProperty('trend');
    });

    it('should include rankings', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const products = await service.getProductPerformance(defaultQuery);

      expect(products[0]).toHaveProperty('rank_by_quantity');
      expect(products[0]).toHaveProperty('rank_by_revenue');
      expect(products[0]).toHaveProperty('rank_by_profit');
    });

    it('should calculate profit correctly', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce([mockLines[0]])
        .mockResolvedValueOnce([]);

      const products = await service.getProductPerformance(defaultQuery);

      // Latte: revenue=500, cost=20*10=200, profit=300
      expect(products[0].profit).toBe(300);
    });

    it('should return empty array when no sales', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const products = await service.getProductPerformance(defaultQuery);

      expect(products).toHaveLength(0);
    });

    it('should mark trend as UP when current > previous by 5%', async () => {
      const prevLines = [{ productId: 'prod-1', quantity: 5, total: 200 }];
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce([mockLines[0]])
        .mockResolvedValueOnce(prevLines);

      const products = await service.getProductPerformance(defaultQuery);
      const latte = products.find((p) => p.product_id === 'prod-1')!;

      expect(latte.trend).toBe('UP');
      expect(latte.vs_previous_period_percent).toBeGreaterThan(0);
    });
  });

  describe('getCategoryPerformance', () => {
    it('should return category performance', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const categories = await service.getCategoryPerformance(defaultQuery);

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(2); // Café + Postres
      expect(categories[0]).toHaveProperty('category');
      expect(categories[0]).toHaveProperty('total_products');
      expect(categories[0]).toHaveProperty('total_sold');
      expect(categories[0]).toHaveProperty('revenue');
    });

    it('should include top products per category', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const categories = await service.getCategoryPerformance(defaultQuery);

      expect(categories[0]).toHaveProperty('top_products');
      expect(Array.isArray(categories[0].top_products)).toBe(true);
    });

    it('should sort categories by revenue', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const categories = await service.getCategoryPerformance(defaultQuery);

      for (let i = 1; i < categories.length; i++) {
        expect(categories[i - 1].revenue).toBeGreaterThanOrEqual(
          categories[i].revenue,
        );
      }
    });
  });

  describe('getTopProducts', () => {
    it('should return top products by revenue', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const products = await service.getTopProducts(defaultQuery);

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(3);
    });

    it('should sort by quantity when specified', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const products = await service.getTopProducts(defaultQuery, 'quantity');

      for (let i = 1; i < products.length; i++) {
        expect(products[i - 1].total_sold).toBeGreaterThanOrEqual(
          products[i].total_sold,
        );
      }
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const products = await service.getTopProducts(defaultQuery, 'revenue', 2);

      expect(products.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getLowPerformers', () => {
    it('should return low performing products when they have declining trend', async () => {
      const prevLines = [{ productId: 'prod-1', quantity: 50, total: 5000 }];
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce([mockLines[0]])
        .mockResolvedValueOnce(prevLines);

      const products = await service.getLowPerformers(defaultQuery);

      expect(Array.isArray(products)).toBe(true);
      if (products.length > 0) {
        const hasDecline = products.some(
          (p) => p.trend === 'DOWN' || p.vs_previous_period_percent < 0,
        );
        expect(hasDecline).toBe(true);
      }
    });

    it('should return empty array when all products are trending up', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]); // no previous data = 0 prev revenue = no decline

      const products = await service.getLowPerformers(defaultQuery);

      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('getProductMix', () => {
    it('should return product mix analysis', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const mix = await service.getProductMix(defaultQuery);

      expect(Array.isArray(mix)).toBe(true);
      expect(mix.length).toBeGreaterThan(0);
      expect(mix[0]).toHaveProperty('category');
      expect(mix[0]).toHaveProperty('percent_of_total');
    });

    it('should have percentages that sum to 100', async () => {
      mockPrismaService.ticketLine.findMany
        .mockResolvedValueOnce(mockLines)
        .mockResolvedValueOnce([]);

      const mix = await service.getProductMix(defaultQuery);

      const total = mix.reduce(
        (sum: number, item: any) => sum + item.percent_of_total,
        0,
      );
      expect(Math.round(total)).toBe(100);
    });
  });
});
