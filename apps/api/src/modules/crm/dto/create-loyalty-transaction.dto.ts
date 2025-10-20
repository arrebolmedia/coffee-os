import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum LoyaltyTransactionType {
  EARN = 'EARN', // Customer earns points from a purchase
  REDEEM = 'REDEEM', // Customer redeems points for a reward
  ADJUST = 'ADJUST', // Manual adjustment (admin)
  EXPIRE = 'EXPIRE', // Points expired
  BONUS = 'BONUS', // Bonus points (birthday, referral, etc.)
}

export class CreateLoyaltyTransactionDto {
  @IsNotEmpty()
  @IsString()
  customer_id: string;

  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsEnum(LoyaltyTransactionType)
  type: LoyaltyTransactionType;

  @IsNumber()
  @Min(0)
  points: number; // Points earned or redeemed

  @IsOptional()
  @IsString()
  order_id?: string; // Related order/ticket ID

  @IsOptional()
  @IsNumber()
  order_total?: number; // Order total that generated points

  @IsOptional()
  @IsString()
  reward_id?: string; // If redeeming, which reward

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  processed_by_user_id?: string; // Staff member who processed transaction
}
