import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
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

interface RequestWithUser {
  user?: { userId?: string };
}

/**
 * La organización sale SIEMPRE del JWT (`@CurrentOrg()`), nunca del cuerpo o
 * del query: el `TenantGuard` global sólo rechaza los `organization_id`
 * explícitos que no coinciden, no la omisión del parámetro.
 */
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private actorId(req: RequestWithUser): string {
    return req.user?.userId ?? 'system';
  }

  /**
   * PERMISSIONS
   */
  @Post('permissions')
  createPermission(
    @CurrentOrg() organizationId: string,
    @Body() createDto: CreatePermissionDto,
  ) {
    return this.rolesService.createPermission(organizationId, createDto);
  }

  @Get('permissions')
  findAllPermissions(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryPermissionsDto,
  ) {
    return this.rolesService.findAllPermissions(organizationId, query);
  }

  @Get('permissions/:id')
  findPermissionById(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.rolesService.findPermissionById(organizationId, id);
  }

  @Put('permissions/:id')
  updatePermission(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionDto,
  ) {
    return this.rolesService.updatePermission(organizationId, id, updateDto);
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.rolesService.deletePermission(organizationId, id);
  }

  /**
   * ROLES
   */
  @Post()
  createRole(
    @CurrentOrg() organizationId: string,
    @Body() createDto: CreateRoleDto,
  ) {
    return this.rolesService.createRole(organizationId, createDto);
  }

  @Get()
  findAllRoles(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryRolesDto,
  ) {
    return this.rolesService.findAllRoles(organizationId, query);
  }

  @Get('stats/:organizationId')
  getStats(@CurrentOrg() organizationId: string) {
    return this.rolesService.getStats(organizationId);
  }

  @Get('user-roles/find')
  findUserRoles(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryUserRolesDto,
  ) {
    return this.rolesService.findUserRoles(organizationId, query);
  }

  @Get(':id')
  findRoleById(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    return this.rolesService.findRoleById(organizationId, id);
  }

  @Put(':id')
  updateRole(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(organizationId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.rolesService.deleteRole(organizationId, id);
  }

  /**
   * USER ROLE ASSIGNMENTS
   */
  @Post('assign')
  assignRole(
    @CurrentOrg() organizationId: string,
    @Body() assignDto: AssignRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rolesService.assignRole(
      organizationId,
      assignDto,
      this.actorId(req),
    );
  }

  @Patch('revoke/:id')
  revokeRole(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.rolesService.revokeRole(organizationId, id, this.actorId(req));
  }

  /**
   * PERMISSION CHECKING
   */
  @Post('check')
  checkPermission(
    @CurrentOrg() organizationId: string,
    @Body() checkDto: CheckPermissionDto,
  ) {
    return this.rolesService.checkPermission(organizationId, checkDto);
  }

  @Get('user-permissions/:userId/:organizationId')
  getUserPermissions(
    @CurrentOrg() organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.getUserPermissions(userId, organizationId);
  }
}
