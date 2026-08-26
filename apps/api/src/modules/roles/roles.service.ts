import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Permission as PrismaPermission,
  Role as PrismaRole,
  UserRoleAssignment as PrismaUserRole,
} from '@prisma/client';
import {
  Action,
  Effect,
  Permission,
  PermissionCheck,
  Resource,
  Role,
  RoleStats,
  SystemRole,
  UserRole,
} from './interfaces';
import {
  AssignRoleDto,
  CheckPermissionDto,
  CreatePermissionDto,
  CreateRoleDto,
  QueryPermissionsDto,
  QueryRolesDto,
  QueryUserRolesDto,
  UpdatePermissionDto,
  UpdateRoleDto,
} from './dto';
import { PrismaService } from '../database/prisma.service';

type RoleRow = PrismaRole & {
  permissions?: { permissionId: string }[];
};

type AssignmentWithPermissions = PrismaUserRole & {
  role: PrismaRole & {
    permissions: { permission: PrismaPermission }[];
  };
};

/**
 * RBAC service — fully persisted in Postgres.
 *
 * Tenancy model (decided when the three in-memory Maps were migrated):
 *
 *  - `roles` rows with `organizationId = null` are GLOBAL system roles. The
 *    seeded catalog (owner/manager/barista) is shared by every tenant because
 *    `User.roleId` of users in *all* organizations points at those same rows;
 *    scoping them to one organization would orphan the rest. They are readable
 *    by every tenant and immutable through the API.
 *  - Every role created through the API belongs to the caller's organization
 *    (taken from the JWT via `@CurrentOrg()`, never from the request body) and
 *    is invisible to other tenants.
 *  - `permissions` and `user_roles` are always tenant-owned: there is no global
 *    variant, so every query filters by `organizationId`.
 *
 * Reads by `:id` use `findFirst` with the organization filter (not
 * `findUnique`) so a valid id from another tenant returns 404 instead of data.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Roles a tenant may see: its own plus the global system catalog. */
  private visibleRoles(organizationId: string): Prisma.RoleWhereInput {
    return { OR: [{ organizationId }, { organizationId: null }] };
  }

  private toApiRole(row: RoleRow): Role {
    return {
      id: row.id,
      organization_id: row.organizationId,
      name: row.name,
      code: row.code,
      description: row.description ?? undefined,
      is_system: row.isSystem,
      system_role: (row.systemRole as SystemRole | null) ?? undefined,
      permission_ids: (row.permissions ?? []).map((p) => p.permissionId),
      scopes: row.scopes,
      active: row.active,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiPermission(row: PrismaPermission): Permission {
    return {
      id: row.id,
      organization_id: row.organizationId,
      resource: row.resource as Resource,
      action: row.action as Action,
      effect: row.effect as Effect,
      conditions: (row.conditions as Record<string, any> | null) ?? undefined,
      name: row.name,
      description: row.description ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiUserRole(row: PrismaUserRole): UserRole {
    return {
      id: row.id,
      user_id: row.userId,
      role_id: row.roleId,
      organization_id: row.organizationId,
      location_ids: row.locationIds,
      valid_from: row.validFrom ?? undefined,
      valid_until: row.validUntil ?? undefined,
      assigned_by: row.assignedBy,
      assigned_at: row.assignedAt,
      revoked_at: row.revokedAt ?? undefined,
      revoked_by: row.revokedBy ?? undefined,
    };
  }

  /** Ensures every referenced permission exists **inside the tenant**. */
  private async assertPermissionsExist(
    organizationId: string,
    permissionIds: string[],
  ): Promise<void> {
    if (permissionIds.length === 0) return;

    const found = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds }, organizationId },
      select: { id: true },
    });
    const foundIds = new Set(found.map((p) => p.id));

    for (const permissionId of permissionIds) {
      if (!foundIds.has(permissionId)) {
        throw new NotFoundException(`Permission ${permissionId} not found`);
      }
    }
  }

  /**
   * PERMISSIONS CRUD
   */
  async createPermission(
    organizationId: string,
    createDto: CreatePermissionDto,
  ): Promise<Permission> {
    const row = await this.prisma.permission.create({
      data: {
        organizationId,
        resource: createDto.resource,
        action: createDto.action,
        effect: createDto.effect ?? Effect.ALLOW,
        conditions: (createDto.conditions ??
          Prisma.DbNull) as Prisma.InputJsonValue,
        name: createDto.name,
        description: createDto.description ?? null,
      },
    });

    return this.toApiPermission(row);
  }

  async findAllPermissions(
    organizationId: string,
    query: QueryPermissionsDto,
  ): Promise<Permission[]> {
    const order = query.order === 'desc' ? 'desc' : 'asc';
    const sortable: Record<
      string,
      keyof Prisma.PermissionOrderByWithRelationInput
    > = {
      name: 'name',
      resource: 'resource',
      action: 'action',
      effect: 'effect',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    };
    const sortBy = sortable[query.sort_by ?? 'name'] ?? 'name';

    const rows = await this.prisma.permission.findMany({
      where: {
        organizationId,
        ...(query.resource ? { resource: query.resource } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                {
                  description: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { [sortBy]: order },
    });

    return rows.map((row) => this.toApiPermission(row));
  }

  async findPermissionById(
    organizationId: string,
    id: string,
  ): Promise<Permission> {
    const row = await this.prisma.permission.findFirst({
      where: { id, organizationId },
    });
    if (!row) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return this.toApiPermission(row);
  }

  async updatePermission(
    organizationId: string,
    id: string,
    updateDto: UpdatePermissionDto,
  ): Promise<Permission> {
    await this.findPermissionById(organizationId, id);

    const data: Prisma.PermissionUpdateInput = {};
    if (updateDto.resource !== undefined) data.resource = updateDto.resource;
    if (updateDto.action !== undefined) data.action = updateDto.action;
    if (updateDto.effect !== undefined) data.effect = updateDto.effect;
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.description !== undefined) {
      data.description = updateDto.description;
    }
    if (updateDto.conditions !== undefined) {
      data.conditions = updateDto.conditions as Prisma.InputJsonValue;
    }

    const row = await this.prisma.permission.update({ where: { id }, data });
    return this.toApiPermission(row);
  }

  async deletePermission(organizationId: string, id: string): Promise<void> {
    await this.findPermissionById(organizationId, id);

    const rolesUsingPermission = await this.prisma.rolePermission.count({
      where: { permissionId: id },
    });

    if (rolesUsingPermission > 0) {
      throw new BadRequestException(
        `Permission is used in ${rolesUsingPermission} role(s)`,
      );
    }

    await this.prisma.permission.delete({ where: { id } });
  }

  /**
   * ROLES CRUD
   */
  async createRole(
    organizationId: string,
    createDto: CreateRoleDto,
  ): Promise<Role> {
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, code: createDto.code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Role with code ${createDto.code} already exists in this organization`,
      );
    }

    const permissionIds = createDto.permission_ids ?? [];
    await this.assertPermissionsExist(organizationId, permissionIds);

    try {
      const row = await this.prisma.role.create({
        data: {
          organizationId,
          name: createDto.name,
          code: createDto.code,
          description: createDto.description ?? null,
          // Banderas del servidor: nunca se toman del cliente. Ver CreateRoleDto.
          isSystem: false,
          systemRole: null,
          color: createDto.color ?? null,
          icon: createDto.icon ?? null,
          scopes: [],
          ...(permissionIds.length
            ? {
                permissions: {
                  create: permissionIds.map((permissionId) => ({
                    permissionId,
                  })),
                },
              }
            : {}),
        },
        include: { permissions: { select: { permissionId: true } } },
      });

      return this.toApiRole(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Role ${createDto.name} already exists in this organization`,
        );
      }
      throw error;
    }
  }

  async findAllRoles(
    organizationId: string,
    query: QueryRolesDto,
  ): Promise<Role[]> {
    const order = query.order === 'desc' ? 'desc' : 'asc';
    const sortBy = query.sort_by === 'created_at' ? 'createdAt' : 'name';

    const rows = await this.prisma.role.findMany({
      where: {
        AND: [
          this.visibleRoles(organizationId),
          ...(query.system_role ? [{ systemRole: query.system_role }] : []),
          ...(query.search
            ? [
                {
                  OR: [
                    {
                      name: {
                        contains: query.search,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                    {
                      description: {
                        contains: query.search,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      include: { permissions: { select: { permissionId: true } } },
      orderBy: { [sortBy]: order },
    });

    return rows.map((row) => this.toApiRole(row));
  }

  async findRoleById(organizationId: string, id: string): Promise<Role> {
    const row = await this.prisma.role.findFirst({
      where: { id, ...this.visibleRoles(organizationId) },
      include: { permissions: { select: { permissionId: true } } },
    });

    if (!row) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    return this.toApiRole(row);
  }

  async findRoleByCode(
    organizationId: string,
    code: string,
  ): Promise<Role | undefined> {
    const row = await this.prisma.role.findFirst({
      where: { code, organizationId },
      include: { permissions: { select: { permissionId: true } } },
    });

    return row ? this.toApiRole(row) : undefined;
  }

  async updateRole(
    organizationId: string,
    id: string,
    updateDto: UpdateRoleDto,
  ): Promise<Role> {
    const role = await this.findRoleById(organizationId, id);

    // Global catalog rows are shared by every tenant — never editable here.
    if (role.organization_id === null) {
      throw new BadRequestException('Cannot update a global system role');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot update system role');
    }

    if (updateDto.code && updateDto.code !== role.code) {
      const existing = await this.findRoleByCode(
        organizationId,
        updateDto.code,
      );
      if (existing) {
        throw new ConflictException(
          `Role with code ${updateDto.code} already exists`,
        );
      }
    }

    if (updateDto.permission_ids !== undefined) {
      await this.assertPermissionsExist(
        organizationId,
        updateDto.permission_ids,
      );
    }

    const data: Prisma.RoleUpdateInput = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.code !== undefined) data.code = updateDto.code;
    if (updateDto.description !== undefined) {
      data.description = updateDto.description;
    }
    if (updateDto.color !== undefined) data.color = updateDto.color;
    if (updateDto.icon !== undefined) data.icon = updateDto.icon;

    const row = await this.prisma.$transaction(async (tx) => {
      if (updateDto.permission_ids !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (updateDto.permission_ids.length > 0) {
          await tx.rolePermission.createMany({
            data: updateDto.permission_ids.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }

      return tx.role.update({
        where: { id },
        data,
        include: { permissions: { select: { permissionId: true } } },
      });
    });

    return this.toApiRole(row);
  }

  async deleteRole(organizationId: string, id: string): Promise<void> {
    const role = await this.findRoleById(organizationId, id);

    if (role.organization_id === null) {
      throw new BadRequestException('Cannot delete a global system role');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot delete system role');
    }

    const [assignments, users] = await Promise.all([
      this.prisma.userRoleAssignment.count({
        where: { roleId: id, revokedAt: null },
      }),
      // `User.roleId` is a RESTRICT foreign key: deleting a role still bound to
      // a user would blow up at the database level, so check it up front.
      this.prisma.user.count({ where: { roleId: id } }),
    ]);

    const inUse = assignments + users;
    if (inUse > 0) {
      throw new BadRequestException(`Role is assigned to ${inUse} user(s)`);
    }

    await this.prisma.role.delete({ where: { id } });
  }

  /**
   * USER ROLE ASSIGNMENTS
   */
  async assignRole(
    organizationId: string,
    assignDto: AssignRoleDto,
    assignedBy: string,
  ): Promise<UserRole> {
    const role = await this.findRoleById(organizationId, assignDto.role_id);

    // The user must belong to the caller's organization: without this check a
    // tenant could grant its own roles to a user of another organization.
    const user = await this.prisma.user.findFirst({
      where: { id: assignDto.user_id, organizationId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${assignDto.user_id} not found`);
    }

    const existing = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId: assignDto.user_id,
        roleId: assignDto.role_id,
        organizationId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `User already has role ${role.name} in this organization`,
      );
    }

    const row = await this.prisma.userRoleAssignment.create({
      data: {
        userId: assignDto.user_id,
        roleId: assignDto.role_id,
        organizationId,
        locationIds: assignDto.location_ids ?? [],
        validFrom: assignDto.valid_from ?? null,
        validUntil: assignDto.valid_until ?? null,
        // Audit truth comes from the JWT, never from the request body.
        assignedBy,
      },
    });

    return this.toApiUserRole(row);
  }

  async revokeRole(
    organizationId: string,
    id: string,
    revokedBy: string,
  ): Promise<UserRole> {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { id, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`User role assignment ${id} not found`);
    }

    if (assignment.revokedAt) {
      throw new BadRequestException('Role assignment already revoked');
    }

    const row = await this.prisma.userRoleAssignment.update({
      where: { id },
      data: { revokedAt: new Date(), revokedBy },
    });

    return this.toApiUserRole(row);
  }

  async findUserRoles(
    organizationId: string,
    query: QueryUserRolesDto,
  ): Promise<UserRole[]> {
    const rows = await this.prisma.userRoleAssignment.findMany({
      where: {
        organizationId,
        revokedAt: null, // Only active assignments
        ...(query.user_id ? { userId: query.user_id } : {}),
        ...(query.role_id ? { roleId: query.role_id } : {}),
        ...(query.location_id
          ? { locationIds: { has: query.location_id } }
          : {}),
      },
      orderBy: { assignedAt: 'asc' },
    });

    return rows.map((row) => this.toApiUserRole(row));
  }

  /**
   * PERMISSION CHECKING
   */
  private async activeAssignments(
    userId: string,
    organizationId: string,
  ): Promise<AssignmentWithPermissions[]> {
    const now = new Date();

    return this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        organizationId,
        revokedAt: null,
        // An expired (or not yet valid) assignment must not grant anything.
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  }

  async checkPermission(
    organizationId: string,
    checkDto: CheckPermissionDto,
  ): Promise<PermissionCheck> {
    const assignments = await this.activeAssignments(
      checkDto.user_id,
      organizationId,
    );

    if (assignments.length === 0) {
      return {
        allowed: false,
        resource: checkDto.resource,
        action: checkDto.action,
        reason: 'User has no roles',
        matched_permissions: [],
      };
    }

    const matchedPermissions: string[] = [];
    let allowed = false;

    for (const assignment of assignments) {
      for (const link of assignment.role.permissions) {
        const perm = link.permission;

        if (
          perm.resource !== checkDto.resource ||
          perm.action !== checkDto.action
        ) {
          continue;
        }

        matchedPermissions.push(perm.id);

        if (perm.effect === Effect.DENY) {
          // DENY takes precedence
          return {
            allowed: false,
            resource: checkDto.resource,
            action: checkDto.action,
            reason: `Explicit DENY: ${perm.name}`,
            matched_permissions: [perm.id],
          };
        }

        if (perm.effect === Effect.ALLOW) {
          allowed = true;
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
    const assignments = await this.activeAssignments(userId, organizationId);

    const byId = new Map<string, Permission>();
    for (const assignment of assignments) {
      for (const link of assignment.role.permissions) {
        byId.set(link.permission.id, this.toApiPermission(link.permission));
      }
    }

    return Array.from(byId.values());
  }

  /**
   * STATISTICS
   *
   * Counts what the tenant actually sees through `GET /roles`: its own roles
   * plus the global system catalog.
   */
  async getStats(organizationId: string): Promise<RoleStats> {
    const [roles, totalPermissions, assignments] = await Promise.all([
      this.prisma.role.findMany({
        where: this.visibleRoles(organizationId),
        select: { id: true, isSystem: true, systemRole: true },
      }),
      this.prisma.permission.count({ where: { organizationId } }),
      this.prisma.userRoleAssignment.findMany({
        where: { organizationId, revokedAt: null },
        select: { roleId: true },
      }),
    ]);

    const bySystemRole = Object.values(SystemRole).reduce(
      (acc, systemRole) => {
        acc[systemRole] = roles.filter(
          (r) => r.systemRole === systemRole,
        ).length;
        return acc;
      },
      {} as Record<SystemRole, number>,
    );

    const usersByRole: Record<string, number> = {};
    for (const role of roles) {
      usersByRole[role.id] = assignments.filter(
        (a) => a.roleId === role.id,
      ).length;
    }

    return {
      total_roles: roles.length,
      system_roles_count: roles.filter((r) => r.isSystem).length,
      custom_roles_count: roles.filter((r) => !r.isSystem).length,
      by_system_role: bySystemRole,
      total_permissions: totalPermissions,
      total_user_roles: assignments.length,
      users_by_role: usersByRole,
    };
  }
}
