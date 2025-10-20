import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsNumber,
  IsOptional,
  IsDate,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  inventory_item_id: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity_ordered: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unit_price: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  organization_id: string;

  @IsUUID()
  supplier_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tax_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shipping_cost?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expected_delivery_date?: Date;

  @IsOptional()
  @IsString()
  requested_by?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
