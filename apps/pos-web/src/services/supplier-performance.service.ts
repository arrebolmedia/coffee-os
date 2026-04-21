/**
 * CoffeeOS - Supplier Performance Service
 * Servicio para evaluación de desempeño de proveedores
 */

import { api } from '@/lib/api';

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
  /**
   * Get supplier performance metrics
   */
  static async getSupplierPerformance(
    supplierId: string,
    dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics> {
    let url = `/supplier-performance/${supplierId}`;

    if (dateRange) {
      url += `?from=${dateRange.from}&to=${dateRange.to}`;
    }

    return await api.get<SupplierPerformanceMetrics>(url);
  }

  /**
   * Get all suppliers performance for organization
   */
  static async getAllSuppliersPerformance(
    organizationId: string,
    dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics[]> {
    let url = `/supplier-performance/organization/${organizationId}`;

    if (dateRange) {
      url += `?from=${dateRange.from}&to=${dateRange.to}`;
    }

    return await api.get<SupplierPerformanceMetrics[]>(url);
  }

  /**
   * Compare suppliers by category
   */
  static async compareSuppliers(
    organizationId: string,
    category?: string,
    dateRange?: { from: string; to: string },
  ): Promise<SupplierComparison[]> {
    let url = `/supplier-performance/organization/${organizationId}/compare`;
    const params = new URLSearchParams();

    if (category) params.append('category', category);
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return await api.get<SupplierComparison[]>(url);
  }

  /**
   * Get supplier evaluations
   */
  static async getSupplierEvaluations(
    supplierId: string,
  ): Promise<SupplierEvaluation[]> {
    return await api.get<SupplierEvaluation[]>(
      `/supplier-evaluations/supplier/${supplierId}`,
    );
  }

  /**
   * Get evaluation by ID
   */
  static async getEvaluation(
    evaluationId: string,
  ): Promise<SupplierEvaluation> {
    return await api.get<SupplierEvaluation>(
      `/supplier-evaluations/${evaluationId}`,
    );
  }

  /**
   * Create supplier evaluation
   */
  static async createEvaluation(
    data: CreateEvaluationDTO,
  ): Promise<SupplierEvaluation> {
    return await api.post<SupplierEvaluation>('/supplier-evaluations', data);
  }

  /**
   * Update supplier evaluation
   */
  static async updateEvaluation(
    evaluationId: string,
    data: Partial<CreateEvaluationDTO>,
  ): Promise<SupplierEvaluation> {
    return await api.put<SupplierEvaluation>(
      `/supplier-evaluations/${evaluationId}`,
      data,
    );
  }

  /**
   * Delete supplier evaluation
   */
  static async deleteEvaluation(evaluationId: string): Promise<void> {
    await api.delete(`/supplier-evaluations/${evaluationId}`);
  }

  /**
   * Get supplier issues
   */
  static async getSupplierIssues(
    supplierId: string,
    status?: string,
  ): Promise<SupplierIssue[]> {
    let url = `/supplier-issues/supplier/${supplierId}`;

    if (status) {
      url += `?status=${status}`;
    }

    return await api.get<SupplierIssue[]>(url);
  }

  /**
   * Get all issues for organization
   */
  static async getOrganizationIssues(
    organizationId: string,
    filters?: {
      supplier_id?: string;
      status?: string;
      severity?: string;
      issue_type?: string;
    },
  ): Promise<SupplierIssue[]> {
    let url = `/supplier-issues/organization/${organizationId}`;
    const params = new URLSearchParams();

    if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.issue_type) params.append('issue_type', filters.issue_type);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return await api.get<SupplierIssue[]>(url);
  }

  /**
   * Create supplier issue
   */
  static async createIssue(data: CreateIssueDTO): Promise<SupplierIssue> {
    return await api.post<SupplierIssue>('/supplier-issues', data);
  }

  /**
   * Update supplier issue
   */
  static async updateIssue(
    issueId: string,
    data: Partial<CreateIssueDTO>,
  ): Promise<SupplierIssue> {
    return await api.put<SupplierIssue>(`/supplier-issues/${issueId}`, data);
  }

  /**
   * Resolve supplier issue
   */
  static async resolveIssue(
    issueId: string,
    resolution: string,
    resolvedBy: string,
  ): Promise<SupplierIssue> {
    return await api.post<SupplierIssue>(
      `/supplier-issues/${issueId}/resolve`,
      {
        resolution,
        resolved_by: resolvedBy,
        resolved_date: new Date().toISOString(),
      },
    );
  }

  /**
   * Close supplier issue
   */
  static async closeIssue(issueId: string): Promise<SupplierIssue> {
    return await api.post<SupplierIssue>(
      `/supplier-issues/${issueId}/close`,
      {},
    );
  }

  /**
   * Get performance trends
   */
  static async getPerformanceTrends(
    supplierId: string,
    months: number = 12,
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
    return await api.get(
      `/supplier-performance/${supplierId}/trends?months=${months}`,
    );
  }

  /**
   * Get top performing suppliers
   */
  static async getTopPerformers(
    organizationId: string,
    limit: number = 10,
    dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics[]> {
    let url = `/supplier-performance/organization/${organizationId}/top?limit=${limit}`;

    if (dateRange) {
      url += `&from=${dateRange.from}&to=${dateRange.to}`;
    }

    return await api.get<SupplierPerformanceMetrics[]>(url);
  }

  /**
   * Get underperforming suppliers
   */
  static async getUnderperformers(
    organizationId: string,
    threshold: number = 3.0,
    dateRange?: { from: string; to: string },
  ): Promise<SupplierPerformanceMetrics[]> {
    let url = `/supplier-performance/organization/${organizationId}/underperformers?threshold=${threshold}`;

    if (dateRange) {
      url += `&from=${dateRange.from}&to=${dateRange.to}`;
    }

    return await api.get<SupplierPerformanceMetrics[]>(url);
  }
}
