import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CustomerStatus } from './update-customer.dto';
import { CampaignStatus, CampaignType } from './create-campaign.dto';
import { LoyaltyTransactionType } from './create-loyalty-transaction.dto';

export class QueryCustomersDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  search?: string; // Search by name, email, phone

  @IsOptional()
  @IsString()
  segment_id?: string; // Filter by RFM segment

  @IsOptional()
  @IsString()
  birthday_month?: string; // Filter customers with birthday in specific month
}

export class QueryLoyaltyTransactionsDto {
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(LoyaltyTransactionType)
  type?: LoyaltyTransactionType;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}

export class QueryCampaignsDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
