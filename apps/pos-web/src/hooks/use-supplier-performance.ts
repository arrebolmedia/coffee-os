/**
 * CoffeeOS - Supplier Performance Hooks
 * React Query hooks para evaluación de desempeño de proveedores
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateEvaluationDTO,
  CreateIssueDTO,
  SupplierPerformanceService,
} from '@/services/supplier-performance.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

// Query keys
export const supplierPerformanceKeys = {
  all: ['supplier-performance'] as const,
  metrics: (supplierId: string, dateRange?: any) =>
    [...supplierPerformanceKeys.all, 'metrics', supplierId, dateRange] as const,
  allMetrics: (orgId: string, dateRange?: any) =>
    [...supplierPerformanceKeys.all, 'all-metrics', orgId, dateRange] as const,
  comparison: (orgId: string, category?: string, dateRange?: any) =>
    [
      ...supplierPerformanceKeys.all,
      'comparison',
      orgId,
      category,
      dateRange,
    ] as const,
  evaluations: (supplierId: string) =>
    [...supplierPerformanceKeys.all, 'evaluations', supplierId] as const,
  evaluation: (evaluationId: string) =>
    [...supplierPerformanceKeys.all, 'evaluation', evaluationId] as const,
  issues: (supplierId: string, status?: string) =>
    [...supplierPerformanceKeys.all, 'issues', supplierId, status] as const,
  orgIssues: (orgId: string, filters?: any) =>
    [...supplierPerformanceKeys.all, 'org-issues', orgId, filters] as const,
  trends: (supplierId: string, months: number) =>
    [...supplierPerformanceKeys.all, 'trends', supplierId, months] as const,
  topPerformers: (orgId: string, limit: number, dateRange?: any) =>
    [
      ...supplierPerformanceKeys.all,
      'top-performers',
      orgId,
      limit,
      dateRange,
    ] as const,
  underperformers: (orgId: string, threshold: number, dateRange?: any) =>
    [
      ...supplierPerformanceKeys.all,
      'underperformers',
      orgId,
      threshold,
      dateRange,
    ] as const,
};

/**
 * Hook to get supplier performance metrics
 */
export function useSupplierPerformance(
  supplierId: string,
  dateRange?: { from: string; to: string },
  enabled = true,
) {
  return useQuery({
    queryKey: supplierPerformanceKeys.metrics(supplierId, dateRange),
    queryFn: () =>
      SupplierPerformanceService.getSupplierPerformance(supplierId, dateRange),
    enabled: enabled && !!supplierId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get all suppliers performance
 */
export function useAllSuppliersPerformance(
  dateRange?: { from: string; to: string },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: supplierPerformanceKeys.allMetrics(organizationId, dateRange),
    queryFn: () =>
      SupplierPerformanceService.getAllSuppliersPerformance(
        organizationId,
        dateRange,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to compare suppliers
 */
export function useCompareSuppliers(
  category?: string,
  dateRange?: { from: string; to: string },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: supplierPerformanceKeys.comparison(
      organizationId,
      category,
      dateRange,
    ),
    queryFn: () =>
      SupplierPerformanceService.compareSuppliers(
        organizationId,
        category,
        dateRange,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get supplier evaluations
 */
export function useSupplierEvaluations(supplierId: string, enabled = true) {
  return useQuery({
    queryKey: supplierPerformanceKeys.evaluations(supplierId),
    queryFn: () =>
      SupplierPerformanceService.getSupplierEvaluations(supplierId),
    enabled: enabled && !!supplierId,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Hook to get evaluation by ID
 */
export function useEvaluation(evaluationId: string, enabled = true) {
  return useQuery({
    queryKey: supplierPerformanceKeys.evaluation(evaluationId),
    queryFn: () => SupplierPerformanceService.getEvaluation(evaluationId),
    enabled: enabled && !!evaluationId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to create supplier evaluation
 */
export function useCreateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEvaluationDTO) =>
      SupplierPerformanceService.createEvaluation(data),
    onSuccess: (evaluation) => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.evaluations(evaluation.supplier_id),
      });
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.metrics(evaluation.supplier_id),
      });
      toast.success('Evaluación creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al crear evaluación',
      );
    },
  });
}

/**
 * Hook to update supplier evaluation
 */
export function useUpdateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateEvaluationDTO>;
    }) => SupplierPerformanceService.updateEvaluation(id, data),
    onSuccess: (evaluation) => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.evaluations(evaluation.supplier_id),
      });
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.evaluation(evaluation.id),
      });
      toast.success('Evaluación actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar evaluación',
      );
    },
  });
}

/**
 * Hook to delete supplier evaluation
 */
export function useDeleteEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SupplierPerformanceService.deleteEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.all,
      });
      toast.success('Evaluación eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al eliminar evaluación',
      );
    },
  });
}

/**
 * Hook to get supplier issues
 */
export function useSupplierIssues(
  supplierId: string,
  status?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: supplierPerformanceKeys.issues(supplierId, status),
    queryFn: () =>
      SupplierPerformanceService.getSupplierIssues(supplierId, status),
    enabled: enabled && !!supplierId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get organization issues
 */
export function useOrganizationIssues(
  filters?: {
    supplier_id?: string;
    status?: string;
    severity?: string;
    issue_type?: string;
  },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: supplierPerformanceKeys.orgIssues(organizationId, filters),
    queryFn: () =>
      SupplierPerformanceService.getOrganizationIssues(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to create supplier issue
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIssueDTO) =>
      SupplierPerformanceService.createIssue(data),
    onSuccess: (issue) => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.issues(issue.supplier_id),
      });
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.orgIssues(issue.organization_id),
      });
      toast.success('Incidencia reportada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al reportar incidencia',
      );
    },
  });
}

/**
 * Hook to update supplier issue
 */
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateIssueDTO> }) =>
      SupplierPerformanceService.updateIssue(id, data),
    onSuccess: (issue) => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.issues(issue.supplier_id),
      });
      toast.success('Incidencia actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar incidencia',
      );
    },
  });
}

/**
 * Hook to resolve supplier issue
 */
export function useResolveIssue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      SupplierPerformanceService.resolveIssue(id, resolution, user?.id || ''),
    onSuccess: (issue) => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.issues(issue.supplier_id),
      });
      toast.success('Incidencia resuelta exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al resolver incidencia',
      );
    },
  });
}

/**
 * Hook to close supplier issue
 */
export function useCloseIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SupplierPerformanceService.closeIssue(id),
    onSuccess: (issue) => {
      queryClient.invalidateQueries({
        queryKey: supplierPerformanceKeys.issues(issue.supplier_id),
      });
      toast.success('Incidencia cerrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al cerrar incidencia',
      );
    },
  });
}

/**
 * Hook to get performance trends
 */
export function usePerformanceTrends(
  supplierId: string,
  months: number = 12,
  enabled = true,
) {
  return useQuery({
    queryKey: supplierPerformanceKeys.trends(supplierId, months),
    queryFn: () =>
      SupplierPerformanceService.getPerformanceTrends(supplierId, months),
    enabled: enabled && !!supplierId,
    staleTime: 600000, // 10 minutes
  });
}

/**
 * Hook to get top performing suppliers
 */
export function useTopPerformers(
  limit: number = 10,
  dateRange?: { from: string; to: string },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: supplierPerformanceKeys.topPerformers(
      organizationId,
      limit,
      dateRange,
    ),
    queryFn: () =>
      SupplierPerformanceService.getTopPerformers(
        organizationId,
        limit,
        dateRange,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get underperforming suppliers
 */
export function useUnderperformers(
  threshold: number = 3.0,
  dateRange?: { from: string; to: string },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: supplierPerformanceKeys.underperformers(
      organizationId,
      threshold,
      dateRange,
    ),
    queryFn: () =>
      SupplierPerformanceService.getUnderperformers(
        organizationId,
        threshold,
        dateRange,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Utility hook to get score badge color
 */
export function useScoreBadge(score: number): {
  color: string;
  bgColor: string;
  label: string;
} {
  if (score >= 4.5) {
    return {
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      label: 'Excelente',
    };
  } else if (score >= 4.0) {
    return {
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
      label: 'Muy Bueno',
    };
  } else if (score >= 3.5) {
    return {
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      label: 'Bueno',
    };
  } else if (score >= 3.0) {
    return {
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      label: 'Regular',
    };
  } else {
    return {
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      label: 'Deficiente',
    };
  }
}

/**
 * Utility hook to get issue severity badge
 */
export function useIssueSeverityBadge(severity: string): {
  color: string;
  bgColor: string;
  label: string;
} {
  const severityMap: Record<
    string,
    { color: string; bgColor: string; label: string }
  > = {
    low: {
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      label: 'Baja',
    },
    medium: {
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      label: 'Media',
    },
    high: {
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      label: 'Alta',
    },
    critical: {
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      label: 'Crítica',
    },
  };

  return (
    severityMap[severity] || {
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      label: severity,
    }
  );
}
