import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum OnboardingPeriod {
  DAY_30 = 'DAY_30',
  DAY_60 = 'DAY_60',
  DAY_90 = 'DAY_90',
}

export enum TaskCategory {
  TRAINING = 'TRAINING',
  DOCUMENTATION = 'DOCUMENTATION',
  EQUIPMENT = 'EQUIPMENT',
  SYSTEMS = 'SYSTEMS',
  POLICIES = 'POLICIES',
  SAFETY = 'SAFETY',
  CULTURE = 'CULTURE',
}

export class OnboardingTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsEnum(TaskCategory)
  category: TaskCategory;

  @IsEnum(OnboardingPeriod)
  period: OnboardingPeriod;

  @IsOptional()
  @IsString()
  assigned_to?: string; // user_id of mentor/manager

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateOnboardingPlanDto {
  @IsNotEmpty()
  @IsString()
  employee_id: string;

  @IsNotEmpty()
  @IsString()
  created_by_user_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaskDto)
  tasks: OnboardingTaskDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
