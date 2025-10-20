import { Test, TestingModule } from '@nestjs/testing';
import { TemperatureLogsService } from '../temperature-logs.service';
import { CreateTemperatureLogDto, TemperatureType, TemperatureUnit } from '../dto';

describe('TemperatureLogsService', () => {
  let service: TemperatureLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemperatureLogsService],
    }).compile();

    service = module.get<TemperatureLogsService>(TemperatureLogsService);
  });

  afterEach(() => {
    service['logs'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a temperature log successfully', async () => {
      const createDto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador Principal',
        recorded_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.temperature).toBe(2);
      expect(result.is_within_range).toBe(true);
      expect(result.alert_triggered).toBe(false);
    });

    it('should trigger alert when temperature is out of range', async () => {
      const createDto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 10, // Too high for refrigerator (should be 0-4°C)
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador Principal',
        recorded_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result.is_within_range).toBe(false);
      expect(result.alert_triggered).toBe(true);
    });

    it('should convert Fahrenheit to Celsius for range check', async () => {
      const createDto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 35.6, // 35.6°F = 2°C (within range)
        unit: TemperatureUnit.FAHRENHEIT,
        equipment_name: 'Refrigerador Principal',
        recorded_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result.is_within_range).toBe(true);
      expect(result.alert_triggered).toBe(false);
    });

    it('should check freezer temperature range', async () => {
      const createDto: CreateTemperatureLogDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.FREEZER,
        temperature: -15,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Congelador 1',
        recorded_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result.is_within_range).toBe(true);
    });

    it('should include product and location details', async () => {
      const createDto: CreateTemperatureLogDto = {
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

      const result = await service.create(createDto);

      expect(result.product_name).toBe('Pastel de Chocolate');
      expect(result.location_detail).toBe('Estante superior derecho');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 1',
        recorded_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_2',
        organization_id: 'org_1',
        type: TemperatureType.FREEZER,
        temperature: -15,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Congelador 1',
        recorded_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_2',
        type: TemperatureType.HOT_HOLDING,
        temperature: 65,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Calentador 1',
        recorded_by_user_id: 'user_1',
      });
    });

    it('should return all logs when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by location_id', async () => {
      const result = await service.findAll({ location_id: 'loc_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const result = await service.findAll({ type: TemperatureType.REFRIGERATOR });
      expect(result).toHaveLength(1);
    });

    it('should filter by equipment name', async () => {
      const result = await service.findAll({ equipment_name: 'Refrigerador' });
      expect(result).toHaveLength(1);
    });

    it('should sort by recorded_at descending', async () => {
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
      const created = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 1',
        recorded_by_user_id: 'user_1',
      });

      const result = await service.findOne(created.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.findOne('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('getAlerts', () => {
    beforeEach(async () => {
      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 10, // Out of range
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 1',
        recorded_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2, // In range
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 2',
        recorded_by_user_id: 'user_1',
      });
    });

    it('should return only alerts', async () => {
      const result = await service.getAlerts('org_1');
      expect(result).toHaveLength(1);
      expect(result[0].alert_triggered).toBe(true);
    });

    it('should filter alerts by location', async () => {
      await service.create({
        location_id: 'loc_2',
        organization_id: 'org_1',
        type: TemperatureType.FREEZER,
        temperature: 5, // Out of range
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Congelador 1',
        recorded_by_user_id: 'user_1',
      });

      const result = await service.getAlerts('org_1', 'loc_1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 1',
        recorded_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 10, // Alert
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 2',
        recorded_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.FREEZER,
        temperature: -15,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Congelador 1',
        recorded_by_user_id: 'user_1',
      });
    });

    it('should return statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(3);
      expect(stats.alerts).toBe(1);
      expect(stats.compliant).toBe(2);
      expect(stats.compliance_rate).toBe(67);
    });

    it('should group by type', async () => {
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
    it('should delete a log', async () => {
      const log = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: TemperatureType.REFRIGERATOR,
        temperature: 2,
        unit: TemperatureUnit.CELSIUS,
        equipment_name: 'Refrigerador 1',
        recorded_by_user_id: 'user_1',
      });

      await service.delete(log.id);
      const result = await service.findOne(log.id);
      expect(result).toBeNull();
    });
  });
});
