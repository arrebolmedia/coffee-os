/**
 * CoffeeOS POS Web - Employees Hooks
 * React Query hooks para gestión de empleados (HR)
 *
 * Contrato alineado al backend `/hr/employees`
 * (apps/api/src/modules/hr/employees.service.ts): el wire format es
 * snake_case y `role`/`employment_type` son strings de enum.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// Enums del backend (apps/api/src/modules/hr/dto/create-employee.dto.ts)
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'TEMPORARY'
  | 'CONTRACT';

export type EmployeeRole =
  | 'BARISTA'
  | 'CASHIER'
  | 'COOK'
  | 'MANAGER'
  | 'ASSISTANT_MANAGER'
  | 'SHIFT_SUPERVISOR'
  | 'CLEANER'
  | 'DELIVERY';

// Shape real que devuelve el backend (snake_case)
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization_id: string;
  location_id: string;
  role: EmployeeRole | '';
  employment_type: EmploymentType | '';
  status: EmployeeStatus;
  hire_date: string;
  termination_date?: string;
  termination_reason?: string;
  hourly_rate?: number;
  monthly_salary?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  rfc?: string;
  curp?: string;
  nss?: string;
  created_at: string;
  updated_at: string;
}

// Espejo del CreateEmployeeDto real del backend
export interface CreateEmployeeDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization_id: string;
  location_id: string;
  role_id: string; // Prisma Role id (User.roleId FK)
  role: EmployeeRole;
  employment_type: EmploymentType;
  hire_date: string;
  hourly_rate?: number;
  monthly_salary?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  rfc?: string;
  curp?: string;
  nss?: string;
}

// Espejo del UpdateEmployeeDto real del backend
export interface UpdateEmployeeDTO {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location_id?: string;
  role?: EmployeeRole;
  employment_type?: EmploymentType;
  status?: EmployeeStatus;
  hourly_rate?: number;
  monthly_salary?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  termination_date?: string;
  termination_reason?: string;
}

// Query keys
export const employeesKeys = {
  all: ['employees'] as const,
  lists: () => [...employeesKeys.all, 'list'] as const,
  list: (orgId: string, filters?: any) =>
    [...employeesKeys.lists(), orgId, filters] as const,
  details: () => [...employeesKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeesKeys.details(), id] as const,
  stats: (orgId: string) => [...employeesKeys.all, 'stats', orgId] as const,
};

const employeesAPI = {
  getEmployees: (organizationId: string): Promise<Employee[]> =>
    api.get(`/hr/employees?organization_id=${organizationId}`),

  getEmployee: (id: string): Promise<Employee> =>
    api.get(`/hr/employees/${id}`),

  createEmployee: (data: CreateEmployeeDTO): Promise<Employee> =>
    api.post('/hr/employees', data),

  updateEmployee: (id: string, data: UpdateEmployeeDTO): Promise<Employee> =>
    api.patch(`/hr/employees/${id}`, data),

  deleteEmployee: (id: string): Promise<void> =>
    api.delete(`/hr/employees/${id}`),

  getStats: (organizationId: string) =>
    api.get(`/hr/employees/stats?organization_id=${organizationId}`),
};

/**
 * Hook to get employees list
 */
export function useEmployees(filters?: {
  status?: EmployeeStatus;
  search?: string;
}) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: employeesKeys.list(organizationId, filters),
    queryFn: () => employeesAPI.getEmployees(organizationId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get employee by ID
 */
export function useEmployee(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: employeesKeys.detail(employeeId),
    queryFn: () => employeesAPI.getEmployee(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (data: Omit<CreateEmployeeDTO, 'organization_id'>) =>
      employeesAPI.createEmployee({
        ...data,
        organization_id: organizationId,
      }),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeesKeys.stats(organizationId),
      });
      toast.success(
        `Empleado ${employee.first_name} ${employee.last_name} creado exitosamente`,
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear empleado');
    },
  });
}

/**
 * Hook to update employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDTO }) =>
      employeesAPI.updateEmployee(id, data),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeesKeys.detail(employee.id),
      });
      queryClient.invalidateQueries({
        queryKey: employeesKeys.stats(organizationId),
      });
      toast.success('Empleado actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar empleado');
    },
  });
}

/**
 * Hook to delete employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (id: string) => employeesAPI.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeesKeys.stats(organizationId),
      });
      toast.success('Empleado eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar empleado');
    },
  });
}

/**
 * Hook to get employee stats
 */
export function useEmployeeStats() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: employeesKeys.stats(organizationId),
    queryFn: () => employeesAPI.getStats(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
