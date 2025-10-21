import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SustainabilityMetricType } from '../interfaces/waste.interface';

export class CreateSustainabilityMetricDto {
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
  value: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit: string;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  period_start: Date;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  period_end: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
