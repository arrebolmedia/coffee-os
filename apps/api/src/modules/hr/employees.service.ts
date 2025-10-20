import { Injectable } from '@nestjs/common';
import { CreateEmployeeDto, UpdateEmployeeDto, QueryEmployeesDto, EmployeeStatus } from './dto';
import { Employee } from './interfaces';

@Injectable()
export class EmployeesService {
  private employees: Map<string, Employee> = new Map();

  async create(createDto: CreateEmployeeDto): Promise<Employee> {
    const id = this.generateId();
    const now = new Date();

    const employee: Employee = {
      id,
      first_name: createDto.first_name,
      last_name: createDto.last_name,
      email: createDto.email,
      phone: createDto.phone,
      organization_id: createDto.organization_id,
      location_id: createDto.location_id,
      role: createDto.role,
      employment_type: createDto.employment_type,
      status: EmployeeStatus.ACTIVE,
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
      created_at: now,
      updated_at: now,
    };

    this.employees.set(id, employee);
    return employee;
  }

  async findAll(query: QueryEmployeesDto): Promise<Employee[]> {
    let employees = Array.from(this.employees.values());

    if (query.organization_id) {
      employees = employees.filter((e) => e.organization_id === query.organization_id);
    }

    if (query.location_id) {
      employees = employees.filter((e) => e.location_id === query.location_id);
    }

    if (query.status) {
      employees = employees.filter((e) => e.status === query.status);
    }

    if (query.role) {
      employees = employees.filter((e) => e.role === query.role);
    }

    if (query.employment_type) {
      employees = employees.filter((e) => e.employment_type === query.employment_type);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.first_name.toLowerCase().includes(searchLower) ||
          e.last_name.toLowerCase().includes(searchLower) ||
          e.email.toLowerCase().includes(searchLower) ||
          e.phone.includes(searchLower),
      );
    }

    return employees;
  }

  async findOne(id: string): Promise<Employee | null> {
    return this.employees.get(id) || null;
  }

  async update(id: string, updateDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = this.employees.get(id);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const updated: Employee = {
      ...employee,
      ...updateDto,
      termination_date: updateDto.termination_date
        ? new Date(updateDto.termination_date)
        : employee.termination_date,
      updated_at: new Date(),
    };

    this.employees.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.employees.delete(id);
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    let employees = Array.from(this.employees.values()).filter(
      (e) => e.organization_id === organizationId,
    );

    if (locationId) {
      employees = employees.filter((e) => e.location_id === locationId);
    }

    const total = employees.length;
    const active = employees.filter((e) => e.status === EmployeeStatus.ACTIVE).length;
    const inactive = employees.filter((e) => e.status === EmployeeStatus.INACTIVE).length;
    const onLeave = employees.filter((e) => e.status === EmployeeStatus.ON_LEAVE).length;
    const terminated = employees.filter((e) => e.status === EmployeeStatus.TERMINATED).length;

    const byRole = employees.reduce((acc, e) => {
      acc[e.role] = (acc[e.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byEmploymentType = employees.reduce((acc, e) => {
      acc[e.employment_type] = (acc[e.employment_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive,
      on_leave: onLeave,
      terminated,
      by_role: byRole,
      by_employment_type: byEmploymentType,
    };
  }

  private generateId(): string {
    return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
