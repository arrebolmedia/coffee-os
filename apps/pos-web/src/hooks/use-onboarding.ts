import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingService } from '@/services/onboarding.service';
import { useAuth } from '@/hooks/use-auth';
import {
  OnboardingPlan,
  OnboardingStats,
  OnboardingPeriod,
  TaskCategory,
} from '@/types';
import toast from 'react-hot-toast';

/**
 * Hook to get all onboarding plans
 */
export function useOnboardingPlans(
  employeeId?: string,
  period?: OnboardingPeriod,
) {
  const { user } = useAuth();

  return useQuery<OnboardingPlan[]>({
    queryKey: ['onboarding', 'plans', user?.organizationId, employeeId, period],
    queryFn: () =>
      onboardingService.getPlans({
        organization_id: user!.organizationId,
        employee_id: employeeId,
        period,
      }),
    enabled: !!user?.organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get a specific onboarding plan
 */
export function useOnboardingPlan(planId?: string) {
  return useQuery<OnboardingPlan>({
    queryKey: ['onboarding', 'plan', planId],
    queryFn: () => onboardingService.getPlan(planId!),
    enabled: !!planId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to get onboarding statistics
 */
export function useOnboardingStats() {
  const { user } = useAuth();

  return useQuery<OnboardingStats>({
    queryKey: ['onboarding', 'stats', user?.organizationId],
    queryFn: () => onboardingService.getStats(user!.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to create a new onboarding plan
 */
export function useCreateOnboardingPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      employee_id: string;
      tasks: {
        title: string;
        description: string;
        category: TaskCategory;
        period: OnboardingPeriod;
        assigned_to?: string;
        required?: boolean;
      }[];
      notes?: string;
    }) =>
      onboardingService.createPlan(
        {
          ...data,
          created_by_user_id: user!.id,
        },
        user!.organizationId,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'stats'] });
      toast.success('Plan de onboarding creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear plan: ${error.message}`);
    },
  });
}

/**
 * Hook to complete/uncomplete a task
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      taskId,
      completed,
      notes,
    }: {
      planId: string;
      taskId: string;
      completed: boolean;
      notes?: string;
    }) =>
      onboardingService.completeTask(planId, {
        task_id: taskId,
        completed,
        notes,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'plans'] });
      queryClient.invalidateQueries({
        queryKey: ['onboarding', 'plan', variables.planId],
      });
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'stats'] });
      toast.success(
        variables.completed
          ? 'Tarea completada'
          : 'Tarea marcada como pendiente',
      );
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar tarea: ${error.message}`);
    },
  });
}

/**
 * Hook to delete an onboarding plan
 */
export function useDeleteOnboardingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => onboardingService.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'stats'] });
      toast.success('Plan de onboarding eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar plan: ${error.message}`);
    },
  });
}
