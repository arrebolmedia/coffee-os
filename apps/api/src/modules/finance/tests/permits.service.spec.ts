import { Test, TestingModule } from '@nestjs/testing';
import { PermitsService } from '../permits.service';
import { PrismaService } from '../../database/prisma.service';
import { PermitStatus, PermitType } from '../dto';

const now = new Date('2026-04-21');
const future = new Date('2027-04-21');

const mockPermit = {
  id: 'permit_1',
  organizationId: 'org_1',
  locationId: 'loc_1',
  type: 'FUNCIONAMIENTO',
  name: 'LIC-2026-001',
  authority: 'Alcaldía Cuauhtémoc',
  permitNumber: 'LIC-2026-001',
  status: 'ACTIVE',
  issuedDate: now,
  expiryDate: future,
  lastRenewalDate: null,
  cost: 5000,
  renewalCost: null,
  renewalFrequency: 'FREQ=YEARLY',
  responsiblePerson: 'Juan Pérez',
  documents: [],
  documentUrl: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};

const mockPrismaService = {
  permit: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('PermitsService', () => {
  let service: PermitsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermitsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PermitsService>(PermitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a permit and calculate expiry info', async () => {
      mockPrismaService.permit.create.mockResolvedValueOnce(mockPermit);

      const result = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        type: PermitType.FUNCIONAMIENTO,
        permit_number: 'LIC-2026-001',
        issuing_authority: 'Alcaldía Cuauhtémoc',
        issue_date: now.toISOString(),
        expiry_date: future.toISOString(),
        cost: 5000,
      });

      expect(result.id).toBe('permit_1');
      expect(result.days_until_expiry).toBeGreaterThan(0);
      expect(result.is_expiring_soon).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return permits for organization ordered by expiry', async () => {
      mockPrismaService.permit.findMany.mockResolvedValueOnce([mockPermit]);

      const result = await service.findAll({ organization_id: 'org_1' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.permit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org_1' }),
          orderBy: { expiryDate: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return permit when found', async () => {
      mockPrismaService.permit.findUnique.mockResolvedValueOnce(mockPermit);

      const result = await service.findOne('permit_1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('permit_1');
    });

    it('should return null when not found', async () => {
      mockPrismaService.permit.findUnique.mockResolvedValueOnce(null);

      const result = await service.findOne('nope');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update permit', async () => {
      const newExpiry = new Date('2028-04-21');
      mockPrismaService.permit.findUnique.mockResolvedValueOnce(mockPermit);
      mockPrismaService.permit.update.mockResolvedValueOnce({
        ...mockPermit,
        status: 'RENEWAL_DUE',
        expiryDate: newExpiry,
      });

      const result = await service.update('permit_1', {
        status: PermitStatus.RENEWAL_DUE,
        expiry_date: newExpiry.toISOString(),
      });

      expect(result.status).toBe(PermitStatus.RENEWAL_DUE);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.permit.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('bad_id', { status: PermitStatus.CANCELLED }),
      ).rejects.toThrow('Permit not found');
    });
  });

  describe('renewPermit', () => {
    it('should renew permit and set status to ACTIVE', async () => {
      const newExpiry = new Date('2028-04-21');
      mockPrismaService.permit.findUnique.mockResolvedValueOnce(mockPermit);
      mockPrismaService.permit.update.mockResolvedValueOnce({
        ...mockPermit,
        expiryDate: newExpiry,
        status: 'ACTIVE',
        lastRenewalDate: new Date(),
        renewalCost: 5500,
      });

      const result = await service.renewPermit('permit_1', newExpiry, 5500);

      expect(result.status).toBe(PermitStatus.ACTIVE);
    });

    it('should throw NotFoundException when permit not found', async () => {
      mockPrismaService.permit.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.renewPermit('bad_id', new Date(), 1000),
      ).rejects.toThrow('Permit not found');
    });
  });

  describe('getExpiringSoon', () => {
    it('should query permits expiring within threshold', async () => {
      mockPrismaService.permit.findMany.mockResolvedValueOnce([mockPermit]);

      const result = await service.getExpiringSoon('org_1', 30);

      expect(mockPrismaService.permit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_1',
            expiryDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getExpired', () => {
    it('should query permits with past expiry', async () => {
      mockPrismaService.permit.findMany.mockResolvedValueOnce([]);

      const result = await service.getExpired('org_1');

      expect(mockPrismaService.permit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_1',
            expiryDate: { lt: expect.any(Date) },
          }),
        }),
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return permit statistics', async () => {
      mockPrismaService.permit.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(1) // expired
        .mockResolvedValueOnce(1); // expiringSoon
      mockPrismaService.permit.groupBy.mockResolvedValueOnce([
        { type: 'FUNCIONAMIENTO', _count: { id: 3 } },
        { type: 'SALUBRIDAD', _count: { id: 2 } },
      ]);

      const stats = await service.getStats('org_1');

      expect(stats.total_permits).toBe(5);
      expect(stats.expired).toBe(1);
      expect(stats.renewal_due).toBe(1);
      expect(stats.by_type['FUNCIONAMIENTO']).toBe(3);
      expect(stats.by_type['SALUBRIDAD']).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete permit', async () => {
      mockPrismaService.permit.delete.mockResolvedValueOnce(mockPermit);

      await service.delete('permit_1');

      expect(mockPrismaService.permit.delete).toHaveBeenCalledWith({
        where: { id: 'permit_1' },
      });
    });
  });
});
