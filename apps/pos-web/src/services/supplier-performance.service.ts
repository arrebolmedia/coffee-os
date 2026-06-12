/**
 * CoffeeOS - Supplier Performance Service
 *
 * MÓDULO SIN BACKEND: no existe ningún controller /supplier-performance,
 * /supplier-evaluations ni /supplier-issues en CoffeeOS API. Los 17 métodos
 * lanzan un Error explícito en lugar de pegar a rutas fantasma (404
 * silencioso).
 *
 * TODO(backend): implementar los módulos supplier-performance /
 * supplier-evaluations / supplier-issues en apps/api y reconectar estos
 * métodos (las URLs originales quedaron documentadas en el historial de git).
 */

const NOT_IMPLEMENTED = (feature: string) =>
  new Error(
    `Módulo de desempeño de proveedores no disponible: el backend de ${feature} aún no existe en CoffeeOS API.`,
  );

export interface SupplierPerformanceMetrics {
  supplier_id: string;
  supplier_name: string;
  period_start: string;
  period_end: string;

  // Métricas de entrega
  total_orders: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_percentage: number;
  average_delay_days: number;

  // Métricas de calidad
  quality_score: number;
  defect_rate: number;
  return_rate: number;
  quality_issues: number;

  // Métricas financieras
  total_spent: number;
  average_order_value: number;
  payment_compliance: number;
  price_competitiveness: number;

  // Métricas de comunicación
  response_time_hours: number;
  communication_score: number;

  // Score general
  overall_score: number;
  rating: number;
  rank?: number;

  // Tendencia
  trend: 'improving' | 'stable' | 'declining';
  previous_score?: number;
}

export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  organization_id: string;
  evaluated_by: string;
  evaluation_date: string;
  period_start: string;
  period_end: string;

  // Criterios de evaluación (1-5)
  delivery_performance: number;
  product_quality: number;
  price_competitiveness: number;
  communication: number;
  flexibility: number;
  documentation: number;

  // Score total
  total_score: number;
  rating: number;

  comments?: string;
  strengths?: string[];
  areas_for_improvement?: string[];

  action_required: boolean;
  action_items?: string[];

  created_at: string;
  updated_at: string;
}

export interface CreateEvaluationDTO {
  supplier_id: string;
  organization_id: string;
  evaluated_by: string;
  evaluation_date: string;
  period_start: string;
  period_end: string;
  delivery_performance: number;
  product_quality: number;
  price_competitiveness: number;
  communication: number;
  flexibility: number;
  documentation: number;
  comments?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  action_required?: boolean;
  action_items?: string[];
}

export interface SupplierComparison {
  supplier_id: string;
  supplier_name: string;
  category: string;
  overall_score: number;
  delivery_score: number;
  quality_score: number;
  price_score: number;
  total_spent: number;
  total_orders: number;
  on_time_percentage: number;
}

export interface SupplierIssue {
  id: string;
  supplier_id: string;
  organization_id: string;
  purchase_order_id?: string;
  issue_type:
    | 'quality'
    | 'delivery'
    | 'pricing'
    | 'communication'
    | 'documentation'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reported_by: string;
  reported_date: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: string;
  resolved_by?: string;
  resolved_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIssueDTO {
  supplier_id: string;
  organization_id: string;
  purchase_order_id?: string;
  issue_type: SupplierIssue['issue_type'];
  severity: SupplierIssue['severity'];
  description: string;
  reported_by: string;
  reported_date: string;
}

export class SupplierPerformanceService {
  static async getSupplierPerformance(
    _supplierId: string,
    _dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics> {
    throw NOT_IMPLEMENTED('métricas de desempeño');
  }

  static async getAllSuppliersPerformance(
    _organizationId: string,
    _dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics[]> {
    throw NOT_IMPLEMENTED('métricas de desempeño');
  }

  static async compareSuppliers(
    _organizationId: string,
    _category?: string,
    _dateRange?: { from: string; to: string },
  ): Promise<SupplierComparison[]> {
    throw NOT_IMPLEMENTED('comparación de proveedores');
  }

  static async getSupplierEvaluations(
    _supplierId: string,
  ): Promise<SupplierEvaluation[]> {
    throw NOT_IMPLEMENTED('evaluaciones de proveedores');
  }

  static async getEvaluation(
    _evaluationId: string,
  ): Promise<SupplierEvaluation> {
    throw NOT_IMPLEMENTED('evaluaciones de proveedores');
  }

  static async createEvaluation(
    _data: CreateEvaluationDTO,
  ): Promise<SupplierEvaluation> {
    throw NOT_IMPLEMENTED('evaluaciones de proveedores');
  }

  static async updateEvaluation(
    _evaluationId: string,
    _data: Partial<CreateEvaluationDTO>,
  ): Promise<SupplierEvaluation> {
    throw NOT_IMPLEMENTED('evaluaciones de proveedores');
  }

  static async deleteEvaluation(_evaluationId: string): Promise<void> {
    throw NOT_IMPLEMENTED('evaluaciones de proveedores');
  }

  static async getSupplierIssues(
    _supplierId: string,
    _status?: string,
  ): Promise<SupplierIssue[]> {
    throw NOT_IMPLEMENTED('incidencias de proveedores');
  }

  static async getOrganizationIssues(
    _organizationId: string,
    _filters?: {
      supplier_id?: string;
      status?: string;
      severity?: string;
      issue_type?: string;
    },
  ): Promise<SupplierIssue[]> {
    throw NOT_IMPLEMENTED('incidencias de proveedores');
  }

  static async createIssue(_data: CreateIssueDTO): Promise<SupplierIssue> {
    throw NOT_IMPLEMENTED('incidencias de proveedores');
  }

  static async updateIssue(
    _issueId: string,
    _data: Partial<CreateIssueDTO>,
  ): Promise<SupplierIssue> {
    throw NOT_IMPLEMENTED('incidencias de proveedores');
  }

  static async resolveIssue(
    _issueId: string,
    _resolution: string,
    _resolvedBy: string,
  ): Promise<SupplierIssue> {
    throw NOT_IMPLEMENTED('incidencias de proveedores');
  }

  static async closeIssue(_issueId: string): Promise<SupplierIssue> {
    throw NOT_IMPLEMENTED('incidencias de proveedores');
  }

  static async getPerformanceTrends(
    _supplierId: string,
    _months: number = 12,
  ): Promise<
    {
      month: string;
      overall_score: number;
      delivery_score: number;
      quality_score: number;
      total_orders: number;
      total_spent: number;
    }[]
  > {
    throw NOT_IMPLEMENTED('tendencias de desempeño');
  }

  static async getTopPerformers(
    _organizationId: string,
    _limit: number = 10,
    _dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics[]> {
    throw NOT_IMPLEMENTED('ranking de proveedores');
  }

  static async getUnderperformers(
    _organizationId: string,
    _threshold: number = 3.0,
    _dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics[]> {
    throw NOT_IMPLEMENTED('ranking de proveedores');
  }
}
