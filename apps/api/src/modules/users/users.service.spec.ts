import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    email: 'test@example.com',
    password: 'hashed-secret',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: null,
    avatar: null,
    emailVerified: null,
    twoFactorEnabled: false,
    lastLoginAt: null,
    isSuperAdmin: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    // create() comprueba que el rol sea visible para la organización.
    role: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return users sans password', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.findAll({ organization_id: 'org-1' });
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].email).toBe('test@example.com');
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findOne('user-1');
      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user missing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a user and hash password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      // create() valida que el rol sea global o de la propia organización
      // (regresión cross-tenant de la migración de roles a Prisma).
      mockPrismaService.role.findFirst.mockResolvedValue({ id: 'role-1' });
      mockPrismaService.user.create.mockImplementation((args: any) =>
        Promise.resolve({ ...mockUser, ...args.data, id: 'user-2' }),
      );

      const result = await service.create({
        organization_id: 'org-1',
        role_id: 'role-1',
        email: 'new@example.com',
        password: 'somepassword',
        first_name: 'New',
        last_name: 'User',
      });

      expect(result.email).toBe('new@example.com');
      expect(result).not.toHaveProperty('password');
      const callArg = mockPrismaService.user.create.mock.calls[0][0];
      expect(callArg.data.password).not.toBe('somepassword'); // hashed
      expect(callArg.data.password.length).toBeGreaterThan(20);
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create({
          organization_id: 'org-1',
          role_id: 'role-1',
          email: 'test@example.com',
          password: 'somepassword',
          first_name: 'X',
          last_name: 'Y',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update non-password fields', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockImplementation((args: any) =>
        Promise.resolve({ ...mockUser, ...args.data }),
      );

      const result = await service.update('user-1', {
        first_name: 'Grace',
        // password should be ignored even if present
        ...({ password: 'NOPE' } as any),
      });
      expect(result.firstName).toBe('Grace');
      const data = mockPrismaService.user.update.mock.calls[0][0].data;
      expect(data.password).toBeUndefined();
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { first_name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        active: false,
      });
      const result = await service.remove('user-1');
      expect(result.active).toBe(false);
      const data = mockPrismaService.user.update.mock.calls[0][0].data;
      expect(data).toEqual({ active: false });
    });
  });
});
