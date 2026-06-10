/**
 * CoffeeOS - Evaluations Hooks
 * React Query hooks para evaluaciones de desempeño
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  CreateEvaluationDto,
  evaluationsService,
  QueryEvaluationsParams,
} from '@/services/evaluations.service';
import { Evaluation, EvaluationStats } from '@/types';
import { useAuth } from '@/hooks/use-auth';

const EVALUATIONS_QUERY_KEY = 'evaluations';

/**
 * Hook para obtener lista de evaluaciones
 */
export function useEvaluations(
  params?: Omit<QueryEvaluationsParams, 'organization_id'>,
) {
  const { user } = useAuth();

  return useQuery<Evaluation[]>({
    queryKey: [EVALUATIONS_QUERY_KEY, 'list', params],
    queryFn: () =>
      evaluationsService.getEvaluations({
        ...params,
        organization_id: user?.organizationId,
      }),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para obtener una evaluación específica
 */
export function useEvaluation(evaluationId?: string) {
  return useQuery<Evaluation>({
    queryKey: [EVALUATIONS_QUERY_KEY, 'detail', evaluationId],
    queryFn: () => evaluationsService.getEvaluation(evaluationId!),
    enabled: !!evaluationId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener historial de evaluaciones de un empleado
 */
export function useEmployeeEvaluationHistory(employeeId?: string) {
  return useQuery<Evaluation[]>({
    queryKey: [EVALUATIONS_QUERY_KEY, 'employee-history', employeeId],
    queryFn: () => evaluationsService.getEmployeeHistory(employeeId!),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener estadísticas de evaluaciones
 */
export function useEvaluationStats() {
  const { user } = useAuth();

  return useQuery<EvaluationStats>({
    queryKey: [EVALUATIONS_QUERY_KEY, 'stats', user?.organizationId],
    queryFn: () => evaluationsService.getStats(user!.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para crear evaluación
 */
export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateEvaluationDto) =>
      evaluationsService.createEvaluation(data, user!.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVALUATIONS_QUERY_KEY] });
      toast.success('Evaluación creada exitosamente');
    },
    onError: () => {
      toast.error('Error al crear evaluación');
    },
  });
}

/**
 * Hook para eliminar evaluación
 */
export function useDeleteEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evaluationId: string) =>
      evaluationsService.deleteEvaluation(evaluationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVALUATIONS_QUERY_KEY] });
      toast.success('Evaluación eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar evaluación');
    },
  });
}
