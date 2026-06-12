/**
 * CoffeeOS - Quality Control Hooks
 * React Query hooks para control de calidad y NOM-251
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChecklistCategory,
  ChecklistType,
  CompleteChecklistDTO,
  CreateChecklistDTO,
  CreateChecklistExecutionDTO,
  CreateCorrectiveActionDTO,
  CreateTemperatureLogDTO,
  QualityControlService,
  TemperatureLogFilters,
  UpdateChecklistExecutionDTO,
} from '@/services/quality-control.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

// Query keys
export const qualityControlKeys = {
  all: ['quality-control'] as const,

  // Checklists (backend real)
  checklists: (orgId: string, filters?: any) =>
    [...qualityControlKeys.all, 'checklists', orgId, filters] as const,
  checklistStats: (orgId: string, locationId?: string) =>
    [...qualityControlKeys.all, 'checklist-stats', orgId, locationId] as const,

  // Checklist templates
  templates: (orgId: string) =>
    [...qualityControlKeys.all, 'templates', orgId] as const,
  template: (templateId: string) =>
    [...qualityControlKeys.all, 'template', templateId] as const,

  // Checklist executions
  executions: (orgId: string, filters?: any) =>
    [...qualityControlKeys.all, 'executions', orgId, filters] as const,
  execution: (executionId: string) =>
    [...qualityControlKeys.all, 'execution', executionId] as const,

  // Temperature logs
  tempLogs: (orgId: string, filters?: any) =>
    [...qualityControlKeys.all, 'temp-logs', orgId, filters] as const,
  tempAlerts: (orgId: string, locationId?: string) =>
    [...qualityControlKeys.all, 'temp-alerts', orgId, locationId] as const,
  tempStats: (orgId: string, locationId?: string) =>
    [...qualityControlKeys.all, 'temp-stats', orgId, locationId] as const,

  // Compliance
  complianceReport: (orgId: string, dateRange: any) =>
    [...qualityControlKeys.all, 'compliance-report', orgId, dateRange] as const,
  nom251Status: (orgId: string) =>
    [...qualityControlKeys.all, 'nom251-status', orgId] as const,

  // Corrective actions
  correctiveActions: (orgId: string, filters?: any) =>
    [...qualityControlKeys.all, 'corrective-actions', orgId, filters] as const,

  // Audit trail
  auditTrail: (orgId: string, filters?: any) =>
    [...qualityControlKeys.all, 'audit-trail', orgId, filters] as const,
};

// ============= CHECKLISTS (backend real: /quality/checklists) =============

export function useChecklists(
  filters?: {
    location_id?: string;
    type?: ChecklistType;
    category?: ChecklistCategory;
    start_date?: string;
    end_date?: string;
    completed?: boolean;
  },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.checklists(organizationId, filters),
    queryFn: () => QualityControlService.getChecklists(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 60000, // 1 minute
  });
}

export function useChecklistStats(locationId?: string, enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.checklistStats(organizationId, locationId),
    queryFn: () =>
      QualityControlService.getChecklistComplianceStats(
        organizationId,
        locationId,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (data: Omit<CreateChecklistDTO, 'organization_id'>) =>
      QualityControlService.createChecklist({
        ...data,
        organization_id: organizationId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.checklists(organizationId),
      });
      toast.success('Checklist creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear checklist');
    },
  });
}

export function useCompleteChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteChecklistDTO }) =>
      QualityControlService.completeChecklist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.checklists(organizationId),
      });
      toast.success('Checklist completado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al completar checklist');
    },
  });
}

// ============= CHECKLIST TEMPLATES =============
// NOTA: el backend de templates/ejecuciones aún no existe. Estos hooks quedan
// para cuando se implemente; el service lanza un Error explícito hoy.

export function useChecklistTemplates(enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.templates(organizationId),
    queryFn: () => QualityControlService.getChecklistTemplates(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

export function useChecklistTemplate(templateId: string, enabled = true) {
  return useQuery({
    queryKey: qualityControlKeys.template(templateId),
    queryFn: () => QualityControlService.getChecklistTemplate(templateId),
    enabled: enabled && !!templateId,
    staleTime: 180000, // 3 minutes
  });
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (data: any) =>
      QualityControlService.createChecklistTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.templates(organizationId),
      });
      toast.success('Plantilla de checklist creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear plantilla');
    },
  });
}

export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      QualityControlService.updateChecklistTemplate(id, data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.templates(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.template(template.id),
      });
      toast.success('Plantilla actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar plantilla',
      );
    },
  });
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (id: string) =>
      QualityControlService.deleteChecklistTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.templates(organizationId),
      });
      toast.success('Plantilla eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al eliminar plantilla',
      );
    },
  });
}

// ============= CHECKLIST EXECUTIONS =============

export function useChecklistExecutions(
  filters?: {
    template_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.executions(organizationId, filters),
    queryFn: () =>
      QualityControlService.getChecklistExecutions(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 60000, // 1 minute
  });
}

export function useChecklistExecution(executionId: string, enabled = true) {
  return useQuery({
    queryKey: qualityControlKeys.execution(executionId),
    queryFn: () => QualityControlService.getChecklistExecution(executionId),
    enabled: enabled && !!executionId,
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateChecklistExecution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (
      data: Omit<
        CreateChecklistExecutionDTO,
        'organization_id' | 'executed_by'
      >,
    ) =>
      QualityControlService.createChecklistExecution({
        ...data,
        organization_id: organizationId,
        executed_by: user?.id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.executions(organizationId),
      });
      toast.success('Checklist iniciado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al iniciar checklist',
      );
    },
  });
}

export function useUpdateChecklistExecution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateChecklistExecutionDTO;
    }) => QualityControlService.updateChecklistExecution(id, data),
    onSuccess: (execution) => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.executions(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.execution(execution.id),
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar checklist',
      );
    },
  });
}

export function useCompleteChecklistExecution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (id: string) =>
      QualityControlService.completeChecklistExecution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.executions(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.complianceReport(
          organizationId,
          undefined,
        ),
      });
      toast.success('Checklist completado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al completar checklist',
      );
    },
  });
}

// ============= TEMPERATURE LOGS =============

export function useTemperatureLogs(
  filters?: TemperatureLogFilters,
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.tempLogs(organizationId, filters),
    queryFn: () =>
      QualityControlService.getTemperatureLogs(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 60000, // 1 minute
  });
}

export function useCreateTemperatureLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (
      data: Omit<
        CreateTemperatureLogDTO,
        'organization_id' | 'recorded_by_user_id'
      >,
    ) =>
      QualityControlService.createTemperatureLog({
        ...data,
        organization_id: organizationId,
        recorded_by_user_id: user?.id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.tempLogs(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.tempAlerts(organizationId),
      });
      toast.success('Temperatura registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al registrar temperatura',
      );
    },
  });
}

export function useTemperatureAlerts(locationId?: string, enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.tempAlerts(organizationId, locationId),
    queryFn: () =>
      QualityControlService.getTemperatureAlerts(organizationId, locationId),
    enabled: enabled && !!organizationId,
    staleTime: 30000, // 30 seconds
  });
}

export function useTemperatureStats(locationId?: string, enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.tempStats(organizationId, locationId),
    queryFn: () =>
      QualityControlService.getTemperatureStats(organizationId, locationId),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

export function useAcknowledgeTemperatureAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (alertId: string) =>
      QualityControlService.acknowledgeTemperatureAlert(
        alertId,
        user?.id || '',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.tempAlerts(organizationId),
      });
      toast.success('Alerta reconocida');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al reconocer alerta',
      );
    },
  });
}

// ============= COMPLIANCE & REPORTING =============

export function useComplianceReport(
  dateRange: { from: string; to: string },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.complianceReport(organizationId, dateRange),
    queryFn: () =>
      QualityControlService.getComplianceReport(organizationId, dateRange),
    enabled: enabled && !!organizationId && !!dateRange.from && !!dateRange.to,
    staleTime: 300000, // 5 minutes
  });
}

export function useNOM251Status(enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.nom251Status(organizationId),
    queryFn: () =>
      QualityControlService.getNOM251ComplianceStatus(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 600000, // 10 minutes
  });
}

export function useGenerateNOM251Report() {
  return useMutation({
    mutationFn: ({
      organizationId,
      dateRange,
    }: {
      organizationId: string;
      dateRange: { from: string; to: string };
    }) => QualityControlService.generateNOM251Report(organizationId, dateRange),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-nom251-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Reporte NOM-251 generado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al generar reporte');
    },
  });
}

// ============= CORRECTIVE ACTIONS =============

export function useCorrectiveActions(
  filters?: {
    status?: string;
    severity?: string;
    issue_type?: string;
  },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.correctiveActions(organizationId, filters),
    queryFn: () =>
      QualityControlService.getCorrectiveActions(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 120000, // 2 minutes
  });
}

export function useCreateCorrectiveAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (
      data: Omit<CreateCorrectiveActionDTO, 'organization_id' | 'created_by'>,
    ) =>
      QualityControlService.createCorrectiveAction({
        ...data,
        organization_id: organizationId,
        created_by: user?.id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.correctiveActions(organizationId),
      });
      toast.success('Acción correctiva creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al crear acción correctiva',
      );
    },
  });
}

export function useUpdateCorrectiveAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      QualityControlService.updateCorrectiveAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.correctiveActions(organizationId),
      });
      toast.success('Acción correctiva actualizada');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          'Error al actualizar acción correctiva',
      );
    },
  });
}

export function useCompleteCorrectiveAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({
      id,
      verificationNotes,
    }: {
      id: string;
      verificationNotes: string;
    }) => QualityControlService.completeCorrectiveAction(id, verificationNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qualityControlKeys.correctiveActions(organizationId),
      });
      toast.success('Acción correctiva completada y verificada');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          'Error al completar acción correctiva',
      );
    },
  });
}

// ============= AUDIT TRAIL =============

export function useAuditTrail(
  filters?: {
    entity_type?: string;
    entity_id?: string;
    date_from?: string;
    date_to?: string;
  },
  enabled = true,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: qualityControlKeys.auditTrail(organizationId, filters),
    queryFn: () => QualityControlService.getAuditTrail(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

// ============= UTILITY HOOKS =============

export function useSeverityBadge(severity: string): {
  color: string;
  bgColor: string;
  label: string;
} {
  const severityMap: Record<
    string,
    { color: string; bgColor: string; label: string }
  > = {
    low: { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'Baja' },
    medium: {
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      label: 'Media',
    },
    high: { color: 'text-orange-800', bgColor: 'bg-orange-100', label: 'Alta' },
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

export function useComplianceScoreBadge(score: number): {
  color: string;
  bgColor: string;
  label: string;
} {
  if (score >= 95) {
    return {
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      label: 'Excelente',
    };
  } else if (score >= 85) {
    return {
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
      label: 'Muy Bueno',
    };
  } else if (score >= 75) {
    return {
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      label: 'Bueno',
    };
  } else if (score >= 60) {
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
