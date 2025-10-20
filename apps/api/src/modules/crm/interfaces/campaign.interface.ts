import { CampaignType, CampaignStatus, CampaignChannel } from '../dto';

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  channels: CampaignChannel[];
  segment_id?: string;
  start_date?: Date;
  end_date?: Date;
  is_automated: boolean;

  // Message content
  email_subject?: string;
  email_body?: string;
  whatsapp_template_id?: string;
  sms_message?: string;
  push_title?: string;
  push_body?: string;

  // Offer/discount
  offer_code?: string;
  offer_description?: string;
  offer_discount_percent?: number;
  offer_discount_amount?: number;

  // Campaign metrics
  total_recipients?: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  unsubscribed_count: number;

  created_by_user_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  channel: CampaignChannel;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  converted_at?: Date;
  unsubscribed_at?: Date;
  error_message?: string;
}
