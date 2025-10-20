import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyService } from '../loyalty.service';
import { LoyaltyTransactionType } from '../dto';

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoyaltyService],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
  });

  afterEach(() => {
    service['transactions'].clear();
    service['rewards'].clear();
    service['balances'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('earnPoints', () => {
    it('should earn points based on order total', async () => {
      const result = await service.earnPoints('customer_1', 'org_1', 100, 'order_1');

      expect(result.type).toBe(LoyaltyTransactionType.EARN);
      expect(result.points).toBe(100); // 1 point per peso
      expect(result.order_total).toBe(100);
      expect(result.balance_after).toBe(100);
    });

    it('should accumulate points over multiple purchases', async () => {
      await service.earnPoints('customer_1', 'org_1', 100);
      await service.earnPoints('customer_1', 'org_1', 200);
      const result = await service.earnPoints('customer_1', 'org_1', 150);

      expect(result.balance_after).toBe(450);
    });
  });

  describe('redeemPoints', () => {
    beforeEach(async () => {
      // Create a reward
      await service.createReward('org_1', {
        name: 'Free Coffee',
        points_required: 100,
        reward_type: 'FREE_ITEM',
        reward_item_id: 'product_1',
      });
    });

    it('should redeem points for a reward', async () => {
      // Earn points first
      await service.earnPoints('customer_1', 'org_1', 150);

      const rewards = await service.findAllRewards('org_1');
      const reward = rewards[0];

      const result = await service.redeemPoints('customer_1', 'org_1', reward.id, 'user_1');

      expect(result.type).toBe(LoyaltyTransactionType.REDEEM);
      expect(result.points).toBe(100);
      expect(result.balance_after).toBe(50);
    });

    it('should throw error if insufficient points', async () => {
      const rewards = await service.findAllRewards('org_1');
      const reward = rewards[0];

      await expect(
        service.redeemPoints('customer_1', 'org_1', reward.id, 'user_1'),
      ).rejects.toThrow('Insufficient loyalty points');
    });
  });

  describe('checkLoyalty9Plus1', () => {
    it('should detect 9+1 eligibility', async () => {
      const customerId = 'customer_1';

      // Make 9 purchases
      for (let i = 0; i < 9; i++) {
        await service.earnPoints(customerId, 'org_1', 100);
      }

      const result = await service.checkLoyalty9Plus1(customerId);

      expect(result.visits).toBe(9);
      expect(result.eligible).toBe(true);
    });

    it('should not be eligible before 9 visits', async () => {
      const customerId = 'customer_1';

      // Make 5 purchases
      for (let i = 0; i < 5; i++) {
        await service.earnPoints(customerId, 'org_1', 100);
      }

      const result = await service.checkLoyalty9Plus1(customerId);

      expect(result.visits).toBe(5);
      expect(result.eligible).toBe(false);
    });
  });

  describe('getBalance', () => {
    it('should return customer balance', async () => {
      await service.earnPoints('customer_1', 'org_1', 500, 'order_1');
      await service.earnPoints('customer_1', 'org_1', 300, 'order_2');

      const balance = await service.getBalance('customer_1');

      expect(balance.current_balance).toBe(800);
      expect(balance.total_points_earned).toBe(800);
      expect(balance.lifetime_value).toBe(800);
    });

    it('should create balance if not exists', async () => {
      const balance = await service.getBalance('new_customer');

      expect(balance.current_balance).toBe(0);
      expect(balance.total_points_earned).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.earnPoints('customer_1', 'org_1', 1000);
      await service.earnPoints('customer_2', 'org_1', 500);

      // Create and redeem reward
      await service.createReward('org_1', {
        name: 'Free Coffee',
        points_required: 200,
        reward_type: 'FREE_ITEM',
      });

      const rewards = await service.findAllRewards('org_1');
      await service.redeemPoints('customer_1', 'org_1', rewards[0].id, 'user_1');
    });

    it('should return loyalty statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total_transactions).toBe(3); // 2 earn + 1 redeem
      expect(stats.total_points_earned).toBe(1500);
      expect(stats.total_points_redeemed).toBe(200);
      expect(stats.total_active_points).toBe(1300);
    });

    it('should calculate redemption rate', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.redemption_rate).toBe(13); // 200/1500 * 100 = 13.33 -> 13
    });
  });

  describe('rewards', () => {
    it('should create a reward', async () => {
      const reward = await service.createReward('org_1', {
        name: 'Free Latte',
        description: 'Get a free latte',
        points_required: 150,
        reward_type: 'FREE_ITEM',
        reward_item_id: 'product_latte',
      });

      expect(reward.name).toBe('Free Latte');
      expect(reward.points_required).toBe(150);
      expect(reward.is_active).toBe(true);
    });

    it('should list rewards sorted by points', async () => {
      await service.createReward('org_1', {
        name: 'Expensive Reward',
        points_required: 500,
        reward_type: 'DISCOUNT_PERCENT',
        reward_value: 50,
      });

      await service.createReward('org_1', {
        name: 'Cheap Reward',
        points_required: 100,
        reward_type: 'DISCOUNT_AMOUNT',
        reward_value: 20,
      });

      const rewards = await service.findAllRewards('org_1');

      expect(rewards).toHaveLength(2);
      expect(rewards[0].points_required).toBe(100);
      expect(rewards[1].points_required).toBe(500);
    });

    it('should update reward', async () => {
      const reward = await service.createReward('org_1', {
        name: 'Test Reward',
        points_required: 200,
        reward_type: 'FREE_ITEM',
      });

      const updated = await service.updateReward(reward.id, {
        is_active: false,
        points_required: 250,
      });

      expect(updated.is_active).toBe(false);
      expect(updated.points_required).toBe(250);
    });

    it('should delete reward', async () => {
      const reward = await service.createReward('org_1', {
        name: 'Test Reward',
        points_required: 200,
        reward_type: 'FREE_ITEM',
      });

      await service.deleteReward(reward.id);
      const result = await service.findReward(reward.id);
      expect(result).toBeNull();
    });
  });
});
