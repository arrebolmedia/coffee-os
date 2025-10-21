import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WasteCategory, WasteReason, DisposalMethod } from '../interfaces/waste.interface';

export class CreateWasteLogDto {
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsUUID()
  inventory_item_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  item_name: string;

  @IsNotEmpty()
  @IsEnum(WasteCategory)
  category: WasteCategory;

  @IsNotEmpty()
  @IsEnum(WasteReason)
  reason: WasteReason;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_per_unit?: number;

  @IsNotEmpty()
  @IsEnum(DisposalMethod)
  disposal_method: DisposalMethod;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  disposal_date?: Date;

  @IsNotEmpty()
  @IsUUID()
  recorded_by: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}
