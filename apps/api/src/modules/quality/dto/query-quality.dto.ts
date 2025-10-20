import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ChecklistType, ChecklistCategory } from './create-checklist.dto';
import { TemperatureType } from './create-temperature-log.dto';
import { IncidentType, IncidentSeverity, IncidentStatus } from './create-food-safety-incident.dto';

export class QueryChecklistsDto {
  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(ChecklistType)
  type?: ChecklistType;

  @IsOptional()
  @IsEnum(ChecklistCategory)
  category?: ChecklistCategory;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  completed?: string; // 'true' | 'false'
}

export class QueryTemperatureLogsDto {
  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(TemperatureType)
  type?: TemperatureType;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  equipment_name?: string;
}

export class QueryIncidentsDto {
  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
