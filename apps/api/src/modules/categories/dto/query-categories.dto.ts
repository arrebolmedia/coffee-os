import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryType, CategoryStatus } from './create-category.dto';

export class QueryCategoriesDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  is_featured?: string;

  @IsOptional()
  @IsString()
  show_in_menu?: string;

  @IsOptional()
  @IsString()
  allow_products?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  level?: number;

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'display_order' | 'created_at';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}
