import { Injectable } from '@nestjs/common';
import { CreateLoyaltyTransactionDto, QueryLoyaltyTransactionsDto, LoyaltyTransactionType } from './dto';
import { LoyaltyTransaction, LoyaltyReward, CustomerLoyaltyBalance } from './interfaces';

@Injectable()
export class LoyaltyService {
  private transactions: Map<string, LoyaltyTransaction> = new Map();
  private rewards: Map<string, LoyaltyReward> = new Map();
  private balances: Map<string, CustomerLoyaltyBalance> = new Map();

  // Loyalty Program Configuration
  private readonly POINTS_PER_PESO = 1; // 1 point per peso spent
  private readonly LOYALTY_9_PLUS_1_POINTS = 9; // After 9 purchases, get 1 free

  async createTransaction(createDto: CreateLoyaltyTransactionDto): Promise<LoyaltyTransaction> {
    const id = this.generateId();
    const now = new Date();

    // Get current balance
    const balance = await this.getBalance(createDto.customer_id);
    const currentPoints = balance.current_balance;

    // Calculate new balance
    let newBalance = currentPoints;
    if (createDto.type === LoyaltyTransactionType.EARN || createDto.type === LoyaltyTransactionType.BONUS) {
      newBalance += createDto.points;
    } else if (createDto.type === LoyaltyTransactionType.REDEEM) {
      if (currentPoints < createDto.points) {
        throw new Error('Insufficient loyalty points');
      }
      newBalance -= createDto.points;
    } else if (createDto.type === LoyaltyTransactionType.EXPIRE) {
      newBalance -= createDto.points;
    }

    const transaction: LoyaltyTransaction = {
      id,
      customer_id: createDto.customer_id,
      organization_id: createDto.organization_id,
      type: createDto.type,
      points: createDto.points,
      order_id: createDto.order_id,
      order_total: createDto.order_total,
      reward_id: createDto.reward_id,
      description: createDto.description,
      processed_by_user_id: createDto.processed_by_user_id,
      balance_after: newBalance,
      created_at: now,
    };

    this.transactions.set(id, transaction);

    // Update customer balance
    await this.updateBalance(createDto.customer_id, transaction);

    return transaction;
  }

  async earnPoints(customerId: string, organizationId: string, orderTotal: number, orderId?: string): Promise<LoyaltyTransaction> {
    // Calculate points: 1 point per peso
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

  async redeemPoints(customerId: string, organizationId: string, rewardId: string, processedByUserId: string): Promise<LoyaltyTransaction> {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (!reward.is_active) {
      throw new Error('Reward is not active');
    }

    return this.createTransaction({
      customer_id: customerId,
      organization_id: organizationId,
      type: LoyaltyTransactionType.REDEEM,
      points: reward.points_required,
      reward_id: rewardId,
      processed_by_user_id: processedByUserId,
      description: `Redeemed ${reward.name}`,
    });
  }

  async checkLoyalty9Plus1(customerId: string): Promise<{ eligible: boolean; visits: number }> {
    // Get customer's EARN transactions to count visits
    const transactions = Array.from(this.transactions.values()).filter(
      (t) => t.customer_id === customerId && t.type === LoyaltyTransactionType.EARN,
    );

    const visits = transactions.length;
    const eligible = visits > 0 && visits % this.LOYALTY_9_PLUS_1_POINTS === 0;

    return { eligible, visits };
  }

  async findAll(query: QueryLoyaltyTransactionsDto): Promise<LoyaltyTransaction[]> {
    let transactions = Array.from(this.transactions.values());

    if (query.customer_id) {
      transactions = transactions.filter((t) => t.customer_id === query.customer_id);
    }

    if (query.organization_id) {
      transactions = transactions.filter((t) => t.organization_id === query.organization_id);
    }

    if (query.type) {
      transactions = transactions.filter((t) => t.type === query.type);
    }

    if (query.start_date) {
      const startDate = new Date(query.start_date);
      transactions = transactions.filter((t) => t.created_at >= startDate);
    }

    if (query.end_date) {
      const endDate = new Date(query.end_date);
      transactions = transactions.filter((t) => t.created_at <= endDate);
    }

    return transactions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async findOne(id: string): Promise<LoyaltyTransaction | null> {
    return this.transactions.get(id) || null;
  }

  async getBalance(customerId: string): Promise<CustomerLoyaltyBalance> {
    let balance = this.balances.get(customerId);

    if (!balance) {
      balance = {
        customer_id: customerId,
        total_points_earned: 0,
        total_points_redeemed: 0,
        total_points_expired: 0,
        current_balance: 0,
        lifetime_value: 0,
      };
      this.balances.set(customerId, balance);
    }

    return balance;
  }

  private async updateBalance(customerId: string, transaction: LoyaltyTransaction): Promise<void> {
    const balance = await this.getBalance(customerId);

    if (transaction.type === LoyaltyTransactionType.EARN || transaction.type === LoyaltyTransactionType.BONUS) {
      balance.total_points_earned += transaction.points;
      if (transaction.order_total) {
        balance.lifetime_value += transaction.order_total;
      }
    } else if (transaction.type === LoyaltyTransactionType.REDEEM) {
      balance.total_points_redeemed += transaction.points;
    } else if (transaction.type === LoyaltyTransactionType.EXPIRE) {
      balance.total_points_expired += transaction.points;
    }

    balance.current_balance = transaction.balance_after;
    balance.last_transaction_date = transaction.created_at;

    this.balances.set(customerId, balance);
  }

  async getStats(organizationId: string): Promise<any> {
    const transactions = Array.from(this.transactions.values()).filter(
      (t) => t.organization_id === organizationId,
    );

    const totalTransactions = transactions.length;
    const totalPointsEarned = transactions
      .filter((t) => t.type === LoyaltyTransactionType.EARN || t.type === LoyaltyTransactionType.BONUS)
      .reduce((sum, t) => sum + t.points, 0);
    const totalPointsRedeemed = transactions
      .filter((t) => t.type === LoyaltyTransactionType.REDEEM)
      .reduce((sum, t) => sum + t.points, 0);
    const totalPointsExpired = transactions
      .filter((t) => t.type === LoyaltyTransactionType.EXPIRE)
      .reduce((sum, t) => sum + t.points, 0);

    const byType = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate active balances
    const activeBalances = Array.from(this.balances.values());
    const totalActivePoints = activeBalances.reduce((sum, b) => sum + b.current_balance, 0);
    const avgPointsPerCustomer = activeBalances.length > 0 
      ? Math.round(totalActivePoints / activeBalances.length) 
      : 0;

    const totalLifetimeValue = activeBalances.reduce((sum, b) => sum + b.lifetime_value, 0);

    return {
      total_transactions: totalTransactions,
      total_points_earned: totalPointsEarned,
      total_points_redeemed: totalPointsRedeemed,
      total_points_expired: totalPointsExpired,
      total_active_points: totalActivePoints,
      avg_points_per_customer: avgPointsPerCustomer,
      total_lifetime_value: totalLifetimeValue,
      redemption_rate: totalPointsEarned > 0 ? Math.round((totalPointsRedeemed / totalPointsEarned) * 100) : 0,
      by_type: byType,
    };
  }

  // Reward management
  async createReward(organizationId: string, rewardData: Partial<LoyaltyReward>): Promise<LoyaltyReward> {
    const id = this.generateId();
    const now = new Date();

    const reward: LoyaltyReward = {
      id,
      organization_id: organizationId,
      name: rewardData.name!,
      description: rewardData.description,
      points_required: rewardData.points_required!,
      is_active: rewardData.is_active ?? true,
      reward_type: rewardData.reward_type!,
      reward_value: rewardData.reward_value,
      reward_item_id: rewardData.reward_item_id,
      expiry_days: rewardData.expiry_days,
      max_redemptions_per_customer: rewardData.max_redemptions_per_customer,
      created_at: now,
      updated_at: now,
    };

    this.rewards.set(id, reward);
    return reward;
  }

  async findAllRewards(organizationId: string): Promise<LoyaltyReward[]> {
    return Array.from(this.rewards.values())
      .filter((r) => r.organization_id === organizationId)
      .sort((a, b) => a.points_required - b.points_required);
  }

  async findReward(id: string): Promise<LoyaltyReward | null> {
    return this.rewards.get(id) || null;
  }

  async updateReward(id: string, updateData: Partial<LoyaltyReward>): Promise<LoyaltyReward> {
    const reward = this.rewards.get(id);
    if (!reward) {
      throw new Error('Reward not found');
    }

    const updated: LoyaltyReward = {
      ...reward,
      ...updateData,
      updated_at: new Date(),
    };

    this.rewards.set(id, updated);
    return updated;
  }

  async deleteReward(id: string): Promise<void> {
    this.rewards.delete(id);
  }

  private generateId(): string {
    return `loyalty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
