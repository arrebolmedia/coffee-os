import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import {
  CreateEmployeeDto,
  EmployeeStatus,
  QueryEmployeesDto,
  UpdateEmployeeDto,
} from './dto';
import { Employee } from './interfaces';

// Subset of Prisma User fields we care about in this service
interface PrismaUser {
  id: string;
  organizationId: string;
  roleId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateEmployeeDto,
    organizationId: string,
  ): Promise<Employee> {
    if (!createDto.role_id) {
      throw new BadRequestException(
        'role_id is required when creating an employee; obtain a valid role id from the roles service.',
      );
    }

    // Roles are multi-tenant: `organizationId === null` marks a row in the
    // global system catalog (owner/manager/barista) shared by every tenant,
    // and a non-null one is owned by a single organization. Scope the lookup
    // so an employee can only be bound to a role its own organization can
    // see — same predicate as `visibleRoles()` in the roles service. The org
    // comes from the JWT, never from `createDto.organization_id`.
    const role = await this.prisma.role.findFirst({
      where: {
        id: createDto.role_id,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: { id: true, active: true },
    });
    if (!role) {
      throw new BadRequestException(`Role ${createDto.role_id} not found`);
    }

    // Generate a temporary password so the User.password column is never
    // empty (which would silently disable authentication). The employee
    // must reset it through the auth password-reset flow before login.
    const tempPassword = randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        // Same JWT-derived org the role was validated against, so the employee
        // can never land in a different tenant than the role it binds to.
        organizationId,
        roleId: createDto.role_id,
        email: createDto.email,
        password: hashedPassword,
        firstName: createDto.first_name,
        lastName: createDto.last_name,
        phone: createDto.phone ?? null,
        active: true,
      },
    });

    return this.mapToEmployee(user as unknown as PrismaUser, {
      location_id: createDto.location_id,
      role: createDto.role,
      employment_type: createDto.employment_type,
      hire_date: new Date(createDto.hire_date),
      hourly_rate: createDto.hourly_rate,
      monthly_salary: createDto.monthly_salary,
      emergency_contact_name: createDto.emergency_contact_name,
      emergency_contact_phone: createDto.emergency_contact_phone,
      address: createDto.address,
      city: createDto.city,
      state: createDto.state,
      postal_code: createDto.postal_code,
      rfc: createDto.rfc,
      curp: createDto.curp,
      nss: createDto.nss,
    });
  }

  async findAll(query: QueryEmployeesDto): Promise<Employee[]> {
    const where: Record<string, unknown> = {};

    if (query.organization_id) {
      where['organizationId'] = query.organization_id;
    }

    if (query.status === EmployeeStatus.ACTIVE) {
      where['active'] = true;
    } else if (
      query.status === EmployeeStatus.INACTIVE ||
      query.status === EmployeeStatus.TERMINATED
    ) {
      where['active'] = false;
    }

    if (query.search) {
      where['OR'] = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({ where });
    return (users as unknown as PrismaUser[]).map((u) => this.mapToEmployee(u));
  }

  async findOne(id: string): Promise<Employee | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.mapToEmployee(user as unknown as PrismaUser);
  }

  async update(id: string, updateDto: UpdateEmployeeDto): Promise<Employee> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const data: Record<string, unknown> = {};

    if (updateDto.first_name !== undefined)
      data['firstName'] = updateDto.first_name;
    if (updateDto.last_name !== undefined)
      data['lastName'] = updateDto.last_name;
    if (updateDto.email !== undefined) data['email'] = updateDto.email;
    if (updateDto.phone !== undefined) data['phone'] = updateDto.phone;

    if (
      updateDto.status === EmployeeStatus.TERMINATED ||
      updateDto.status === EmployeeStatus.INACTIVE
    ) {
      data['active'] = false;
    } else if (updateDto.status === EmployeeStatus.ACTIVE) {
      data['active'] = true;
    }

    const updated = await this.prisma.user.update({ where: { id }, data });

    return this.mapToEmployee(updated as unknown as PrismaUser, {
      role: updateDto.role,
      employment_type: updateDto.employment_type,
      location_id: updateDto.location_id,
      status: updateDto.status,
      hourly_rate: updateDto.hourly_rate,
      monthly_salary: updateDto.monthly_salary,
      emergency_contact_name: updateDto.emergency_contact_name,
      emergency_contact_phone: updateDto.emergency_contact_phone,
      address: updateDto.address,
      city: updateDto.city,
      state: updateDto.state,
      postal_code: updateDto.postal_code,
      termination_date: updateDto.termination_date
        ? new Date(updateDto.termination_date)
        : undefined,
      termination_reason: updateDto.termination_reason,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { active: false } });
  }

  async getStats(
    organizationId: string,
    _locationId?: string,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { organizationId };

    const [total, active, inactive] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, active: true } }),
      this.prisma.user.count({ where: { ...where, active: false } }),
    ]);

    return {
      total,
      active,
      inactive,
      on_leave: 0,
      terminated: inactive,
      by_role: {},
      by_employment_type: {},
    };
  }

  private mapToEmployee(
    user: PrismaUser,
    overrides: Partial<Employee> = {},
  ): Employee {
    const status = user.active
      ? (overrides.status ?? EmployeeStatus.ACTIVE)
      : (overrides.status ?? EmployeeStatus.INACTIVE);

    return {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      organization_id: user.organizationId,
      location_id: overrides.location_id ?? '',
      role: overrides.role ?? ('' as Employee['role']),
      employment_type:
        overrides.employment_type ?? ('' as Employee['employment_type']),
      status,
      hire_date: overrides.hire_date ?? user.createdAt,
      termination_date: overrides.termination_date,
      termination_reason: overrides.termination_reason,
      hourly_rate: overrides.hourly_rate,
      monthly_salary: overrides.monthly_salary,
      emergency_contact_name: overrides.emergency_contact_name,
      emergency_contact_phone: overrides.emergency_contact_phone,
      address: overrides.address,
      city: overrides.city,
      state: overrides.state,
      postal_code: overrides.postal_code,
      rfc: overrides.rfc,
      curp: overrides.curp,
      nss: overrides.nss,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
