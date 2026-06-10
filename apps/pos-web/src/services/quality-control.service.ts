/**
 * CoffeeOS - Quality Control Service
 * Servicio para control de calidad y cumplimiento NOM-251
 */

import { api } from '@/lib/api';

// ============= CHECKLISTS =============

export interface ChecklistTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type:
    | 'opening'
    | 'closing'
    | 'cleaning'
    | 'equipment'
    | 'food_safety'
    | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  items: ChecklistItem[];
  required_roles?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  order: number;
  category: string;
  task: string;
  description?: string;
  is_critical: boolean;
  requires_photo?: boolean;
  requires_notes?: boolean;
  acceptable_values?: string[];
}

export interface ChecklistExecution {
  id: string;
  organization_id: string;
  location_id?: string;
  template_id: string;
  template_name: string;
  executed_by: string;
  executed_by_name?: string;
  execution_date: string;
  start_time: string;
  end_time?: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  items_completed: ChecklistItemCompletion[];
  overall_score: number;
  critical_failures: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemCompletion {
  item_id: string;
  task: string;
  completed: boolean;
  value?: string;
  notes?: string;
  photo_url?: string;
  completed_at?: string;
  is_critical: boolean;
  passed: boolean;
}

export interface CreateChecklistExecutionDTO {
  organization_id: string;
  location_id?: string;
  template_id: string;
  executed_by: string;
  execution_date: string;
}

export interface UpdateChecklistExecutionDTO {
  items_completed?: ChecklistItemCompletion[];
  status?: ChecklistExecution['status'];
  end_time?: string;
  notes?: string;
}

// ============= TEMPERATURE LOGS =============

export interface TemperatureLog {
  id: string;
  organization_id: string;
  location_id?: string;
  equipment_type:
    | 'refrigerator'
    | 'freezer'
    | 'hot_holding'
    | 'cold_holding'
    | 'other';
  equipment_name: string;
  temperature: number;
  unit: 'celsius' | 'fahrenheit';
  min_acceptable: number;
  max_acceptable: number;
  is_within_range: boolean;
  recorded_by: string;
  recorded_by_name?: string;
  recorded_at: string;
  photo_url?: string;
  notes?: string;
  corrective_action?: string;
  created_at: string;
}

export interface CreateTemperatureLogDTO {
  organization_id: string;
  location_id?: string;
  equipment_type: TemperatureLog['equipment_type'];
  equipment_name: string;
  temperature: number;
  unit?: 'celsius' | 'fahrenheit';
  min_acceptable: number;
  max_acceptable: number;
  recorded_by: string;
  recorded_at: string;
  photo_url?: string;
  notes?: string;
  corrective_action?: string;
}

export interface TemperatureAlert {
  id: string;
  log_id: string;
  equipment_name: string;
  temperature: number;
  min_acceptable: number;
  max_acceptable: number;
  severity: 'warning' | 'critical';
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

// ============= COMPLIANCE & AUDIT =============

export interface ComplianceReport {
  period_start: string;
  period_end: string;
  organization_id: string;
  location_id?: string;

  // Checklists
  total_checklists: number;
  completed_checklists: number;
  failed_checklists: number;
  compliance_rate: number;
  critical_failures: number;

  // Temperature Monitoring
  total_temp_logs: number;
  out_of_range_logs: number;
  temp_compliance_rate: number;
  critical_temp_violations: number;

  // Overall Score
  overall_compliance_score: number;
  nom251_compliant: boolean;

  // Issues
  open_issues: number;
  resolved_issues: number;

  // Trends
  trend: 'improving' | 'stable' | 'declining';
  previous_score?: number;
}

export interface CorrectiveAction {
  id: string;
  organization_id: string;
  location_id?: string;
  issue_type:
    | 'temperature'
    | 'checklist'
    | 'food_safety'
    | 'equipment'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  root_cause?: string;
  corrective_action: string;
  preventive_action?: string;
  responsible_person: string;
  due_date: string;
  status: 'open' | 'in_progress' | 'completed' | 'verified';
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCorrectiveActionDTO {
  organization_id: string;
  location_id?: string;
  issue_type: CorrectiveAction['issue_type'];
  severity: CorrectiveAction['severity'];
  description: string;
  root_cause?: string;
  corrective_action: string;
  preventive_action?: string;
  responsible_person: string;
  due_date: string;
  created_by: string;
}

export interface AuditTrail {
  id: string;
  organization_id: string;
  entity_type: 'checklist' | 'temperature' | 'corrective_action' | 'compliance';
  entity_id: string;
  action: 'created' | 'updated' | 'completed' | 'failed' | 'deleted';
  performed_by: string;
  performed_by_name?: string;
  performed_at: string;
  changes?: Record<string, any>;
  notes?: string;
}

export class QualityControlService {
  // ============= CHECKLIST TEMPLATES =============

  static async getChecklistTemplates(
    organizationId: string,
  ): Promise<ChecklistTemplate[]> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/checklist-templates`,
    );
    return response?.data ?? response;
  }

  static async getChecklistTemplate(
    templateId: string,
  ): Promise<ChecklistTemplate> {
    return await api.get<ChecklistTemplate>(
      `/quality-control/checklist-templates/${templateId}`,
    );
  }

  static async createChecklistTemplate(
    data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ChecklistTemplate> {
    const response = await api.post<any>('/quality/checklist-templates', data);
    return response?.data ?? response;
  }

  static async updateChecklistTemplate(
    templateId: string,
    data: Partial<ChecklistTemplate>,
  ): Promise<ChecklistTemplate> {
    return await api.put<ChecklistTemplate>(
      `/quality-control/checklist-templates/${templateId}`,
      data,
    );
  }

  static async deleteChecklistTemplate(templateId: string): Promise<void> {
    await api.delete(`/quality-control/checklist-templates/${templateId}`);
  }

  // ============= CHECKLIST EXECUTIONS =============

  static async getChecklistExecutions(
    organizationId: string,
    filters?: {
      template_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<ChecklistExecution[]> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/checklist-executions`,
      filters ? { params: filters } : undefined,
    );
    return response?.data ?? response;
  }

  static async getChecklistExecution(
    executionId: string,
  ): Promise<ChecklistExecution> {
    return await api.get<ChecklistExecution>(
      `/quality-control/checklist-executions/${executionId}`,
    );
  }

  static async createChecklistExecution(
    data: CreateChecklistExecutionDTO,
  ): Promise<ChecklistExecution> {
    return await api.post<ChecklistExecution>(
      '/quality-control/checklist-executions',
      data,
    );
  }

  static async updateChecklistExecution(
    executionId: string,
    data: UpdateChecklistExecutionDTO,
  ): Promise<ChecklistExecution> {
    return await api.put<ChecklistExecution>(
      `/quality-control/checklist-executions/${executionId}`,
      data,
    );
  }

  static async completeChecklistExecution(
    executionId: string,
  ): Promise<ChecklistExecution> {
    const response = await api.post<any>(
      `/quality/checklist-executions/${executionId}/complete`,
    );
    return response?.data ?? response;
  }

  // ============= TEMPERATURE LOGS =============

  static async getTemperatureLogs(
    organizationId: string,
    filters?: {
      equipment_type?: string;
      date_from?: string;
      date_to?: string;
      out_of_range_only?: boolean;
    },
  ): Promise<TemperatureLog[]> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/temperature-logs`,
      filters ? { params: filters } : undefined,
    );
    return response?.data ?? response;
  }

  static async createTemperatureLog(
    data: CreateTemperatureLogDTO,
  ): Promise<TemperatureLog> {
    const response = await api.post<any>('/quality/temperature-logs', data);
    return response?.data ?? response;
  }

  static async getTemperatureAlerts(
    organizationId: string,
    acknowledged?: boolean,
  ): Promise<TemperatureAlert[]> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/temperature-alerts`,
      acknowledged !== undefined ? { params: { acknowledged } } : undefined,
    );
    return response?.data ?? response;
  }

  static async acknowledgeTemperatureAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<TemperatureAlert> {
    return await api.post<TemperatureAlert>(
      `/quality-control/temperature-alerts/${alertId}/acknowledge`,
      { acknowledged_by: acknowledgedBy },
    );
  }

  // ============= COMPLIANCE & REPORTING =============

  static async getComplianceReport(
    organizationId: string,
    dateRange: { from: string; to: string },
  ): Promise<ComplianceReport> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/compliance-report`,
      { params: dateRange },
    );
    return response?.data ?? response;
  }

  static async getCorrectiveActions(
    organizationId: string,
    filters?: {
      status?: string;
      severity?: string;
      issue_type?: string;
    },
  ): Promise<CorrectiveAction[]> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/corrective-actions`,
      filters ? { params: filters } : undefined,
    );
    return response?.data ?? response;
  }

  static async createCorrectiveAction(
    data: CreateCorrectiveActionDTO,
  ): Promise<CorrectiveAction> {
    const response = await api.post<any>('/quality/corrective-actions', data);
    return response?.data ?? response;
  }

  static async updateCorrectiveAction(
    actionId: string,
    data: Partial<CreateCorrectiveActionDTO>,
  ): Promise<CorrectiveAction> {
    return await api.put<CorrectiveAction>(
      `/quality-control/corrective-actions/${actionId}`,
      data,
    );
  }

  static async completeCorrectiveAction(
    actionId: string,
    verificationNotes: string,
    verifiedBy?: string,
  ): Promise<CorrectiveAction> {
    const response = await api.post<any>(
      `/quality/corrective-actions/${actionId}/complete`,
      {
        verification_notes: verificationNotes,
        verified_by: verifiedBy,
      },
    );
    return response?.data ?? response;
  }

  static async getAuditTrail(
    organizationId: string,
    filters?: {
      entity_type?: string;
      entity_id?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<AuditTrail[]> {
    let url = `/quality-control/organizations/${organizationId}/audit-trail`;
    const params = new URLSearchParams();

    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.entity_id) params.append('entity_id', filters.entity_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    if (params.toString()) url += `?${params.toString()}`;

    return await api.get<AuditTrail[]>(url);
  }

  // ============= NOM-251 SPECIFIC =============

  static async getNOM251ComplianceStatus(organizationId: string): Promise<{
    compliant: boolean;
    score: number;
    requirements: {
      category: string;
      requirement: string;
      status: 'compliant' | 'non_compliant' | 'partial';
      evidence?: string;
      last_verified?: string;
    }[];
    recommendations: string[];
  }> {
    const response = await api.get<any>(
      `/organizations/${organizationId}/quality/nom251-status`,
    );
    const data = response?.data ?? response;
    return {
      ...data,
      score: data.score ?? data.compliance_score,
    };
  }

  static async generateNOM251Report(
    organizationId: string,
    dateRange: { from: string; to: string },
  ): Promise<Blob> {
    const response = await fetch(
      `/api/quality-control/organizations/${organizationId}/nom251-report?from=${dateRange.from}&to=${dateRange.to}`,
    );
    return await response.blob();
  }
}
