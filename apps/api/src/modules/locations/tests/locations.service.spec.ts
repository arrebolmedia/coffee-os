import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from '../locations.service';
import { CreateLocationDto } from '../dto';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

describe('LocationsService', () => {
  let service: LocationsService;

  const orgId = 'org-123';

  const createDto: CreateLocationDto = {
    organization_id: orgId,
    name: 'Café Centro',
    address: 'Av. Reforma 123',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '06600',
    country: 'MX',
    phone: '+52 55 1234 5678',
    email: 'centro@cafeteria.mx',
    timezone: 'America/Mexico_City',
    tax_rate: 0.16,
    currency: 'MXN',
    active: true,
  };

  const makeRow = (overrides: any = {}) => ({
    id: overrides.id || `loc-${Date.now()}-${Math.random()}`,
    organizationId: overrides.organizationId || orgId,
    name: overrides.name || 'Café Centro',
    address: overrides.address ?? null,
    city: overrides.city ?? null,
    state: overrides.state ?? null,
    postalCode: overrides.postalCode ?? null,
    country: overrides.country || 'MX',
    phone: overrides.phone ?? null,
    email: overrides.email ?? null,
    timezone: overrides.timezone || 'America/Mexico_City',
    taxRate: overrides.taxRate ?? 0.16,
    currency: overrides.currency || 'MXN',
    active: overrides.active ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const store: any[] = [];

  const mockPrismaService = {
    location: {
      create: jest.fn().mockImplementation((args: any) => {
        const row = makeRow({
          organizationId: args.data?.organizationId,
          name: args.data?.name,
          address: args.data?.address,
          city: args.data?.city,
          state: args.data?.state,
          postalCode: args.data?.postalCode,
          country: args.data?.country,
          phone: args.data?.phone,
          email: args.data?.email,
          timezone: args.data?.timezone,
          taxRate: args.data?.taxRate,
          currency: args.data?.currency,
          active: args.data?.active,
        });
        store.push(row);
        return Promise.resolve(row);
      }),
      findMany: jest.fn().mockImplementation((args: any = {}) => {
        let results = [...store];
        const where = args?.where || {};
        if (where.organizationId) {
          results = results.filter(
            (r) => r.organizationId === where.organizationId,
          );
        }
        if (where.active !== undefined) {
          results = results.filter((r) => r.active === where.active);
        }
        return Promise.resolve(results);
      }),
      findUnique: jest.fn().mockImplementation((args: any) => {
        const found = store.find((r) => r.id === args?.where?.id);
        return Promise.resolve(found || null);
      }),
      update: jest.fn().mockImplementation((args: any) => {
        const idx = store.findIndex((r) => r.id === args?.where?.id);
        if (idx < 0) return Promise.reject(new Error('Not found'));
        store[idx] = { ...store[idx], ...args.data, updatedAt: new Date() };
        return Promise.resolve(store[idx]);
      }),
      count: jest.fn().mockImplementation((args: any = {}) => {
        let results = [...store];
        const where = args?.where || {};
        if (where.organizationId) {
          results = results.filter(
            (r) => r.organizationId === where.organizationId,
          );
        }
        if (where.active !== undefined) {
          results = results.filter((r) => r.active === where.active);
        }
        return Promise.resolve(results.length);
      }),
    },
  };

  beforeEach(async () => {
    store.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  describe('create', () => {
    it('should create a location', async () => {
      const result = await service.create(createDto);
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Café Centro');
      expect(result.active).toBe(true);
      expect(result.tax_rate).toBe(0.16);
      expect(result.currency).toBe('MXN');
    });

    it('should apply defaults for country/timezone/taxRate/currency', async () => {
      const minimal: CreateLocationDto = {
        organization_id: orgId,
        name: 'Café Sur',
      };
      const result = await service.create(minimal);
      expect(result.country).toBe('MX');
      expect(result.timezone).toBe('America/Mexico_City');
      expect(result.currency).toBe('MXN');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        name: 'Café Norte',
        city: 'Monterrey',
        state: 'Nuevo León',
        active: false,
      });
      await service.create({
        ...createDto,
        organization_id: 'org-456',
        name: 'Café Otra Org',
      });
    });

    it('should return all locations when no filter', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: orgId });
      expect(result).toHaveLength(2);
    });

    it('should filter by active', async () => {
      const result = await service.findAll({ active: true });
      expect(result.every((l) => l.active)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return location by id', async () => {
      const created = await service.create(createDto);
      const result = await service.findById(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update location fields', async () => {
      const created = await service.create(createDto);
      const result = await service.update(created.id, {
        name: 'Café Centro Updated',
        tax_rate: 0.08,
      });
      expect(result.name).toBe('Café Centro Updated');
      expect(result.tax_rate).toBe(0.08);
    });

    it('should throw NotFoundException if location not found', async () => {
      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete (soft)', () => {
    it('should soft delete by setting active=false', async () => {
      const created = await service.create(createDto);
      await service.delete(created.id);
      const stillThere = await service.findById(created.id);
      expect(stillThere.active).toBe(false);
    });

    it('should throw NotFoundException if location not found', async () => {
      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate / deactivate', () => {
    it('should activate a location', async () => {
      const created = await service.create({ ...createDto, active: false });
      const result = await service.activate(created.id);
      expect(result.active).toBe(true);
    });

    it('should deactivate a location', async () => {
      const created = await service.create(createDto);
      const result = await service.deactivate(created.id);
      expect(result.active).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return total/active/inactive counts', async () => {
      await service.create(createDto);
      await service.create({ ...createDto, name: 'Otra', active: false });
      await service.create({ ...createDto, name: 'Tercera' });

      const stats = await service.getStats(orgId);
      expect(stats.total_locations).toBe(3);
      expect(stats.active_count).toBe(2);
      expect(stats.inactive_count).toBe(1);
    });
  });
});
