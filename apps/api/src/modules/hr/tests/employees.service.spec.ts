import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from '../employees.service';
import { CreateEmployeeDto, EmployeeStatus, EmployeeRole, EmploymentType, UpdateEmployeeDto } from '../dto';

describe('EmployeesService', () => {
  let service: EmployeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeesService],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  afterEach(() => {
    service['employees'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee successfully', async () => {
      const createDto: CreateEmployeeDto = {
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan.perez@cafeteria.com',
        phone: '+52 55 1234 5678',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.BARISTA,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2025-01-15',
        hourly_rate: 85,
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.first_name).toBe('Juan');
      expect(result.last_name).toBe('Pérez');
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
      expect(result.role).toBe(EmployeeRole.BARISTA);
    });

    it('should include Mexican IDs', async () => {
      const createDto: CreateEmployeeDto = {
        first_name: 'María',
        last_name: 'García',
        email: 'maria.garcia@cafeteria.com',
        phone: '+52 55 9876 5432',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.CASHIER,
        employment_type: EmploymentType.PART_TIME,
        hire_date: '2025-02-01',
        rfc: 'GAMA900101ABC',
        curp: 'GAMA900101MDFRRR01',
        nss: '12345678901',
      };

      const result = await service.create(createDto);

      expect(result.rfc).toBe('GAMA900101ABC');
      expect(result.curp).toBe('GAMA900101MDFRRR01');
      expect(result.nss).toBe('12345678901');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        phone: '1234567',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.BARISTA,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2025-01-01',
      });

      await service.create({
        first_name: 'María',
        last_name: 'García',
        email: 'maria@test.com',
        phone: '7654321',
        organization_id: 'org_1',
        location_id: 'loc_2',
        role: EmployeeRole.MANAGER,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2024-12-01',
      });

      await service.create({
        first_name: 'Carlos',
        last_name: 'López',
        email: 'carlos@test.com',
        phone: '1112222',
        organization_id: 'org_2',
        location_id: 'loc_3',
        role: EmployeeRole.COOK,
        employment_type: EmploymentType.PART_TIME,
        hire_date: '2025-03-01',
      });
    });

    it('should return all employees when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by location_id', async () => {
      const result = await service.findAll({ location_id: 'loc_1' });
      expect(result).toHaveLength(1);
    });

    it('should filter by role', async () => {
      const result = await service.findAll({ role: EmployeeRole.BARISTA });
      expect(result).toHaveLength(1);
    });

    it('should filter by employment_type', async () => {
      const result = await service.findAll({ employment_type: EmploymentType.FULL_TIME });
      expect(result).toHaveLength(2);
    });

    it('should search by name', async () => {
      const result = await service.findAll({ search: 'juan' });
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('Juan');
    });

    it('should search by email', async () => {
      const result = await service.findAll({ search: 'maria@' });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update employee', async () => {
      const employee = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        phone: '1234567',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.BARISTA,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2025-01-01',
      });

      const updateDto: UpdateEmployeeDto = {
        role: EmployeeRole.SHIFT_SUPERVISOR,
        hourly_rate: 100,
      };

      const result = await service.update(employee.id, updateDto);

      expect(result.role).toBe(EmployeeRole.SHIFT_SUPERVISOR);
      expect(result.hourly_rate).toBe(100);
    });

    it('should terminate employee', async () => {
      const employee = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        phone: '1234567',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.BARISTA,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2025-01-01',
      });

      const updateDto: UpdateEmployeeDto = {
        status: EmployeeStatus.TERMINATED,
        termination_date: '2025-10-01',
        termination_reason: 'Resigned',
      };

      const result = await service.update(employee.id, updateDto);

      expect(result.status).toBe(EmployeeStatus.TERMINATED);
      expect(result.termination_date).toBeDefined();
      expect(result.termination_reason).toBe('Resigned');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        first_name: 'Active 1',
        last_name: 'Employee',
        email: 'active1@test.com',
        phone: '111',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.BARISTA,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2025-01-01',
      });

      const emp2 = await service.create({
        first_name: 'Active 2',
        last_name: 'Employee',
        email: 'active2@test.com',
        phone: '222',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.CASHIER,
        employment_type: EmploymentType.PART_TIME,
        hire_date: '2025-01-01',
      });

      await service.update(emp2.id, {
        status: EmployeeStatus.TERMINATED,
        termination_date: '2025-10-01',
      });
    });

    it('should return employee statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.terminated).toBe(1);
    });

    it('should group by role', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_role[EmployeeRole.BARISTA]).toBe(1);
      expect(stats.by_role[EmployeeRole.CASHIER]).toBe(1);
    });

    it('should group by employment type', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_employment_type[EmploymentType.FULL_TIME]).toBe(1);
      expect(stats.by_employment_type[EmploymentType.PART_TIME]).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete employee', async () => {
      const employee = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        phone: '1234567',
        organization_id: 'org_1',
        location_id: 'loc_1',
        role: EmployeeRole.BARISTA,
        employment_type: EmploymentType.FULL_TIME,
        hire_date: '2025-01-01',
      });

      await service.delete(employee.id);
      const result = await service.findOne(employee.id);
      expect(result).toBeNull();
    });
  });
});
