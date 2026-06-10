import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from '../suppliers.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { NotFoundException } from '@nestjs/common';

describe('SuppliersService', () => {
  let service: SuppliersService;
  const orgId = 'org-123';

  const createDto: CreateSupplierDto = {
    organization_id: orgId,
    name: 'Café Premium SA',
    contact_person: 'Juan Pérez',
    email: 'ventas@cafepremium.mx',
    phone: '+52 55 1234 5678',
    address: 'Calle Principal 123',
    payment_terms: 'NET_30',
    lead_time_days: 5,
    active: true,
  };

  const makeRow = (overrides: any = {}) => ({
    id: overrides.id || `sup-${Date.now()}-${Math.random()}`,
    organizationId: overrides.organizationId || orgId,
    name: overrides.name || 'Café Premium SA',
    contactName: overrides.contactName ?? null,
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    address: overrides.address ?? null,
    paymentTerms: overrides.paymentTerms ?? null,
    leadTime: overrides.leadTime ?? null,
    active: overrides.active ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const store: any[] = [];

  const mockPrismaService = {
    supplier: {
      create: jest.fn().mockImplementation((args: any) => {
        const row = makeRow({
          organizationId: args.data?.organizationId,
          name: args.data?.name,
          contactName: args.data?.contactName,
          email: args.data?.email,
          phone: args.data?.phone,
          address: args.data?.address,
          paymentTerms: args.data?.paymentTerms,
          leadTime: args.data?.leadTime,
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
        SuppliersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<SuppliersService>(SuppliersService);
  });

  describe('create', () => {
    it('should create a supplier', async () => {
      const result = await service.create(createDto);
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Café Premium SA');
      expect(result.active).toBe(true);
      expect(result.contact_person).toBe('Juan Pérez');
      expect(result.payment_terms).toBe('NET_30');
    });

    it('should default active=true', async () => {
      const { active: _active, ...rest } = createDto;
      const result = await service.create(rest);
      expect(result.active).toBe(true);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        name: 'Lácteos del Valle',
        active: false,
      });
      await service.create({
        ...createDto,
        organization_id: 'org-456',
        name: 'Otra Org',
      });
    });

    it('should return all suppliers when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by the authenticated organizationId (query org ignored)', async () => {
      const result = await service.findAll({}, orgId);
      expect(result).toHaveLength(2);
    });

    it('should ignore organization_id coming from the query string', async () => {
      // El organization_id del query NO debe filtrar: solo el del JWT.
      const result = await service.findAll(
        { organization_id: 'org-456' },
        orgId,
      );
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.organization_id === orgId)).toBe(true);
    });

    it('should filter by active', async () => {
      const result = await service.findAll({ active: true });
      expect(result.every((s) => s.active)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return a supplier', async () => {
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
    it('should update supplier', async () => {
      const created = await service.create(createDto);
      const updated = await service.update(created.id, {
        name: 'Updated',
        lead_time_days: 10,
      });
      expect(updated.name).toBe('Updated');
      expect(updated.lead_time_days).toBe(10);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete (soft)', () => {
    it('should soft delete by setting active=false', async () => {
      const created = await service.create(createDto);
      await service.delete(created.id);
      const after = await service.findById(created.id);
      expect(after.active).toBe(false);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return total/active/inactive counts', async () => {
      await service.create(createDto);
      await service.create({ ...createDto, name: 'B', active: false });
      await service.create({ ...createDto, name: 'C' });

      const stats = await service.getStats(orgId);
      expect(stats.total_suppliers).toBe(3);
      expect(stats.active_count).toBe(2);
      expect(stats.inactive_count).toBe(1);
    });
  });
});
