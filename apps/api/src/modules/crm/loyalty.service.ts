import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateLoyaltyTransactionDto,
  LoyaltyTransactionType,
  QueryLoyaltyTransactionsDto,
} from './dto';
import {
  CustomerLoyaltyBalance,
  LoyaltyReward,
  LoyaltyTransaction,
} from './interfaces';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LoyaltyService {
  // Loyalty Program Configuration
  private readonly POINTS_PER_PESO = 1; // 1 point per peso spent
  private readonly LOYALTY_9_PLUS_1_POINTS = 9; // After 9 purchases, get 1 free

  constructor(private readonly prisma: PrismaService) {}

  private mapTransaction(t: any): LoyaltyTransaction {
    return {
      id: t.id,
      customer_id: t.customerId,
      organization_id: t.organizationId,
      type: t.type as LoyaltyTransactionType,
      points: t.points,
      order_id: t.orderId ?? undefined,
      order_total: t.orderTotal ?? undefined,
      reward_id: t.rewardId ?? undefined,
      description: t.description ?? undefined,
      processed_by_user_id: t.processedByUserId ?? undefined,
      balance_after: t.balanceAfter,
      created_at: t.createdAt,
    };
  }

  private mapReward(r: any): LoyaltyReward {
    return {
      id: r.id,
      organization_id: r.organizationId,
      name: r.name,
      description: r.description ?? undefined,
      points_required: r.pointsRequired,
      is_active: r.isActive,
      reward_type: r.rewardType as
        | 'FREE_ITEM'
        | 'DISCOUNT_PERCENT'
        | 'DISCOUNT_AMOUNT',
      reward_value: r.rewardValue ?? undefined,
      reward_item_id: r.rewardItemId ?? undefined,
      expiry_days: r.expiryDays ?? undefined,
      max_redemptions_per_customer: r.maxRedemptionsPerCustomer ?? undefined,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  async createTransaction(
    createDto: CreateLoyaltyTransactionDto,
  ): Promise<LoyaltyTransaction> {
    // Read balance + write transaction + sync Customer.loyaltyPoints atomically.
    // Without a transaction two concurrent EARNs could read the same balance
    // and corrupt the running total. Serializable isolation guarantees the
    // read-modify-write is linearized.
    const transaction = await this.prisma.$transaction(
      async (tx) => {
        // Re-read balance from inside the transaction. This is the read that
        // the write depends on, so it must be serialized with respect to
        // other concurrent createTransaction calls.
        const [earnedAgg, redeemedAgg, expiredAgg] = await Promise.all([
          tx.loyaltyTransaction.aggregate({
            where: {
              customerId: createDto.customer_id,
              type: { in: ['EARN', 'BONUS'] },
            },
            _sum: { points: true },
          }),
          tx.loyaltyTransaction.aggregate({
            where: { customerId: createDto.customer_id, type: 'REDEEM' },
            _sum: { points: true },
          }),
          tx.loyaltyTransaction.aggregate({
            where: { customerId: createDto.customer_id, type: 'EXPIRE' },
            _sum: { points: true },
          }),
        ]);

        const earned = earnedAgg._sum.points ?? 0;
        const redeemed = redeemedAgg._sum.points ?? 0;
        const expired = expiredAgg._sum.points ?? 0;
        const currentPoints = earned - redeemed - expired;

        let newBalance = currentPoints;
        if (
          createDto.type === LoyaltyTransactionType.EARN ||
          createDto.type === LoyaltyTransactionType.BONUS
        ) {
          newBalance += createDto.points;
        } else if (createDto.type === LoyaltyTransactionType.REDEEM) {
          if (currentPoints < createDto.points) {
            throw new BadRequestException('Insufficient loyalty points');
          }
          newBalance -= createDto.points;
        } else if (createDto.type === LoyaltyTransactionType.EXPIRE) {
          // EXPIRE must not drive the balance negative either; that would
          // hide a bug somewhere else in the points pipeline.
          if (currentPoints < createDto.points) {
            throw new BadRequestException(
              `Cannot expire ${createDto.points} points: customer balance is ${currentPoints}`,
            );
          }
          newBalance -= createDto.points;
        }

        const created = await tx.loyaltyTransaction.create({
          data: {
            customerId: createDto.customer_id,
            organizationId: createDto.organization_id,
            type: createDto.type,
            points: createDto.points,
            orderId: createDto.order_id,
            orderTotal: createDto.order_total,
            rewardId: createDto.reward_id,
            description: createDto.description,
            processedByUserId: createDto.processed_by_user_id,
            balanceAfter: newBalance,
          },
        });

        await tx.customer.update({
          where: { id: createDto.customer_id },
          data: { loyaltyPoints: newBalance },
        });

        return created;
      },
      { isolationLevel: 'Serializable' },
    );

    return this.mapTransaction(transaction);
  }

  async earnPoints(
    customerId: string,
    organizationId: string,
    orderTotal: number,
    orderId?: string,
  ): Promise<LoyaltyTransaction> {
    const points = Math.floor(orderTotal * this.POINTS_PER_PESO);

    return this.createTransaction({
      customer_id: customerId,
      organization_id: organizationId,
      type: LoyaltyTransactionType.EARN,
      points,
      order_id: orderId,
      order_total: orderTotal,
      description: `Earned ${points} points from purchase`,
    });
  }

  async redeemPoints(
    customerId: string,
    organizationId: string,
    rewardId: string,
    processedByUserId: string,
  ): Promise<LoyaltyTransaction> {
    const reward = await this.prisma.loyaltyReward.findUnique({
      where: { id: rewardId },
    });
    if (!reward) throw new NotFoundException('Reward not found');
    if (!reward.isActive) throw new BadRequestException('Reward is not active');

    return this.createTransaction({
      customer_id: customerId,
      organization_id: organizationId,
      type: LoyaltyTransactionType.REDEEM,
      points: reward.pointsRequired,
      reward_id: rewardId,
      processed_by_user_id: processedByUserId,
      description: `Redeemed ${reward.name}`,
    });
  }

  async checkLoyalty9Plus1(
    customerId: string,
  ): Promise<{ eligible: boolean; visits: number }> {
    // 9+1 must reset every time a customer redeems — otherwise a customer
    // who already cashed in their free drink would keep being "eligible"
    // forever. Count EARN transactions strictly after the last REDEEM
    // (falling back to all-time EARNs for never-redeemed customers).
    const lastRedeem = await this.prisma.loyaltyTransaction.findFirst({
      where: { customerId, type: 'REDEEM' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const visits = await this.prisma.loyaltyTransaction.count({
      where: {
        customerId,
        type: 'EARN',
        ...(lastRedeem ? { createdAt: { gt: lastRedeem.createdAt } } : {}),
      },
    });

    const eligible = visits > 0 && visits % this.LOYALTY_9_PLUS_1_POINTS === 0;
    return { eligible, visits };
  }

  async findAll(
    query: QueryLoyaltyTransactionsDto,
  ): Promise<LoyaltyTransaction[]> {
    const where: any = {};
    if (query.customer_id) where.customerId = query.customer_id;
    if (query.organization_id) where.organizationId = query.organization_id;
    if (query.type) where.type = query.type;
    if (query.start_date || query.end_date) {
      where.createdAt = {};
      if (query.start_date) where.createdAt.gte = new Date(query.start_date);
      if (query.end_date) where.createdAt.lte = new Date(query.end_date);
    }

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(this.mapTransaction.bind(this));
  }

  async findOne(id: string): Promise<LoyaltyTransaction | null> {
    const t = await this.prisma.loyaltyTransaction.findUnique({
      where: { id },
    });
    return t ? this.mapTransaction(t) : null;
  }

  async getBalance(customerId: string): Promise<CustomerLoyaltyBalance> {
    const [earned, redeemed, expired, lastTx] = await Promise.all([
      this.prisma.loyaltyTransaction.aggregate({
        where: { customerId, type: { in: ['EARN', 'BONUS'] } },
        _sum: { points: true, orderTotal: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { customerId, type: 'REDEEM' },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { customerId, type: 'EXPIRE' },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const totalEarned = earned._sum.points ?? 0;
    const totalRedeemed = redeemed._sum.points ?? 0;
    const totalExpired = expired._sum.points ?? 0;
    const currentBalance = totalEarned - totalRedeemed - totalExpired;

    return {
      customer_id: customerId,
      total_points_earned: totalEarned,
      total_points_redeemed: totalRedeemed,
      total_points_expired: totalExpired,
      current_balance: currentBalance,
      lifetime_value: earned._sum.orderTotal ?? 0,
      last_transaction_date: lastTx?.createdAt ?? undefined,
    };
  }

  async getStats(organizationId: string): Promise<any> {
    const where = { organizationId };

    const [totalTransactions, earnAgg, redeemAgg, expireAgg, byTypeRaw] =
      await Promise.all([
        this.prisma.loyaltyTransaction.count({ where }),
        this.prisma.loyaltyTransaction.aggregate({
          where: { ...where, type: { in: ['EARN', 'BONUS'] } },
          _sum: { points: true },
        }),
        this.prisma.loyaltyTransaction.aggregate({
          where: { ...where, type: 'REDEEM' },
          _sum: { points: true },
        }),
        this.prisma.loyaltyTransaction.aggregate({
          where: { ...where, type: 'EXPIRE' },
          _sum: { points: true },
        }),
        this.prisma.loyaltyTransaction.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
      ]);

    const totalEarned = earnAgg._sum.points ?? 0;
    const totalRedeemed = redeemAgg._sum.points ?? 0;
    const totalExpired = expireAgg._sum.points ?? 0;

    const byType = byTypeRaw.reduce(
      (acc, g) => {
        acc[g.type] = g._count.type;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Active points: aggregate from Customer table (denormalized)
    const pointsAgg = await this.prisma.customer.aggregate({
      where: { organizationId },
      _sum: { loyaltyPoints: true },
      _avg: { loyaltyPoints: true },
      _count: { id: true },
    });

    const totalActivePoints = pointsAgg._sum.loyaltyPoints ?? 0;
    const avgPointsPerCustomer =
      pointsAgg._count.id > 0
        ? Math.round(pointsAgg._avg.loyaltyPoints ?? 0)
        : 0;

    return {
      total_transactions: totalTransactions,
      total_points_earned: totalEarned,
      total_points_redeemed: totalRedeemed,
      total_points_expired: totalExpired,
      total_active_points: totalActivePoints,
      avg_points_per_customer: avgPointsPerCustomer,
      redemption_rate:
        totalEarned > 0 ? Math.round((totalRedeemed / totalEarned) * 100) : 0,
      by_type: byType,
    };
  }

  // ── Reward management ────────────────────────────────────────────────────

  async createReward(
    organizationId: string,
    rewardData: Partial<LoyaltyReward>,
  ): Promise<LoyaltyReward> {
    const reward = await this.prisma.loyaltyReward.create({
      data: {
        organizationId,
        name: rewardData.name!,
        description: rewardData.description,
        pointsRequired: rewardData.points_required!,
        isActive: rewardData.is_active ?? true,
        rewardType: rewardData.reward_type!,
        rewardValue: rewardData.reward_value,
        rewardItemId: rewardData.reward_item_id,
        expiryDays: rewardData.expiry_days,
        maxRedemptionsPerCustomer: rewardData.max_redemptions_per_customer,
      },
    });
    return this.mapReward(reward);
  }

  async findAllRewards(organizationId: string): Promise<LoyaltyReward[]> {
    const rewards = await this.prisma.loyaltyReward.findMany({
      where: { organizationId },
      orderBy: { pointsRequired: 'asc' },
    });
    return rewards.map(this.mapReward.bind(this));
  }

  async findReward(id: string): Promise<LoyaltyReward | null> {
    const r = await this.prisma.loyaltyReward.findUnique({ where: { id } });
    return r ? this.mapReward(r) : null;
  }

  async updateReward(
    id: string,
    updateData: Partial<LoyaltyReward>,
  ): Promise<LoyaltyReward> {
    const existing = await this.prisma.loyaltyReward.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Reward not found');

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined)
      data.description = updateData.description;
    if (updateData.points_required !== undefined)
      data.pointsRequired = updateData.points_required;
    if (updateData.is_active !== undefined)
      data.isActive = updateData.is_active;
    if (updateData.reward_type !== undefined)
      data.rewardType = updateData.reward_type;
    if (updateData.reward_value !== undefined)
      data.rewardValue = updateData.reward_value;
    if (updateData.reward_item_id !== undefined)
      data.rewardItemId = updateData.reward_item_id;
    if (updateData.expiry_days !== undefined)
      data.expiryDays = updateData.expiry_days;
    if (updateData.max_redemptions_per_customer !== undefined)
      data.maxRedemptionsPerCustomer = updateData.max_redemptions_per_customer;

    const updated = await this.prisma.loyaltyReward.update({
      where: { id },
      data,
    });
    return this.mapReward(updated);
  }

  async deleteReward(id: string): Promise<void> {
    await this.prisma.loyaltyReward.delete({ where: { id } });
  }
}
