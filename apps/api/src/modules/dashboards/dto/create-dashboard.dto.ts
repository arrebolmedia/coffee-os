import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DashboardCategory, WidgetConfig } from '../interfaces/dashboard.interface';

export class CreateDashboardDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsEnum(DashboardCategory)
  category: DashboardCategory;

  @IsArray()
  @IsOptional()
  widgets?: WidgetConfig[];

  @IsObject()
  @IsOptional()
  filters?: {
    location_ids?: string[];
    date_range?: {
      start: Date;
      end: Date;
    };
    custom_filters?: Record<string, any>;
  };

  @IsBoolean()
  @IsOptional()
  is_template?: boolean;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowed_roles?: string[];

  @IsUUID()
  created_by: string;
}
