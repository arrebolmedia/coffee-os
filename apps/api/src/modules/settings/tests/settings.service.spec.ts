import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../settings.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  SettingCategory,
  SettingType,
  ValidationRuleType,
} from '../interfaces';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeAll(() => {
    // SettingsService now requires SETTINGS_ENCRYPTION_KEY at construction.
    process.env.SETTINGS_ENCRYPTION_KEY =
      'test-encryption-key-do-not-use-in-prod';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    // Clear all data
    service['settings'].clear();
    service['history'].clear();
    service['templates'].clear();
  });

  describe('Basic CRUD', () => {
    it('should create a new setting', async () => {
      const dto = {
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
        description: 'Default timezone',
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.organization_id).toBe('org-1');
      expect(result.key).toBe('timezone');
      expect(result.value).toBe('America/Mexico_City');
      expect(result.is_public).toBe(false);
      expect(result.is_readonly).toBe(false);
      expect(result.is_encrypted).toBe(false);
    });

    it('should throw ConflictException if setting already exists', async () => {
      const dto = {
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      };

      await service.create(dto);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should validate value type on create', async () => {
      const dto = {
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'port',
        type: SettingType.NUMBER,
        value: 'not-a-number',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should return all settings', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
      });

      const result = await service.findAll({});

      expect(result).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-2',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/New_York',
      });

      const result = await service.findAll({ organization_id: 'org-1' });

      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org-1');
    });

    it('should filter by category', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
      });

      const result = await service.findAll({
        category: SettingCategory.FINANCE,
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(SettingCategory.FINANCE);
    });

    it('should filter by type', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'max_users',
        type: SettingType.NUMBER,
        value: 100,
      });

      const result = await service.findAll({ type: SettingType.NUMBER });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(SettingType.NUMBER);
    });

    it('should search by key or description', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
        description: 'Default timezone setting',
      });

      const result = await service.findAll({ search: 'timezone' });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('timezone');
    });

    it('should return setting by id', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      const result = await service.findById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException for invalid id', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return setting by key', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      const result = await service.findByKey(
        'org-1',
        SettingCategory.GENERAL,
        'timezone',
      );

      expect(result).toBeDefined();
      expect(result!.key).toBe('timezone');
    });

    it('should update setting', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      const updated = await service.update(created.id, {
        value: 'America/New_York',
      });

      expect(updated.value).toBe('America/New_York');
    });

    it('should throw error when updating readonly setting', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'system_version',
        type: SettingType.STRING,
        value: '1.0.0',
        is_readonly: true,
      });

      await expect(
        service.update(created.id, { value: '2.0.0' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete setting', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when deleting readonly setting', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'system_version',
        type: SettingType.STRING,
        value: '1.0.0',
        is_readonly: true,
      });

      await expect(service.delete(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset to default value', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/New_York',
        default_value: 'America/Mexico_City',
      });

      await service.update(created.id, { value: 'Europe/Madrid' });

      const reset = await service.resetToDefault(created.id);

      expect(reset.value).toBe('America/Mexico_City');
    });

    it('should throw error when resetting without default', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await expect(service.resetToDefault(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Encryption', () => {
    it('should create encrypted setting', async () => {
      const dto = {
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: 'secret-key-123',
        is_encrypted: true,
      };

      const result = await service.create(dto);

      expect(result.is_encrypted).toBe(true);
      expect(result.value).toBe('secret-key-123'); // Decrypted in output
    });

    it('should decrypt encrypted values on read', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: 'secret-key-123',
        is_encrypted: true,
      });

      const found = await service.findById(created.id);

      expect(found.value).toBe('secret-key-123');
    });

    it('should toggle encryption on update', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: 'secret-key-123',
        is_encrypted: false,
      });

      const encrypted = await service.update(created.id, {
        is_encrypted: true,
      });

      expect(encrypted.is_encrypted).toBe(true);
      expect(encrypted.value).toBe('secret-key-123');
    });
  });

  describe('Validation Rules', () => {
    it('should set validation rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'port',
        type: SettingType.NUMBER,
        value: 3000,
      });

      const updated = await service.setValidationRule(created.id, {
        type: ValidationRuleType.RANGE,
        value: [1000, 9999],
        message: 'Port must be between 1000 and 9999',
      });

      expect(updated.validation_rules).toHaveLength(1);
      expect(updated.validation_rules![0].type).toBe(ValidationRuleType.RANGE);
    });

    it('should validate against REGEX rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'email',
        type: SettingType.STRING,
        value: 'test@example.com',
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.REGEX,
        value: '^[^@]+@[^@]+\\.[^@]+$',
      });

      await expect(
        service.update(created.id, { value: 'invalid-email' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate against MIN rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'min_age',
        type: SettingType.NUMBER,
        value: 18,
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.MIN,
        value: 18,
      });

      await expect(service.update(created.id, { value: 15 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate against MAX rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'max_users',
        type: SettingType.NUMBER,
        value: 100,
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.MAX,
        value: 1000,
      });

      await expect(service.update(created.id, { value: 1500 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate against ENUM rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'language',
        type: SettingType.STRING,
        value: 'es',
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.ENUM,
        value: ['es', 'en', 'fr'],
      });

      await expect(service.update(created.id, { value: 'de' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate against RANGE rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.RANGE,
        value: [0, 100],
      });

      await expect(service.update(created.id, { value: 150 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate against LENGTH rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'code',
        type: SettingType.STRING,
        value: '12345',
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.LENGTH,
        value: [5, 10],
      });

      await expect(
        service.update(created.id, { value: '123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove validation rule', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'port',
        type: SettingType.NUMBER,
        value: 3000,
      });

      await service.setValidationRule(created.id, {
        type: ValidationRuleType.RANGE,
        value: [1000, 9999],
      });

      const updated = await service.removeValidationRule(
        created.id,
        ValidationRuleType.RANGE,
      );

      expect(updated.validation_rules).toHaveLength(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update settings', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'language',
        type: SettingType.STRING,
        value: 'es',
      });

      const result = await service.bulkUpdate({
        organization_id: 'org-1',
        updates: [
          {
            category: SettingCategory.GENERAL,
            key: 'timezone',
            value: 'America/New_York',
          },
          { category: SettingCategory.GENERAL, key: 'language', value: 'en' },
        ],
      });

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle bulk update errors', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      const result = await service.bulkUpdate({
        organization_id: 'org-1',
        updates: [
          {
            category: SettingCategory.GENERAL,
            key: 'timezone',
            value: 'America/New_York',
          },
          {
            category: SettingCategory.GENERAL,
            key: 'non_existent',
            value: 'value',
          },
        ],
      });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Import/Export', () => {
    it('should export settings', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
      });

      const result = await service.exportSettings({
        organization_id: 'org-1',
      });

      expect(result.version).toBe('1.0');
      expect(result.settings).toHaveLength(2);
      expect(result.organization_id).toBe('org-1');
    });

    it('should filter export by categories', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
      });

      const result = await service.exportSettings({
        organization_id: 'org-1',
        categories: [SettingCategory.GENERAL],
      });

      expect(result.settings).toHaveLength(1);
      expect(result.settings[0].category).toBe(SettingCategory.GENERAL);
    });

    it('should import settings', async () => {
      const result = await service.importSettings({
        organization_id: 'org-1',
        settings: [
          {
            category: SettingCategory.GENERAL,
            key: 'timezone',
            type: SettingType.STRING,
            value: 'America/Mexico_City',
          },
          {
            category: SettingCategory.FINANCE,
            key: 'tax_rate',
            type: SettingType.NUMBER,
            value: 16,
          },
        ],
      });

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      const settings = await service.findAll({ organization_id: 'org-1' });
      expect(settings).toHaveLength(2);
    });

    it('should overwrite on import if specified', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      const result = await service.importSettings({
        organization_id: 'org-1',
        overwrite_existing: true,
        settings: [
          {
            category: SettingCategory.GENERAL,
            key: 'timezone',
            type: SettingType.STRING,
            value: 'America/New_York',
          },
        ],
      });

      expect(result.success).toBe(1);

      const setting = await service.findByKey(
        'org-1',
        SettingCategory.GENERAL,
        'timezone',
      );
      expect(setting!.value).toBe('America/New_York');
    });
  });

  describe('History', () => {
    it('should track history on create', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
        created_by: 'user-1',
      });

      const history = await service.getHistory(created.id);

      expect(history).toHaveLength(1);
      expect(history[0].new_value).toBeDefined();
      expect(history[0].changed_by).toBe('user-1');
    });

    it('should track history on update', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.update(created.id, { value: 'America/New_York' }, 'user-1');

      const history = await service.getHistory(created.id);

      expect(history).toHaveLength(2); // Create + Update
      expect(history[1].old_value).toBe('America/Mexico_City');
      expect(history[1].new_value).toBe('America/New_York');
      expect(history[1].changed_by).toBe('user-1');
    });

    it('should track history on reset', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/New_York',
        default_value: 'America/Mexico_City',
      });

      await service.resetToDefault(created.id, 'user-1');

      const history = await service.getHistory(created.id);

      expect(history).toHaveLength(2);
      expect(history[1].reason).toBe('Reset to default');
      expect(history[1].changed_by).toBe('user-1');
    });
  });

  describe('Templates', () => {
    it('should create template', async () => {
      const template = await service.createTemplate({
        name: 'Default Settings',
        description: 'Default settings for new organizations',
        category: SettingCategory.GENERAL,
        settings: [
          {
            key: 'timezone',
            type: 'string',
            value: 'America/Mexico_City',
            description: 'Default timezone',
          },
          {
            key: 'language',
            type: 'string',
            value: 'es',
            description: 'Default language',
          },
        ],
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('Default Settings');
      expect(template.settings).toHaveLength(2);
    });

    it('should list templates', async () => {
      await service.createTemplate({
        name: 'Template 1',
        category: SettingCategory.GENERAL,
        settings: [],
      });

      await service.createTemplate({
        name: 'Template 2',
        category: SettingCategory.FINANCE,
        settings: [],
      });

      const templates = await service.findAllTemplates();

      expect(templates).toHaveLength(2);
    });

    it('should filter templates by category', async () => {
      await service.createTemplate({
        name: 'Template 1',
        category: SettingCategory.GENERAL,
        settings: [],
      });

      await service.createTemplate({
        name: 'Template 2',
        category: SettingCategory.FINANCE,
        settings: [],
      });

      const templates = await service.findAllTemplates(SettingCategory.GENERAL);

      expect(templates).toHaveLength(1);
      expect(templates[0].category).toBe(SettingCategory.GENERAL);
    });

    it('should apply template', async () => {
      const template = await service.createTemplate({
        name: 'Default Settings',
        category: SettingCategory.GENERAL,
        settings: [
          {
            key: 'timezone',
            type: 'string',
            value: 'America/Mexico_City',
          },
          {
            key: 'language',
            type: 'string',
            value: 'es',
          },
        ],
      });

      const result = await service.applyTemplate('org-1', template.id);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      const settings = await service.getByCategory(
        'org-1',
        SettingCategory.GENERAL,
      );
      expect(settings).toHaveLength(2);
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'Template',
        category: SettingCategory.GENERAL,
        settings: [],
      });

      await service.deleteTemplate(template.id);

      await expect(service.findTemplateById(template.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Category Helpers', () => {
    it('should get settings by category', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
      });

      const result = await service.getByCategory(
        'org-1',
        SettingCategory.GENERAL,
      );

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(SettingCategory.GENERAL);
    });

    it('should get public settings', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
        is_public: true,
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: 'secret',
        is_public: false,
      });

      const result = await service.getPublicSettings('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].is_public).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return comprehensive statistics', async () => {
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
        is_public: true,
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.FINANCE,
        key: 'tax_rate',
        type: SettingType.NUMBER,
        value: 16,
        is_readonly: true,
      });

      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: 'secret',
        is_encrypted: true,
      });

      const stats = await service.getStats('org-1');

      expect(stats.total).toBe(3);
      expect(stats.by_category[SettingCategory.GENERAL]).toBe(1);
      expect(stats.by_type[SettingType.STRING]).toBe(2);
      expect(stats.public_count).toBe(1);
      expect(stats.readonly_count).toBe(1);
      expect(stats.encrypted_count).toBe(1);
    });
  });

  describe('Initialization', () => {
    it('should initialize default settings', async () => {
      const created = await service.initializeDefaults('org-1', 'user-1');

      expect(created).toBeGreaterThan(0);

      const settings = await service.findAll({ organization_id: 'org-1' });
      expect(settings.length).toBeGreaterThan(0);
    });

    it('should not duplicate on re-initialization', async () => {
      await service.initializeDefaults('org-1');
      const firstCount = await service.initializeDefaults('org-1');

      expect(firstCount).toBe(0); // No new settings created
    });
  });
});
