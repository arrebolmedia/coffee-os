import { LoyaltyTransactionType } from '../dto';

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  organization_id: string;
  type: LoyaltyTransactionType;
  points: number;
  order_id?: string;
  order_total?: number;
  reward_id?: string;
  description?: string;
  processed_by_user_id?: string;
  balance_after: number; // Loyalty points balance after this transaction
  created_at: Date;
}

export interface LoyaltyReward {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  points_required: number;
  is_active: boolean;
  reward_type: 'FREE_ITEM' | 'DISCOUNT_PERCENT' | 'DISCOUNT_AMOUNT';
  reward_value?: number; // Discount percent or amount
  reward_item_id?: string; // Product ID if FREE_ITEM
  expiry_days?: number; // Days until reward expires after redemption
  max_redemptions_per_customer?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerLoyaltyBalance {
  customer_id: string;
  total_points_earned: number;
  total_points_redeemed: number;
  total_points_expired: number;
  current_balance: number;
  lifetime_value: number; // Total amount spent
  last_transaction_date?: Date;
}
