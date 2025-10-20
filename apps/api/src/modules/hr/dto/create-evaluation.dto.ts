import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';

export enum EvaluationPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
}

export enum PerformanceRating {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  SATISFACTORY = 'SATISFACTORY',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  UNSATISFACTORY = 'UNSATISFACTORY',
}

export class CreateEvaluationDto {
  @IsNotEmpty()
  @IsString()
  employee_id: string;

  @IsNotEmpty()
  @IsString()
  evaluator_user_id: string;

  @IsEnum(EvaluationPeriod)
  period: EvaluationPeriod;

  @IsNotEmpty()
  @IsDateString()
  evaluation_date: string;

  @IsEnum(PerformanceRating)
  overall_rating: PerformanceRating;

  @IsNumber()
  @Min(1)
  @Max(5)
  punctuality_score: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  quality_of_work_score: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  customer_service_score: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  teamwork_score: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  initiative_score: number;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  areas_for_improvement?: string;

  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsString()
  employee_comments?: string;

  @IsOptional()
  @IsString()
  evaluator_comments?: string;
}
