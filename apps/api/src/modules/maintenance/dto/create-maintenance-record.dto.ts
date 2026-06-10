import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceType,
} from '../interfaces/maintenance.interface';

export class CreateMaintenanceRecordDto {
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @IsNotEmpty()
  @IsUUID()
  asset_id: string;

  @IsNotEmpty()
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsNotEmpty()
  @IsEnum(MaintenancePriority)
  priority: MaintenancePriority;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  scheduled_date: Date;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsNotEmpty()
  @IsBoolean()
  is_external: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  external_provider?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recurring_interval_days?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
