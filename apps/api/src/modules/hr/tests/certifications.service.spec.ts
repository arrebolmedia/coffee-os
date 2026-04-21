import { Test, TestingModule } from '@nestjs/testing';
import { CertificationsService } from '../certifications.service';
import { CreateCertificationDto, CertificationType, CertificationStatus } from '../dto';

// Use relative dates so tests don't break as time passes
const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

const pastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

describe('CertificationsService', () => {
  let service: CertificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CertificationsService],
    }).compile();

    service = module.get<CertificationsService>(CertificationsService);
  });

  afterEach(() => {
    service['certifications'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a certification with ACTIVE status when expiry is in the future', async () => {
      const createDto: CreateCertificationDto = {
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Food Handler Certificate',
        issue_date: pastDate(30),
        expiry_date: futureDate(365),
        issuer: 'Mexican Health Authority',
        certificate_number: 'FH-2025-001',
      };

      const result = await service.create(createDto, 'org_1');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe(CertificationStatus.ACTIVE);
      expect(result.type).toBe(CertificationType.FOOD_HANDLER);
    });

    it('should create a certification with EXPIRED status when expiry is in the past', async () => {
      const createDto: CreateCertificationDto = {
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Expired Certificate',
        issue_date: pastDate(400),
        expiry_date: pastDate(10),
        issuer: 'Authority',
      };

      const result = await service.create(createDto, 'org_1');

      expect(result.status).toBe(CertificationStatus.EXPIRED);
    });

    it('should calculate days until expiry', async () => {
      const createDto: CreateCertificationDto = {
        employee_id: 'emp_1',
        type: CertificationType.SAFETY_HYGIENE,
        name: 'Safety & Hygiene',
        issue_date: pastDate(10),
        expiry_date: futureDate(45),
        issuer: 'STPS',
      };

      const result = await service.create(createDto, 'org_1');

      expect(result.days_until_expiry).toBeGreaterThan(40);
      expect(result.days_until_expiry).toBeLessThan(50);
    });

    it('should mark as expiring soon if within 30 days', async () => {
      const createDto: CreateCertificationDto = {
        employee_id: 'emp_1',
        type: CertificationType.FIRST_AID,
        name: 'First Aid',
        issue_date: pastDate(300),
        expiry_date: futureDate(25),
        issuer: 'Red Cross',
      };

      const result = await service.create(createDto, 'org_1');

      expect(result.is_expiring_soon).toBe(true);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Food Handler',
        issue_date: pastDate(30),
        expiry_date: futureDate(335),
        issuer: 'Authority 1',
      }, 'org_1');

      await service.create({
        employee_id: 'emp_2',
        type: CertificationType.BARISTA,
        name: 'Barista Certification',
        issue_date: pastDate(15),
        expiry_date: futureDate(350),
        issuer: 'Coffee Association',
      }, 'org_1');

      await service.create({
        employee_id: 'emp_3',
        type: CertificationType.FIRE_SAFETY,
        name: 'Fire Safety',
        issue_date: pastDate(60),
        expiry_date: futureDate(305),
        issuer: 'Fire Department',
      }, 'org_2');
    });

    it('should return all certifications when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by employee_id', async () => {
      const result = await service.findAll({ employee_id: 'emp_1' });
      expect(result).toHaveLength(1);
    });

    it('should filter by type', async () => {
      const result = await service.findAll({ type: CertificationType.FOOD_HANDLER });
      expect(result).toHaveLength(1);
    });

    it('should filter by status active', async () => {
      const result = await service.findAll({ status: CertificationStatus.ACTIVE });
      expect(result).toHaveLength(3);
    });
  });

  describe('getExpiring', () => {
    it('should find certifications expiring soon', async () => {
      await service.create({
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Expiring Soon',
        issue_date: pastDate(300),
        expiry_date: futureDate(25),
        issuer: 'Authority',
      }, 'org_1');

      // Add one that is not expiring soon
      await service.create({
        employee_id: 'emp_2',
        type: CertificationType.BARISTA,
        name: 'Not Expiring Soon',
        issue_date: pastDate(10),
        expiry_date: futureDate(180),
        issuer: 'Authority',
      }, 'org_1');

      const result = await service.getExpiring('org_1', 30);

      expect(result).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update certification status', async () => {
      const cert = await service.create({
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Food Handler',
        issue_date: pastDate(30),
        expiry_date: futureDate(335),
        issuer: 'Authority',
      }, 'org_1');

      const result = await service.updateStatus(cert.id, CertificationStatus.EXPIRED);

      expect(result.status).toBe(CertificationStatus.EXPIRED);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Two active FOOD_HANDLER
      await service.create({
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Food Handler 1',
        issue_date: pastDate(30),
        expiry_date: futureDate(335),
        issuer: 'Authority 1',
      }, 'org_1');

      await service.create({
        employee_id: 'emp_2',
        type: CertificationType.FOOD_HANDLER,
        name: 'Food Handler 2',
        issue_date: pastDate(15),
        expiry_date: futureDate(350),
        issuer: 'Authority 1',
      }, 'org_1');

      // One BARISTA that we'll manually expire
      const cert3 = await service.create({
        employee_id: 'emp_3',
        type: CertificationType.BARISTA,
        name: 'Barista',
        issue_date: pastDate(400),
        expiry_date: futureDate(200),
        issuer: 'Coffee Assoc',
      }, 'org_1');

      await service.updateStatus(cert3.id, CertificationStatus.EXPIRED);
    });

    it('should return certification statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.expired).toBe(1);
    });

    it('should group by type', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_type[CertificationType.FOOD_HANDLER]).toBe(2);
      expect(stats.by_type[CertificationType.BARISTA]).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete certification', async () => {
      const cert = await service.create({
        employee_id: 'emp_1',
        type: CertificationType.FOOD_HANDLER,
        name: 'Food Handler',
        issue_date: pastDate(30),
        expiry_date: futureDate(335),
        issuer: 'Authority',
      }, 'org_1');

      await service.delete(cert.id);
      const result = await service.findOne(cert.id);
      expect(result).toBeNull();
    });
  });
});
