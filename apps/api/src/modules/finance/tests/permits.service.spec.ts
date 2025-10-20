import { Test, TestingModule } from '@nestjs/testing';
import { PermitsService } from '../permits.service';
import { PermitType, PermitStatus } from '../dto';

describe('PermitsService', () => {
  let service: PermitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermitsService],
    }).compile();

    service = module.get<PermitsService>(PermitsService);
  });

  afterEach(() => {
    service['permits'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a permit', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90); // 90 days ahead

      const permit = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.FUNCIONAMIENTO,
        permit_number: 'FUNC-2024-001',
        issuing_authority: 'Alcaldía Cuauhtémoc',
        issue_date: new Date().toISOString(),
        expiry_date: futureDate.toISOString(),
        cost: 5000,
        responsible_person: 'Juan Pérez',
      });

      expect(permit.id).toBeDefined();
      expect(permit.type).toBe(PermitType.FUNCIONAMIENTO);
      expect(permit.status).toBe(PermitStatus.ACTIVE); // > 30 days
      expect(permit.days_until_expiry).toBeDefined();
    });

    it('should calculate expiry info', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

      const permit = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.USO_SUELO,
        permit_number: 'USO-001',
        issuing_authority: 'Gobierno CDMX',
        issue_date: new Date().toISOString(),
        expiry_date: futureDate.toISOString(),
      });

      expect(permit.days_until_expiry).toBeLessThanOrEqual(15);
      expect(permit.is_expiring_soon).toBe(true); // < 30 days
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.FUNCIONAMIENTO,
        permit_number: 'FUNC-001',
        issuing_authority: 'Alcaldía',
        issue_date: '2024-01-01',
        expiry_date: '2025-01-01',
      });

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_2',
        type: PermitType.SALUBRIDAD,
        permit_number: 'SAL-001',
        issuing_authority: 'Secretaría de Salud',
        issue_date: '2024-01-01',
        expiry_date: '2025-01-01',
      });

      await service.create({
        organization_id: 'org_2',
        location_id: 'loc_3',
        type: PermitType.PROTECCION_CIVIL,
        permit_number: 'PC-001',
        issuing_authority: 'Protección Civil',
        issue_date: '2024-01-01',
        expiry_date: '2025-01-01',
      });
    });

    it('should return all permits for organization', async () => {
      const permits = await service.findAll({ organization_id: 'org_1' });

      expect(permits).toHaveLength(2);
    });

    it('should filter by location', async () => {
      const permits = await service.findAll({
        organization_id: 'org_1',
        location_id: 'loc_1',
      });

      expect(permits).toHaveLength(1);
      expect(permits[0].location_id).toBe('loc_1');
    });

    it('should search by permit number', async () => {
      const permits = await service.findAll({
        organization_id: 'org_1',
        search: 'SAL',
      });

      expect(permits).toHaveLength(1);
      expect(permits[0].type).toBe(PermitType.SALUBRIDAD);
    });
  });

  describe('update', () => {
    it('should update permit', async () => {
      const permit = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.ANUNCIO,
        permit_number: 'ANU-001',
        issuing_authority: 'Autoridad',
        issue_date: '2024-01-01',
        expiry_date: '2025-01-01',
      });

      const newDate = new Date('2026-01-01');
      const updated = await service.update(permit.id, {
        expiry_date: newDate.toISOString(),
        responsible_person: 'María García',
      });

      expect(updated.expiry_date).toEqual(newDate);
      expect(updated.responsible_person).toBe('María García');
    });
  });

  describe('renewPermit', () => {
    it('should renew a permit', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30); // 30 days ago

      const permit = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.FUNCIONAMIENTO,
        permit_number: 'FUNC-001',
        issuing_authority: 'Alcaldía',
        issue_date: '2024-01-01',
        expiry_date: pastDate.toISOString(), // Already expired
      });

      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 365); // 1 year from now

      const renewed = await service.renewPermit(permit.id, newExpiryDate, 6000);

      expect(renewed.expiry_date).toEqual(newExpiryDate);
      expect(renewed.renewal_cost).toBe(6000);
      expect(renewed.status).toBe(PermitStatus.ACTIVE); // > 30 days now
      expect(renewed.last_renewal_date).toBeDefined();
    });
  });

  describe('getExpiringSoon', () => {
    beforeEach(async () => {
      // Expires in 15 days
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.FUNCIONAMIENTO,
        permit_number: 'FUNC-001',
        issuing_authority: 'Alcaldía',
        issue_date: new Date().toISOString(),
        expiry_date: soon.toISOString(),
      });

      // Expires in 60 days
      const later = new Date();
      later.setDate(later.getDate() + 60);

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_2',
        type: PermitType.SALUBRIDAD,
        permit_number: 'SAL-001',
        issuing_authority: 'Salud',
        issue_date: new Date().toISOString(),
        expiry_date: later.toISOString(),
      });
    });

    it('should return permits expiring soon', async () => {
      const expiring = await service.getExpiringSoon('org_1', 30);

      expect(expiring.length).toBeGreaterThanOrEqual(1);
      const funcionamiento = expiring.find((p) => p.type === PermitType.FUNCIONAMIENTO);
      expect(funcionamiento).toBeDefined();
    });
  });

  describe('getExpired', () => {
    it('should return expired permits', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 10); // 10 days ago

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.PROTECCION_CIVIL,
        permit_number: 'PC-001',
        issuing_authority: 'PC',
        issue_date: '2023-01-01',
        expiry_date: past.toISOString(),
      });

      const expired = await service.getExpired('org_1');

      expect(expired).toHaveLength(1);
      expect(expired[0].status).toBe(PermitStatus.EXPIRED);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Active permit
      const future = new Date();
      future.setDate(future.getDate() + 60);

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.FUNCIONAMIENTO,
        permit_number: 'FUNC-001',
        issuing_authority: 'Alcaldía',
        issue_date: new Date().toISOString(),
        expiry_date: future.toISOString(),
      });

      // Expiring soon
      const soon = new Date();
      soon.setDate(soon.getDate() + 20);

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.SALUBRIDAD,
        permit_number: 'SAL-001',
        issuing_authority: 'Salud',
        issue_date: new Date().toISOString(),
        expiry_date: soon.toISOString(),
      });

      // Expired
      const past = new Date();
      past.setDate(past.getDate() - 10);

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.PROTECCION_CIVIL,
        permit_number: 'PC-001',
        issuing_authority: 'PC',
        issue_date: '2023-01-01',
        expiry_date: past.toISOString(),
      });
    });

    it('should return permit statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total_permits).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.renewal_due).toBe(1);
      expect(stats.expired).toBe(1);
    });

    it('should group by type', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_type[PermitType.FUNCIONAMIENTO]).toBe(1);
      expect(stats.by_type[PermitType.SALUBRIDAD]).toBe(1);
      expect(stats.by_type[PermitType.PROTECCION_CIVIL]).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete permit', async () => {
      const permit = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.OTHER,
        permit_number: 'TEST-001',
        issuing_authority: 'Test',
        issue_date: '2024-01-01',
        expiry_date: '2025-01-01',
      });

      await service.delete(permit.id);
      const result = await service.findOne(permit.id);

      expect(result).toBeNull();
    });
  });
});
