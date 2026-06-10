import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import auditsService, {
  CreateAuditDto,
  QueryAuditsParams,
  UpdateAuditDto,
} from '@/services/audits.service';
import { useAuth } from '@/hooks/use-auth';

const AUDITS_QUERY_KEY = 'audits';

export const useAudits = (params?: QueryAuditsParams) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AUDITS_QUERY_KEY, user?.organizationId, params],
    queryFn: () => auditsService.getAudits(user!.organizationId, params),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAudit = (id: string) => {
  return useQuery({
    queryKey: [AUDITS_QUERY_KEY, id],
    queryFn: () => auditsService.getAudit(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOpenActions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AUDITS_QUERY_KEY, 'open-actions', user?.organizationId],
    queryFn: () => auditsService.getOpenActions(user!.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAuditStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AUDITS_QUERY_KEY, 'stats', user?.organizationId],
    queryFn: () => auditsService.getStats(user!.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateAudit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateAuditDto) =>
      auditsService.createAudit(user!.organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUDITS_QUERY_KEY] });
      toast.success('Auditoría registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al registrar auditoría',
      );
    },
  });
};

export const useUpdateAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAuditDto }) =>
      auditsService.updateAudit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUDITS_QUERY_KEY] });
      toast.success('Auditoría actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al actualizar auditoría',
      );
    },
  });
};

export const useCompleteAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      completionDate,
    }: {
      id: string;
      completionDate: string;
    }) => auditsService.completeAudit(id, completionDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUDITS_QUERY_KEY] });
      toast.success('Auditoría completada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al completar auditoría',
      );
    },
  });
};

export const useDeleteAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => auditsService.deleteAudit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUDITS_QUERY_KEY] });
      toast.success('Auditoría eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al eliminar auditoría',
      );
    },
  });
};
