import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
  MaxLength,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum PaymentTerms {
  IMMEDIATE = 'immediate',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
}

export class CreateSupplierDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/)
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legal_name?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact_person?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @IsOptional()
  @IsEnum(PaymentTerms)
  payment_terms?: PaymentTerms;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  credit_limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discount_percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsBoolean()
  is_preferred?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
