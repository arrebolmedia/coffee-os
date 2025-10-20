import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from '../locations.service';
import { CreateLocationDto } from '../dto';
import { LocationStatus, LocationType } from '../interfaces';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('LocationsService', () => {
  let service: LocationsService;

  const orgId = 'org-123';

  const createDto: CreateLocationDto = {
    organization_id: orgId,
    code: 'LOC-001',
    name: 'Café Centro',
    type: LocationType.STANDARD,
    status: LocationStatus.ACTIVE,
    address: 'Av. Reforma 123',
    address_line_2: 'Piso 2',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '06600',
    country: 'México',
    phone: '+52 55 1234 5678',
    email: 'centro@cafeteria.mx',
    coordinates: {
      latitude: 19.4326,
      longitude: -99.1332,
    },
    hours: [
      { day_of_week: 1, open_time: '07:00', close_time: '20:00', is_closed: false },
      { day_of_week: 2, open_time: '07:00', close_time: '20:00', is_closed: false },
    ],
    timezone: 'America/Mexico_City',
    seating_capacity: 30,
    max_occupancy: 50,
    manager_id: 'mgr-123',
    opening_date: new Date('2024-01-15'),
    allow_online_orders: true,
    allow_delivery: true,
    allow_pickup: true,
    allow_dine_in: true,
    image_url: 'https://example.com/cafe-centro.jpg',
    notes: 'Flagship location',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationsService],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    (service as any).locations.clear();
  });

  describe('create', () => {
    it('should create a location with full data', async () => {
      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.code).toBe('LOC-001');
      expect(result.name).toBe('Café Centro');
      expect(result.status).toBe(LocationStatus.ACTIVE);
      expect(result.type).toBe(LocationType.STANDARD);
      expect(result.coordinates).toEqual({
        latitude: 19.4326,
        longitude: -99.1332,
      });
      expect(result.hours).toHaveLength(2);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create location with defaults', async () => {
      const minimalDto: CreateLocationDto = {
        organization_id: orgId,
        code: 'LOC-002',
        name: 'Café Sur',
        type: LocationType.KIOSK,
        address: 'Calle 1',
        city: 'CDMX',
        state: 'CDMX',
        postal_code: '01000',
        country: 'México',
      };

      const result = await service.create(minimalDto);

      expect(result.status).toBe(LocationStatus.ACTIVE);
      expect(result.allow_online_orders).toBe(true);
      expect(result.allow_delivery).toBe(false);
      expect(result.allow_pickup).toBe(true);
      expect(result.allow_dine_in).toBe(true);
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
      expect(result.code).toBe('LOC-001');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        code: 'LOC-002',
        name: 'Café Norte',
        type: LocationType.KIOSK,
        city: 'Monterrey',
        state: 'Nuevo León',
        status: LocationStatus.INACTIVE,
      });
      await service.create({
        ...createDto,
        code: 'LOC-003',
        name: 'Café Sur',
        organization_id: 'org-456',
      });
    });

    it('should return all locations', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: orgId });
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const result = await service.findAll({ status: LocationStatus.ACTIVE });
      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const result = await service.findAll({ type: LocationType.KIOSK });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(LocationType.KIOSK);
    });

    it('should filter by city', async () => {
      const result = await service.findAll({ city: 'Monterrey' });
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Monterrey');
    });

    it('should filter by state', async () => {
      const result = await service.findAll({ state: 'CDMX' });
      expect(result).toHaveLength(2);
    });

    it('should filter by allow_delivery', async () => {
      const result = await service.findAll({ allow_delivery: true });
      expect(result).toHaveLength(3);
    });

    it('should search by name', async () => {
      const result = await service.findAll({ search: 'Norte' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Café Norte');
    });

    it('should sort by name ascending', async () => {
      const result = await service.findAll({ sort_by: 'name', order: 'asc' });
      expect(result[0].name).toBe('Café Centro');
      expect(result[2].name).toBe('Café Sur');
    });
  });

  describe('findById', () => {
    it('should return location by id', async () => {
      const created = await service.create(createDto);
      const result = await service.findById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should return location by organization and code', async () => {
      await service.create(createDto);
      const result = await service.findByCode(orgId, 'LOC-001');

      expect(result).toBeDefined();
      expect(result?.code).toBe('LOC-001');
    });

    it('should return undefined if not found', async () => {
      const result = await service.findByCode(orgId, 'NON-EXISTENT');
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update location fields', async () => {
      const created = await service.create(createDto);
      const result = await service.update(created.id, {
        name: 'Café Centro Updated',
        seating_capacity: 40,
      });

      expect(result.name).toBe('Café Centro Updated');
      expect(result.seating_capacity).toBe(40);
      expect(result.code).toBe('LOC-001');
    });

    it('should throw NotFoundException if location not found', async () => {
      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if code already exists', async () => {
      const loc1 = await service.create(createDto);
      await service.create({ ...createDto, code: 'LOC-002' });

      await expect(
        service.update(loc1.id, { code: 'LOC-002' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete a location', async () => {
      const created = await service.create(createDto);
      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if location not found', async () => {
      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a location', async () => {
      const created = await service.create({
        ...createDto,
        status: LocationStatus.INACTIVE,
      });
      const result = await service.activate(created.id);

      expect(result.status).toBe(LocationStatus.ACTIVE);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a location', async () => {
      const created = await service.create(createDto);
      const result = await service.deactivate(created.id);

      expect(result.status).toBe(LocationStatus.INACTIVE);
    });
  });

  describe('updateHours', () => {
    it('should update location hours', async () => {
      const created = await service.create(createDto);
      const newHours = [
        { day_of_week: 1, open_time: '08:00', close_time: '22:00', is_closed: false },
        { day_of_week: 0, open_time: '10:00', close_time: '18:00', is_closed: false },
      ];

      const result = await service.updateHours(created.id, newHours);

      expect(result.hours).toHaveLength(2);
      expect(result.hours![0].open_time).toBe('08:00');
    });

    it('should throw BadRequestException if more than 7 hours', async () => {
      const created = await service.create(createDto);
      const tooManyHours = Array(8).fill({
        day_of_week: 1,
        open_time: '08:00',
        close_time: '22:00',
        is_closed: false,
      });

      await expect(
        service.updateHours(created.id, tooManyHours),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create(createDto);
      await service.create({
        ...createDto,
        code: 'LOC-002',
        type: LocationType.KIOSK,
        status: LocationStatus.INACTIVE,
      });
      await service.create({
        ...createDto,
        code: 'LOC-003',
        type: LocationType.FLAGSHIP,
        status: LocationStatus.COMING_SOON,
      });
      await service.create({
        ...createDto,
        code: 'LOC-004',
        organization_id: 'org-456',
      });
    });

    it('should return location statistics', async () => {
      const result = await service.getStats(orgId);

      expect(result.total_locations).toBe(3);
      expect(result.by_status[LocationStatus.ACTIVE]).toBe(1);
      expect(result.by_status[LocationStatus.INACTIVE]).toBe(1);
      expect(result.by_status[LocationStatus.COMING_SOON]).toBe(1);
      expect(result.by_type[LocationType.STANDARD]).toBe(1);
      expect(result.by_type[LocationType.KIOSK]).toBe(1);
      expect(result.by_type[LocationType.FLAGSHIP]).toBe(1);
      expect(result.active_count).toBe(1);
    });
  });
});
