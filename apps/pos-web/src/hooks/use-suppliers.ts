/**
 * CoffeeOS - Suppliers Hooks
 * React Query hooks para gestión de proveedores
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SuppliersService,
  CreateSupplierDTO,
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
  purchases: (supplierId: string) =>
    [...suppliersKeys.detail(supplierId), 'purchases'] as const,
  category: (orgId: string, category: string) =>
    [...suppliersKeys.lists(), orgId, 'category', category] as const,
  search: (orgId: string, query: string) =>
    [...suppliersKeys.all, 'search', orgId, query] as const,
};

/**
 * Hook to get suppliers list
 */
export function useSuppliers(filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

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
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

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
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

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
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

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
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

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

/**
 * Hook to get supplier purchases
 */
export function useSupplierPurchases(supplierId: string, enabled = true) {
  return useQuery({
    queryKey: suppliersKeys.purchases(supplierId),
    queryFn: () => SuppliersService.getSupplierPurchases(supplierId),
    enabled: enabled && !!supplierId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to update supplier rating
 */
export function useUpdateSupplierRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      SuppliersService.updateSupplierRating(id, rating),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({
        queryKey: suppliersKeys.detail(supplier.id),
      });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      toast.success('Calificación actualizada');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar calificación',
      );
    },
  });
}

/**
 * Hook to get suppliers by category
 */
export function useSuppliersByCategory(category: string, enabled = true) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: suppliersKeys.category(organizationId, category),
    queryFn: () =>
      SuppliersService.getSuppliersByCategory(organizationId, category),
    enabled: enabled && !!organizationId && !!category,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Hook to search suppliers
 */
export function useSearchSuppliers(query: string, enabled = true) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: suppliersKeys.search(organizationId, query),
    queryFn: () => SuppliersService.searchSuppliers(organizationId, query),
    enabled: enabled && !!organizationId && query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}
