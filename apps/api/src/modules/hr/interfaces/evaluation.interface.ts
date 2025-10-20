import { EvaluationPeriod, PerformanceRating } from '../dto';

export interface Evaluation {
  id: string;
  employee_id: string;
  organization_id: string;
  evaluator_user_id: string;
  period: EvaluationPeriod;
  evaluation_date: Date;
  overall_rating: PerformanceRating;
  punctuality_score: number;
  quality_of_work_score: number;
  customer_service_score: number;
  teamwork_score: number;
  initiative_score: number;
  average_score: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  employee_comments?: string;
  evaluator_comments?: string;
  created_at: Date;
  updated_at: Date;
}
