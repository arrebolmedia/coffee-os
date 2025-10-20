import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from '../roles.service';
import {
  CreatePermissionDto,
  CreateRoleDto,
  AssignRoleDto,
  CheckPermissionDto,
} from '../dto';
import {
  Resource,
  Action,
  Effect,
  SystemRole,
} from '../interfaces';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;

  const orgId = 'org-123';
  const userId = 'user-123';
  const assignedBy = 'admin-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService],
    }).compile();

    service = module.get<RolesService>(RolesService);
    (service as any).permissions.clear();
    (service as any).roles.clear();
    (service as any).userRoles.clear();
  });

  /**
   * PERMISSIONS TESTS
   */
  describe('createPermission', () => {
    it('should create a permission', async () => {
      const dto: CreatePermissionDto = {
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
        description: 'Allow creating products',
      };

      const result = await service.createPermission(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.resource).toBe(Resource.PRODUCTS);
      expect(result.action).toBe(Action.CREATE);
      expect(result.effect).toBe(Effect.ALLOW);
    });

    it('should default effect to ALLOW', async () => {
      const dto: CreatePermissionDto = {
        organization_id: orgId,
        resource: Resource.ORDERS,
        action: Action.READ,
        name: 'Read Orders',
      };

      const result = await service.createPermission(dto);
      expect(result.effect).toBe(Effect.ALLOW);
    });
  });

  describe('findAllPermissions', () => {
    beforeEach(async () => {
      await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
      });
      await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.READ,
        name: 'Read Products',
      });
      await service.createPermission({
        organization_id: 'org-456',
        resource: Resource.ORDERS,
        action: Action.CREATE,
        name: 'Create Orders',
      });
    });

    it('should return all permissions', async () => {
      const result = await service.findAllPermissions({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAllPermissions({
        organization_id: orgId,
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by resource', async () => {
      const result = await service.findAllPermissions({
        resource: Resource.PRODUCTS,
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by action', async () => {
      const result = await service.findAllPermissions({
        action: Action.CREATE,
      });
      expect(result).toHaveLength(2);
    });

    it('should search by name', async () => {
      const result = await service.findAllPermissions({ search: 'Read' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Read Products');
    });
  });

  describe('deletePermission', () => {
    it('should delete a permission', async () => {
      const perm = await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.DELETE,
        name: 'Delete Products',
      });

      await service.deletePermission(perm.id);

      await expect(service.findPermissionById(perm.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent deleting permission in use', async () => {
      const perm = await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
      });

      await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
        permission_ids: [perm.id],
      });

      await expect(service.deletePermission(perm.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  /**
   * ROLES TESTS
   */
  describe('createRole', () => {
    it('should create a role', async () => {
      const dto: CreateRoleDto = {
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
        description: 'Coffee maker',
        color: '#FF5733',
        icon: 'coffee',
      };

      const result = await service.createRole(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Barista');
      expect(result.code).toBe('BARISTA');
      expect(result.is_system).toBe(false);
    });

    it('should create system role', async () => {
      const dto: CreateRoleDto = {
        organization_id: orgId,
        name: 'Owner',
        code: 'OWNER',
        is_system: true,
        system_role: SystemRole.OWNER,
      };

      const result = await service.createRole(dto);

      expect(result.is_system).toBe(true);
      expect(result.system_role).toBe(SystemRole.OWNER);
    });

    it('should throw ConflictException if code exists', async () => {
      await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
      });

      await expect(
        service.createRole({
          organization_id: orgId,
          name: 'Manager 2',
          code: 'MANAGER',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate permission_ids exist', async () => {
      await expect(
        service.createRole({
          organization_id: orgId,
          name: 'Test',
          code: 'TEST',
          permission_ids: ['non-existent'],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllRoles', () => {
    beforeEach(async () => {
      await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
        is_system: true,
        system_role: SystemRole.MANAGER,
      });
      await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });
      await service.createRole({
        organization_id: 'org-456',
        name: 'Cashier',
        code: 'CASHIER',
      });
    });

    it('should return all roles', async () => {
      const result = await service.findAllRoles({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAllRoles({ organization_id: orgId });
      expect(result).toHaveLength(2);
    });

    it('should filter by system_role', async () => {
      const result = await service.findAllRoles({
        system_role: SystemRole.MANAGER,
      });
      expect(result).toHaveLength(1);
    });

    it('should search by name', async () => {
      const result = await service.findAllRoles({ search: 'Barista' });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateRole', () => {
    it('should update role', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });

      const result = await service.updateRole(role.id, {
        name: 'Senior Barista',
        color: '#00FF00',
      });

      expect(result.name).toBe('Senior Barista');
      expect(result.color).toBe('#00FF00');
      expect(result.code).toBe('BARISTA');
    });

    it('should prevent updating system role', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Owner',
        code: 'OWNER',
        is_system: true,
        system_role: SystemRole.OWNER,
      });

      await expect(
        service.updateRole(role.id, { name: 'New Name' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent code conflicts', async () => {
      const role1 = await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
      });
      await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });

      await expect(
        service.updateRole(role1.id, { code: 'BARISTA' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteRole', () => {
    it('should delete role', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Temp',
        code: 'TEMP',
      });

      await service.deleteRole(role.id);

      await expect(service.findRoleById(role.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent deleting system role', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Owner',
        code: 'OWNER',
        is_system: true,
        system_role: SystemRole.OWNER,
      });

      await expect(service.deleteRole(role.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent deleting role in use', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
      });

      await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });

      await expect(service.deleteRole(role.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  /**
   * USER ROLE ASSIGNMENTS
   */
  describe('assignRole', () => {
    let role: any;

    beforeEach(async () => {
      role = await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });
    });

    it('should assign role to user', async () => {
      const dto: AssignRoleDto = {
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      };

      const result = await service.assignRole(dto);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.role_id).toBe(role.id);
      expect(result.assigned_by).toBe(assignedBy);
    });

    it('should assign role with location scope', async () => {
      const result = await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        location_ids: ['loc-1', 'loc-2'],
        assigned_by: assignedBy,
      });

      expect(result.location_ids).toEqual(['loc-1', 'loc-2']);
    });

    it('should assign role with validity dates', async () => {
      const validFrom = new Date('2025-01-01');
      const validUntil = new Date('2025-12-31');

      const result = await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        valid_from: validFrom,
        valid_until: validUntil,
        assigned_by: assignedBy,
      });

      expect(result.valid_from).toEqual(validFrom);
      expect(result.valid_until).toEqual(validUntil);
    });

    it('should throw ConflictException if already assigned', async () => {
      await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });

      await expect(
        service.assignRole({
          user_id: userId,
          role_id: role.id,
          organization_id: orgId,
          assigned_by: assignedBy,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeRole', () => {
    it('should revoke role assignment', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });

      const assignment = await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });

      const result = await service.revokeRole(assignment.id, 'admin-789');

      expect(result.revoked_at).toBeDefined();
      expect(result.revoked_by).toBe('admin-789');
    });

    it('should prevent revoking twice', async () => {
      const role = await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });

      const assignment = await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });

      await service.revokeRole(assignment.id, 'admin-789');

      await expect(
        service.revokeRole(assignment.id, 'admin-789'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUserRoles', () => {
    beforeEach(async () => {
      const role1 = await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
      });
      const role2 = await service.createRole({
        organization_id: orgId,
        name: 'Barista',
        code: 'BARISTA',
      });

      await service.assignRole({
        user_id: userId,
        role_id: role1.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });
      await service.assignRole({
        user_id: userId,
        role_id: role2.id,
        organization_id: orgId,
        location_ids: ['loc-1'],
        assigned_by: assignedBy,
      });
      await service.assignRole({
        user_id: 'user-456',
        role_id: role2.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });
    });

    it('should find user roles', async () => {
      const result = await service.findUserRoles({ user_id: userId });
      expect(result).toHaveLength(2);
    });

    it('should filter by location', async () => {
      const result = await service.findUserRoles({ location_id: 'loc-1' });
      expect(result).toHaveLength(1);
    });
  });

  /**
   * PERMISSION CHECKING
   */
  describe('checkPermission', () => {
    let perm: any;
    let role: any;

    beforeEach(async () => {
      perm = await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
      });

      role = await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
        permission_ids: [perm.id],
      });

      await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });
    });

    it('should allow permission if user has it', async () => {
      const dto: CheckPermissionDto = {
        user_id: userId,
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
      };

      const result = await service.checkPermission(dto);

      expect(result.allowed).toBe(true);
      expect(result.matched_permissions).toHaveLength(1);
    });

    it('should deny if user lacks permission', async () => {
      const dto: CheckPermissionDto = {
        user_id: userId,
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.DELETE,
      };

      const result = await service.checkPermission(dto);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No matching permissions');
    });

    it('should deny if user has no roles', async () => {
      const dto: CheckPermissionDto = {
        user_id: 'user-no-roles',
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
      };

      const result = await service.checkPermission(dto);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User has no roles');
    });

    it('should handle DENY effect', async () => {
      const denyPerm = await service.createPermission({
        organization_id: orgId,
        resource: Resource.ORDERS,
        action: Action.DELETE,
        effect: Effect.DENY,
        name: 'Deny Delete Orders',
      });

      const role2 = await service.createRole({
        organization_id: orgId,
        name: 'Restricted',
        code: 'RESTRICTED',
        permission_ids: [denyPerm.id],
      });

      await service.assignRole({
        user_id: 'user-restricted',
        role_id: role2.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });

      const result = await service.checkPermission({
        user_id: 'user-restricted',
        organization_id: orgId,
        resource: Resource.ORDERS,
        action: Action.DELETE,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('DENY');
    });
  });

  describe('getUserPermissions', () => {
    it('should get all user permissions', async () => {
      const perm1 = await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
      });
      const perm2 = await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.READ,
        name: 'Read Products',
      });

      const role = await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
        permission_ids: [perm1.id, perm2.id],
      });

      await service.assignRole({
        user_id: userId,
        role_id: role.id,
        organization_id: orgId,
        assigned_by: assignedBy,
      });

      const result = await service.getUserPermissions(userId, orgId);

      expect(result).toHaveLength(2);
    });
  });

  /**
   * STATISTICS
   */
  describe('getStats', () => {
    beforeEach(async () => {
      await service.createRole({
        organization_id: orgId,
        name: 'Owner',
        code: 'OWNER',
        is_system: true,
        system_role: SystemRole.OWNER,
      });
      await service.createRole({
        organization_id: orgId,
        name: 'Manager',
        code: 'MANAGER',
        is_system: true,
        system_role: SystemRole.MANAGER,
      });
      await service.createRole({
        organization_id: orgId,
        name: 'Custom Role',
        code: 'CUSTOM',
      });
      await service.createPermission({
        organization_id: orgId,
        resource: Resource.PRODUCTS,
        action: Action.CREATE,
        name: 'Create Products',
      });
      await service.createPermission({
        organization_id: orgId,
        resource: Resource.ORDERS,
        action: Action.READ,
        name: 'Read Orders',
      });
    });

    it('should return role statistics', async () => {
      const result = await service.getStats(orgId);

      expect(result.total_roles).toBe(3);
      expect(result.system_roles_count).toBe(2);
      expect(result.custom_roles_count).toBe(1);
      expect(result.by_system_role[SystemRole.OWNER]).toBe(1);
      expect(result.by_system_role[SystemRole.MANAGER]).toBe(1);
      expect(result.total_permissions).toBe(2);
    });
  });
});
