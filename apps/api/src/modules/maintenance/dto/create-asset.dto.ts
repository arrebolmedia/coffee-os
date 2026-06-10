import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus, AssetType } from '../interfaces/maintenance.interface';

export class CreateAssetDto {
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNotEmpty()
  @IsEnum(AssetType)
  type: AssetType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial_number?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  purchase_date?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_price?: number;

  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  warranty_months?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  useful_life_years?: number;

  @IsOptional()
  @IsEnum(['straight_line', 'declining_balance'])
  depreciation_method?: 'straight_line' | 'declining_balance';

  @IsOptional()
  @IsNumber()
  @Min(0)
  residual_value?: number;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  installation_date?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}
