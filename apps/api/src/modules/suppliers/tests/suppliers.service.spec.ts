import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from '../suppliers.service';
import {
  SupplierStatus,
  PaymentTerms,
  CreateSupplierDto,
} from '../dto/create-supplier.dto';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('SuppliersService', () => {
  let service: SuppliersService;

  const orgId = 'org-123';
  const createDto: CreateSupplierDto = {
    organization_id: orgId,
    code: 'SUPP-001',
    name: 'Café Premium SA',
    legal_name: 'Café Premium SA de CV',
    status: SupplierStatus.ACTIVE,
    contact_person: 'Juan Pérez',
    email: 'ventas@cafepremium.mx',
    phone: '+52 55 1234 5678',
    website: 'https://cafepremium.mx',
    address: 'Calle Principal 123',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '01000',
    country: 'México',
    tax_id: 'CTP970615XYZ',
    payment_terms: PaymentTerms.NET_30,
    credit_limit: 50000,
    discount_percentage: 5,
    rating: 4.5,
    is_preferred: true,
    tags: ['coffee', 'premium'],
    notes: 'Proveedor principal de café',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersService],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    // Clear the Map between tests
    (service as any).suppliers.clear();
  });

  describe('create', () => {
    it('should create a supplier with full data', async () => {
      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.code).toBe('SUPP-001');
      expect(result.name).toBe('Café Premium SA');
      expect(result.status).toBe(SupplierStatus.ACTIVE);
      expect(result.payment_terms).toBe(PaymentTerms.NET_30);
      expect(result.rating).toBe(4.5);
      expect(result.on_time_delivery_rate).toBe(85);
      expect(result.is_preferred).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create supplier with default status', async () => {
      const { status, ...dtoWithoutStatus } = createDto;
      const result = await service.create(dtoWithoutStatus);

      expect(result.status).toBe(SupplierStatus.ACTIVE);
    });

    it('should throw ConflictException if code already exists', async () => {
      await service.create(createDto);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow same code in different organizations', async () => {
      await service.create(createDto);

      const otherOrgDto = { ...createDto, organization_id: 'org-456' };
      const result = await service.create(otherOrgDto);

      expect(result).toBeDefined();
      expect(result.code).toBe('SUPP-001');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        code: 'SUPP-002',
        name: 'Lácteos del Valle',
        status: SupplierStatus.INACTIVE,
        is_preferred: false,
        rating: 3.5,
      });
      await service.create({
        ...createDto,
        code: 'SUPP-003',
        name: 'Azúcar Mexicana',
        status: SupplierStatus.SUSPENDED,
        rating: undefined,
        is_preferred: false,
      });
    });

    it('should return all suppliers', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      await service.create({
        ...createDto,
        code: 'SUPP-004',
        organization_id: 'org-456',
      });

      const result = await service.findAll({ organization_id: orgId });
      expect(result).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const result = await service.findAll({ status: SupplierStatus.ACTIVE });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(SupplierStatus.ACTIVE);
    });

    it('should filter by is_preferred', async () => {
      const result = await service.findAll({ is_preferred: true });
      expect(result).toHaveLength(1);
      expect(result[0].is_preferred).toBe(true);
    });

    it('should filter by min_rating', async () => {
      const result = await service.findAll({ min_rating: 4.0 });
      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(4.5);
    });

    it('should search by name', async () => {
      const result = await service.findAll({ search: 'Lácteos' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Lácteos del Valle');
    });

    it('should search by code', async () => {
      const result = await service.findAll({ search: 'SUPP-002' });
      expect(result).toHaveLength(1);
    });

    it('should sort by name ascending', async () => {
      const result = await service.findAll({ sort_by: 'name', order: 'asc' });
      expect(result[0].name).toBe('Azúcar Mexicana');
      expect(result[2].name).toBe('Lácteos del Valle');
    });

    it('should sort by rating descending', async () => {
      const result = await service.findAll({
        sort_by: 'rating',
        order: 'desc',
      });
      expect(result[0].rating).toBe(4.5);
      expect(result[1].rating).toBe(3.5);
    });
  });

  describe('findById', () => {
    it('should return a supplier by id', async () => {
      const created = await service.create(createDto);
      const result = await service.findById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should return supplier by organization and code', async () => {
      await service.create(createDto);
      const result = await service.findByCode(orgId, 'SUPP-001');

      expect(result).toBeDefined();
      expect(result?.code).toBe('SUPP-001');
    });

    it('should return undefined if not found', async () => {
      const result = await service.findByCode(orgId, 'NON-EXISTENT');
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update supplier fields', async () => {
      const created = await service.create(createDto);
      const result = await service.update(created.id, {
        name: 'Café Premium Updated',
        rating: 5.0,
      });

      expect(result.name).toBe('Café Premium Updated');
      expect(result.rating).toBe(5.0);
      expect(result.code).toBe('SUPP-001');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if code already exists', async () => {
      const s1 = await service.create(createDto);
      await service.create({ ...createDto, code: 'SUPP-002' });

      await expect(
        service.update(s1.id, { code: 'SUPP-002' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete a supplier', async () => {
      const created = await service.create(createDto);
      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if supplier not found', async () => {
      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRating', () => {
    it('should update rating and on-time delivery', async () => {
      const created = await service.create(createDto);
      const result = await service.updateRating(created.id, 4.8, 95);

      expect(result.rating).toBe(4.8);
      expect(result.on_time_delivery_rate).toBe(95);
    });

    it('should update only rating', async () => {
      const created = await service.create(createDto);
      const result = await service.updateRating(created.id, 4.0);

      expect(result.rating).toBe(4.0);
      expect(result.on_time_delivery_rate).toBe(85);
    });

    it('should throw BadRequestException if rating < 0', async () => {
      const created = await service.create(createDto);
      await expect(service.updateRating(created.id, -1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if rating > 5', async () => {
      const created = await service.create(createDto);
      await expect(service.updateRating(created.id, 6)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if on_time_delivery_rate invalid', async () => {
      const created = await service.create(createDto);
      await expect(service.updateRating(created.id, 4.0, 150)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        code: 'SUPP-002',
        status: SupplierStatus.INACTIVE,
        is_preferred: false,
        rating: 3.5,
      });
      await service.create({
        ...createDto,
        code: 'SUPP-003',
        status: SupplierStatus.SUSPENDED,
        is_preferred: true,
        rating: undefined,
      });
    });

    it('should return supplier statistics', async () => {
      const result = await service.getStats(orgId);

      expect(result.total_suppliers).toBe(3);
      expect(result.by_status[SupplierStatus.ACTIVE]).toBe(1);
      expect(result.by_status[SupplierStatus.INACTIVE]).toBe(1);
      expect(result.by_status[SupplierStatus.SUSPENDED]).toBe(1);
      expect(result.preferred_count).toBe(2);
      expect(result.average_rating).toBeCloseTo(4.0);
    });

    it('should return zero average_rating if no ratings', async () => {
      const testOrgId = 'org-test';
      await service.create({
        ...createDto,
        organization_id: testOrgId,
        code: 'SUPP-100',
        rating: undefined,
      });

      const result = await service.getStats(testOrgId);
      expect(result.average_rating).toBe(0);
    });
  });
});
