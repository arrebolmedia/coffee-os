import { Test, TestingModule } from '@nestjs/testing';
import { RFMService } from '../rfm.service';

describe('RFMService', () => {
  let service: RFMService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RFMService],
    }).compile();

    service = module.get<RFMService>(RFMService);
  });

  afterEach(() => {
    service['customerPurchases'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordPurchase', () => {
    it('should record a purchase for a customer', async () => {
      await service.recordPurchase('customer_1', 500, new Date());

      const rfm = await service.calculateCustomerRFM('customer_1');
      expect(rfm).not.toBeNull();
      expect(rfm?.customer_id).toBe('customer_1');
    });
  });

  describe('calculateCustomerRFM', () => {
    it('should return null for customer with no purchases', async () => {
      const rfm = await service.calculateCustomerRFM('customer_no_purchase');

      expect(rfm).toBeNull();
    });

    it('should calculate RFM score for champion customer', async () => {
      const customerId = 'customer_1';
      const now = new Date();

      // Record 25 recent purchases (most recent last)
      for (let i = 24; i >= 0; i--) {
        const purchaseDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        await service.recordPurchase(customerId, 600, purchaseDate);
      }

      const rfm = await service.calculateCustomerRFM(customerId);

      expect(rfm).not.toBeNull();
      expect(rfm?.recency_score).toBe(5); // Last purchase today
      expect(rfm?.frequency_score).toBe(5); // 25 purchases
      expect(rfm?.monetary_score).toBe(5); // 25 * 600 = 15,000
    });

    it('should calculate RFM score for recent customer', async () => {
      const customerId = 'customer_2';
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      await service.recordPurchase(customerId, 100, twoDaysAgo);

      const rfm = await service.calculateCustomerRFM(customerId);

      expect(rfm).not.toBeNull();
      expect(rfm?.recency_score).toBe(5); // 2 days ago
      expect(rfm?.recency_days).toBe(2);
      expect(rfm?.frequency_score).toBe(1); // 1 purchase
      expect(rfm?.monetary_score).toBe(1); // $100
    });

    it('should calculate RFM score for at-risk customer', async () => {
      const customerId = 'customer_3';
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Record 15 purchases over time, most recent is 90 days ago
      for (let i = 14; i >= 0; i--) {
        const purchaseDate = new Date(ninetyDaysAgo.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        await service.recordPurchase(customerId, 533, purchaseDate);
      }

      const rfm = await service.calculateCustomerRFM(customerId);

      expect(rfm).not.toBeNull();
      expect(rfm?.recency_score).toBe(2); // 90 days (61-120 = score 2)
      expect(rfm?.frequency_score).toBe(4); // 15 purchases
      expect(rfm?.monetary_score).toBe(4); // 15 * 533 = ~7,995 (5000-10000 = score 4)
    });

    it('should calculate RFM score for lost customer', async () => {
      const customerId = 'customer_4';
      const longTimeAgo = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000);

      await service.recordPurchase(customerId, 200, new Date(longTimeAgo.getTime() - 10 * 24 * 60 * 60 * 1000));
      await service.recordPurchase(customerId, 200, longTimeAgo);

      const rfm = await service.calculateCustomerRFM(customerId);

      expect(rfm).not.toBeNull();
      expect(rfm?.recency_score).toBe(1); // 150+ days
      expect(rfm?.frequency_score).toBe(2); // 2 purchases
      expect(rfm?.monetary_score).toBe(1); // $400
    });

    it('should calculate correct RFM score string', async () => {
      const customerId = 'customer_5';
      const now = new Date();

      // Create a customer with specific scores: R=5, F=3, M=3
      for (let i = 0; i < 5; i++) {
        await service.recordPurchase(customerId, 400, new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      }

      const rfm = await service.calculateCustomerRFM(customerId);

      expect(rfm).not.toBeNull();
      expect(rfm?.rfm_score).toBe('533'); // R=5, F=3, M=3 (5*400=2000)
    });
  });

  describe('getSegmentDistribution', () => {
    it('should return segment distribution', async () => {
      const distribution = await service.getSegmentDistribution('org_1');

      expect(distribution).toBeDefined();
      expect(distribution['Champions']).toBe(15);
      expect(distribution['Loyal Customers']).toBe(25);
      expect(distribution['Lost']).toBe(4);
    });
  });
});
