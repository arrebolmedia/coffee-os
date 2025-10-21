import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ExportFormat,
  ScheduleFrequency,
} from '../interfaces/report.interface';

export class CreateReportScheduleDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  template_id: string;

  @IsEnum(ExportFormat)
  export_format: ExportFormat;

  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @IsDateString()
  @Type(() => Date)
  start_date: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  end_date?: Date;

  @IsOptional()
  @IsString()
  cron_expression?: string;

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsUUID()
  created_by: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
