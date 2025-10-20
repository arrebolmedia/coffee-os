import { Injectable } from '@nestjs/common';
import { CreateEvaluationDto, QueryEvaluationsDto } from './dto';
import { Evaluation } from './interfaces';

@Injectable()
export class EvaluationsService {
  private evaluations: Map<string, Evaluation> = new Map();

  async create(createDto: CreateEvaluationDto, organizationId: string): Promise<Evaluation> {
    const id = this.generateId();
    const now = new Date();

    // Calculate average score
    const avgScore =
      (createDto.punctuality_score +
        createDto.quality_of_work_score +
        createDto.customer_service_score +
        createDto.teamwork_score +
        createDto.initiative_score) /
      5;

    const evaluation: Evaluation = {
      id,
      employee_id: createDto.employee_id,
      organization_id: organizationId,
      evaluator_user_id: createDto.evaluator_user_id,
      period: createDto.period,
      evaluation_date: new Date(createDto.evaluation_date),
      overall_rating: createDto.overall_rating,
      punctuality_score: createDto.punctuality_score,
      quality_of_work_score: createDto.quality_of_work_score,
      customer_service_score: createDto.customer_service_score,
      teamwork_score: createDto.teamwork_score,
      initiative_score: createDto.initiative_score,
      average_score: Math.round(avgScore * 100) / 100,
      strengths: createDto.strengths,
      areas_for_improvement: createDto.areas_for_improvement,
      goals: createDto.goals,
      employee_comments: createDto.employee_comments,
      evaluator_comments: createDto.evaluator_comments,
      created_at: now,
      updated_at: now,
    };

    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  async findAll(query: QueryEvaluationsDto): Promise<Evaluation[]> {
    let evaluations = Array.from(this.evaluations.values());

    if (query.employee_id) {
      evaluations = evaluations.filter((e) => e.employee_id === query.employee_id);
    }

    if (query.organization_id) {
      evaluations = evaluations.filter((e) => e.organization_id === query.organization_id);
    }

    if (query.period) {
      evaluations = evaluations.filter((e) => e.period === query.period);
    }

    if (query.rating) {
      evaluations = evaluations.filter((e) => e.overall_rating === query.rating);
    }

    return evaluations.sort((a, b) => b.evaluation_date.getTime() - a.evaluation_date.getTime());
  }

  async findOne(id: string): Promise<Evaluation | null> {
    return this.evaluations.get(id) || null;
  }

  async getEmployeeHistory(employeeId: string): Promise<Evaluation[]> {
    const evaluations = Array.from(this.evaluations.values())
      .filter((e) => e.employee_id === employeeId)
      .sort((a, b) => b.evaluation_date.getTime() - a.evaluation_date.getTime());

    return evaluations;
  }

  async delete(id: string): Promise<void> {
    this.evaluations.delete(id);
  }

  async getStats(organizationId: string): Promise<any> {
    const evaluations = Array.from(this.evaluations.values()).filter(
      (e) => e.organization_id === organizationId,
    );

    const total = evaluations.length;

    const byRating = evaluations.reduce((acc, e) => {
      acc[e.overall_rating] = (acc[e.overall_rating] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgOverallScore =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.average_score, 0) / total) * 100,
          ) / 100
        : 0;

    const avgPunctuality =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.punctuality_score, 0) / total) * 100,
          ) / 100
        : 0;

    const avgQualityOfWork =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.quality_of_work_score, 0) / total) * 100,
          ) / 100
        : 0;

    const avgCustomerService =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.customer_service_score, 0) / total) * 100,
          ) / 100
        : 0;

    const avgTeamwork =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.teamwork_score, 0) / total) * 100,
          ) / 100
        : 0;

    const avgInitiative =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.initiative_score, 0) / total) * 100,
          ) / 100
        : 0;

    return {
      total,
      by_rating: byRating,
      avg_overall_score: avgOverallScore,
      avg_punctuality: avgPunctuality,
      avg_quality_of_work: avgQualityOfWork,
      avg_customer_service: avgCustomerService,
      avg_teamwork: avgTeamwork,
      avg_initiative: avgInitiative,
    };
  }

  private generateId(): string {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
