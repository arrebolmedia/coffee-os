export enum Channel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface NotificationTemplate {
  id: string;
  organization_id: string;
  code: string; // unique per org
  name: string;
  channel: Channel;
  subject?: string;
  body: string; // templated string (mustache/handlebars)
  variables?: string[]; // allowed variables
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  organization_id: string;
  template_id?: string;
  channel: Channel;
  to: string; // email/phone/userId
  subject?: string;
  body?: string; // resolved body
  data?: Record<string, any>; // raw payload
  status: NotificationStatus;
  attempts: number;
  scheduled_at?: Date;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationStats {
  total: number;
  by_status: Partial<Record<NotificationStatus, number>>;
  by_channel: Partial<Record<Channel, number>>;
}
