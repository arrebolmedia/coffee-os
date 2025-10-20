import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  Permission,
  Role,
  UserRole,
  PermissionCheck,
  RoleStats,
  Resource,
  Action,
  Effect,
  SystemRole,
} from './interfaces';
import {
  CreatePermissionDto,
  CreateRoleDto,
  AssignRoleDto,
  CheckPermissionDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  QueryPermissionsDto,
  QueryRolesDto,
  QueryUserRolesDto,
} from './dto';

@Injectable()
export class RolesService {
  private readonly permissions = new Map<string, Permission>();
  private readonly roles = new Map<string, Role>();
  private readonly userRoles = new Map<string, UserRole>();

  /**
   * PERMISSIONS CRUD
   */
  async createPermission(
    createDto: CreatePermissionDto,
  ): Promise<Permission> {
    const permission: Permission = {
      id: `perm-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...createDto,
      effect: createDto.effect || Effect.ALLOW,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.permissions.set(permission.id, permission);
    return permission;
  }

  async findAllPermissions(
    query: QueryPermissionsDto,
  ): Promise<Permission[]> {
    let permissions = Array.from(this.permissions.values());

    // Filters
    if (query.organization_id) {
      permissions = permissions.filter(
        (p) => p.organization_id === query.organization_id,
      );
    }

    if (query.resource) {
      permissions = permissions.filter((p) => p.resource === query.resource);
    }

    if (query.action) {
      permissions = permissions.filter((p) => p.action === query.action);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      permissions = permissions.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.description && p.description.toLowerCase().includes(search)),
      );
    }

    // Sort
    const sortBy = query.sort_by || 'name';
    const order = query.order || 'asc';

    permissions.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Permission];
      let bValue: any = b[sortBy as keyof Permission];

      if (aValue === undefined)
        aValue = order === 'asc' ? '' : Number.MIN_VALUE;
      if (bValue === undefined)
        bValue = order === 'asc' ? '' : Number.MIN_VALUE;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return permissions;
  }

  async findPermissionById(id: string): Promise<Permission> {
    const permission = this.permissions.get(id);
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return permission;
  }

  async updatePermission(
    id: string,
    updateDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findPermissionById(id);

    Object.assign(permission, {
      ...updateDto,
      updated_at: new Date(),
    });

    this.permissions.set(id, permission);
    return permission;
  }

  async deletePermission(id: string): Promise<void> {
    const permission = await this.findPermissionById(id);

    // Check if permission is used in any role
    const rolesUsingPermission = Array.from(this.roles.values()).filter(
      (role) => role.permission_ids.includes(id),
    );

    if (rolesUsingPermission.length > 0) {
      throw new BadRequestException(
        `Permission is used in ${rolesUsingPermission.length} role(s)`,
      );
    }

    this.permissions.delete(id);
  }

  /**
   * ROLES CRUD
   */
  async createRole(createDto: CreateRoleDto): Promise<Role> {
    // Check code uniqueness within organization
    const existing = Array.from(this.roles.values()).find(
      (r) =>
        r.code === createDto.code &&
        r.organization_id === createDto.organization_id,
    );

    if (existing) {
      throw new ConflictException(
        `Role with code ${createDto.code} already exists in this organization`,
      );
    }

    // Validate permission_ids exist
    if (createDto.permission_ids && createDto.permission_ids.length > 0) {
      for (const permId of createDto.permission_ids) {
        if (!this.permissions.has(permId)) {
          throw new NotFoundException(`Permission ${permId} not found`);
        }
      }
    }

    const role: Role = {
      id: `role-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...createDto,
      permission_ids: createDto.permission_ids || [],
      is_system: createDto.is_system || false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.roles.set(role.id, role);
    return role;
  }

  async findAllRoles(query: QueryRolesDto): Promise<Role[]> {
    let roles = Array.from(this.roles.values());

    // Filters
    if (query.organization_id) {
      roles = roles.filter((r) => r.organization_id === query.organization_id);
    }

    if (query.system_role) {
      roles = roles.filter((r) => r.system_role === query.system_role);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      roles = roles.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.code.toLowerCase().includes(search) ||
          (r.description && r.description.toLowerCase().includes(search)),
      );
    }

    // Sort
    const sortBy = query.sort_by || 'name';
    const order = query.order || 'asc';

    roles.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Role];
      let bValue: any = b[sortBy as keyof Role];

      if (aValue === undefined)
        aValue = order === 'asc' ? '' : Number.MIN_VALUE;
      if (bValue === undefined)
        bValue = order === 'asc' ? '' : Number.MIN_VALUE;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return roles;
  }

  async findRoleById(id: string): Promise<Role> {
    const role = this.roles.get(id);
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    return role;
  }

  async findRoleByCode(
    organizationId: string,
    code: string,
  ): Promise<Role | undefined> {
    return Array.from(this.roles.values()).find(
      (r) => r.organization_id === organizationId && r.code === code,
    );
  }

  async updateRole(id: string, updateDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);

    // Prevent updating system roles
    if (role.is_system) {
      throw new BadRequestException('Cannot update system role');
    }

    // Check code conflicts
    if (updateDto.code && updateDto.code !== role.code) {
      const existing = await this.findRoleByCode(
        role.organization_id,
        updateDto.code,
      );
      if (existing) {
        throw new ConflictException(
          `Role with code ${updateDto.code} already exists`,
        );
      }
    }

    // Validate permission_ids exist
    if (updateDto.permission_ids && updateDto.permission_ids.length > 0) {
      for (const permId of updateDto.permission_ids) {
        if (!this.permissions.has(permId)) {
          throw new NotFoundException(`Permission ${permId} not found`);
        }
      }
    }

    Object.assign(role, {
      ...updateDto,
      updated_at: new Date(),
    });

    this.roles.set(id, role);
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.findRoleById(id);

    // Prevent deleting system roles
    if (role.is_system) {
      throw new BadRequestException('Cannot delete system role');
    }

    // Check if role is assigned to any user
    const usersWithRole = Array.from(this.userRoles.values()).filter(
      (ur) => ur.role_id === id && !ur.revoked_at,
    );

    if (usersWithRole.length > 0) {
      throw new BadRequestException(
        `Role is assigned to ${usersWithRole.length} user(s)`,
      );
    }

    this.roles.delete(id);
  }

  /**
   * USER ROLE ASSIGNMENTS
   */
  async assignRole(assignDto: AssignRoleDto): Promise<UserRole> {
    // Validate role exists
    const role = await this.findRoleById(assignDto.role_id);

    // Check if user already has this role (non-revoked)
    const existing = Array.from(this.userRoles.values()).find(
      (ur) =>
        ur.user_id === assignDto.user_id &&
        ur.role_id === assignDto.role_id &&
        ur.organization_id === assignDto.organization_id &&
        !ur.revoked_at,
    );

    if (existing) {
      throw new ConflictException(
        `User already has role ${role.name} in this organization`,
      );
    }

    const userRole: UserRole = {
      id: `ur-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      user_id: assignDto.user_id,
      role_id: assignDto.role_id,
      organization_id: assignDto.organization_id,
      location_ids: assignDto.location_ids,
      valid_from: assignDto.valid_from,
      valid_until: assignDto.valid_until,
      assigned_by: assignDto.assigned_by,
      assigned_at: new Date(),
    };

    this.userRoles.set(userRole.id, userRole);
    return userRole;
  }

  async revokeRole(id: string, revokedBy: string): Promise<UserRole> {
    const userRole = this.userRoles.get(id);
    if (!userRole) {
      throw new NotFoundException(`User role assignment ${id} not found`);
    }

    if (userRole.revoked_at) {
      throw new BadRequestException('Role assignment already revoked');
    }

    userRole.revoked_at = new Date();
    userRole.revoked_by = revokedBy;

    this.userRoles.set(id, userRole);
    return userRole;
  }

  async findUserRoles(query: QueryUserRolesDto): Promise<UserRole[]> {
    let userRoles = Array.from(this.userRoles.values()).filter(
      (ur) => !ur.revoked_at, // Only active assignments
    );

    if (query.user_id) {
      userRoles = userRoles.filter((ur) => ur.user_id === query.user_id);
    }

    if (query.role_id) {
      userRoles = userRoles.filter((ur) => ur.role_id === query.role_id);
    }

    if (query.organization_id) {
      userRoles = userRoles.filter(
        (ur) => ur.organization_id === query.organization_id,
      );
    }

    if (query.location_id) {
      userRoles = userRoles.filter(
        (ur) =>
          ur.location_ids && ur.location_ids.includes(query.location_id!),
      );
    }

    return userRoles;
  }

  /**
   * PERMISSION CHECKING
   */
  async checkPermission(
    checkDto: CheckPermissionDto,
  ): Promise<PermissionCheck> {
    // Get user's roles
    const userRoles = await this.findUserRoles({
      user_id: checkDto.user_id,
      organization_id: checkDto.organization_id,
    });

    if (userRoles.length === 0) {
      return {
        allowed: false,
        resource: checkDto.resource,
        action: checkDto.action,
        reason: 'User has no roles',
        matched_permissions: [],
      };
    }

    // Get all permissions from user's roles
    const matchedPermissions: string[] = [];
    let allowed = false;

    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.role_id);
      if (!role) continue;

      for (const permId of role.permission_ids) {
        const perm = this.permissions.get(permId);
        if (!perm) continue;

        // Check if permission matches
        if (
          perm.resource === checkDto.resource &&
          perm.action === checkDto.action
        ) {
          matchedPermissions.push(permId);

          if (perm.effect === Effect.ALLOW) {
            allowed = true;
          } else if (perm.effect === Effect.DENY) {
            // DENY takes precedence
            return {
              allowed: false,
              resource: checkDto.resource,
              action: checkDto.action,
              reason: `Explicit DENY: ${perm.name}`,
              matched_permissions: [permId],
            };
          }
        }
      }
    }

    return {
      allowed,
      resource: checkDto.resource,
      action: checkDto.action,
      reason: allowed ? undefined : 'No matching permissions',
      matched_permissions: matchedPermissions,
    };
  }

  async getUserPermissions(
    userId: string,
    organizationId: string,
  ): Promise<Permission[]> {
    const userRoles = await this.findUserRoles({ user_id: userId, organization_id: organizationId });
    const permissionSet = new Set<string>();

    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.role_id);
      if (role) {
        role.permission_ids.forEach((pid) => permissionSet.add(pid));
      }
    }

    return Array.from(permissionSet)
      .map((pid) => this.permissions.get(pid))
      .filter((p): p is Permission => p !== undefined);
  }

  /**
   * STATISTICS
   */
  async getStats(organizationId: string): Promise<RoleStats> {
    const orgRoles = Array.from(this.roles.values()).filter(
      (r) => r.organization_id === organizationId,
    );

    const systemRolesCount = orgRoles.filter((r) => r.is_system).length;
    const customRolesCount = orgRoles.filter((r) => !r.is_system).length;

    const bySystemRole: Record<SystemRole, number> = {} as any;
    Object.values(SystemRole).forEach((sr) => {
      bySystemRole[sr] = orgRoles.filter((r) => r.system_role === sr).length;
    });

    const totalPermissions = Array.from(this.permissions.values()).filter(
      (p) => p.organization_id === organizationId,
    ).length;

    const totalUserRoles = Array.from(this.userRoles.values()).filter(
      (ur) => ur.organization_id === organizationId && !ur.revoked_at,
    ).length;

    const usersByRole: Record<string, number> = {};
    orgRoles.forEach((role) => {
      usersByRole[role.id] = Array.from(this.userRoles.values()).filter(
        (ur) => ur.role_id === role.id && !ur.revoked_at,
      ).length;
    });

    return {
      total_roles: orgRoles.length,
      system_roles_count: systemRolesCount,
      custom_roles_count: customRolesCount,
      by_system_role: bySystemRole,
      total_permissions: totalPermissions,
      total_user_roles: totalUserRoles,
      users_by_role: usersByRole,
    };
  }
}
