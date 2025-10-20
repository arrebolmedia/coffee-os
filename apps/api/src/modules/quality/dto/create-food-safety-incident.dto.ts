import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsArray } from 'class-validator';

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentType {
  TEMPERATURE_VIOLATION = 'TEMPERATURE_VIOLATION',
  CONTAMINATION = 'CONTAMINATION',
  EXPIRED_PRODUCT = 'EXPIRED_PRODUCT',
  PEST_SIGHTING = 'PEST_SIGHTING',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  HYGIENE_VIOLATION = 'HYGIENE_VIOLATION',
  CROSS_CONTAMINATION = 'CROSS_CONTAMINATION',
  STORAGE_VIOLATION = 'STORAGE_VIOLATION',
  OTHER = 'OTHER',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class CreateFoodSafetyIncidentDto {
  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsEnum(IncidentType)
  type: IncidentType;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  product_affected?: string;

  @IsOptional()
  @IsString()
  location_detail?: string;

  @IsNotEmpty()
  @IsString()
  reported_by_user_id: string;

  @IsOptional()
  @IsDateString()
  incident_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photo_urls?: string[];

  @IsOptional()
  @IsString()
  immediate_action_taken?: string;
}
