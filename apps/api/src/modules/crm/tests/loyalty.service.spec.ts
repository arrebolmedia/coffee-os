import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoyaltyService } from '../loyalty.service';
import { PrismaService } from '../../database/prisma.service';
import { LoyaltyTransactionType } from '../dto';

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  const mockPrismaService = {
    loyaltyTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    loyaltyReward: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      update: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockTx = {
    id: 'tx-id-1',
    customerId: 'cust-1',
    organizationId: 'org-1',
    type: 'EARN',
    points: 150,
    orderId: 'order-1',
    orderTotal: 150,
    rewardId: null,
    description: 'Earned 150 points from purchase',
    processedByUserId: null,
    balanceAfter: 150,
    createdAt: new Date(),
  };

  const mockReward = {
    id: 'reward-1',
    organizationId: 'org-1',
    name: 'Café Gratis',
    description: null,
    pointsRequired: 100,
    isActive: true,
    rewardType: 'FREE_ITEM',
    rewardValue: null,
    rewardItemId: null,
    expiryDays: null,
    maxRedemptionsPerCustomer: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper: mock getBalance returning 0 points
  const mockZeroBalance = () => {
    mockPrismaService.loyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: null, orderTotal: null } })
      .mockResolvedValueOnce({ _sum: { points: null } })
      .mockResolvedValueOnce({ _sum: { points: null } });
    mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValueOnce(null);
  };

  // Helper: mock getBalance returning N points
  const mockBalance = (points: number) => {
    mockPrismaService.loyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points, orderTotal: points } })
      .mockResolvedValueOnce({ _sum: { points: 0 } })
      .mockResolvedValueOnce({ _sum: { points: 0 } });
    mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValueOnce({ createdAt: new Date() });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('earnPoints', () => {
    it('should earn 1 point per peso spent', async () => {
      mockZeroBalance();
      mockPrismaService.loyaltyTransaction.create.mockResolvedValue(mockTx);
      mockPrismaService.customer.update.mockResolvedValue({});

      const result = await service.earnPoints('cust-1', 'org-1', 150, 'order-1');

      expect(result.points).toBe(150);
      expect(result.type).toBe(LoyaltyTransactionType.EARN);
      expect(result.balance_after).toBe(150);
    });

    it('should accumulate points over multiple purchases', async () => {
      mockBalance(150);
      const secondTx = { ...mockTx, points: 200, balanceAfter: 350 };
      mockPrismaService.loyaltyTransaction.create.mockResolvedValue(secondTx);
      mockPrismaService.customer.update.mockResolvedValue({});

      const result = await service.earnPoints('cust-1', 'org-1', 200);

      expect(result.balance_after).toBe(350);
    });
  });

  describe('redeemPoints', () => {
    it('should redeem points for a reward', async () => {
      mockPrismaService.loyaltyReward.findUnique.mockResolvedValue(mockReward);
      mockBalance(200);
      const redeemTx = { ...mockTx, type: 'REDEEM', points: 100, balanceAfter: 100 };
      mockPrismaService.loyaltyTransaction.create.mockResolvedValue(redeemTx);
      mockPrismaService.customer.update.mockResolvedValue({});

      const result = await service.redeemPoints('cust-1', 'org-1', 'reward-1', 'user-1');

      expect(result.type).toBe(LoyaltyTransactionType.REDEEM);
      expect(result.points).toBe(100);
    });

    it('should throw BadRequestException when insufficient points', async () => {
      mockPrismaService.loyaltyReward.findUnique.mockResolvedValue(mockReward);
      mockBalance(50); // only 50, reward needs 100

      await expect(
        service.redeemPoints('cust-1', 'org-1', 'reward-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when reward not found', async () => {
      mockPrismaService.loyaltyReward.findUnique.mockResolvedValue(null);
      await expect(
        service.redeemPoints('cust-1', 'org-1', 'nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkLoyalty9Plus1', () => {
    it('should return eligible=true after 9 purchases', async () => {
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(9);
      const result = await service.checkLoyalty9Plus1('cust-1');
      expect(result.eligible).toBe(true);
      expect(result.visits).toBe(9);
    });

    it('should return eligible=false before 9 purchases', async () => {
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(5);
      const result = await service.checkLoyalty9Plus1('cust-1');
      expect(result.eligible).toBe(false);
    });

    it('should return eligible=true at multiples of 9', async () => {
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(18);
      const result = await service.checkLoyalty9Plus1('cust-1');
      expect(result.eligible).toBe(true);
    });
  });

  describe('getBalance', () => {
    it('should calculate balance from aggregates', async () => {
      mockPrismaService.loyaltyTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { points: 300, orderTotal: 300 } })
        .mockResolvedValueOnce({ _sum: { points: 100 } })
        .mockResolvedValueOnce({ _sum: { points: 0 } });
      mockPrismaService.loyaltyTransaction.findFirst.mockResolvedValue({ createdAt: new Date() });

      const balance = await service.getBalance('cust-1');

      expect(balance.total_points_earned).toBe(300);
      expect(balance.total_points_redeemed).toBe(100);
      expect(balance.current_balance).toBe(200);
      expect(balance.lifetime_value).toBe(300);
    });

    it('should return zero balance for new customer', async () => {
      mockZeroBalance();
      const balance = await service.getBalance('new-cust');
      expect(balance.current_balance).toBe(0);
      expect(balance.last_transaction_date).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return loyalty statistics with redemption rate', async () => {
      mockPrismaService.loyaltyTransaction.count.mockResolvedValue(10);
      mockPrismaService.loyaltyTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { points: 1000 } })
        .mockResolvedValueOnce({ _sum: { points: 200 } })
        .mockResolvedValueOnce({ _sum: { points: 50 } });
      mockPrismaService.loyaltyTransaction.groupBy.mockResolvedValue([
        { type: 'EARN', _count: { type: 7 } },
        { type: 'REDEEM', _count: { type: 3 } },
      ]);
      mockPrismaService.customer.aggregate.mockResolvedValue({
        _sum: { loyaltyPoints: 750 },
        _avg: { loyaltyPoints: 150 },
        _count: { id: 5 },
      });

      const stats = await service.getStats('org-1');

      expect(stats.total_transactions).toBe(10);
      expect(stats.total_points_earned).toBe(1000);
      expect(stats.total_points_redeemed).toBe(200);
      expect(stats.redemption_rate).toBe(20); // 200/1000*100
      expect(stats.total_active_points).toBe(750);
      expect(stats.by_type.EARN).toBe(7);
    });
  });

  describe('rewards', () => {
    it('should create a reward', async () => {
      mockPrismaService.loyaltyReward.create.mockResolvedValue(mockReward);

      const result = await service.createReward('org-1', {
        name: 'Café Gratis',
        points_required: 100,
        is_active: true,
        reward_type: 'FREE_ITEM',
      });

      expect(result.name).toBe('Café Gratis');
      expect(result.points_required).toBe(100);
    });

    it('should return rewards sorted by points ascending', async () => {
      mockPrismaService.loyaltyReward.findMany.mockResolvedValue([mockReward]);
      await service.findAllRewards('org-1');
      expect(mockPrismaService.loyaltyReward.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { pointsRequired: 'asc' } }),
      );
    });

    it('should update a reward', async () => {
      mockPrismaService.loyaltyReward.findUnique.mockResolvedValue(mockReward);
      mockPrismaService.loyaltyReward.update.mockResolvedValue({ ...mockReward, isActive: false });

      const result = await service.updateReward('reward-1', { is_active: false });
      expect(result.is_active).toBe(false);
    });

    it('should throw NotFoundException when updating nonexistent reward', async () => {
      mockPrismaService.loyaltyReward.findUnique.mockResolvedValue(null);
      await expect(service.updateReward('bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('should delete a reward', async () => {
      mockPrismaService.loyaltyReward.delete.mockResolvedValue(undefined);
      await service.deleteReward('reward-1');
      expect(mockPrismaService.loyaltyReward.delete).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
      });
    });
  });
});
