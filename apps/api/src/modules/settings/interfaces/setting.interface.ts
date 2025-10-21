export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

export enum SettingCategory {
  GENERAL = 'general',
  POS = 'pos',
  INVENTORY = 'inventory',
  HR = 'hr',
  CRM = 'crm',
  FINANCE = 'finance',
  QUALITY = 'quality',
  NOTIFICATIONS = 'notifications',
  INTEGRATIONS = 'integrations',
  UI = 'ui',
}

export interface Setting {
  id: string;
  organization_id: string;
  category: SettingCategory;
  key: string; // unique per org+category
  type: SettingType;
  value: any;
  default_value?: any;
  description?: string;
  is_public: boolean; // can be read by frontend
  is_readonly: boolean; // cannot be changed via API
  created_at: Date;
  updated_at: Date;
}

export interface SettingsStats {
  total: number;
  by_category: Partial<Record<SettingCategory, number>>;
  by_type: Partial<Record<SettingType, number>>;
  public_count: number;
  readonly_count: number;
}
