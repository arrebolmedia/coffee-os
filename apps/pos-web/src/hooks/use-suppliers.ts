/**
 * CoffeeOS - Suppliers Hooks
 * React Query hooks para gestión de proveedores
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateSupplierDTO,
  SuppliersService,
  UpdateSupplierDTO,
} from '@/services/suppliers.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

// Query keys
export const suppliersKeys = {
  all: ['suppliers'] as const,
  lists: () => [...suppliersKeys.all, 'list'] as const,
  list: (orgId: string, filters?: any) =>
    [...suppliersKeys.lists(), orgId, filters] as const,
  details: () => [...suppliersKeys.all, 'detail'] as const,
  detail: (id: string) => [...suppliersKeys.details(), id] as const,
  stats: (orgId: string) => [...suppliersKeys.all, 'stats', orgId] as const,
  search: (orgId: string, query: string) =>
    [...suppliersKeys.all, 'search', orgId, query] as const,
};

/**
 * Hook to get suppliers list
 */
export function useSuppliers(filters?: { active?: boolean; search?: string }) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: suppliersKeys.list(organizationId, filters),
    queryFn: () => SuppliersService.getSuppliers(organizationId, filters),
    enabled: !!organizationId,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Hook to get supplier by ID
 */
export function useSupplier(supplierId: string, enabled = true) {
  return useQuery({
    queryKey: suppliersKeys.detail(supplierId),
    queryFn: () => SuppliersService.getSupplier(supplierId),
    enabled: enabled && !!supplierId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get supplier statistics
 */
export function useSupplierStats() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: suppliersKeys.stats(organizationId),
    queryFn: () => SuppliersService.getSupplierStats(organizationId),
    enabled: !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to create supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (data: Omit<CreateSupplierDTO, 'organization_id'>) =>
      SuppliersService.createSupplier({
        ...data,
        organization_id: organizationId,
      }),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: suppliersKeys.stats(organizationId),
      });
      toast.success(`Proveedor ${supplier.name} creado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear proveedor');
    },
  });
}

/**
 * Hook to update supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierDTO }) =>
      SuppliersService.updateSupplier(id, data),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: suppliersKeys.detail(supplier.id),
      });
      queryClient.invalidateQueries({
        queryKey: suppliersKeys.stats(organizationId),
      });
      toast.success('Proveedor actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar proveedor',
      );
    },
  });
}

/**
 * Hook to delete supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (id: string) => SuppliersService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: suppliersKeys.stats(organizationId),
      });
      toast.success('Proveedor eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al eliminar proveedor',
      );
    },
  });
}

// NOTE (migración Prisma): useSupplierPurchases, useUpdateSupplierRating y
// useSuppliersByCategory se eliminaron — el backend ya no expone purchases,
// rating ni category para proveedores.

/**
 * Hook to search suppliers
 */
export function useSearchSuppliers(query: string, enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: suppliersKeys.search(organizationId, query),
    queryFn: () => SuppliersService.searchSuppliers(organizationId, query),
    enabled: enabled && !!organizationId && query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}
