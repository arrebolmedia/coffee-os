import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CompleteOnboardingTaskDto {
  @IsNotEmpty()
  @IsString()
  task_id: string;

  @IsBoolean()
  completed: boolean;

  @IsNotEmpty()
  @IsString()
  completed_by_user_id: string;

  @IsOptional()
  @IsDateString()
  completed_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
