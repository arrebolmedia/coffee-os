import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingCategory, CompetencyLevel } from '../interfaces/onboarding.interface';

export class CreateCertificationDto {
  @IsUUID()
  organization_id: string;

  @IsUUID()
  employee_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(TrainingCategory)
  category: TrainingCategory;

  @IsEnum(CompetencyLevel)
  level: CompetencyLevel;

  @IsDateString()
  @Type(() => Date)
  issued_date: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  expiry_date?: Date;

  @IsUUID()
  issued_by: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules_completed?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evaluations_passed?: string[];

  @IsOptional()
  @IsString()
  certificate_url?: string;

  @IsBoolean()
  is_renewable: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  renewal_reminder_days?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
