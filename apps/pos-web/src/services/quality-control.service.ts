/**
 * CoffeeOS - Quality Control Service
 * Servicio para control de calidad y cumplimiento NOM-251.
 *
 * Backend real (apps/api/src/modules/quality):
 * - GET/POST /quality/temperature-logs, GET /quality/temperature-logs/alerts,
 *   GET /quality/temperature-logs/stats, GET/DELETE /quality/temperature-logs/:id
 * - GET/POST /quality/checklists, GET /quality/checklists/stats,
 *   GET /quality/checklists/:id, PATCH /quality/checklists/:id/complete,
 *   DELETE /quality/checklists/:id
 * - GET /quality/food-safety/incidents (solo lectura, sin persistencia aún)
 *
 * NO existe backend para: checklist-templates, checklist-executions,
 * temperature-alerts acknowledge, compliance-report, corrective-actions,
 * audit-trail ni nom251-status/report. Esos métodos lanzan un Error explícito
 * en lugar de pegar a rutas fantasma (404 silencioso).
 */

import { api, buildQueryString } from '@/lib/api';

const NOT_IMPLEMENTED = (feature: string) =>
  new Error(
    `Módulo en construcción: el backend de ${feature} aún no existe en CoffeeOS API.`,
  );

// ============= CHECKLISTS (backend real: /quality/checklists) =============

export type ChecklistType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export type ChecklistCategory =
  | 'CLEANING'
  | 'FOOD_SAFETY'
  | 'EQUIPMENT'
  | 'PERSONNEL'
  | 'HYGIENE'
  | 'TEMPERATURE'
  | 'STORAGE'
  | 'WASTE';

export interface ChecklistItem {
  id: string;
  description: string;
  category: ChecklistCategory | null;
  regulation_reference?: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  completion_notes?: string;
  photo_url?: string;
}

export interface Checklist {
  id: string;
  name: string;
  type: ChecklistType;
  location_id: string;
  organization_id: string;
  scheduled_date?: string;
  description?: string;
  items: ChecklistItem[];
  completed: boolean;
  completed_at?: string;
  completed_by_user_id?: string;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistDTO {
  name: string;
  type: ChecklistType;
  location_id: string;
  organization_id: string;
  items: {
    description: string;
    category: ChecklistCategory;
    regulation_reference?: string;
    notes?: string;
  }[];
  scheduled_date?: string;
  description?: string;
}

export interface CompleteChecklistDTO {
  completed_by_user_id: string;
  items: {
    item_id: string;
    completed: boolean;
    notes?: string;
    photo_url?: string;
  }[];
  general_notes?: string;
}

// ============= LEGACY TYPES (sin backend — se mantienen para los hooks) ====

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
  items: any[];
  required_roles?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
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

// ============= TEMPERATURE LOGS (backend real) =============

export type TemperatureType =
  | 'REFRIGERATOR'
  | 'FREEZER'
  | 'HOT_HOLDING'
  | 'COLD_HOLDING'
  | 'COOKING'
  | 'COOLING'
  | 'RECEIVING';

export type TemperatureUnit = 'CELSIUS' | 'FAHRENHEIT';

/** Shape real devuelto por GET /quality/temperature-logs. */
export interface TemperatureLog {
  id: string;
  location_id: string;
  organization_id: string;
  type: TemperatureType;
  temperature: number;
  unit: TemperatureUnit;
  equipment_name: string;
  product_name?: string;
  location_detail?: string;
  recorded_by_user_id: string;
  recorded_at: string;
  notes?: string;
  is_within_range: boolean;
  alert_triggered: boolean;
  created_at: string;
}

/** DTO real de POST /quality/temperature-logs (CreateTemperatureLogDto). */
export interface CreateTemperatureLogDTO {
  location_id: string;
  organization_id: string;
  type: TemperatureType;
  temperature: number;
  unit: TemperatureUnit;
  equipment_name: string;
  product_name?: string;
  location_detail?: string;
  recorded_by_user_id: string;
  recorded_at?: string;
  notes?: string;
}

export interface TemperatureLogFilters {
  location_id?: string;
  type?: TemperatureType;
  start_date?: string;
  end_date?: string;
  equipment_name?: string;
}

// ============= COMPLIANCE & AUDIT (sin backend) =============

export interface ComplianceReport {
  period_start: string;
  period_end: string;
  organization_id: string;
  location_id?: string;
  total_checklists: number;
  completed_checklists: number;
  failed_checklists: number;
  compliance_rate: number;
  critical_failures: number;
  total_temp_logs: number;
  out_of_range_logs: number;
  temp_compliance_rate: number;
  critical_temp_violations: number;
  overall_compliance_score: number;
  nom251_compliant: boolean;
  open_issues: number;
  resolved_issues: number;
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
  // ============= CHECKLISTS (backend real) =============

  static async getChecklists(
    organizationId: string,
    filters?: {
      location_id?: string;
      type?: ChecklistType;
      category?: ChecklistCategory;
      start_date?: string;
      end_date?: string;
      completed?: boolean;
    },
  ): Promise<Checklist[]> {
    const query = buildQueryString({
      organization_id: organizationId,
      ...filters,
      completed:
        filters?.completed !== undefined
          ? String(filters.completed)
          : undefined,
    });
    return await api.get<Checklist[]>(`/quality/checklists${query}`);
  }

  static async getChecklist(checklistId: string): Promise<Checklist> {
    return await api.get<Checklist>(`/quality/checklists/${checklistId}`);
  }

  static async createChecklist(data: CreateChecklistDTO): Promise<Checklist> {
    return await api.post<Checklist>('/quality/checklists', data);
  }

  static async completeChecklist(
    checklistId: string,
    data: CompleteChecklistDTO,
  ): Promise<Checklist> {
    return await api.patch<Checklist>(
      `/quality/checklists/${checklistId}/complete`,
      data,
    );
  }

  static async deleteChecklist(checklistId: string): Promise<void> {
    await api.delete(`/quality/checklists/${checklistId}`);
  }

  static async getChecklistComplianceStats(
    organizationId: string,
    locationId?: string,
  ): Promise<any> {
    const query = buildQueryString({
      organization_id: organizationId,
      location_id: locationId,
    });
    return await api.get<any>(`/quality/checklists/stats${query}`);
  }

  // ============= CHECKLIST TEMPLATES (sin backend) =============

  // TODO(backend): implementar /quality/checklist-templates en la API.
  static async getChecklistTemplates(
    _organizationId: string,
  ): Promise<ChecklistTemplate[]> {
    throw NOT_IMPLEMENTED('plantillas de checklist');
  }

  // TODO(backend): implementar /quality/checklist-templates/:id en la API.
  static async getChecklistTemplate(
    _templateId: string,
  ): Promise<ChecklistTemplate> {
    throw NOT_IMPLEMENTED('plantillas de checklist');
  }

  // TODO(backend): implementar POST /quality/checklist-templates en la API.
  static async createChecklistTemplate(
    _data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ChecklistTemplate> {
    throw NOT_IMPLEMENTED('plantillas de checklist');
  }

  // TODO(backend): implementar PUT /quality/checklist-templates/:id en la API.
  static async updateChecklistTemplate(
    _templateId: string,
    _data: Partial<ChecklistTemplate>,
  ): Promise<ChecklistTemplate> {
    throw NOT_IMPLEMENTED('plantillas de checklist');
  }

  // TODO(backend): implementar DELETE /quality/checklist-templates/:id.
  static async deleteChecklistTemplate(_templateId: string): Promise<void> {
    throw NOT_IMPLEMENTED('plantillas de checklist');
  }

  // ============= CHECKLIST EXECUTIONS (sin backend) =============

  // TODO(backend): implementar /quality/checklist-executions en la API.
  static async getChecklistExecutions(
    _organizationId: string,
    _filters?: {
      template_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<ChecklistExecution[]> {
    throw NOT_IMPLEMENTED('ejecuciones de checklist');
  }

  // TODO(backend): implementar /quality/checklist-executions/:id en la API.
  static async getChecklistExecution(
    _executionId: string,
  ): Promise<ChecklistExecution> {
    throw NOT_IMPLEMENTED('ejecuciones de checklist');
  }

  // TODO(backend): implementar POST /quality/checklist-executions en la API.
  static async createChecklistExecution(
    _data: CreateChecklistExecutionDTO,
  ): Promise<ChecklistExecution> {
    throw NOT_IMPLEMENTED('ejecuciones de checklist');
  }

  // TODO(backend): implementar PUT /quality/checklist-executions/:id.
  static async updateChecklistExecution(
    _executionId: string,
    _data: UpdateChecklistExecutionDTO,
  ): Promise<ChecklistExecution> {
    throw NOT_IMPLEMENTED('ejecuciones de checklist');
  }

  // TODO(backend): implementar POST /quality/checklist-executions/:id/complete.
  static async completeChecklistExecution(
    _executionId: string,
  ): Promise<ChecklistExecution> {
    throw NOT_IMPLEMENTED('ejecuciones de checklist');
  }

  // ============= TEMPERATURE LOGS (backend real) =============

  static async getTemperatureLogs(
    organizationId: string,
    filters?: TemperatureLogFilters,
  ): Promise<TemperatureLog[]> {
    const query = buildQueryString({
      organization_id: organizationId,
      ...filters,
    });
    return await api.get<TemperatureLog[]>(`/quality/temperature-logs${query}`);
  }

  static async createTemperatureLog(
    data: CreateTemperatureLogDTO,
  ): Promise<TemperatureLog> {
    return await api.post<TemperatureLog>('/quality/temperature-logs', data);
  }

  /**
   * GET /quality/temperature-logs/alerts — devuelve los TemperatureLog con
   * alert_triggered=true (no existe un modelo de "alerta" separado).
   */
  static async getTemperatureAlerts(
    organizationId: string,
    locationId?: string,
  ): Promise<TemperatureLog[]> {
    const query = buildQueryString({
      organization_id: organizationId,
      location_id: locationId,
    });
    return await api.get<TemperatureLog[]>(
      `/quality/temperature-logs/alerts${query}`,
    );
  }

  static async getTemperatureStats(
    organizationId: string,
    locationId?: string,
  ): Promise<any> {
    const query = buildQueryString({
      organization_id: organizationId,
      location_id: locationId,
    });
    return await api.get<any>(`/quality/temperature-logs/stats${query}`);
  }

  // TODO(backend): no existe acknowledge de alertas (las alertas son logs).
  static async acknowledgeTemperatureAlert(
    _alertId: string,
    _acknowledgedBy: string,
  ): Promise<TemperatureLog> {
    throw NOT_IMPLEMENTED('reconocimiento de alertas de temperatura');
  }

  // ============= COMPLIANCE & REPORTING (sin backend) =============

  // TODO(backend): implementar el reporte de cumplimiento en la API.
  static async getComplianceReport(
    _organizationId: string,
    _dateRange: { from: string; to: string },
  ): Promise<ComplianceReport> {
    throw NOT_IMPLEMENTED('reportes de cumplimiento');
  }

  // TODO(backend): implementar /quality/corrective-actions en la API.
  static async getCorrectiveActions(
    _organizationId: string,
    _filters?: {
      status?: string;
      severity?: string;
      issue_type?: string;
    },
  ): Promise<CorrectiveAction[]> {
    throw NOT_IMPLEMENTED('acciones correctivas');
  }

  // TODO(backend): implementar POST /quality/corrective-actions en la API.
  static async createCorrectiveAction(
    _data: CreateCorrectiveActionDTO,
  ): Promise<CorrectiveAction> {
    throw NOT_IMPLEMENTED('acciones correctivas');
  }

  // TODO(backend): implementar PUT /quality/corrective-actions/:id en la API.
  static async updateCorrectiveAction(
    _actionId: string,
    _data: Partial<CreateCorrectiveActionDTO>,
  ): Promise<CorrectiveAction> {
    throw NOT_IMPLEMENTED('acciones correctivas');
  }

  // TODO(backend): implementar el complete de acciones correctivas en la API.
  static async completeCorrectiveAction(
    _actionId: string,
    _verificationNotes: string,
    _verifiedBy?: string,
  ): Promise<CorrectiveAction> {
    throw NOT_IMPLEMENTED('acciones correctivas');
  }

  // TODO(backend): implementar el audit-trail de calidad en la API.
  static async getAuditTrail(
    _organizationId: string,
    _filters?: {
      entity_type?: string;
      entity_id?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<AuditTrail[]> {
    throw NOT_IMPLEMENTED('audit trail de calidad');
  }

  // ============= NOM-251 SPECIFIC (sin backend) =============

  // TODO(backend): implementar el status NOM-251 en la API.
  static async getNOM251ComplianceStatus(_organizationId: string): Promise<{
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
    throw NOT_IMPLEMENTED('status de cumplimiento NOM-251');
  }

  // TODO(backend): implementar la generación del reporte NOM-251 en la API.
  static async generateNOM251Report(
    _organizationId: string,
    _dateRange: { from: string; to: string },
  ): Promise<Blob> {
    throw NOT_IMPLEMENTED('reportes NOM-251');
  }
}
