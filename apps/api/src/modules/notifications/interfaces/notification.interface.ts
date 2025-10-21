export enum Channel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  READ = 'read',
  BOUNCED = 'bounced',
  SPAM = 'spam',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TemplateCategory {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
  OPERATIONAL = 'operational',
  ALERTS = 'alerts',
  SYSTEM = 'system',
}

export interface NotificationTemplate {
  id: string;
  organization_id: string;
  code: string; // unique per org
  name: string;
  description?: string;
  category: TemplateCategory;
  channel: Channel;
  subject?: string;
  body: string; // templated string (mustache/handlebars)
  html_body?: string; // For email HTML version
  variables?: string[]; // allowed variables
  metadata?: Record<string, any>;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id?: string; // recipient user ID if applicable
  template_id?: string;
  channel: Channel;
  priority: NotificationPriority;
  to: string; // email/phone/userId/webhook_url
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string; // resolved body
  html_body?: string; // resolved HTML body
  data?: Record<string, any>; // raw payload
  attachments?: NotificationAttachment[];
  status: NotificationStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at?: Date;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  bounced_at?: Date;
  last_error?: string;
  provider_id?: string; // External provider message ID
  provider_response?: any;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationAttachment {
  filename: string;
  content_type: string;
  url?: string;
  content?: string; // base64 encoded
  size?: number;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  organization_id: string;
  channel: Channel;
  category: TemplateCategory;
  enabled: boolean;
  quiet_hours_start?: string; // HH:mm format
  quiet_hours_end?: string;
  timezone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationBatch {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  template_id: string;
  channel: Channel;
  recipients: string[]; // Array of email/phone/userId
  data?: Record<string, any>; // Common data for all recipients
  individual_data?: Record<string, Record<string, any>>; // Per-recipient data
  scheduled_at?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_count: number;
  sent_count: number;
  failed_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationStats {
  organization_id: string;
  total: number;
  by_status: Partial<Record<NotificationStatus, number>>;
  by_channel: Partial<Record<Channel, number>>;
  by_priority: Partial<Record<NotificationPriority, number>>;
  success_rate: number;
  avg_delivery_time_ms?: number;
  failed_today: number;
  sent_today: number;
  delivered_today: number;
}

export interface NotificationLog {
  id: string;
  notification_id: string;
  timestamp: Date;
  status: NotificationStatus;
  message: string;
  details?: any;
}
