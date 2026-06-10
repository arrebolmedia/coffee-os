/**
 * CoffeeOS - Permits Hooks
 * React Query hooks para permisos y licencias
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  CreatePermitDto,
  permitsService,
  QueryPermitsParams,
  UpdatePermitDto,
} from '@/services/permits.service';
import { Permit, PermitStats } from '@/types';
import { useAuth } from '@/hooks/use-auth';

const PERMITS_QUERY_KEY = 'permits';

/**
 * Hook para obtener lista de permisos
 */
export function usePermits(
  params?: Omit<QueryPermitsParams, 'organization_id'>,
) {
  const { user } = useAuth();

  return useQuery<Permit[]>({
    queryKey: [PERMITS_QUERY_KEY, 'list', params],
    queryFn: () =>
      permitsService.getPermits({
        ...params,
        organization_id: user?.organizationId,
      }),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para obtener un permiso específico
 */
export function usePermit(permitId?: string) {
  return useQuery<Permit>({
    queryKey: [PERMITS_QUERY_KEY, 'detail', permitId],
    queryFn: () => permitsService.getPermit(permitId!),
    enabled: !!permitId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener permisos próximos a vencer
 */
export function useExpiringSoonPermits(days: number = 30) {
  const { user } = useAuth();

  return useQuery<Permit[]>({
    queryKey: [PERMITS_QUERY_KEY, 'expiring-soon', user?.organizationId, days],
    queryFn: () => permitsService.getExpiringSoon(user!.organizationId, days),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener permisos vencidos
 */
export function useExpiredPermits() {
  const { user } = useAuth();

  return useQuery<Permit[]>({
    queryKey: [PERMITS_QUERY_KEY, 'expired', user?.organizationId],
    queryFn: () => permitsService.getExpired(user!.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener estadísticas de permisos
 */
export function usePermitStats(locationId?: string) {
  const { user } = useAuth();

  return useQuery<PermitStats>({
    queryKey: [PERMITS_QUERY_KEY, 'stats', user?.organizationId, locationId],
    queryFn: () => permitsService.getStats(user!.organizationId, locationId),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para crear permiso
 */
export function useCreatePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePermitDto) => permitsService.createPermit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERMITS_QUERY_KEY] });
      toast.success('Permiso creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear permiso');
    },
  });
}

/**
 * Hook para actualizar permiso
 */
export function useUpdatePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermitDto }) =>
      permitsService.updatePermit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERMITS_QUERY_KEY] });
      toast.success('Permiso actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar permiso');
    },
  });
}

/**
 * Hook para renovar permiso
 */
export function useRenewPermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      expiryDate,
      renewalCost,
    }: {
      id: string;
      expiryDate: string;
      renewalCost?: number;
    }) => permitsService.renewPermit(id, expiryDate, renewalCost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERMITS_QUERY_KEY] });
      toast.success('Permiso renovado exitosamente');
    },
    onError: () => {
      toast.error('Error al renovar permiso');
    },
  });
}

/**
 * Hook para eliminar permiso
 */
export function useDeletePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permitId: string) => permitsService.deletePermit(permitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERMITS_QUERY_KEY] });
      toast.success('Permiso eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar permiso');
    },
  });
}
