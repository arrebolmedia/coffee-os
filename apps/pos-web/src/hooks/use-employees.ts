/**
 * CoffeeOS POS Web - Employees Hooks
 * React Query hooks para gestión de empleados (Users)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
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

// API functions (mock for now - replace with actual API calls)
const employeesAPI = {
  getEmployees: async (organizationId: string): Promise<Employee[]> => {
    // TODO: Replace with actual API call
    // return await api.get(`/users?organizationId=${organizationId}`);
    return []; // Mock data
  },

  getEmployee: async (id: string): Promise<Employee> => {
    // TODO: Replace with actual API call
    // return await api.get(`/users/${id}`);
    throw new Error('Not implemented');
  },

  createEmployee: async (data: CreateEmployeeDTO): Promise<Employee> => {
    // TODO: Replace with actual API call
    // return await api.post('/users', data);
    console.log('Creating employee:', data);
    throw new Error('Not implemented');
  },

  updateEmployee: async (
    id: string,
    data: Partial<UpdateEmployeeDTO>,
  ): Promise<Employee> => {
    // TODO: Replace with actual API call
    // return await api.put(`/users/${id}`, data);
    console.log('Updating employee:', id, data);
    throw new Error('Not implemented');
  },

  deleteEmployee: async (id: string): Promise<void> => {
    // TODO: Replace with actual API call
    // return await api.delete(`/users/${id}`);
    console.log('Deleting employee:', id);
    throw new Error('Not implemented');
  },
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
    queryFn: async () => {
      // TODO: Replace with actual API call
      // return await api.get(`/users/stats?organizationId=${organizationId}`);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        vacation: 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
