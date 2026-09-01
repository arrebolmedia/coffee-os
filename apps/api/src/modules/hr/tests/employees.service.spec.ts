import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from '../employees.service';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateEmployeeDto,
  EmployeeRole,
  EmployeeStatus,
  EmploymentType,
  UpdateEmployeeDto,
} from '../dto';

describe('EmployeesService', () => {
  let service: EmployeesService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findFirst: jest.fn().mockResolvedValue({ id: 'role-id-1', active: true }),
    },
    // La sucursal se valida contra la organizacion del JWT, igual que el rol:
    // el alta tambien crea la fila de `user_locations`, sin la cual el empleado
    // entraria a una sesion sin sucursal y el POS no tendria donde vender.
    location: {
      findFirst: jest.fn().mockResolvedValue({ id: 'location-id-1' }),
    },
  };

  // Canonical Prisma User shape (camelCase)
  const mockPrismaUser = {
    id: 'user-id-123',
    organizationId: 'org_1',
    roleId: 'role-id-1',
    email: 'juan.perez@cafeteria.com',
    password: '',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: '+52 55 1234 5678',
    avatar: null,
    emailVerified: null,
    twoFactorEnabled: false,
    lastLoginAt: null,
    isSuperAdmin: false,
    active: true,
    createdAt: new Date('2025-01-15T00:00:00.000Z'),
    updatedAt: new Date('2025-01-15T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateEmployeeDto = {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan.perez@cafeteria.com',
      phone: '+52 55 1234 5678',
      organization_id: 'org_1',
      location_id: 'loc_1',
      role_id: 'role-id-1',
      role: EmployeeRole.BARISTA,
      employment_type: EmploymentType.FULL_TIME,
      hire_date: '2025-01-15',
      hourly_rate: 85,
    };

    it('should call prisma.user.create with mapped fields', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockPrismaUser);

      const result = await service.create(createDto, 'org_1');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org_1',
            roleId: 'role-id-1',
            email: 'juan.perez@cafeteria.com',
            firstName: 'Juan',
            lastName: 'Pérez',
            phone: '+52 55 1234 5678',
            active: true,
          }),
        }),
      );
      // Password must be hashed (non-empty bcrypt hash starts with $2)
      const createArgs = mockPrismaService.user.create.mock.calls[0][0];
      expect(typeof createArgs.data.password).toBe('string');
      expect(createArgs.data.password.length).toBeGreaterThan(20);
      expect(createArgs.data.password.startsWith('$2')).toBe(true);
      expect(result).toBeDefined();
      expect(result.id).toBe('user-id-123');
    });

    it('should throw BadRequestException when role_id is missing', async () => {
      const dtoNoRole: any = { ...createDto };
      delete dtoNoRole.role_id;

      await expect(service.create(dtoNoRole, 'org_1')).rejects.toThrow(
        /role_id is required/,
      );
    });

    it('should throw BadRequestException when role does not exist', async () => {
      mockPrismaService.role.findFirst.mockResolvedValueOnce(null);
      await expect(service.create(createDto, 'org_1')).rejects.toThrow(/Role/);
    });

    it('should scope the role lookup to the caller org plus global roles', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockPrismaUser);

      await service.create(createDto, 'org_1');

      expect(mockPrismaService.role.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'role-id-1',
            OR: [{ organizationId: 'org_1' }, { organizationId: null }],
          },
        }),
      );
    });

    it('should reject a role owned by another organization', async () => {
      // A role belonging to org_2 is invisible to org_1, so the scoped
      // findFirst returns null and the bind is refused.
      mockPrismaService.role.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(createDto, 'org_1')).rejects.toThrow(/Role/);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create the employee in the JWT org, ignoring the body org', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockPrismaUser);

      await service.create(
        { ...createDto, organization_id: 'org_attacker' },
        'org_1',
      );

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 'org_1' }),
        }),
      );
    });

    it('should return mapped employee with correct fields', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockPrismaUser);

      const result = await service.create(createDto, 'org_1');

      expect(result.first_name).toBe('Juan');
      expect(result.last_name).toBe('Pérez');
      expect(result.email).toBe('juan.perez@cafeteria.com');
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
      expect(result.role).toBe(EmployeeRole.BARISTA);
      expect(result.employment_type).toBe(EmploymentType.FULL_TIME);
      expect(result.hire_date).toEqual(new Date('2025-01-15'));
      expect(result.hourly_rate).toBe(85);
    });

    it('should include Mexican ID fields when provided', async () => {
      const dtoWithIds: CreateEmployeeDto = {
        first_name: 'María',
        last_name: 'García',
        email: 'maria.garcia@cafeteria.com',
        phone: '+52 55 9876 5432',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role_id: 'role-id-1',
        role: EmployeeRole.CASHIER,
        employment_type: EmploymentType.PART_TIME,
        hire_date: '2025-02-01',
        rfc: 'GAMA900101ABC',
        curp: 'GAMA900101MDFRRR01',
        nss: '12345678901',
      };

      mockPrismaService.user.create.mockResolvedValue({
        ...mockPrismaUser,
        email: 'maria.garcia@cafeteria.com',
        firstName: 'María',
        lastName: 'García',
      });

      const result = await service.create(dtoWithIds, 'org_1');

      expect(result.rfc).toBe('GAMA900101ABC');
      expect(result.curp).toBe('GAMA900101MDFRRR01');
      expect(result.nss).toBe('12345678901');
    });
  });

  describe('findAll', () => {
    it('should return all employees when no filters', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);

      const result = await service.findAll({});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {},
      });
      expect(result).toHaveLength(1);
    });

    it('should pass organizationId filter to Prisma', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);

      await service.findAll({ organization_id: 'org_1' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org_1' }),
        }),
      );
    });

    it('should filter active status as active=true', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);

      await service.findAll({ status: EmployeeStatus.ACTIVE });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('should filter terminated status as active=false', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.findAll({ status: EmployeeStatus.TERMINATED });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: false }),
        }),
      );
    });

    it('should pass OR search clause for search query', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);

      await service.findAll({ search: 'juan' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('should return empty array when prisma returns no users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll({ organization_id: 'nonexistent' });

      expect(result).toHaveLength(0);
    });

    it('should map Prisma camelCase fields to snake_case Employee interface', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);

      const result = await service.findAll({});

      expect(result[0].first_name).toBe('Juan');
      expect(result[0].last_name).toBe('Pérez');
      expect(result[0].organization_id).toBe('org_1');
    });
  });

  describe('findOne', () => {
    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return mapped employee when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await service.findOne('user-id-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-id-123');
      expect(result!.first_name).toBe('Juan');
      expect(result!.organization_id).toBe('org_1');
    });

    it('should call prisma.user.findUnique with correct id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      await service.findOne('user-id-123');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when employee does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('bad-id', { first_name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user fields in Prisma', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, phone: '+52 55 9999 0000' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const updateDto: UpdateEmployeeDto = { phone: '+52 55 9999 0000' };
      const result = await service.update('user-id-123', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id-123' },
          data: expect.objectContaining({ phone: '+52 55 9999 0000' }),
        }),
      );
      expect(result.phone).toBe('+52 55 9999 0000');
    });

    it('should set active=false when status is TERMINATED', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);
      const terminatedUser = { ...mockPrismaUser, active: false };
      mockPrismaService.user.update.mockResolvedValue(terminatedUser);

      const updateDto: UpdateEmployeeDto = {
        status: EmployeeStatus.TERMINATED,
        termination_date: '2025-10-01',
        termination_reason: 'Resigned',
      };

      const result = await service.update('user-id-123', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ active: false }),
        }),
      );
      expect(result.status).toBe(EmployeeStatus.TERMINATED);
      expect(result.termination_date).toEqual(new Date('2025-10-01'));
      expect(result.termination_reason).toBe('Resigned');
    });

    it('should map non-persistent fields (role, employment_type) from the DTO', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrismaService.user.update.mockResolvedValue(mockPrismaUser);

      const updateDto: UpdateEmployeeDto = {
        role: EmployeeRole.SHIFT_SUPERVISOR,
        hourly_rate: 100,
      };

      const result = await service.update('user-id-123', updateDto);

      expect(result.role).toBe(EmployeeRole.SHIFT_SUPERVISOR);
      expect(result.hourly_rate).toBe(100);
    });
  });

  describe('delete (soft)', () => {
    it('should soft-delete by setting active=false', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockPrismaUser,
        active: false,
      });

      await service.delete('user-id-123');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { active: false },
      });
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics using prisma.user.count', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3) // active
        .mockResolvedValueOnce(2); // inactive

      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(5);
      expect(stats.active).toBe(3);
      expect(stats.inactive).toBe(2);
      expect(stats.terminated).toBe(2);
      expect(stats).toHaveProperty('by_role');
      expect(stats).toHaveProperty('by_employment_type');
    });

    it('should query prisma with organizationId', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.getStats('org_1');

      expect(mockPrismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org_1' }),
        }),
      );
    });
  });
});
