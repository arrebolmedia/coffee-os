import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import wasteService, {
  CreateWasteLogDto,
  UpdateWasteLogDto,
  QueryWasteLogsParams,
} from '@/services/waste.service';
import { useAuth } from '@/hooks/use-auth';

const WASTE_QUERY_KEY = 'waste';

export const useWasteLogs = (
  params?: Omit<QueryWasteLogsParams, 'organization_id'>,
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [WASTE_QUERY_KEY, 'logs', user?.organizationId, params],
    queryFn: () =>
      wasteService.getWasteLogs({
        organization_id: user!.organizationId,
        ...params,
      }),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useWasteLog = (id: string) => {
  return useQuery({
    queryKey: [WASTE_QUERY_KEY, 'logs', id],
    queryFn: () => wasteService.getWasteLog(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useWasteStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [WASTE_QUERY_KEY, 'stats', user?.organizationId],
    queryFn: () => wasteService.getWasteStats(user!.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateWasteLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (
      data: Omit<CreateWasteLogDto, 'organization_id' | 'recorded_by'>,
    ) =>
      wasteService.createWasteLog({
        ...data,
        organization_id: user!.organizationId,
        recorded_by: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WASTE_QUERY_KEY] });
      toast.success('Registro de desperdicio creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear registro');
    },
  });
};

export const useUpdateWasteLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWasteLogDto }) =>
      wasteService.updateWasteLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WASTE_QUERY_KEY] });
      toast.success('Registro actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al actualizar registro',
      );
    },
  });
};

export const useDeleteWasteLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => wasteService.deleteWasteLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WASTE_QUERY_KEY] });
      toast.success('Registro eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al eliminar registro',
      );
    },
  });
};
