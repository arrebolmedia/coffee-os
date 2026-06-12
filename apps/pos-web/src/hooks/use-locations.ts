import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * Shape real que devuelve el backend
 * (apps/api/src/modules/locations/interfaces/location.interface.ts):
 * el Location de Prisma plano, en snake_case.
 */
export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  timezone: string;
  tax_rate: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationStats {
  total_locations: number;
  active_count: number;
  inactive_count: number;
}

const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (orgId: string) => [...locationKeys.lists(), orgId] as const,
  stats: (orgId: string) => [...locationKeys.all, 'stats', orgId] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
};

export function useLocations() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: locationKeys.list(organizationId),
    queryFn: () =>
      api.get<Location[]>(`/locations?organization_id=${organizationId}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocationStats() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: locationKeys.stats(organizationId),
    queryFn: () => api.get<LocationStats>(`/locations/stats/${organizationId}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: locationKeys.list(organizationId),
      });
      toast.success('Sucursal actualizada exitosamente');
    },
    onError: () => toast.error('Error al actualizar sucursal'),
  });
}
