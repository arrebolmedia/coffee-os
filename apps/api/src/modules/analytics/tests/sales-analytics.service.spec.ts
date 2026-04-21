import { Test, TestingModule } from '@nestjs/testing';
import { SalesAnalyticsService } from '../sales-analytics.service';
import { PrismaService } from '../../database/prisma.service';
import { TimeGranularity } from '../dto';

const mockTickets = [
  {
    id: 'ticket-1',
    total: 350,
    subtotal: 302,
    tax: 48,
    discount: 0,
    closedAt: new Date('2024-01-15T10:30:00Z'),
    customerId: 'cust-1',
    locationId: 'loc-1',
    status: 'CLOSED',
    lines: [{ id: 'line-1' }, { id: 'line-2' }],
    customer: { id: 'cust-1' },
  },
  {
    id: 'ticket-2',
    total: 180,
    subtotal: 155,
    tax: 25,
    discount: 20,
    closedAt: new Date('2024-01-16T14:00:00Z'),
    customerId: 'cust-2',
    locationId: 'loc-1',
    status: 'CLOSED',
    lines: [{ id: 'line-3' }],
    customer: { id: 'cust-2' },
  },
];

const mockPrismaService = {
  ticket: {
    findMany: jest.fn(),
  },
  ticketLine: {
    findMany: jest.fn(),
  },
};

describe('SalesAnalyticsService', () => {
  let service: SalesAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SalesAnalyticsService>(SalesAnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesMetrics', () => {
    const query = {
      organization_id: 'org_1',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    beforeEach(() => {
      // Current period tickets + previous period (empty)
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);
    });

    it('should return sales metrics for period', async () => {
      const metrics = await service.getSalesMetrics(query);

      expect(metrics.gross_sales).toBeDefined();
      expect(metrics.net_sales).toBeDefined();
      expect(metrics.total_orders).toBeDefined();
      expect(metrics.avg_order_value).toBeDefined();
      expect(metrics.total_customers).toBeDefined();
    });

    it('should calculate gross sales as sum of ticket totals', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.gross_sales).toBe(530); // 350 + 180
    });

    it('should calculate net sales correctly', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      // net = gross - discounts (refunds = 0)
      expect(metrics.net_sales).toBe(metrics.gross_sales - metrics.discounts);
    });

    it('should count total orders correctly', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.total_orders).toBe(2);
    });

    it('should count unique customers', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.total_customers).toBe(2);
    });

    it('should include hourly breakdown', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.hourly_breakdown).toBeDefined();
      expect(metrics.hourly_breakdown!.length).toBeGreaterThan(0);
      expect(metrics.hourly_breakdown![0]).toHaveProperty('hour');
      expect(metrics.hourly_breakdown![0]).toHaveProperty('sales');
      expect(metrics.hourly_breakdown![0]).toHaveProperty('orders');
    });

    it('should include daily breakdown', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.daily_breakdown).toBeDefined();
      expect(metrics.daily_breakdown!.length).toBeGreaterThan(0);
    });

    it('should include vs_previous_period comparison', async () => {
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.vs_previous_period).toBeDefined();
      expect(metrics.vs_previous_period).toHaveProperty('gross_sales_change');
      expect(metrics.vs_previous_period).toHaveProperty('orders_change');
    });

    it('should return zeros when no tickets in period', async () => {
      mockPrismaService.ticket.findMany.mockReset();
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const metrics = await service.getSalesMetrics(query);

      expect(metrics.gross_sales).toBe(0);
      expect(metrics.total_orders).toBe(0);
      expect(metrics.avg_order_value).toBe(0);
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return top selling products by revenue', async () => {
      mockPrismaService.ticketLine.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantity: 10,
          total: 500,
          product: { id: 'prod-1', name: 'Latte', cost: 20, categoryId: 'cat-1', category: { name: 'Café' } },
        },
        {
          productId: 'prod-2',
          quantity: 5,
          total: 200,
          product: { id: 'prod-2', name: 'Americano', cost: 15, categoryId: 'cat-1', category: { name: 'Café' } },
        },
      ]);

      const products = await service.getTopSellingProducts({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(products).toHaveLength(2);
      expect(products[0].product_name).toBe('Latte');
      expect(products[0].revenue).toBe(500);
    });

    it('should return empty array when no sales', async () => {
      mockPrismaService.ticketLine.findMany.mockResolvedValue([]);

      const products = await service.getTopSellingProducts({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(products).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const manyLines = Array.from({ length: 20 }, (_, i) => ({
        productId: `prod-${i}`,
        quantity: 1,
        total: 100 - i,
        product: { id: `prod-${i}`, name: `Product ${i}`, cost: 10, categoryId: 'cat-1', category: { name: 'Café' } },
      }));
      mockPrismaService.ticketLine.findMany.mockResolvedValue(manyLines);

      const products = await service.getTopSellingProducts(
        { organization_id: 'org_1', start_date: '2024-01-01', end_date: '2024-01-31' },
        5,
      );

      expect(products).toHaveLength(5);
    });
  });

  describe('getSalesByCategory', () => {
    it('should return sales grouped by category', async () => {
      mockPrismaService.ticketLine.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantity: 10,
          total: 500,
          product: {
            categoryId: 'cat-1',
            category: { name: 'Café' },
          },
        },
        {
          productId: 'prod-2',
          quantity: 5,
          total: 200,
          product: {
            categoryId: 'cat-2',
            category: { name: 'Postres' },
          },
        },
      ]);

      const categories = await service.getSalesByCategory({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(categories).toHaveLength(2);
      expect(categories[0].category_name).toBe('Café');
      expect(categories[0].revenue).toBe(500);
    });
  });

  describe('getSalesTrend', () => {
    it('should return daily trend by default', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { total: 350, closedAt: new Date('2024-01-15T10:30:00Z') },
        { total: 180, closedAt: new Date('2024-01-15T14:00:00Z') },
        { total: 220, closedAt: new Date('2024-01-16T11:00:00Z') },
      ]);

      const trend = await service.getSalesTrend({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(trend).toHaveLength(2); // 2 distinct days
      expect(trend[0]).toHaveProperty('period');
      expect(trend[0]).toHaveProperty('sales');
      expect(trend[0]).toHaveProperty('orders');
    });

    it('should return empty array when no tickets', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      const trend = await service.getSalesTrend({
        organization_id: 'org_1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(trend).toHaveLength(0);
    });
  });
});
