/**
 * CoffeeOS POS Web - Employees Hooks
 * React Query hooks para gestión de empleados (Users)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// Types
export interface Employee {
  id: string;
  organizationId: string;
  roleId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: string;
    name: string;
  };
  locations?: Array<{
    id: string;
    name: string;
  }>;
  // Extended HR fields (stored in metadata or separate table)
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  salary?: number;
  curp?: string;
  rfc?: string;
  nss?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
}

export interface CreateEmployeeDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string; // Required for user creation
  roleId: string;
  organizationId: string;
  locationIds: string[];
  active: boolean;
  // Extended fields
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  salary?: number;
  curp?: string;
  rfc?: string;
  nss?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
  id: string;
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

  updateEmployee: (
    id: string,
    data: Partial<UpdateEmployeeDTO>,
  ): Promise<Employee> => api.patch(`/hr/employees/${id}`, data),

  deleteEmployee: (id: string): Promise<void> =>
    api.delete(`/hr/employees/${id}`),

  getStats: (organizationId: string) =>
    api.get(`/hr/employees/stats?organization_id=${organizationId}`),
};

/**
 * Hook to get employees list
 */
export function useEmployees(filters?: {
  roleId?: string;
  status?: 'active' | 'inactive';
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
    mutationFn: (
      data: Omit<CreateEmployeeDTO, 'organizationId' | 'password'> & {
        password?: string;
      },
    ) => {
      // Generate default password if not provided
      const password =
        data.password || `Temp${Math.random().toString(36).slice(-8)}!`;
      return employeesAPI.createEmployee({
        ...data,
        organizationId,
        password,
      });
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeesKeys.stats(organizationId),
      });
      toast.success(
        `Empleado ${employee.firstName} ${employee.lastName} creado exitosamente`,
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
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<UpdateEmployeeDTO>;
    }) => employeesAPI.updateEmployee(id, data),
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
