import {
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingCategory, CompetencyLevel } from '../interfaces/onboarding.interface';

export class CreateTrainingModuleDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsEnum(TrainingCategory)
  category: TrainingCategory;

  @IsEnum(CompetencyLevel)
  level: CompetencyLevel;

  @IsArray()
  @IsString({ each: true })
  objectives: string[];

  @IsNumber()
  @Min(1)
  duration_minutes: number;

  @IsOptional()
  @IsString()
  content_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_for_role?: string[];

  @IsBoolean()
  has_evaluation: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passing_score?: number;

  @IsNumber()
  @Min(0)
  order: number;

  @IsNumber()
  @Min(1)
  @Max(90)
  days_target: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
