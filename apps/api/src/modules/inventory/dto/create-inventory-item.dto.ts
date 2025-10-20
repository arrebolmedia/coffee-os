import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ItemType {
  INGREDIENT = 'ingredient',
  SUPPLY = 'supply',
  MATERIAL = 'material',
  EQUIPMENT = 'equipment',
}

export enum ItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

export enum UnitOfMeasure {
  // Peso
  KILOGRAM = 'kg',
  GRAM = 'g',
  POUND = 'lb',
  OUNCE = 'oz',
  
  // Volumen
  LITER = 'l',
  MILLILITER = 'ml',
  GALLON = 'gal',
  FLUID_OUNCE = 'fl_oz',
  
  // Unidades
  UNIT = 'unit',
  PIECE = 'piece',
  BOX = 'box',
  BAG = 'bag',
  BOTTLE = 'bottle',
  CAN = 'can',
}

export class CreateInventoryItemDto {
  @IsUUID()
  organization_id: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  supplier_id?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/)
  @MaxLength(50)
  sku: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsEnum(UnitOfMeasure)
  unit_of_measure: UnitOfMeasure;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  units_per_package?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  package_size?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_per_unit: number;

  @IsOptional()
  @IsBoolean()
  track_inventory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  current_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimum_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maximum_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  par_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  conversion_factor?: number;

  @IsOptional()
  @IsEnum(UnitOfMeasure)
  conversion_unit?: UnitOfMeasure;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  lead_time_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  order_frequency_days?: number;

  @IsOptional()
  @IsBoolean()
  is_perishable?: boolean;

  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @IsOptional()
  @IsBoolean()
  requires_refrigeration?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storage_location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storage_temperature_min?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storage_temperature_max?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
