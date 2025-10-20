import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
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

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * PERMISSIONS
   */
  @Post('permissions')
  createPermission(@Body() createDto: CreatePermissionDto) {
    return this.rolesService.createPermission(createDto);
  }

  @Get('permissions')
  findAllPermissions(@Query() query: QueryPermissionsDto) {
    return this.rolesService.findAllPermissions(query);
  }

  @Get('permissions/:id')
  findPermissionById(@Param('id') id: string) {
    return this.rolesService.findPermissionById(id);
  }

  @Put('permissions/:id')
  updatePermission(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionDto,
  ) {
    return this.rolesService.updatePermission(id, updateDto);
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param('id') id: string) {
    await this.rolesService.deletePermission(id);
  }

  /**
   * ROLES
   */
  @Post()
  createRole(@Body() createDto: CreateRoleDto) {
    return this.rolesService.createRole(createDto);
  }

  @Get()
  findAllRoles(@Query() query: QueryRolesDto) {
    return this.rolesService.findAllRoles(query);
  }

  @Get('stats/:organizationId')
  getStats(@Param('organizationId') organizationId: string) {
    return this.rolesService.getStats(organizationId);
  }

  @Get(':id')
  findRoleById(@Param('id') id: string) {
    return this.rolesService.findRoleById(id);
  }

  @Put(':id')
  updateRole(@Param('id') id: string, @Body() updateDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string) {
    await this.rolesService.deleteRole(id);
  }

  /**
   * USER ROLE ASSIGNMENTS
   */
  @Post('assign')
  assignRole(@Body() assignDto: AssignRoleDto) {
    return this.rolesService.assignRole(assignDto);
  }

  @Patch('revoke/:id')
  revokeRole(
    @Param('id') id: string,
    @Body('revoked_by') revokedBy: string,
  ) {
    return this.rolesService.revokeRole(id, revokedBy);
  }

  @Get('user-roles/find')
  findUserRoles(@Query() query: QueryUserRolesDto) {
    return this.rolesService.findUserRoles(query);
  }

  /**
   * PERMISSION CHECKING
   */
  @Post('check')
  checkPermission(@Body() checkDto: CheckPermissionDto) {
    return this.rolesService.checkPermission(checkDto);
  }

  @Get('user-permissions/:userId/:organizationId')
  getUserPermissions(
    @Param('userId') userId: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.rolesService.getUserPermissions(userId, organizationId);
  }
}
