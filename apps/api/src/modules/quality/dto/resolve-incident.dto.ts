import { IsNotEmpty, IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { IncidentStatus } from './create-food-safety-incident.dto';

export class ResolveIncidentDto {
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @IsNotEmpty()
  @IsString()
  resolution_notes: string;

  @IsNotEmpty()
  @IsString()
  resolved_by_user_id: string;

  @IsOptional()
  @IsString()
  corrective_action?: string;

  @IsOptional()
  @IsString()
  preventive_action?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resolution_photo_urls?: string[];
}
