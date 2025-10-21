import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SustainabilityMetricType } from '../interfaces/waste.interface';

export class CreateSustainabilityTargetDto {
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsNotEmpty()
  @IsEnum(SustainabilityMetricType)
  metric_type: SustainabilityMetricType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  target_value: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit: string;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  start_date: Date;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  end_date: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
