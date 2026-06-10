import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EvaluationQuestion,
  EvaluationType,
} from '../interfaces/onboarding.interface';

export class CreateEvaluationDto {
  @IsUUID()
  organization_id: string;

  @IsUUID()
  employee_id: string;

  @IsOptional()
  @IsUUID()
  module_id?: string;

  @IsEnum(EvaluationType)
  type: EvaluationType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(1)
  max_score: number;

  @IsNumber()
  @Min(0)
  passing_score: number;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  scheduled_date?: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  due_date?: Date;

  @IsOptional()
  @IsUUID()
  evaluator_id?: string;

  @IsOptional()
  @IsArray()
  questions?: EvaluationQuestion[];
}
