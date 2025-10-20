import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationStatus, LocationType } from '../interfaces';

export class QueryLocationsDto {
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allow_online_orders?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allow_delivery?: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
