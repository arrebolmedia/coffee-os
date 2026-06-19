import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
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
import { PrismaService } from '../../database/prisma.service';

/**
 * Stateful in-memory fake of the PrismaService delegates the SettingsService
 * touches. No real database is used. The fake mimics Prisma semantics closely
 * enough (cuid-ish ids, unique [organizationId, category, key], cascade delete
 * of history) for the service's behavioral contracts, while every delegate
 * method remains a `jest.fn()` so call args (e.g. the ENCRYPTED value passed to
 * `setting.create`) can be asserted.
 */
function createPrismaMock() {
  const settings: any[] = [];
  const history: any[] = [];
  const templates: any[] = [];
  let seq = 0;
  const nextId = (p: string) => `${p}-${(++seq).toString().padStart(6, '0')}`;

  const matchesWhere = (row: any, where: any = {}): boolean => {
    for (const [k, cond] of Object.entries(where)) {
      const v = row[k];
      if (cond !== null && typeof cond === 'object') {
        if ('in' in (cond as any)) {
          if (!(cond as any).in.includes(v)) return false;
          continue;
        }
        if ('equals' in (cond as any)) {
          if (v !== (cond as any).equals) return false;
          continue;
        }
        return false;
      }
      if (v !== cond) return false;
    }
    return true;
  };

  const prisma = {
    setting: {
      findFirst: jest.fn(
        async ({ where }: any = {}) =>
          settings.find((s) => matchesWhere(s, where)) ?? null,
      ),
      findUnique: jest.fn(
        async ({ where }: any) =>
          settings.find((s) => s.id === where.id) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any = {}) =>
        settings.filter((s) => matchesWhere(s, where)),
      ),
      create: jest.fn(async ({ data }: any) => {
        // Enforce the composite unique constraint like Postgres would.
        const dup = settings.find(
          (s) =>
            s.organizationId === data.organizationId &&
            s.category === data.category &&
            s.key === data.key,
        );
        if (dup) {
          const err: any = new Error('Unique constraint failed');
          err.code = 'P2002';
          Object.setPrototypeOf(
            err,
            Prisma.PrismaClientKnownRequestError.prototype,
          );
          throw err;
        }
        const now = new Date();
        const row = {
          id: nextId('setting'),
          organizationId: data.organizationId,
          category: data.category,
          key: data.key,
          type: data.type,
          value: data.value,
          defaultValue:
            data.defaultValue === undefined ||
            data.defaultValue?.constructor?.name?.includes('DbNull')
              ? null
              : data.defaultValue,
          description: data.description ?? null,
          isPublic: data.isPublic ?? false,
          isReadonly: data.isReadonly ?? false,
          isEncrypted: data.isEncrypted ?? false,
          validationRules: data.validationRules ?? null,
          metadata: data.metadata ?? null,
          createdBy: data.createdBy ?? null,
          updatedBy: data.updatedBy ?? null,
          createdAt: now,
          updatedAt: now,
        };
        settings.push(row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = settings.find((s) => s.id === where.id);
        if (!row) throw new Error('Record to update not found');
        for (const [k, v] of Object.entries(data)) {
          row[k] = v as any;
        }
        row.updatedAt = new Date();
        return { ...row };
      }),
      delete: jest.fn(async ({ where }: any) => {
        const idx = settings.findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error('Record to delete not found');
        const [removed] = settings.splice(idx, 1);
        // Cascade history.
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].settingId === removed.id) history.splice(i, 1);
        }
        return removed;
      }),
      count: jest.fn(
        async ({ where }: any = {}) =>
          settings.filter((s) => matchesWhere(s, where)).length,
      ),
    },
    settingHistory: {
      create: jest.fn(async ({ data }: any) => {
        const isDbNull = (x: any) =>
          x && x.constructor?.name?.includes('DbNull');
        const row = {
          id: nextId('hist'),
          settingId: data.settingId,
          oldValue:
            data.oldValue === undefined || isDbNull(data.oldValue)
              ? null
              : data.oldValue,
          newValue:
            data.newValue === undefined || isDbNull(data.newValue)
              ? null
              : data.newValue,
          changedBy: data.changedBy ?? null,
          changedAt: new Date(),
          reason: data.reason ?? null,
        };
        history.push(row);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where }: any = {}) =>
        history
          .filter((h) => matchesWhere(h, where))
          .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime() || 0),
      ),
      deleteMany: jest.fn(async ({ where }: any = {}) => {
        let count = 0;
        for (let i = history.length - 1; i >= 0; i--) {
          if (matchesWhere(history[i], where)) {
            history.splice(i, 1);
            count++;
          }
        }
        return { count };
      }),
    },
    settingTemplate: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: nextId('tpl'),
          name: data.name,
          description: data.description ?? null,
          category: data.category,
          settings: data.settings,
          createdAt: new Date(),
        };
        templates.push(row);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where }: any = {}) =>
        templates.filter((t) => matchesWhere(t, where)),
      ),
      findUnique: jest.fn(
        async ({ where }: any) =>
          templates.find((t) => t.id === where.id) ?? null,
      ),
      delete: jest.fn(async ({ where }: any) => {
        const idx = templates.findIndex((t) => t.id === where.id);
        if (idx === -1) throw new Error('Record to delete not found');
        const [removed] = templates.splice(idx, 1);
        return removed;
      }),
    },
    // Expose raw stores for white-box assertions if needed.
    __stores: { settings, history, templates },
  };

  return prisma;
}

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeAll(() => {
    // SettingsService requires SETTINGS_ENCRYPTION_KEY at construction.
    process.env.SETTINGS_ENCRYPTION_KEY =
      'test-encryption-key-do-not-use-in-prod';
  });

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
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
      // Non-encrypted setting persists value verbatim.
      expect(prisma.setting.create).toHaveBeenCalledTimes(1);
      expect(prisma.setting.create.mock.calls[0][0].data.value).toBe(
        'America/Mexico_City',
      );
      // Output shape: null validationRules/metadata mapped to []/{}.
      expect(result.validation_rules).toEqual([]);
      expect(result.metadata).toEqual({});
    });

    it('should throw ConflictException if setting already exists (pre-check)', async () => {
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

    it('should map Prisma P2002 to ConflictException (race-safe)', async () => {
      // Bypass the pre-check so create() hits the unique constraint directly.
      prisma.setting.findFirst.mockResolvedValueOnce(null);
      // Seed an existing row that the fake create() will collide with.
      await service.create({
        organization_id: 'org-1',
        category: SettingCategory.GENERAL,
        key: 'timezone',
        type: SettingType.STRING,
        value: 'America/Mexico_City',
      });

      // Next create: pre-check returns null (mocked), but the fake create
      // raises P2002 because the row already exists.
      prisma.setting.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.create({
          organization_id: 'org-1',
          category: SettingCategory.GENERAL,
          key: 'timezone',
          type: SettingType.STRING,
          value: 'America/New_York',
        }),
      ).rejects.toThrow(ConflictException);
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
      expect(prisma.setting.create).not.toHaveBeenCalled();
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

  describe('Encryption (at-rest contract)', () => {
    it('should persist an ENCRYPTED value (not plaintext) when is_encrypted', async () => {
      const secret = 'secret-key-123';
      const result = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: secret,
        is_encrypted: true,
      });

      // Output is decrypted...
      expect(result.is_encrypted).toBe(true);
      expect(result.value).toBe(secret);

      // ...but what was handed to prisma.setting.create MUST be encrypted.
      const stored = prisma.setting.create.mock.calls[0][0].data.value;
      expect(typeof stored).toBe('string');
      expect(stored).not.toBe(secret);
      expect(stored).not.toContain(secret);
      // AES-256-CBC envelope is `<ivHex>:<cipherHex>`.
      expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);

      // The raw row in the store is likewise the ciphertext, never plaintext.
      const row = prisma.__stores.settings.find((s) => s.id === result.id);
      expect(row.value).toBe(stored);
      expect(row.value).not.toBe(secret);
    });

    it('should decrypt encrypted values on read (findById)', async () => {
      const created = await service.create({
        organization_id: 'org-1',
        category: SettingCategory.INTEGRATIONS,
        key: 'api_key',
        type: SettingType.STRING,
        value: 'secret-key-123',
        is_encrypted: true,
      });

      const found = await service.findById(created.id);

      // Stored ciphertext is decrypted back to plaintext for the caller.
      expect(found.value).toBe('secret-key-123');
      const row = prisma.__stores.settings.find((s) => s.id === created.id);
      expect(row.value).not.toBe('secret-key-123');
    });

    it('should encrypt at rest when toggling encryption on via update', async () => {
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

      const row = prisma.__stores.settings.find((s) => s.id === created.id);
      expect(row.isEncrypted).toBe(true);
      expect(row.value).not.toBe('secret-key-123');
      expect(row.value).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
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
      expect(prisma.settingTemplate.create).toHaveBeenCalledTimes(1);
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
