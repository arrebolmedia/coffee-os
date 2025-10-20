import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRoleDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  role_id: string;

  @IsUUID()
  organization_id: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  location_ids?: string[];

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  valid_from?: Date;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  valid_until?: Date;

  @IsUUID()
  assigned_by: string;
}
