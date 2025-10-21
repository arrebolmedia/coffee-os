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

export enum ValidationRuleType {
  REGEX = 'regex',
  MIN = 'min',
  MAX = 'max',
  ENUM = 'enum',
  RANGE = 'range',
  LENGTH = 'length',
  CUSTOM = 'custom',
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
  is_encrypted: boolean; // encrypted storage for sensitive data
  validation_rules?: ValidationRule[];
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ValidationRule {
  type: ValidationRuleType;
  value?: any; // For REGEX (pattern), MIN/MAX (number), ENUM (array), RANGE ([min,max]), LENGTH ([min,max])
  message?: string; // Custom error message
}

export interface SettingHistory {
  id: string;
  setting_id: string;
  old_value: any;
  new_value: any;
  changed_by?: string;
  changed_at: Date;
  reason?: string;
}

export interface SettingTemplate {
  id: string;
  name: string;
  description?: string;
  category: SettingCategory;
  settings: SettingTemplateItem[];
  created_at: Date;
}

export interface SettingTemplateItem {
  key: string;
  type: SettingType;
  value: any;
  description?: string;
  is_public?: boolean;
  is_readonly?: boolean;
  validation_rules?: ValidationRule[];
}

export interface SettingsStats {
  total: number;
  by_category: Partial<Record<SettingCategory, number>>;
  by_type: Partial<Record<SettingType, number>>;
  public_count: number;
  readonly_count: number;
  encrypted_count: number;
  with_validation_count: number;
}

export interface BulkUpdateResult {
  success: number;
  failed: number;
  errors: Array<{ key: string; error: string }>;
}

export interface SettingExport {
  version: string;
  exported_at: Date;
  organization_id: string;
  settings: Array<{
    category: SettingCategory;
    key: string;
    type: SettingType;
    value: any;
    description?: string;
    is_public: boolean;
    validation_rules?: ValidationRule[];
  }>;
}
