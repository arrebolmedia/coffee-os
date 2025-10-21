import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteMaintenanceDto {
  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  completed_at: Date;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  work_performed: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parts_replaced?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  performed_by?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  labor_cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  parts_cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  external_invoice?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  next_maintenance_date?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
