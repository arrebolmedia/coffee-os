import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from '../roles.service';
import { Action, Effect, Resource, SystemRole } from '../interfaces';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * RolesService está 100% en Prisma (antes eran tres Maps en memoria, por lo que
 * `GET /roles/:id` devolvía 404 siempre). Estos tests verifican dos cosas:
 * que la lectura llega a la base, y que TODA query lleva el filtro de
 * organización (roles propios + catálogo global con organizationId null).
 */
describe('RolesService', () => {
  let service: RolesService;

  const orgId = 'org-123';
  const otherOrgId = 'org-456';
  const userId = 'user-123';
  const actor = 'admin-456';

  const prismaMock = {
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    rolePermission: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    userRoleAssignment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const roleRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'role-1',
    organizationId: orgId,
    name: 'Barista',
    code: 'BARISTA',
    description: null,
    scopes: [],
    isSystem: false,
    systemRole: null,
    color: null,
    icon: null,
    active: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    permissions: [],
    ...overrides,
  });

  const permissionRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'perm-1',
    organizationId: orgId,
    resource: Resource.PRODUCTS,
    action: Action.CREATE,
    effect: Effect.ALLOW,
    conditions: null,
    name: 'Create Products',
    description: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

  const assignmentRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'ur-1',
    userId,
    roleId: 'role-1',
    organizationId: orgId,
    locationIds: [],
    validFrom: null,
    validUntil: null,
    assignedBy: actor,
    assignedAt: new Date('2026-01-01'),
    revokedAt: null,
    revokedBy: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
    );
  });

  /**
   * PERMISSIONS
   */
  describe('createPermission', () => {
    it('should persist the permission in the caller organization', async () => {
      prismaMock.permission.create.mockResolvedValue(permissionRow());

      const result = await service.createPermission(orgId, {
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
      });

      expect(prismaMock.permission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: orgId,
          resource: Resource.PRODUCTS,
          action: Action.CREATE,
          effect: Effect.ALLOW,
        }),
      });
      expect(result.id).toBe('perm-1');
      expect(result.effect).toBe(Effect.ALLOW);
    });

    it('should ignore an organization_id sent by the client', async () => {
      prismaMock.permission.create.mockResolvedValue(permissionRow());

      await service.createPermission(orgId, {
        organization_id: otherOrgId,
        resource: Resource.ORDERS,
        action: Action.READ,
        name: 'Read Orders',
      });

      expect(prismaMock.permission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: orgId }),
      });
    });
  });

  describe('findAllPermissions', () => {
    it('should always scope the query to the organization', async () => {
      prismaMock.permission.findMany.mockResolvedValue([permissionRow()]);

      const result = await service.findAllPermissions(orgId, {
        resource: Resource.PRODUCTS,
        search: 'Create',
      });

      expect(prismaMock.permission.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: orgId,
          resource: Resource.PRODUCTS,
        }),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findPermissionById', () => {
    it('should filter by organization and throw 404 when missing', async () => {
      prismaMock.permission.findFirst.mockResolvedValue(null);

      await expect(service.findPermissionById(orgId, 'perm-x')).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.permission.findFirst).toHaveBeenCalledWith({
        where: { id: 'perm-x', organizationId: orgId },
      });
    });
  });

  describe('deletePermission', () => {
    it('should delete a permission that is not in use', async () => {
      prismaMock.permission.findFirst.mockResolvedValue(permissionRow());
      prismaMock.rolePermission.count.mockResolvedValue(0);
      prismaMock.permission.delete.mockResolvedValue(permissionRow());

      await service.deletePermission(orgId, 'perm-1');

      expect(prismaMock.permission.delete).toHaveBeenCalledWith({
        where: { id: 'perm-1' },
      });
    });

    it('should prevent deleting a permission used by a role', async () => {
      prismaMock.permission.findFirst.mockResolvedValue(permissionRow());
      prismaMock.rolePermission.count.mockResolvedValue(2);

      await expect(service.deletePermission(orgId, 'perm-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.permission.delete).not.toHaveBeenCalled();
    });
  });

  /**
   * ROLES
   */
  describe('createRole', () => {
    it('should create the role in the caller organization', async () => {
      prismaMock.role.findFirst.mockResolvedValue(null);
      prismaMock.role.create.mockResolvedValue(roleRow());

      const result = await service.createRole(orgId, {
        name: 'Barista',
        code: 'BARISTA',
        description: 'Coffee maker',
      });

      expect(prismaMock.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgId,
            name: 'Barista',
            code: 'BARISTA',
            isSystem: false,
          }),
        }),
      );
      expect(result.code).toBe('BARISTA');
      expect(result.is_system).toBe(false);
    });

    it('should ignore is_system and system_role sent by the client', async () => {
      // Se escribian tal cual: un cliente podia crear un rol is_system:true que
      // despues ni updateRole ni deleteRole dejaban tocar.
      prismaMock.role.findFirst.mockResolvedValue(null);
      prismaMock.role.create.mockResolvedValue(roleRow());

      await service.createRole(orgId, {
        name: 'Fake system role',
        code: 'FAKE_SYSTEM',
        is_system: true,
        system_role: SystemRole.OWNER,
      });

      expect(prismaMock.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isSystem: false, systemRole: null }),
        }),
      );
    });

    it('should throw ConflictException if the code exists in the organization', async () => {
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-existing' });

      await expect(
        service.createRole(orgId, { name: 'Manager 2', code: 'MANAGER' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.role.create).not.toHaveBeenCalled();
    });

    it('should reject permission_ids that do not belong to the organization', async () => {
      prismaMock.role.findFirst.mockResolvedValue(null);
      prismaMock.permission.findMany.mockResolvedValue([]);

      await expect(
        service.createRole(orgId, {
          name: 'Test',
          code: 'TEST',
          permission_ids: ['perm-of-another-org'],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.permission.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['perm-of-another-org'] }, organizationId: orgId },
        select: { id: true },
      });
      expect(prismaMock.role.create).not.toHaveBeenCalled();
    });

    it('should link the permissions through role_permissions', async () => {
      prismaMock.role.findFirst.mockResolvedValue(null);
      prismaMock.permission.findMany.mockResolvedValue([{ id: 'perm-1' }]);
      prismaMock.role.create.mockResolvedValue(
        roleRow({ permissions: [{ permissionId: 'perm-1' }] }),
      );

      const result = await service.createRole(orgId, {
        name: 'Manager',
        code: 'MANAGER',
        permission_ids: ['perm-1'],
      });

      expect(prismaMock.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            permissions: { create: [{ permissionId: 'perm-1' }] },
          }),
        }),
      );
      expect(result.permission_ids).toEqual(['perm-1']);
    });
  });

  describe('findAllRoles', () => {
    it('should return the organization roles plus the global catalog', async () => {
      prismaMock.role.findMany.mockResolvedValue([
        roleRow({ id: 'r1', name: 'Manager', code: 'MANAGER' }),
        roleRow({
          id: 'r2',
          organizationId: null,
          name: 'owner',
          code: 'OWNER',
          isSystem: true,
          systemRole: 'owner',
        }),
      ]);

      const result = await service.findAllRoles(orgId, {});

      expect(prismaMock.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { OR: [{ organizationId: orgId }, { organizationId: null }] },
            ]),
          },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'r1', code: 'MANAGER' });
      expect(result[1]).toMatchObject({
        id: 'r2',
        organization_id: null,
        is_system: true,
        system_role: SystemRole.OWNER,
      });
    });

    it('should pass a case-insensitive search filter to Prisma', async () => {
      prismaMock.role.findMany.mockResolvedValue([]);

      await service.findAllRoles(orgId, { search: 'Barista' });

      const where = prismaMock.role.findMany.mock.calls[0][0].where;
      expect(where.AND).toEqual(
        expect.arrayContaining([
          {
            OR: [
              { name: { contains: 'Barista', mode: 'insensitive' } },
              { description: { contains: 'Barista', mode: 'insensitive' } },
            ],
          },
        ]),
      );
    });
  });

  describe('findRoleById', () => {
    // Regresión: con los Maps en memoria esto devolvía 404 SIEMPRE.
    it('should return the role stored in the database', async () => {
      prismaMock.role.findFirst.mockResolvedValue(
        roleRow({
          id: 'cml9tug2t000012cbeoo5mgnq',
          organizationId: null,
          name: 'owner',
          code: 'OWNER',
          isSystem: true,
          systemRole: 'owner',
          scopes: ['all'],
        }),
      );

      const result = await service.findRoleById(
        orgId,
        'cml9tug2t000012cbeoo5mgnq',
      );

      expect(result.id).toBe('cml9tug2t000012cbeoo5mgnq');
      expect(result.name).toBe('owner');
      expect(result.scopes).toEqual(['all']);
      expect(prismaMock.role.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'cml9tug2t000012cbeoo5mgnq',
            OR: [{ organizationId: orgId }, { organizationId: null }],
          }),
        }),
      );
    });

    it('should throw 404 for a role of another organization', async () => {
      prismaMock.role.findFirst.mockResolvedValue(null);

      await expect(
        service.findRoleById(orgId, 'role-of-org-b'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('should update a custom role of the organization', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.role.update.mockResolvedValue(
        roleRow({ name: 'Senior Barista', color: '#00FF00' }),
      );

      const result = await service.updateRole(orgId, 'role-1', {
        name: 'Senior Barista',
        color: '#00FF00',
      });

      expect(result.name).toBe('Senior Barista');
      expect(result.color).toBe('#00FF00');
      expect(result.code).toBe('BARISTA');
    });

    it('should ignore system_role sent by the client', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.role.update.mockResolvedValue(roleRow({ name: 'Renamed' }));

      await service.updateRole(orgId, 'role-1', {
        name: 'Renamed',
        system_role: SystemRole.OWNER,
      });

      const data = prismaMock.role.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('systemRole');
      expect(data.name).toBe('Renamed');
    });

    it('should refuse to update a global system role', async () => {
      prismaMock.role.findFirst.mockResolvedValue(
        roleRow({ organizationId: null, isSystem: true }),
      );

      await expect(
        service.updateRole(orgId, 'role-1', { name: 'Hacked' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.role.update).not.toHaveBeenCalled();
    });

    it('should refuse to update a tenant system role', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow({ isSystem: true }));

      await expect(
        service.updateRole(orgId, 'role-1', { name: 'New Name' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent code conflicts', async () => {
      prismaMock.role.findFirst
        .mockResolvedValueOnce(roleRow()) // findRoleById
        .mockResolvedValueOnce(roleRow({ id: 'role-2', code: 'MANAGER' })); // findRoleByCode

      await expect(
        service.updateRole(orgId, 'role-1', { code: 'MANAGER' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should replace the permission links inside a transaction', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.permission.findMany.mockResolvedValue([{ id: 'perm-2' }]);
      prismaMock.rolePermission.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.rolePermission.createMany.mockResolvedValue({ count: 1 });
      prismaMock.role.update.mockResolvedValue(
        roleRow({ permissions: [{ permissionId: 'perm-2' }] }),
      );

      const result = await service.updateRole(orgId, 'role-1', {
        permission_ids: ['perm-2'],
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 'role-1' },
      });
      expect(prismaMock.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'role-1', permissionId: 'perm-2' }],
      });
      expect(result.permission_ids).toEqual(['perm-2']);
    });
  });

  describe('deleteRole', () => {
    it('should delete a custom role that nobody uses', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.userRoleAssignment.count.mockResolvedValue(0);
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.role.delete.mockResolvedValue(roleRow());

      await service.deleteRole(orgId, 'role-1');

      expect(prismaMock.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-1' },
      });
    });

    it('should refuse to delete a global system role', async () => {
      prismaMock.role.findFirst.mockResolvedValue(
        roleRow({ organizationId: null, isSystem: true }),
      );

      await expect(service.deleteRole(orgId, 'role-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.role.delete).not.toHaveBeenCalled();
    });

    it('should refuse to delete a role still bound to users', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.userRoleAssignment.count.mockResolvedValue(0);
      prismaMock.user.count.mockResolvedValue(3);

      await expect(service.deleteRole(orgId, 'role-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.role.delete).not.toHaveBeenCalled();
    });
  });

  /**
   * USER ROLE ASSIGNMENTS
   */
  describe('assignRole', () => {
    it('should assign a role and take the author from the JWT', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.user.findFirst.mockResolvedValue({ id: userId });
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue(null);
      prismaMock.userRoleAssignment.create.mockResolvedValue(assignmentRow());

      const result = await service.assignRole(
        orgId,
        { user_id: userId, role_id: 'role-1', assigned_by: 'spoofed' },
        actor,
      );

      expect(prismaMock.userRoleAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          roleId: 'role-1',
          organizationId: orgId,
          assignedBy: actor,
        }),
      });
      expect(result.assigned_by).toBe(actor);
    });

    it('should reject a user from another organization', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRole(
          orgId,
          { user_id: 'user-of-org-b', role_id: 'role-1' },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.userRoleAssignment.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if already assigned', async () => {
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.user.findFirst.mockResolvedValue({ id: userId });
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue({ id: 'ur-1' });

      await expect(
        service.assignRole(
          orgId,
          { user_id: userId, role_id: 'role-1' },
          actor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should keep the location scope and validity window', async () => {
      const validFrom = new Date('2026-01-01');
      const validUntil = new Date('2026-12-31');
      prismaMock.role.findFirst.mockResolvedValue(roleRow());
      prismaMock.user.findFirst.mockResolvedValue({ id: userId });
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue(null);
      prismaMock.userRoleAssignment.create.mockResolvedValue(
        assignmentRow({
          locationIds: ['loc-1', 'loc-2'],
          validFrom,
          validUntil,
        }),
      );

      const result = await service.assignRole(
        orgId,
        {
          user_id: userId,
          role_id: 'role-1',
          location_ids: ['loc-1', 'loc-2'],
          valid_from: validFrom,
          valid_until: validUntil,
        },
        actor,
      );

      expect(result.location_ids).toEqual(['loc-1', 'loc-2']);
      expect(result.valid_from).toEqual(validFrom);
      expect(result.valid_until).toEqual(validUntil);
    });
  });

  describe('revokeRole', () => {
    it('should soft-revoke the assignment', async () => {
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue(
        assignmentRow(),
      );
      prismaMock.userRoleAssignment.update.mockResolvedValue(
        assignmentRow({ revokedAt: new Date(), revokedBy: 'admin-789' }),
      );

      const result = await service.revokeRole(orgId, 'ur-1', 'admin-789');

      expect(prismaMock.userRoleAssignment.findFirst).toHaveBeenCalledWith({
        where: { id: 'ur-1', organizationId: orgId },
      });
      expect(result.revoked_at).toBeDefined();
      expect(result.revoked_by).toBe('admin-789');
    });

    it('should prevent revoking twice', async () => {
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue(
        assignmentRow({ revokedAt: new Date() }),
      );

      await expect(
        service.revokeRole(orgId, 'ur-1', 'admin-789'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 for an assignment of another organization', async () => {
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeRole(orgId, 'ur-of-org-b', 'admin-789'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserRoles', () => {
    it('should force the organization filter and skip revoked rows', async () => {
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([
        assignmentRow(),
      ]);

      const result = await service.findUserRoles(orgId, {
        user_id: userId,
        location_id: 'loc-1',
        organization_id: otherOrgId,
      });

      expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            revokedAt: null,
            userId,
            locationIds: { has: 'loc-1' },
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  /**
   * PERMISSION CHECKING
   */
  describe('checkPermission', () => {
    const assignmentWith = (perms: any[]) => ({
      ...assignmentRow(),
      role: {
        ...roleRow(),
        permissions: perms.map((permission) => ({ permission })),
      },
    });

    it('should allow when a matching ALLOW permission exists', async () => {
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([
        assignmentWith([permissionRow()]),
      ]);

      const result = await service.checkPermission(orgId, {
        user_id: userId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
      });

      expect(result.allowed).toBe(true);
      expect(result.matched_permissions).toEqual(['perm-1']);
    });

    it('should deny when no permission matches', async () => {
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([
        assignmentWith([permissionRow()]),
      ]);

      const result = await service.checkPermission(orgId, {
        user_id: userId,
        resource: Resource.PRODUCTS,
        action: Action.DELETE,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No matching permissions');
    });

    it('should deny when the user has no active assignments', async () => {
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

      const result = await service.checkPermission(orgId, {
        user_id: 'user-no-roles',
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User has no roles');
    });

    it('should let DENY win over ALLOW', async () => {
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([
        assignmentWith([
          permissionRow({
            id: 'perm-allow',
            resource: Resource.ORDERS,
            action: Action.DELETE,
          }),
          permissionRow({
            id: 'perm-deny',
            resource: Resource.ORDERS,
            action: Action.DELETE,
            effect: Effect.DENY,
            name: 'Deny Delete Orders',
          }),
        ]),
      ]);

      const result = await service.checkPermission(orgId, {
        user_id: userId,
        resource: Resource.ORDERS,
        action: Action.DELETE,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('DENY');
    });

    it('should ignore expired assignments', async () => {
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

      await service.checkPermission(orgId, {
        user_id: userId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
      });

      const where = prismaMock.userRoleAssignment.findMany.mock.calls[0][0]
        .where as any;
      expect(where.organizationId).toBe(orgId);
      expect(where.revokedAt).toBeNull();
      expect(where.AND).toHaveLength(2);
    });
  });

  describe('getUserPermissions', () => {
    it('should return the deduplicated permissions of every active role', async () => {
      const shared = permissionRow({ id: 'perm-shared' });
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([
        {
          ...assignmentRow(),
          role: {
            ...roleRow(),
            permissions: [
              { permission: permissionRow({ id: 'perm-1' }) },
              { permission: shared },
            ],
          },
        },
        {
          ...assignmentRow({ id: 'ur-2', roleId: 'role-2' }),
          role: {
            ...roleRow({ id: 'role-2' }),
            permissions: [{ permission: shared }],
          },
        },
      ]);

      const result = await service.getUserPermissions(userId, orgId);

      expect(result.map((p) => p.id).sort()).toEqual(['perm-1', 'perm-shared']);
    });
  });

  /**
   * STATISTICS
   */
  describe('getStats', () => {
    it('should count the roles visible to the tenant', async () => {
      prismaMock.role.findMany.mockResolvedValue([
        { id: 'r1', isSystem: true, systemRole: 'owner' },
        { id: 'r2', isSystem: true, systemRole: 'manager' },
        { id: 'r3', isSystem: false, systemRole: null },
      ]);
      prismaMock.permission.count.mockResolvedValue(2);
      prismaMock.userRoleAssignment.findMany.mockResolvedValue([
        { roleId: 'r3' },
        { roleId: 'r3' },
      ]);

      const result = await service.getStats(orgId);

      expect(prismaMock.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
        }),
      );
      expect(result.total_roles).toBe(3);
      expect(result.system_roles_count).toBe(2);
      expect(result.custom_roles_count).toBe(1);
      expect(result.by_system_role[SystemRole.OWNER]).toBe(1);
      expect(result.by_system_role[SystemRole.MANAGER]).toBe(1);
      expect(result.total_permissions).toBe(2);
      expect(result.total_user_roles).toBe(2);
      expect(result.users_by_role['r3']).toBe(2);
    });
  });
});
