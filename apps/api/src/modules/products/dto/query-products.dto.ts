import {
  IsOptional,
  IsUUID,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType, ProductStatus } from './create-product.dto';

export class QueryProductsDto {
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  is_available?: string; // 'true' or 'false'

  @IsOptional()
  @IsString()
  is_featured?: string; // 'true' or 'false'

  @IsOptional()
  @IsString()
  track_inventory?: string; // 'true' or 'false'

  @IsOptional()
  @IsString()
  low_stock?: string; // 'true' or 'false'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'price' | 'created_at' | 'display_order';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}
