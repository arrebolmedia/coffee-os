import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../settings.service';
import { CreateSettingDto, UpdateSettingDto } from '../dto';
import { SettingType, SettingCategory } from '../interfaces';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('SettingsService', () => {
  let service: SettingsService;
  const orgId = 'org-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    (service as any).settings.clear();
  });

  describe('create', () => {
    it('should create a string setting', async () => {
      const dto: CreateSettingDto = {
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'brand_name',
        type: SettingType.STRING,
        value: 'Café Premium',
        description: 'Brand name',
      };

      const result = await service.create(dto);
      expect(result).toBeDefined();
      expect(result.key).toBe('brand_name');
      expect(result.value).toBe('Café Premium');
      expect(result.type).toBe(SettingType.STRING);
    });

    it('should create a number setting', async () => {
      const dto: CreateSettingDto = {
        organization_id: orgId,
        category: SettingCategory.POS,
        key: 'max_discount_percent',
        type: SettingType.NUMBER,
        value: 15,
      };

      const result = await service.create(dto);
      expect(result.value).toBe(15);
      expect(result.type).toBe(SettingType.NUMBER);
    });

    it('should create a boolean setting', async () => {
      const dto: CreateSettingDto = {
        organization_id: orgId,
        category: SettingCategory.POS,
        key: 'allow_tips',
        type: SettingType.BOOLEAN,
        value: true,
        default_value: false,
      };

      const result = await service.create(dto);
      expect(result.value).toBe(true);
      expect(result.default_value).toBe(false);
    });

    it('should create a JSON setting', async () => {
      const dto: CreateSettingDto = {
        organization_id: orgId,
        category: SettingCategory.UI,
        key: 'theme',
        type: SettingType.JSON,
        value: { primaryColor: '#FF5733', darkMode: false },
      };

      const result = await service.create(dto);
      expect(result.value).toEqual({ primaryColor: '#FF5733', darkMode: false });
    });

    it('should throw ConflictException if key exists', async () => {
      await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'duplicate',
        type: SettingType.STRING,
        value: 'test',
      });

      await expect(
        service.create({
          organization_id: orgId,
          category: SettingCategory.GENERAL,
          key: 'duplicate',
          type: SettingType.STRING,
          value: 'test2',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same key in different categories', async () => {
      await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'timeout',
        type: SettingType.NUMBER,
        value: 30,
      });

      const result = await service.create({
        organization_id: orgId,
        category: SettingCategory.POS,
        key: 'timeout',
        type: SettingType.NUMBER,
        value: 60,
      });

      expect(result.value).toBe(60);
    });

    it('should throw BadRequestException for invalid string type', async () => {
      await expect(
        service.create({
          organization_id: orgId,
          category: SettingCategory.GENERAL,
          key: 'test',
          type: SettingType.STRING,
          value: 123,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid number type', async () => {
      await expect(
        service.create({
          organization_id: orgId,
          category: SettingCategory.GENERAL,
          key: 'test',
          type: SettingType.NUMBER,
          value: 'not a number',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid boolean type', async () => {
      await expect(
        service.create({
          organization_id: orgId,
          category: SettingCategory.GENERAL,
          key: 'test',
          type: SettingType.BOOLEAN,
          value: 'yes',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid JSON type', async () => {
      await expect(
        service.create({
          organization_id: orgId,
          category: SettingCategory.GENERAL,
          key: 'test',
          type: SettingType.JSON,
          value: 'not json',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'setting1',
        type: SettingType.STRING,
        value: 'val1',
      });
      await service.create({
        organization_id: orgId,
        category: SettingCategory.POS,
        key: 'setting2',
        type: SettingType.NUMBER,
        value: 100,
      });
      await service.create({
        organization_id: 'org-456',
        category: SettingCategory.GENERAL,
        key: 'setting3',
        type: SettingType.BOOLEAN,
        value: true,
      });
    });

    it('should return all settings', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: orgId });
      expect(result).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const result = await service.findAll({ category: SettingCategory.POS });
      expect(result).toHaveLength(1);
    });

    it('should filter by type', async () => {
      const result = await service.findAll({ type: SettingType.STRING });
      expect(result).toHaveLength(1);
    });

    it('should search by key', async () => {
      const result = await service.findAll({ search: 'setting1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return setting by id', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'find_me',
        type: SettingType.STRING,
        value: 'test',
      });

      const result = await service.findById(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByKey', () => {
    it('should return setting by org+category+key', async () => {
      await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'brand',
        type: SettingType.STRING,
        value: 'test',
      });

      const result = await service.findByKey(
        orgId,
        SettingCategory.GENERAL,
        'brand',
      );
      expect(result).toBeDefined();
      expect(result?.key).toBe('brand');
    });

    it('should return undefined if not found', async () => {
      const result = await service.findByKey(
        orgId,
        SettingCategory.GENERAL,
        'non_existent',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update setting value', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'test',
        type: SettingType.STRING,
        value: 'old',
      });

      const result = await service.update(created.id, { value: 'new' });
      expect(result.value).toBe('new');
    });

    it('should throw BadRequestException if readonly', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'readonly',
        type: SettingType.STRING,
        value: 'test',
        is_readonly: true,
      });

      await expect(
        service.update(created.id, { value: 'new' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate value type on update', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'test',
        type: SettingType.NUMBER,
        value: 100,
      });

      await expect(
        service.update(created.id, { value: 'not a number' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete setting', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'temp',
        type: SettingType.STRING,
        value: 'test',
      });

      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if readonly', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'readonly',
        type: SettingType.STRING,
        value: 'test',
        is_readonly: true,
      });

      await expect(service.delete(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetToDefault', () => {
    it('should reset to default value', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'test',
        type: SettingType.NUMBER,
        value: 100,
        default_value: 50,
      });

      const result = await service.resetToDefault(created.id);
      expect(result.value).toBe(50);
    });

    it('should throw BadRequestException if no default', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'test',
        type: SettingType.STRING,
        value: 'test',
      });

      await expect(service.resetToDefault(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if readonly', async () => {
      const created = await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 'readonly',
        type: SettingType.STRING,
        value: 'test',
        default_value: 'default',
        is_readonly: true,
      });

      await expect(service.resetToDefault(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        organization_id: orgId,
        category: SettingCategory.GENERAL,
        key: 's1',
        type: SettingType.STRING,
        value: 'v1',
        is_public: true,
      });
      await service.create({
        organization_id: orgId,
        category: SettingCategory.POS,
        key: 's2',
        type: SettingType.NUMBER,
        value: 100,
        is_readonly: true,
      });
      await service.create({
        organization_id: orgId,
        category: SettingCategory.POS,
        key: 's3',
        type: SettingType.BOOLEAN,
        value: true,
      });
    });

    it('should return comprehensive stats', async () => {
      const stats = await service.getStats(orgId);
      expect(stats.total).toBe(3);
      expect(stats.by_category[SettingCategory.GENERAL]).toBe(1);
      expect(stats.by_category[SettingCategory.POS]).toBe(2);
      expect(stats.by_type[SettingType.STRING]).toBe(1);
      expect(stats.by_type[SettingType.NUMBER]).toBe(1);
      expect(stats.by_type[SettingType.BOOLEAN]).toBe(1);
      expect(stats.public_count).toBe(1);
      expect(stats.readonly_count).toBe(1);
    });
  });
});
