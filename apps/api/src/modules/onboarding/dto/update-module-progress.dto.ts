import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { TrainingModuleStatus } from '../interfaces/onboarding.interface';

export class UpdateModuleProgressDto {
  @IsOptional()
  @IsEnum(TrainingModuleStatus)
  status?: TrainingModuleStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  time_spent_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  evaluation_score?: number;

  @IsOptional()
  @IsUUID()
  mentor_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
