import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BulkUpdateResult,
  Setting,
  SettingCategory,
  SettingExport,
  SettingHistory,
  SettingsStats,
  SettingTemplate,
  SettingTemplateItem,
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
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';

/**
 * Shape of a Prisma `setting` row as returned by the client. Fields are
 * camelCase and Json columns come back as `Prisma.JsonValue`.
 */
type SettingRow = {
  id: string;
  organizationId: string;
  category: string;
  key: string;
  type: string;
  value: Prisma.JsonValue;
  defaultValue: Prisma.JsonValue | null;
  description: string | null;
  isPublic: boolean;
  isReadonly: boolean;
  isEncrypted: boolean;
  validationRules: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SettingsService {
  private readonly ENCRYPTION_KEY: string;
  private readonly ALGORITHM = 'aes-256-cbc';

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.SETTINGS_ENCRYPTION_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error(
        'SETTINGS_ENCRYPTION_KEY environment variable is required and must not be empty',
      );
    }
    this.ENCRYPTION_KEY = key;
  }

  // ========== MAPPERS ==========

  /**
   * Map a Prisma `setting` row (camelCase, Json columns) to the snake_case
   * `Setting` interface the controller + frontend depend on. The `value` is
   * returned as-is from the Json column (an encrypted string when
   * is_encrypted, otherwise the raw value); decryption happens in
   * `sanitizeOutput`. Null `validationRules`/`metadata` map to `[]`/`{}`.
   */
  private toApi(row: SettingRow): Setting {
    return {
      id: row.id,
      organization_id: row.organizationId,
      category: row.category as SettingCategory,
      key: row.key,
      type: row.type as SettingType,
      value: row.value as any,
      default_value:
        row.defaultValue === null ? undefined : (row.defaultValue as any),
      description: row.description ?? undefined,
      is_public: row.isPublic,
      is_readonly: row.isReadonly,
      is_encrypted: row.isEncrypted,
      validation_rules:
        (row.validationRules as unknown as ValidationRule[] | null) ?? [],
      metadata: (row.metadata as unknown as Record<string, any> | null) ?? {},
      created_by: row.createdBy ?? undefined,
      updated_by: row.updatedBy ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  // ========== BASIC CRUD ==========

  async create(dto: CreateSettingDto): Promise<Setting> {
    const existing = await this.prisma.setting.findFirst({
      where: {
        organizationId: dto.organization_id,
        category: dto.category,
        key: dto.key,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Setting already exists: ${dto.category}.${dto.key}`,
      );
    }

    this.validateValue(dto.type, dto.value);

    const isEncrypted = dto.is_encrypted ?? false;
    const storedValue = isEncrypted ? this.encrypt(dto.value) : dto.value;

    let created: SettingRow;
    try {
      created = (await this.prisma.setting.create({
        data: {
          organizationId: dto.organization_id,
          category: dto.category,
          key: dto.key,
          type: dto.type,
          value: storedValue as Prisma.InputJsonValue,
          defaultValue:
            dto.default_value === undefined
              ? Prisma.DbNull
              : (dto.default_value as Prisma.InputJsonValue),
          description: dto.description ?? null,
          isPublic: dto.is_public ?? false,
          isReadonly: dto.is_readonly ?? false,
          isEncrypted: isEncrypted,
          validationRules: [] as Prisma.InputJsonValue,
          metadata: {} as Prisma.InputJsonValue,
          createdBy: dto.created_by ?? null,
        },
      })) as SettingRow;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Setting already exists: ${dto.category}.${dto.key}`,
        );
      }
      throw error;
    }

    // History: store the plaintext (decrypted) value for auditing.
    await this.addHistory(created.id, undefined, dto.value, dto.created_by);

    return this.sanitizeOutput(this.toApi(created));
  }

  async findAll(query: QuerySettingsDto): Promise<Setting[]> {
    const where: Prisma.SettingWhereInput = {};

    if (query.organization_id) {
      where.organizationId = query.organization_id;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.type) {
      where.type = query.type;
    }

    const rows = (await this.prisma.setting.findMany({
      where,
    })) as SettingRow[];

    let result = rows.map((row) => this.toApi(row));

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
      const aVal = (a as any)[sortBy] || '';
      const bVal = (b as any)[sortBy] || '';
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

    return result.map((s) => this.sanitizeOutput(s));
  }

  async findById(id: string): Promise<Setting> {
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }
    return this.sanitizeOutput(this.toApi(row));
  }

  async findByKey(
    organizationId: string,
    category: SettingCategory,
    key: string,
  ): Promise<Setting | undefined> {
    const row = (await this.prisma.setting.findFirst({
      where: { organizationId, category, key },
    })) as SettingRow | null;
    return row ? this.sanitizeOutput(this.toApi(row)) : undefined;
  }

  async update(
    id: string,
    dto: UpdateSettingDto,
    updatedBy?: string,
  ): Promise<Setting> {
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    const setting = this.toApi(row);

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot update readonly setting');
    }

    // Decrypted current value (used for history + re-encryption toggles).
    const oldValue = setting.is_encrypted
      ? this.decrypt(setting.value)
      : setting.value;

    const data: Prisma.SettingUpdateInput = {};

    // Track the effective is_encrypted + the (possibly re-derived) plaintext
    // value so re-encryption toggles are applied against the right base.
    let effectiveEncrypted = setting.is_encrypted;
    let plaintextValue = oldValue;

    if (dto.value !== undefined) {
      this.validateValue(setting.type, dto.value);

      if (setting.validation_rules && setting.validation_rules.length > 0) {
        this.validateAgainstRules(dto.value, setting.validation_rules);
      }

      plaintextValue = dto.value;
      data.value = (
        effectiveEncrypted ? this.encrypt(dto.value) : dto.value
      ) as Prisma.InputJsonValue;
    }

    if (dto.type !== undefined) data.type = dto.type;
    if (dto.default_value !== undefined)
      data.defaultValue = dto.default_value as Prisma.InputJsonValue;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_public !== undefined) data.isPublic = dto.is_public;

    if (dto.is_encrypted !== undefined) {
      if (dto.is_encrypted && !effectiveEncrypted) {
        // Turning encryption ON: encrypt the current plaintext.
        data.value = this.encrypt(plaintextValue) as Prisma.InputJsonValue;
      } else if (!dto.is_encrypted && effectiveEncrypted) {
        // Turning encryption OFF: store the plaintext.
        data.value = plaintextValue as Prisma.InputJsonValue;
      }
      effectiveEncrypted = dto.is_encrypted;
      data.isEncrypted = dto.is_encrypted;
    }

    data.updatedBy = updatedBy ?? null;

    const updated = (await this.prisma.setting.update({
      where: { id },
      data,
    })) as SettingRow;

    const newValue = effectiveEncrypted
      ? this.decrypt(updated.value as string)
      : (updated.value as any);
    await this.addHistory(id, oldValue, newValue, updatedBy);

    return this.sanitizeOutput(this.toApi(updated));
  }

  async delete(id: string): Promise<void> {
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    if (row.isReadonly) {
      throw new BadRequestException('Cannot delete readonly setting');
    }

    // SettingHistory has onDelete: Cascade, so related history rows are removed.
    await this.prisma.setting.delete({ where: { id } });
  }

  async resetToDefault(id: string, updatedBy?: string): Promise<Setting> {
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    const setting = this.toApi(row);

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot reset readonly setting');
    }

    if (setting.default_value === undefined) {
      throw new BadRequestException('Setting has no default value');
    }

    const oldValue = setting.is_encrypted
      ? this.decrypt(setting.value)
      : setting.value;

    const storedValue = setting.is_encrypted
      ? this.encrypt(setting.default_value)
      : setting.default_value;

    const updated = (await this.prisma.setting.update({
      where: { id },
      data: {
        value: storedValue as Prisma.InputJsonValue,
        updatedBy: updatedBy ?? null,
      },
    })) as SettingRow;

    await this.addHistory(
      id,
      oldValue,
      setting.default_value,
      updatedBy,
      'Reset to default',
    );

    return this.sanitizeOutput(this.toApi(updated));
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
    const where: Prisma.SettingWhereInput = {
      organizationId: dto.organization_id,
    };

    if (dto.categories && dto.categories.length > 0) {
      where.category = { in: dto.categories };
    }
    if (!dto.include_readonly) {
      where.isReadonly = false;
    }
    if (!dto.include_encrypted) {
      where.isEncrypted = false;
    }

    const rows = (await this.prisma.setting.findMany({
      where,
    })) as SettingRow[];
    const settings = rows.map((row) => this.toApi(row));

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
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    const setting = this.toApi(row);
    const rules: ValidationRule[] = setting.validation_rules ?? [];

    const rule: ValidationRule = {
      type: dto.type,
      value: dto.value,
      message: dto.message,
    };

    // Remove existing rule of same type, then append.
    const nextRules = rules.filter((r) => r.type !== dto.type);
    nextRules.push(rule);

    const updated = (await this.prisma.setting.update({
      where: { id },
      data: { validationRules: nextRules as unknown as Prisma.InputJsonValue },
    })) as SettingRow;

    return this.sanitizeOutput(this.toApi(updated));
  }

  async removeValidationRule(
    id: string,
    ruleType: ValidationRuleType,
  ): Promise<Setting> {
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    const setting = this.toApi(row);
    const nextRules = (setting.validation_rules ?? []).filter(
      (r) => r.type !== ruleType,
    );

    const updated = (await this.prisma.setting.update({
      where: { id },
      data: { validationRules: nextRules as unknown as Prisma.InputJsonValue },
    })) as SettingRow;

    return this.sanitizeOutput(this.toApi(updated));
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
    const row = (await this.prisma.setting.findUnique({
      where: { id },
    })) as SettingRow | null;
    if (!row) {
      throw new NotFoundException(`Setting not found: ${id}`);
    }

    const history = await this.prisma.settingHistory.findMany({
      where: { settingId: id },
      orderBy: { changedAt: 'asc' },
    });

    return history.map((h) => ({
      id: h.id,
      setting_id: h.settingId,
      old_value: h.oldValue === null ? undefined : (h.oldValue as any),
      new_value: h.newValue === null ? undefined : (h.newValue as any),
      changed_by: h.changedBy ?? undefined,
      changed_at: h.changedAt,
      reason: h.reason ?? undefined,
    }));
  }

  private async addHistory(
    settingId: string,
    oldValue: any,
    newValue: any,
    changedBy?: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.settingHistory.create({
      data: {
        settingId,
        oldValue:
          oldValue === undefined
            ? Prisma.DbNull
            : (oldValue as Prisma.InputJsonValue),
        newValue:
          newValue === undefined
            ? Prisma.DbNull
            : (newValue as Prisma.InputJsonValue),
        changedBy: changedBy ?? null,
        reason: reason ?? null,
      },
    });
  }

  // ========== TEMPLATES ==========

  async createTemplate(dto: CreateTemplateDto): Promise<SettingTemplate> {
    const items: SettingTemplateItem[] = dto.settings.map((s) => ({
      key: s.key,
      type: s.type as SettingType,
      value: s.value,
      description: s.description,
      is_public: s.is_public,
      is_readonly: s.is_readonly,
      validation_rules: s.validation_rules,
    }));

    const created = await this.prisma.settingTemplate.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        settings: items as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toApiTemplate(created);
  }

  async findAllTemplates(
    category?: SettingCategory,
  ): Promise<SettingTemplate[]> {
    const where: Prisma.SettingTemplateWhereInput = {};
    if (category) {
      where.category = category;
    }

    const rows = await this.prisma.settingTemplate.findMany({ where });
    return rows.map((row) => this.toApiTemplate(row));
  }

  async findTemplateById(id: string): Promise<SettingTemplate> {
    const row = await this.prisma.settingTemplate.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Template not found: ${id}`);
    }
    return this.toApiTemplate(row);
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
    const row = await this.prisma.settingTemplate.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Template not found: ${id}`);
    }
    await this.prisma.settingTemplate.delete({ where: { id } });
  }

  /**
   * Map a Prisma `setting_template` row to the `SettingTemplate` interface.
   * The `settings` Json column is the serialized `SettingTemplateItem[]`.
   */
  private toApiTemplate(row: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    settings: Prisma.JsonValue;
    createdAt: Date;
  }): SettingTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category as SettingCategory,
      settings: (row.settings as unknown as SettingTemplateItem[]) ?? [],
      created_at: row.createdAt,
    };
  }

  // ========== CATEGORY HELPERS ==========

  async getByCategory(
    organizationId: string,
    category: SettingCategory,
  ): Promise<Setting[]> {
    const rows = (await this.prisma.setting.findMany({
      where: { organizationId, category },
    })) as SettingRow[];
    return rows.map((row) => this.sanitizeOutput(this.toApi(row)));
  }

  async getPublicSettings(organizationId: string): Promise<Setting[]> {
    const rows = (await this.prisma.setting.findMany({
      where: { organizationId, isPublic: true },
    })) as SettingRow[];
    return rows.map((row) => this.sanitizeOutput(this.toApi(row)));
  }

  // ========== STATISTICS ==========

  async getStats(organizationId: string): Promise<SettingsStats> {
    const rows = (await this.prisma.setting.findMany({
      where: { organizationId },
    })) as SettingRow[];
    const orgSettings = rows.map((row) => this.toApi(row));

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
