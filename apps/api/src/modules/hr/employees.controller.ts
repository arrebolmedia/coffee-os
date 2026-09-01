import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, QueryEmployeesDto, UpdateEmployeeDto } from './dto';
import { Employee } from './interfaces';

@ApiBearerAuth()
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  /**
   * Ownership check: an employee from another organization is reported as
   * not found (404) to avoid leaking cross-tenant data.
   */
  private async assertOwnership(
    id: string,
    organizationId: string,
  ): Promise<Employee> {
    const employee = await this.employeesService.findOne(id);
    if (!employee || employee.organization_id !== organizationId) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateEmployeeDto,
    @CurrentOrg() organizationId: string,
  ): Promise<Employee> {
    // Always create within the caller's organization: the service uses this
    // org for both the role lookup and the new row, so any `organization_id`
    // in the body is ignored.
    return this.employeesService.create(createDto, organizationId);
  }

  /**
   * Repone la contrasena de un empleado y devuelve la nueva, una sola vez.
   *
   * Sin esto, un empleado que olvida su contrasena queda fuera para siempre: no
   * hay correo de recuperacion y `change-password` exige la contrasena actual.
   */
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.employeesService.resetPassword(id, organizationId);
  }

  @Get()
  async findAll(
    @Query() query: QueryEmployeesDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Employee[]> {
    // The org filter always comes from the JWT, never from the query string.
    return this.employeesService.findAll({
      ...query,
      organization_id: this.requireOrg(user),
    });
  }

  @Get('stats')
  async getStats(
    @CurrentUser() user: CurrentUserType,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.employeesService.getStats(this.requireOrg(user), locationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Employee> {
    return this.assertOwnership(id, this.requireOrg(user));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Employee> {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.employeesService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    await this.assertOwnership(id, this.requireOrg(user));
    await this.employeesService.delete(id);
  }
}
