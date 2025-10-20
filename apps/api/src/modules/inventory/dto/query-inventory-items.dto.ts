import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType, ItemStatus } from './create-inventory-item.dto';

export class QueryInventoryItemsDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  supplier_id?: string;

  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  track_inventory?: string;

  @IsOptional()
  @IsString()
  low_stock?: string;           // current_stock <= minimum_stock

  @IsOptional()
  @IsString()
  out_of_stock?: string;        // current_stock = 0

  @IsOptional()
  @IsString()
  is_perishable?: string;

  @IsOptional()
  @IsString()
  requires_refrigeration?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  min_cost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  max_cost?: number;

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'cost_per_unit' | 'current_stock' | 'created_at';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}
