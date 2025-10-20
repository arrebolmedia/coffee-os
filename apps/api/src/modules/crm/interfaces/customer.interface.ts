import { CustomerStatus } from '../dto';

export interface Customer {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  gender?: string;
  preferred_language?: string;
  notes?: string;

  // LFPDPPP Compliance
  consent_marketing: boolean;
  consent_whatsapp: boolean;
  consent_email: boolean;
  consent_sms: boolean;
  consent_date?: Date;
  consent_ip_address?: string;

  // Customer preferences
  favorite_drink?: string;
  dietary_restrictions?: string;
  allergies?: string;

  // Status
  status: CustomerStatus;
  blocked_reason?: string;

  // Loyalty
  loyalty_points: number;
  total_visits: number;
  total_spent: number;
  last_visit_date?: Date;

  // RFM Segmentation (calculated)
  rfm_segment?: string; // Champions, Loyal, At Risk, etc.
  recency_score?: number; // 1-5
  frequency_score?: number; // 1-5
  monetary_score?: number; // 1-5

  // Timestamps
  created_at: Date;
  updated_at: Date;
}
