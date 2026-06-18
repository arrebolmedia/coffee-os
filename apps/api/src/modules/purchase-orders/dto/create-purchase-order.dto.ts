import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// NOTE: entity ids are cuid (Prisma @default(cuid())), not UUID — id fields use
// @IsString/@IsNotEmpty, not @IsUUID (which rejected every real id → no PO could
// ever be created).
export class CreatePurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
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
  @IsString()
  @IsNotEmpty()
  organization_id: string;

  @IsString()
  @IsNotEmpty()
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
