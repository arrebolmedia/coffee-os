import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsBoolean, IsArray, IsNumber } from 'class-validator';

export enum CampaignType {
  BIRTHDAY = 'BIRTHDAY', // Automated birthday campaigns
  WELCOME = 'WELCOME', // Welcome series for new customers
  WINBACK = 'WINBACK', // Re-engagement for inactive customers
  PROMOTIONAL = 'PROMOTIONAL', // Limited-time offers
  LOYALTY_MILESTONE = 'LOYALTY_MILESTONE', // Loyalty tier achievements
  NPS = 'NPS', // Net Promoter Score surveys
  CUSTOM = 'CUSTOM', // Custom one-off campaigns
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum CampaignChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsArray()
  @IsEnum(CampaignChannel, { each: true })
  channels: CampaignChannel[]; // Can send via multiple channels

  @IsOptional()
  @IsString()
  segment_id?: string; // Target specific segment (RFM, custom)

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsBoolean()
  is_automated: boolean; // True for birthday, welcome, etc.

  // Message content
  @IsOptional()
  @IsString()
  email_subject?: string;

  @IsOptional()
  @IsString()
  email_body?: string;

  @IsOptional()
  @IsString()
  whatsapp_template_id?: string; // Pre-approved Meta template

  @IsOptional()
  @IsString()
  sms_message?: string;

  @IsOptional()
  @IsString()
  push_title?: string;

  @IsOptional()
  @IsString()
  push_body?: string;

  // Offer/discount
  @IsOptional()
  @IsString()
  offer_code?: string;

  @IsOptional()
  @IsString()
  offer_description?: string;

  @IsOptional()
  @IsNumber()
  offer_discount_percent?: number;

  @IsOptional()
  @IsNumber()
  offer_discount_amount?: number;
}
