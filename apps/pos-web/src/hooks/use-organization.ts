import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const orgKeys = {
  all: ['organization'] as const,
  detail: (id: string) => [...orgKeys.all, id] as const,
};

export function useOrganization() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: orgKeys.detail(organizationId),
    queryFn: () => api.get(`/organizations/${organizationId}`),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (data: any) =>
      api.patch(`/organizations/${organizationId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orgKeys.detail(organizationId),
      });
      toast.success('Organización actualizada exitosamente');
    },
    onError: () => toast.error('Error al actualizar organización'),
  });
}
