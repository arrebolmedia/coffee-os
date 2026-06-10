import { Test, TestingModule } from '@nestjs/testing';
import { TemperatureLogsService } from '../temperature-logs.service';
import {
  CreateTemperatureLogDto,
  TemperatureType,
  TemperatureUnit,
} from '../dto';
import { PrismaService } from '../../database/prisma.service';

function makeQualityLog(overrides: Partial<any> = {}) {
  const now = new Date();
  return {
    id: 'ql_1',
    locationId: 'loc_1',
    userId: 'user_1',
    type: 'TEMPERATURE',
    value: 2,
    unit: 'CELSIUS',
    equipment: 'Refrigerador Principal',
    notes: 'subtype:REFRIGERATOR|org:org_1|in_range:true',
    signedBy: null,
    signedAt: null,
    recordedAt: now,
    ...overrides,
  };
}

const prismaMock = {
  qualityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TemperatureLogsService', () => {
  let service: TemperatureLogsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemperatureLogsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TemperatureLogsService>(TemperatureLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a temperature log successfully', async () => {
      const dto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador Principal',
        recorded_by_user_id: 'user_1',
      };

      prismaMock.qualityLog.create.mockResolvedValue(
        makeQualityLog({ value: 2 }),
      );

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.temperature).toBe(2);
      expect(result.is_within_range).toBe(true);
      expect(result.alert_triggered).toBe(false);
    });

    it('should trigger alert when temperature is out of range', async () => {
      const dto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 10,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador Principal',
        recorded_by_user_id: 'user_1',
      };

      prismaMock.qualityLog.create.mockResolvedValue(
        makeQualityLog({ value: 10 }),
      );

      const result = await service.create(dto);

      expect(result.is_within_range).toBe(false);
      expect(result.alert_triggered).toBe(true);
    });

    it('should convert Fahrenheit to Celsius for range check', async () => {
      const dto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 35.6, // 35.6°F ≈ 2°C (within 0-4 range)
        unit: TemperatureUnit.FAHRENHEIT,
        equipment_name: 'Refrigerador Principal',
        recorded_by_user_id: 'user_1',
      };

      prismaMock.qualityLog.create.mockResolvedValue(
        makeQualityLog({ value: 35.6, unit: 'FAHRENHEIT' }),
      );

      const result = await service.create(dto);

      expect(result.is_within_range).toBe(true);
      expect(result.alert_triggered).toBe(false);
    });

    it('should include product and location details', async () => {
      const dto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.COLD_HOLDING,
        temperature: 3,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Vitrina de Postres',
        product_name: 'Pastel de Chocolate',
        location_detail: 'Estante superior derecho',
        recorded_by_user_id: 'user_1',
      };

      prismaMock.qualityLog.create.mockResolvedValue(
        makeQualityLog({ value: 3 }),
      );

      const result = await service.create(dto);

      expect(result.product_name).toBe('Pastel de Chocolate');
      expect(result.location_detail).toBe('Estante superior derecho');
    });
  });

  describe('findAll', () => {
    it('should return all logs when no filters', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({ id: 'ql_1' }),
        makeQualityLog({
          id: 'ql_2',
          locationId: 'loc_2',
          notes: 'subtype:FREEZER|org:org_1|in_range:true',
        }),
        makeQualityLog({
          id: 'ql_3',
          notes: 'subtype:HOT_HOLDING|org:org_2|in_range:true',
        }),
      ]);

      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by location_id in Prisma where clause', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({ id: 'ql_1' }),
        makeQualityLog({
          id: 'ql_3',
          notes: 'subtype:HOT_HOLDING|org:org_2|in_range:true',
        }),
      ]);

      await service.findAll({ location_id: 'loc_1' });

      expect(prismaMock.qualityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: 'loc_1' }),
        }),
      );
    });

    it('should post-filter by organization_id', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({
          id: 'ql_1',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:true',
        }),
        makeQualityLog({
          id: 'ql_2',
          notes: 'subtype:FREEZER|org:org_2|in_range:true',
        }),
      ]);

      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org_1');
    });

    it('should post-filter by type', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({
          id: 'ql_1',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:true',
        }),
        makeQualityLog({
          id: 'ql_2',
          notes: 'subtype:FREEZER|org:org_1|in_range:true',
        }),
      ]);

      const result = await service.findAll({
        type: TemperatureType.REFRIGERATOR,
      });
      expect(result).toHaveLength(1);
    });

    it('should sort by recorded_at descending', async () => {
      const t1 = new Date('2025-10-01T10:00:00Z');
      const t2 = new Date('2025-10-01T09:00:00Z');

      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({ id: 'ql_1', recordedAt: t1 }),
        makeQualityLog({ id: 'ql_2', recordedAt: t2 }),
      ]);

      const result = await service.findAll({});
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].recorded_at.getTime()).toBeGreaterThanOrEqual(
          result[i + 1].recorded_at.getTime(),
        );
      }
    });
  });

  describe('findOne', () => {
    it('should return a log by id', async () => {
      prismaMock.qualityLog.findUnique.mockResolvedValue(
        makeQualityLog({ id: 'ql_1' }),
      );

      const result = await service.findOne('ql_1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('ql_1');
    });

    it('should return null for non-existent id', async () => {
      prismaMock.qualityLog.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non_existent');
      expect(result).toBeNull();
    });

    it('should return null if record type is not TEMPERATURE', async () => {
      prismaMock.qualityLog.findUnique.mockResolvedValue(
        makeQualityLog({ id: 'ql_1', type: 'PPM' }),
      );

      const result = await service.findOne('ql_1');
      expect(result).toBeNull();
    });
  });

  describe('getAlerts', () => {
    it('should return only records with alert_triggered', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({
          id: 'ql_1',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:false',
        }),
        makeQualityLog({
          id: 'ql_2',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:true',
        }),
      ]);

      const result = await service.getAlerts('org_1');
      expect(result).toHaveLength(1);
      expect(result[0].alert_triggered).toBe(true);
    });

    it('should filter alerts by organization_id', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({
          id: 'ql_1',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:false',
        }),
        makeQualityLog({
          id: 'ql_2',
          notes: 'subtype:FREEZER|org:org_2|in_range:false',
        }),
      ]);

      const result = await service.getAlerts('org_1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return statistics with compliance rate', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({
          id: 'ql_1',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:true',
        }),
        makeQualityLog({
          id: 'ql_2',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:false',
        }),
        makeQualityLog({
          id: 'ql_3',
          notes: 'subtype:FREEZER|org:org_1|in_range:true',
        }),
      ]);

      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(3);
      expect(stats.alerts).toBe(1);
      expect(stats.compliant).toBe(2);
      expect(stats.compliance_rate).toBe(67);
    });

    it('should group by type', async () => {
      prismaMock.qualityLog.findMany.mockResolvedValue([
        makeQualityLog({
          id: 'ql_1',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:true',
        }),
        makeQualityLog({
          id: 'ql_2',
          notes: 'subtype:REFRIGERATOR|org:org_1|in_range:false',
        }),
        makeQualityLog({
          id: 'ql_3',
          notes: 'subtype:FREEZER|org:org_1|in_range:true',
        }),
      ]);

      const stats = await service.getStats('org_1');

      expect(stats.by_type[TemperatureType.REFRIGERATOR]).toEqual({
        total: 2,
        alerts: 1,
      });
      expect(stats.by_type[TemperatureType.FREEZER]).toEqual({
        total: 1,
        alerts: 0,
      });
    });
  });

  describe('delete', () => {
    it('should call prisma delete', async () => {
      prismaMock.qualityLog.delete.mockResolvedValue({});

      await service.delete('ql_1');

      expect(prismaMock.qualityLog.delete).toHaveBeenCalledWith({
        where: { id: 'ql_1' },
      });
    });
  });
});
