import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOnboardingPlanDto {
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

  @IsString()
  @MaxLength(100)
  role: string;

  @IsDateString()
  @Type(() => Date)
  start_date: Date;

  @IsOptional()
  @IsUUID()
  mentor_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
