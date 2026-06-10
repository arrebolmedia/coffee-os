import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException } from '@nestjs/common';
import { FoodSafetyService } from '../food-safety.service';
import {
  CreateFoodSafetyIncidentDto,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  ResolveIncidentDto,
} from '../dto';

describe('FoodSafetyService (stub)', () => {
  let service: FoodSafetyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodSafetyService],
    }).compile();

    service = module.get<FoodSafetyService>(FoodSafetyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotImplementedException (no Prisma model)', async () => {
      const createDto: CreateFoodSafetyIncidentDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Refrigerador fuera de temperatura segura',
        reported_by_user_id: 'user_1',
      };

      await expect(service.create(createDto)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });

  describe('findAll', () => {
    it('should return empty array', async () => {
      const result = await service.findAll({});
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return null', async () => {
      const result = await service.findOne('any_id');
      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    it('should throw NotImplementedException', async () => {
      const resolveDto: ResolveIncidentDto = {
        status: IncidentStatus.RESOLVED,
        resolution_notes: 'Fixed',
        resolved_by_user_id: 'user_1',
      };

      await expect(service.resolve('any_id', resolveDto)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });

  describe('delete', () => {
    it('should throw NotImplementedException', async () => {
      await expect(service.delete('any_id')).rejects.toThrow(
        NotImplementedException,
      );
    });
  });

  describe('getStats', () => {
    it('should return zeroed stats object', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(0);
      expect(stats.open).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.resolved).toBe(0);
      expect(stats.closed).toBe(0);
      expect(stats.by_severity).toEqual({});
      expect(stats.by_type).toEqual({});
      expect(stats.avg_resolution_hours).toBe(0);
    });
  });

  describe('getCriticalIncidents', () => {
    it('should return empty array', async () => {
      const result = await service.getCriticalIncidents('org_1');
      expect(result).toEqual([]);
    });

    it('should return empty array with location filter', async () => {
      const result = await service.getCriticalIncidents('org_1', 'loc_1');
      expect(result).toEqual([]);
    });
  });
});
