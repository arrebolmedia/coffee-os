import { Test, TestingModule } from '@nestjs/testing';
import { FoodSafetyService } from '../food-safety.service';
import {
  CreateFoodSafetyIncidentDto,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  ResolveIncidentDto,
} from '../dto';

describe('FoodSafetyService', () => {
  let service: FoodSafetyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodSafetyService],
    }).compile();

    service = module.get<FoodSafetyService>(FoodSafetyService);
  });

  afterEach(() => {
    service['incidents'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an incident successfully', async () => {
      const createDto: CreateFoodSafetyIncidentDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Refrigerador fuera de temperatura segura',
        reported_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(IncidentType.TEMPERATURE_VIOLATION);
      expect(result.severity).toBe(IncidentSeverity.HIGH);
      expect(result.status).toBe(IncidentStatus.OPEN);
      expect(result.reported_at).toBeDefined();
    });

    it('should include product and location details', async () => {
      const createDto: CreateFoodSafetyIncidentDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.EXPIRED_PRODUCT,
        severity: IncidentSeverity.MEDIUM,
        description: 'Producto vencido encontrado',
        product_affected: 'Leche entera 1L',
        location_detail: 'Refrigerador principal, estante 2',
        reported_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result.product_affected).toBe('Leche entera 1L');
      expect(result.location_detail).toBe('Refrigerador principal, estante 2');
    });

    it('should include immediate action taken', async () => {
      const createDto: CreateFoodSafetyIncidentDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.CONTAMINATION,
        severity: IncidentSeverity.CRITICAL,
        description: 'Posible contaminación cruzada',
        immediate_action_taken: 'Producto descartado y área desinfectada',
        reported_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result.immediate_action_taken).toBe('Producto descartado y área desinfectada');
    });

    it('should include photo URLs', async () => {
      const createDto: CreateFoodSafetyIncidentDto = {
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.PEST_SIGHTING,
        severity: IncidentSeverity.HIGH,
        description: 'Cucaracha avistada en almacén',
        photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        reported_by_user_id: 'user_1',
      };

      const result = await service.create(createDto);

      expect(result.photo_urls).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Incident 1',
        reported_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_2',
        organization_id: 'org_1',
        type: IncidentType.EXPIRED_PRODUCT,
        severity: IncidentSeverity.MEDIUM,
        description: 'Incident 2',
        reported_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_2',
        type: IncidentType.CONTAMINATION,
        severity: IncidentSeverity.CRITICAL,
        description: 'Incident 3',
        reported_by_user_id: 'user_1',
      });
    });

    it('should return all incidents when no filters', async () => {
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
      const result = await service.findAll({ type: IncidentType.TEMPERATURE_VIOLATION });
      expect(result).toHaveLength(1);
    });

    it('should filter by severity', async () => {
      const result = await service.findAll({ severity: IncidentSeverity.CRITICAL });
      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const result = await service.findAll({ status: IncidentStatus.OPEN });
      expect(result).toHaveLength(3);
    });

    it('should sort by incident_date descending', async () => {
      const result = await service.findAll({});
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].incident_date.getTime()).toBeGreaterThanOrEqual(
          result[i + 1].incident_date.getTime(),
        );
      }
    });
  });

  describe('findOne', () => {
    it('should return an incident by id', async () => {
      const created = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Test incident',
        reported_by_user_id: 'user_1',
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

  describe('resolve', () => {
    it('should resolve an incident', async () => {
      const incident = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Test incident',
        reported_by_user_id: 'user_1',
      });

      const resolveDto: ResolveIncidentDto = {
        status: IncidentStatus.RESOLVED,
        resolution_notes: 'Refrigerador reparado y temperatura normalizada',
        resolved_by_user_id: 'user_2',
        corrective_action: 'Técnico revisó y reparó termostato',
        preventive_action: 'Implementar revisiones semanales',
      };

      const result = await service.resolve(incident.id, resolveDto);

      expect(result.status).toBe(IncidentStatus.RESOLVED);
      expect(result.resolution_notes).toBe('Refrigerador reparado y temperatura normalizada');
      expect(result.corrective_action).toBe('Técnico revisó y reparó termostato');
      expect(result.preventive_action).toBe('Implementar revisiones semanales');
      expect(result.resolved_at).toBeDefined();
      expect(result.resolved_by_user_id).toBe('user_2');
    });

    it('should throw error for non-existent incident', async () => {
      const resolveDto: ResolveIncidentDto = {
        status: IncidentStatus.RESOLVED,
        resolution_notes: 'Notes',
        resolved_by_user_id: 'user_1',
      };

      await expect(service.resolve('non_existent', resolveDto)).rejects.toThrow(
        'Incident not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete an incident', async () => {
      const incident = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Test incident',
        reported_by_user_id: 'user_1',
      });

      await service.delete(incident.id);
      const result = await service.findOne(incident.id);
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const incident1 = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'Incident 1',
        reported_by_user_id: 'user_1',
      });

      await service.resolve(incident1.id, {
        status: IncidentStatus.RESOLVED,
        resolution_notes: 'Resolved',
        resolved_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.CONTAMINATION,
        severity: IncidentSeverity.CRITICAL,
        description: 'Incident 2',
        reported_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.EXPIRED_PRODUCT,
        severity: IncidentSeverity.MEDIUM,
        description: 'Incident 3',
        reported_by_user_id: 'user_1',
      });
    });

    it('should return incident statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(3);
      expect(stats.resolved).toBe(1);
      expect(stats.open).toBe(2);
    });

    it('should group by severity', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_severity[IncidentSeverity.CRITICAL]).toBe(1);
      expect(stats.by_severity[IncidentSeverity.HIGH]).toBe(1);
      expect(stats.by_severity[IncidentSeverity.MEDIUM]).toBe(1);
    });

    it('should group by type', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_type[IncidentType.TEMPERATURE_VIOLATION]).toBe(1);
      expect(stats.by_type[IncidentType.CONTAMINATION]).toBe(1);
      expect(stats.by_type[IncidentType.EXPIRED_PRODUCT]).toBe(1);
    });

    it('should calculate average resolution time', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.avg_resolution_hours).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCriticalIncidents', () => {
    beforeEach(async () => {
      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.CONTAMINATION,
        severity: IncidentSeverity.CRITICAL,
        description: 'Critical incident',
        reported_by_user_id: 'user_1',
      });

      await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.TEMPERATURE_VIOLATION,
        severity: IncidentSeverity.HIGH,
        description: 'High incident',
        reported_by_user_id: 'user_1',
      });

      const closedIncident = await service.create({
        location_id: 'loc_1',
        organization_id: 'org_1',
        type: IncidentType.CONTAMINATION,
        severity: IncidentSeverity.CRITICAL,
        description: 'Closed critical incident',
        reported_by_user_id: 'user_1',
      });

      await service.resolve(closedIncident.id, {
        status: IncidentStatus.CLOSED,
        resolution_notes: 'Closed',
        resolved_by_user_id: 'user_1',
      });
    });

    it('should return only open critical incidents', async () => {
      const result = await service.getCriticalIncidents('org_1');

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe(IncidentSeverity.CRITICAL);
      expect(result[0].status).not.toBe(IncidentStatus.CLOSED);
    });

    it('should filter by location', async () => {
      await service.create({
        location_id: 'loc_2',
        organization_id: 'org_1',
        type: IncidentType.CONTAMINATION,
        severity: IncidentSeverity.CRITICAL,
        description: 'Another critical',
        reported_by_user_id: 'user_1',
      });

      const result = await service.getCriticalIncidents('org_1', 'loc_1');

      expect(result).toHaveLength(1);
    });
  });
});
