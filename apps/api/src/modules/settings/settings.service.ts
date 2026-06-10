import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BulkUpdateResult,
  Setting,
  SettingCategory,
  SettingExport,
  SettingHistory,
  SettingsStats,
  SettingTemplate,
  SettingType,
  ValidationRule,
  ValidationRuleType,
} from './interfaces/setting.interface';
import {
  BulkUpdateDto,
  CreateSettingDto,
  CreateTemplateDto,
  ExportSettingsDto,
  ImportSettingsDto,
  QuerySettingsDto,
  SetValidationRuleDto,
  UpdateSettingDto,
} from './dto';
import * as crypto from 'crypto';

@Injectable()
export class SettingsService {
  private settings = new Map<string, Setting>();
  private history = new Map<string, SettingHistory[]>();
  private templates = new Map<string, SettingTemplate>();
  private readonly ENCRYPTION_KEY: string;
  private readonly ALGORITHM = 'aes-256-cbc';

  constructor() {
    const key = process.env.SETTINGS_ENCRYPTION_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error(
        'SETTINGS_ENCRYPTION_KEY environment variable is required and must not be empty',
      );
    }
    this.ENCRYPTION_KEY = key;
  }

  // ========== BASIC CRUD ==========

  async create(dto: CreateSettingDto): Promise<Setting> {
    const existing = Array.from(this.settings.values()).find(
      (s) =>
        s.organization_id === dto.organization_id &&
        s.category === dto.category &&
        s.key === dto.key,
    );

    if (existing) {
      throw new ConflictException(
        `Setting already exists: ${dto.category}.${dto.key}`,
      );
    }

    this.validateValue(dto.type, dto.value);

    const value = dto.is_encrypted ? this.encrypt(dto.value) : dto.value;

    const setting: Setting = {
      id: randomUUID(),
      organization_id: dto.organization_id,
      category: dto.category,
      key: dto.key,
      type: dto.type,
      value,
      default_value: dto.default_value,
      description: dto.description,
      is_public: dto.is_public ?? false,
      is_readonly: dto.is_readonly ?? false,
      is_encrypted: dto.is_encrypted ?? false,
      validation_rules: [],
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.settings.set(setting.id, setting);
    this.addHistory(setting.id, undefined, setting.value, dto.created_by);

    return this.sanitizeOutput(setting);
  }

  async findAll(query: QuerySettingsDto): Promise<Setting[]> {
    let result = Array.from(this.settings.values());

    if (query.organization_id) {
      result = result.filter(
        (s) => s.organization_id === query.organization_id,
      );
    }

    if (query.category) {
      result = result.filter((s) => s.category === query.category);
    }

    if (query.type) {
      result = result.filter((s) => s.type === query.type);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.key.toLowerCase().includes(search) ||
          s.description?.toLowerCase().includes(search),
      );
    }

    const sortBy = query.sort_by || 'key';
    const order = query.order || 'asc';
    result.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

    return result.map((s) => this.sanitizeOutput(s));
  }

  async findById(id: string): Promise<Setting> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }
    return this.sanitizeOutput(setting);
  }

  async findByKey(
    organizationId: string,
    category: SettingCategory,
    key: string,
  ): Promise<Setting | undefined> {
    const setting = Array.from(this.settings.values()).find(
      (s) =>
        s.organization_id === organizationId &&
        s.category === category &&
        s.key === key,
    );
    return setting ? this.sanitizeOutput(setting) : undefined;
  }

  async update(
    id: string,
    dto: UpdateSettingDto,
    updatedBy?: string,
  ): Promise<Setting> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot update readonly setting');
    }

    const oldValue = setting.is_encrypted
      ? this.decrypt(setting.value)
      : setting.value;

    if (dto.value !== undefined) {
      this.validateValue(setting.type, dto.value);

      // Validate against rules
      if (setting.validation_rules && setting.validation_rules.length > 0) {
        this.validateAgainstRules(dto.value, setting.validation_rules);
      }

      setting.value = setting.is_encrypted
        ? this.encrypt(dto.value)
        : dto.value;
    }

    if (dto.type !== undefined) setting.type = dto.type;
    if (dto.default_value !== undefined)
      setting.default_value = dto.default_value;
    if (dto.description !== undefined) setting.description = dto.description;
    if (dto.is_public !== undefined) setting.is_public = dto.is_public;
    if (dto.is_encrypted !== undefined) {
      if (dto.is_encrypted && !setting.is_encrypted) {
        setting.value = this.encrypt(setting.value);
      } else if (!dto.is_encrypted && setting.is_encrypted) {
        setting.value = this.decrypt(setting.value);
      }
      setting.is_encrypted = dto.is_encrypted;
    }

    setting.updated_by = updatedBy;
    setting.updated_at = new Date();

    const newValue = setting.is_encrypted
      ? this.decrypt(setting.value)
      : setting.value;
    this.addHistory(id, oldValue, newValue, updatedBy);

    return this.sanitizeOutput(setting);
  }

  async delete(id: string): Promise<void> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot delete readonly setting');
    }

    this.settings.delete(id);
    this.history.delete(id);
  }

  async resetToDefault(id: string, updatedBy?: string): Promise<Setting> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot reset readonly setting');
    }

    if (setting.default_value === undefined) {
      throw new BadRequestException('Setting has no default value');
    }

    const oldValue = setting.is_encrypted
      ? this.decrypt(setting.value)
      : setting.value;

    setting.value = setting.is_encrypted
      ? this.encrypt(setting.default_value)
      : setting.default_value;
    setting.updated_by = updatedBy;
    setting.updated_at = new Date();

    this.addHistory(
      id,
      oldValue,
      setting.default_value,
      updatedBy,
      'Reset to default',
    );

    return this.sanitizeOutput(setting);
  }

  // ========== BULK OPERATIONS ==========

  async bulkUpdate(
    dto: BulkUpdateDto,
    updatedBy?: string,
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of dto.updates) {
      try {
        const setting = await this.findByKey(
          dto.organization_id,
          item.category as SettingCategory,
          item.key,
        );

        if (!setting) {
          result.failed++;
          result.errors.push({ key: item.key, error: 'Setting not found' });
          continue;
        }

        await this.update(setting.id, { value: item.value }, updatedBy);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({ key: item.key, error: error.message });
      }
    }

    return result;
  }

  // ========== IMPORT/EXPORT ==========

  async exportSettings(dto: ExportSettingsDto): Promise<SettingExport> {
    let settings = Array.from(this.settings.values()).filter(
      (s) => s.organization_id === dto.organization_id,
    );

    if (dto.categories && dto.categories.length > 0) {
      settings = settings.filter((s) => dto.categories.includes(s.category));
    }

    if (!dto.include_readonly) {
      settings = settings.filter((s) => !s.is_readonly);
    }

    if (!dto.include_encrypted) {
      settings = settings.filter((s) => !s.is_encrypted);
    }

    const exportData: SettingExport = {
      version: '1.0',
      exported_at: new Date(),
      organization_id: dto.organization_id,
      settings: settings.map((s) => ({
        category: s.category,
        key: s.key,
        type: s.type,
        value: s.is_encrypted ? this.decrypt(s.value) : s.value,
        description: s.description,
        is_public: s.is_public,
        validation_rules: s.validation_rules,
      })),
    };

    return exportData;
  }

  async importSettings(
    dto: ImportSettingsDto,
    createdBy?: string,
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of dto.settings) {
      try {
        const existing = await this.findByKey(
          dto.organization_id,
          item.category,
          item.key,
        );

        if (existing) {
          if (dto.overwrite_existing) {
            if (existing.is_readonly && dto.skip_readonly) {
              result.failed++;
              result.errors.push({
                key: item.key,
                error: 'Skipped readonly setting',
              });
              continue;
            }
            await this.update(existing.id, { value: item.value }, createdBy);
            result.success++;
          } else {
            result.failed++;
            result.errors.push({
              key: item.key,
              error: 'Setting already exists',
            });
          }
        } else {
          await this.create({
            organization_id: dto.organization_id,
            category: item.category,
            key: item.key,
            type: item.type,
            value: item.value,
            description: item.description,
            is_public: item.is_public ?? false,
            is_readonly: false,
            is_encrypted: false,
            created_by: createdBy,
          });
          result.success++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({ key: item.key, error: error.message });
      }
    }

    return result;
  }

  // ========== VALIDATION RULES ==========

  async setValidationRule(
    id: string,
    dto: SetValidationRuleDto,
  ): Promise<Setting> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    if (!setting.validation_rules) {
      setting.validation_rules = [];
    }

    const rule: ValidationRule = {
      type: dto.type,
      value: dto.value,
      message: dto.message,
    };

    // Remove existing rule of same type
    setting.validation_rules = setting.validation_rules.filter(
      (r) => r.type !== dto.type,
    );

    setting.validation_rules.push(rule);
    setting.updated_at = new Date();

    return this.sanitizeOutput(setting);
  }

  async removeValidationRule(
    id: string,
    ruleType: ValidationRuleType,
  ): Promise<Setting> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    if (setting.validation_rules) {
      setting.validation_rules = setting.validation_rules.filter(
        (r) => r.type !== ruleType,
      );
      setting.updated_at = new Date();
    }

    return this.sanitizeOutput(setting);
  }

  private validateAgainstRules(value: any, rules: ValidationRule[]): void {
    for (const rule of rules) {
      switch (rule.type) {
        case ValidationRuleType.REGEX:
          if (typeof value === 'string') {
            const regex = new RegExp(rule.value);
            if (!regex.test(value)) {
              throw new BadRequestException(
                rule.message || `Value does not match pattern: ${rule.value}`,
              );
            }
          }
          break;

        case ValidationRuleType.MIN:
          if (typeof value === 'number' && value < rule.value) {
            throw new BadRequestException(
              rule.message || `Value must be at least ${rule.value}`,
            );
          }
          break;

        case ValidationRuleType.MAX:
          if (typeof value === 'number' && value > rule.value) {
            throw new BadRequestException(
              rule.message || `Value must be at most ${rule.value}`,
            );
          }
          break;

        case ValidationRuleType.ENUM:
          if (Array.isArray(rule.value) && !rule.value.includes(value)) {
            throw new BadRequestException(
              rule.message || `Value must be one of: ${rule.value.join(', ')}`,
            );
          }
          break;

        case ValidationRuleType.RANGE:
          if (
            typeof value === 'number' &&
            Array.isArray(rule.value) &&
            (value < rule.value[0] || value > rule.value[1])
          ) {
            throw new BadRequestException(
              rule.message ||
                `Value must be between ${rule.value[0]} and ${rule.value[1]}`,
            );
          }
          break;

        case ValidationRuleType.LENGTH:
          if (
            typeof value === 'string' &&
            Array.isArray(rule.value) &&
            (value.length < rule.value[0] || value.length > rule.value[1])
          ) {
            throw new BadRequestException(
              rule.message ||
                `Length must be between ${rule.value[0]} and ${rule.value[1]}`,
            );
          }
          break;

        default:
          break;
      }
    }
  }

  // ========== HISTORY ==========

  async getHistory(id: string): Promise<SettingHistory[]> {
    const setting = this.settings.get(id);
    if (!setting) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    return this.history.get(id) || [];
  }

  private addHistory(
    settingId: string,
    oldValue: any,
    newValue: any,
    changedBy?: string,
    reason?: string,
  ): void {
    const historyEntry: SettingHistory = {
      id: randomUUID(),
      setting_id: settingId,
      old_value: oldValue,
      new_value: newValue,
      changed_by: changedBy,
      changed_at: new Date(),
      reason,
    };

    const settingHistory = this.history.get(settingId) || [];
    settingHistory.push(historyEntry);
    this.history.set(settingId, settingHistory);
  }

  // ========== TEMPLATES ==========

  async createTemplate(dto: CreateTemplateDto): Promise<SettingTemplate> {
    const template: SettingTemplate = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      category: dto.category,
      settings: dto.settings.map((s) => ({
        key: s.key,
        type: s.type as SettingType,
        value: s.value,
        description: s.description,
        is_public: s.is_public,
        is_readonly: s.is_readonly,
        validation_rules: s.validation_rules,
      })),
      created_at: new Date(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  async findAllTemplates(
    category?: SettingCategory,
  ): Promise<SettingTemplate[]> {
    let result = Array.from(this.templates.values());

    if (category) {
      result = result.filter((t) => t.category === category);
    }

    return result;
  }

  async findTemplateById(id: string): Promise<SettingTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }
    return template;
  }

  async applyTemplate(
    organizationId: string,
    templateId: string,
    createdBy?: string,
  ): Promise<BulkUpdateResult> {
    const template = await this.findTemplateById(templateId);

    const result: BulkUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of template.settings) {
      try {
        const existing = await this.findByKey(
          organizationId,
          template.category,
          item.key,
        );

        if (!existing) {
          await this.create({
            organization_id: organizationId,
            category: template.category,
            key: item.key,
            type: item.type as SettingType,
            value: item.value,
            description: item.description,
            is_public: item.is_public ?? false,
            is_readonly: item.is_readonly ?? false,
            is_encrypted: false,
            created_by: createdBy,
          });
          result.success++;
        } else {
          result.failed++;
          result.errors.push({
            key: item.key,
            error: 'Setting already exists',
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({ key: item.key, error: error.message });
      }
    }

    return result;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }
    this.templates.delete(id);
  }

  // ========== CATEGORY HELPERS ==========

  async getByCategory(
    organizationId: string,
    category: SettingCategory,
  ): Promise<Setting[]> {
    return Array.from(this.settings.values())
      .filter(
        (s) => s.organization_id === organizationId && s.category === category,
      )
      .map((s) => this.sanitizeOutput(s));
  }

  async getPublicSettings(organizationId: string): Promise<Setting[]> {
    return Array.from(this.settings.values())
      .filter(
        (s) => s.organization_id === organizationId && s.is_public === true,
      )
      .map((s) => this.sanitizeOutput(s));
  }

  // ========== STATISTICS ==========

  async getStats(organizationId: string): Promise<SettingsStats> {
    const orgSettings = Array.from(this.settings.values()).filter(
      (s) => s.organization_id === organizationId,
    );

    const stats: SettingsStats = {
      total: orgSettings.length,
      by_category: {},
      by_type: {},
      public_count: 0,
      readonly_count: 0,
      encrypted_count: 0,
      with_validation_count: 0,
    };

    for (const setting of orgSettings) {
      stats.by_category[setting.category] =
        (stats.by_category[setting.category] || 0) + 1;
      stats.by_type[setting.type] = (stats.by_type[setting.type] || 0) + 1;

      if (setting.is_public) stats.public_count++;
      if (setting.is_readonly) stats.readonly_count++;
      if (setting.is_encrypted) stats.encrypted_count++;
      if (setting.validation_rules && setting.validation_rules.length > 0) {
        stats.with_validation_count++;
      }
    }

    return stats;
  }

  // ========== INITIALIZATION ==========

  async initializeDefaults(
    organizationId: string,
    createdBy?: string,
  ): Promise<number> {
    const defaults = this.getDefaultSettings(organizationId, createdBy);
    let created = 0;

    for (const dto of defaults) {
      try {
        const existing = await this.findByKey(
          organizationId,
          dto.category,
          dto.key,
        );
        if (!existing) {
          await this.create(dto);
          created++;
        }
      } catch {
        // Skip if already exists or error
      }
    }

    return created;
  }

  private getDefaultSettings(
    organizationId: string,
    createdBy?: string,
  ): CreateSettingDto[] {
    return [
      // GENERAL
      {
        organization_id: organizationId,
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
        default_value: 'America/Mexico_City',
        description: 'Default timezone',
        is_public: true,
        is_readonly: false,
        created_by: createdBy,
      },
      {
        organization_id: organizationId,
        category: SettingCategory.GENERAL,
        key: 'currency',
        type: SettingType.STRING,
        value: 'MXN',
        default_value: 'MXN',
        description: 'Default currency',
        is_public: true,
        is_readonly: false,
        created_by: createdBy,
      },
      {
        organization_id: organizationId,
        category: SettingCategory.GENERAL,
        key: 'language',
        type: SettingType.STRING,
        value: 'es',
        default_value: 'es',
        description: 'Default language',
        is_public: true,
        is_readonly: false,
        created_by: createdBy,
      },
      // FINANCE
      {
        organization_id: organizationId,
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
        default_value: 16,
        description: 'IVA tax rate (%)',
        is_public: false,
        is_readonly: false,
        created_by: createdBy,
      },
    ];
  }

  // ========== ENCRYPTION HELPERS ==========

  private encrypt(value: any): string {
    const iv = crypto.randomBytes(16);
    const key = crypto
      .createHash('sha256')
      .update(this.ENCRYPTION_KEY)
      .digest();
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    let encrypted = cipher.update(valueStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encrypted: string): any {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const key = crypto
      .createHash('sha256')
      .update(this.ENCRYPTION_KEY)
      .digest();
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  // ========== TYPE VALIDATION ==========

  private validateValue(type: SettingType, value: any): void {
    switch (type) {
      case SettingType.STRING:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string');
        }
        break;
      case SettingType.NUMBER:
        if (typeof value !== 'number') {
          throw new BadRequestException('Value must be a number');
        }
        break;
      case SettingType.BOOLEAN:
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Value must be a boolean');
        }
        break;
      case SettingType.JSON:
        if (typeof value !== 'object' || value === null) {
          throw new BadRequestException('Value must be a valid JSON object');
        }
        break;
      default:
        throw new BadRequestException(`Unknown type: ${type}`);
    }
  }

  // ========== OUTPUT SANITIZATION ==========

  private sanitizeOutput(setting: Setting): Setting {
    const output = { ...setting };

    // Decrypt encrypted values for output
    if (output.is_encrypted && output.value) {
      output.value = this.decrypt(output.value);
    }

    return output;
  }
}
