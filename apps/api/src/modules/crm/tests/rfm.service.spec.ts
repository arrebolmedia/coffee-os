import { Test, TestingModule } from '@nestjs/testing';
import { RFMService } from '../rfm.service';
import { PrismaService } from '../../database/prisma.service';

describe('RFMService', () => {
  let service: RFMService;

  const mockPrismaService = {
    loyaltyTransaction: {
      findFirst: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    customer: {
      groupBy: jest.fn(),
    },
  };

  // Helper: build a lastTx date N days ago
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RFMService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RFMService>(RFMService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCustomerRFM', () => {
    it('should return null when customer has no EARN transactions', async () => {
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue(null);

      const result = await service.calculateCustomerRFM('cust-no-purchase');
      expect(result).toBeNull();
    });

    it('should calculate Champion scores (R5 F5 M5)', async () => {
      // Last purchase: today → recency 0 days → score 5
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: daysAgo(0) });
      // 25 purchases → frequency score 5
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(25);
      // 25 * 600 = 15,000 → monetary score 5
      mockPrismaService.loyaltyTransaction.aggregate.mockResolvedValue({
        _sum: { orderTotal: 15000 },
      });

      const rfm = await service.calculateCustomerRFM('cust-champion');

      expect(rfm).not.toBeNull();
      expect(rfm!.recency_score).toBe(5);
      expect(rfm!.frequency_score).toBe(5);
      expect(rfm!.monetary_score).toBe(5);
      expect(rfm!.rfm_score).toBe('555');
      expect(rfm!.customer_id).toBe('cust-champion');
    });

    it('should calculate scores for recent new customer (R5 F1 M1)', async () => {
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: daysAgo(2) });
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(1);
      mockPrismaService.loyaltyTransaction.aggregate.mockResolvedValue({
        _sum: { orderTotal: 100 },
      });

      const rfm = await service.calculateCustomerRFM('cust-recent');

      expect(rfm!.recency_score).toBe(5); // 2 days → score 5
      expect(rfm!.recency_days).toBe(2);
      expect(rfm!.frequency_score).toBe(1); // 1 purchase
      expect(rfm!.monetary_score).toBe(1); // $100
    });

    it('should calculate scores for at-risk customer (R2 F4 M4)', async () => {
      // 90 days ago → recency score 2 (61-120)
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: daysAgo(90) });
      // 15 purchases → frequency score 4 (10-19)
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(15);
      // 15 * 533 = 7,995 → monetary score 4 (5000-9999)
      mockPrismaService.loyaltyTransaction.aggregate.mockResolvedValue({
        _sum: { orderTotal: 7995 },
      });

      const rfm = await service.calculateCustomerRFM('cust-at-risk');

      expect(rfm!.recency_score).toBe(2);
      expect(rfm!.frequency_score).toBe(4);
      expect(rfm!.monetary_score).toBe(4);
    });

    it('should calculate scores for lost customer (R1 F2 M1)', async () => {
      // 150 days ago → recency score 1 (>120)
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: daysAgo(150) });
      // 2 purchases → frequency score 2
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(2);
      // $400 → monetary score 1 (<500)
      mockPrismaService.loyaltyTransaction.aggregate.mockResolvedValue({
        _sum: { orderTotal: 400 },
      });

      const rfm = await service.calculateCustomerRFM('cust-lost');

      expect(rfm!.recency_score).toBe(1);
      expect(rfm!.frequency_score).toBe(2);
      expect(rfm!.monetary_score).toBe(1);
    });

    it('should produce correct RFM score string "533"', async () => {
      // R=5 (today), F=3 (5 purchases), M=3 (5*400=2000)
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: daysAgo(1) });
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(5);
      mockPrismaService.loyaltyTransaction.aggregate.mockResolvedValue({
        _sum: { orderTotal: 2000 },
      });

      const rfm = await service.calculateCustomerRFM('cust-5');

      expect(rfm!.rfm_score).toBe('533');
    });

    it('should include calculated_at timestamp', async () => {
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: daysAgo(5) });
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(3);
      mockPrismaService.loyaltyTransaction.aggregate.mockResolvedValue({
        _sum: { orderTotal: 300 },
      });

      const rfm = await service.calculateCustomerRFM('cust-ts');

      expect(rfm!.calculated_at).toBeDefined();
      expect(rfm!.calculated_at).toBeInstanceOf(Date);
    });
  });

  describe('getSegmentDistribution', () => {
    it('should return segment counts from Prisma groupBy', async () => {
      mockPrismaService.customer.groupBy.mockResolvedValue([
        { rfmSegment: 'Champions', _count: { rfmSegment: 15 } },
        { rfmSegment: 'Loyal Customers', _count: { rfmSegment: 25 } },
        { rfmSegment: 'At Risk', _count: { rfmSegment: 7 } },
      ]);

      const distribution = await service.getSegmentDistribution('org-1');

      expect(distribution['Champions']).toBe(15);
      expect(distribution['Loyal Customers']).toBe(25);
      expect(distribution['At Risk']).toBe(7);
    });

    it('should return empty object when no customers have RFM segments', async () => {
      mockPrismaService.customer.groupBy.mockResolvedValue([]);

      const distribution = await service.getSegmentDistribution('org-new');

      expect(Object.keys(distribution)).toHaveLength(0);
    });

    it('should query only customers with non-null rfmSegment', async () => {
      mockPrismaService.customer.groupBy.mockResolvedValue([]);

      await service.getSegmentDistribution('org-1');

      expect(mockPrismaService.customer.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rfmSegment: { not: null } }),
        }),
      );
    });
  });
});
