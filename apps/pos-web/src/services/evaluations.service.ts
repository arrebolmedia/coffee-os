/**
 * CoffeeOS - Evaluations Service
 * Servicio para gestión de evaluaciones de desempeño
 */

import { api } from '@/lib/api';
import {
  Evaluation,
  EvaluationPeriod,
  EvaluationStats,
  PerformanceRating,
} from '@/types';

export interface CreateEvaluationDto {
  employee_id: string;
  evaluator_user_id: string;
  period: EvaluationPeriod;
  evaluation_date: string;
  overall_rating: PerformanceRating;
  punctuality_score: number;
  quality_of_work_score: number;
  customer_service_score: number;
  teamwork_score: number;
  initiative_score: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  employee_comments?: string;
  evaluator_comments?: string;
}

export interface QueryEvaluationsParams {
  organization_id?: string;
  employee_id?: string;
  period?: EvaluationPeriod;
  rating?: PerformanceRating;
}

class EvaluationsService {
  private basePath = '/hr/evaluations';

  /**
   * Crear nueva evaluación
   */
  async createEvaluation(
    data: CreateEvaluationDto,
    organizationId: string,
  ): Promise<Evaluation> {
    return api.post<Evaluation>(
      `${this.basePath}?organization_id=${organizationId}`,
      data,
    );
  }

  /**
   * Obtener lista de evaluaciones
   */
  async getEvaluations(params?: QueryEvaluationsParams): Promise<Evaluation[]> {
    const queryParams = new URLSearchParams();

    if (params?.organization_id)
      queryParams.append('organization_id', params.organization_id);
    if (params?.employee_id)
      queryParams.append('employee_id', params.employee_id);
    if (params?.period) queryParams.append('period', params.period);
    if (params?.rating) queryParams.append('rating', params.rating);

    return api.get<Evaluation[]>(`${this.basePath}?${queryParams.toString()}`);
  }

  /**
   * Obtener evaluación por ID
   */
  async getEvaluation(id: string): Promise<Evaluation> {
    return api.get<Evaluation>(`${this.basePath}/${id}`);
  }

  /**
   * Obtener historial de evaluaciones de un empleado
   */
  async getEmployeeHistory(employeeId: string): Promise<Evaluation[]> {
    return api.get<Evaluation[]>(
      `${this.basePath}/employee/${employeeId}/history`,
    );
  }

  /**
   * Eliminar evaluación
   */
  async deleteEvaluation(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Obtener estadísticas de evaluaciones
   */
  async getStats(organizationId: string): Promise<EvaluationStats> {
    return api.get<EvaluationStats>(
      `${this.basePath}/stats?organization_id=${organizationId}`,
    );
  }
}

export const evaluationsService = new EvaluationsService();
