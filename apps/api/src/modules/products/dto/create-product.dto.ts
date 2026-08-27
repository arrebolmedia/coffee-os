import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
  BUNDLE = 'bundle',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum PricingStrategy {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
  COST_PLUS = 'cost_plus',
}

export class VariantAttributeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  value: string;
}

export class CreateProductVariantDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'SKU must contain only uppercase letters, numbers, and hyphens',
  })
  @MaxLength(50)
  sku: string;

  @IsNumber()
  @Type(() => Number)
  price_adjustment: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_adjustment?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes: VariantAttributeDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_quantity?: number;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  category_id: string;

  @IsOptional()
  @IsString()
  recipe_id?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'SKU must contain only uppercase letters, numbers, and hyphens',
  })
  @MaxLength(50)
  sku: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  base_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsEnum(PricingStrategy)
  pricing_strategy?: PricingStrategy;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  target_margin_percentage?: number;

  /**
   * La tasa como fracción: 0.16 es el 16 %, 0 es tasa cero.
   *
   * El tope era 100, que es el tope de un porcentaje — pero la columna guarda
   * una fracción. Mandar `16` pensando en «16 %» pasaba la validación y se
   * guardaba tal cual: un producto de $50 cobraba $800 de IVA y $850 de total.
   * Comprobado con una venta real antes de arreglarlo.
   *
   * El tope real es 1. En México ninguna tasa de IVA pasa del 16 %, pero se
   * deja margen por si cambia la ley o se usa en otro país.
   */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'tax_rate no puede ser negativa' })
  @Max(1, {
    message:
      'tax_rate es una fracción, no un porcentaje: 0.16 para el 16 %, 0 para tasa cero',
  })
  @Type(() => Number)
  tax_rate?: number;

  /** El precio de venta ya lleva el IVA dentro en vez de sumarse aparte. */
  @IsOptional()
  @IsBoolean()
  tax_included?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_modifiers?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_discounts?: boolean;

  @IsOptional()
  @IsBoolean()
  track_inventory?: boolean;

  @IsOptional()
  @IsBoolean()
  require_preparation?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimum_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorder_point?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  display_order?: number;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  preparation_time_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  calories?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
