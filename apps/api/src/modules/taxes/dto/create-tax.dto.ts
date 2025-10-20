import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TaxCategory {
  IVA = 'IVA', // Impuesto al Valor Agregado
  IEPS = 'IEPS', // Impuesto Especial sobre Producción y Servicios
  ISR = 'ISR', // Impuesto Sobre la Renta
  OTHER = 'OTHER',
}

export class CreateTaxDto {
  @ApiProperty({ description: 'Tax name' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Tax description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: TaxCategory,
    description: 'Tax category (IVA, IEPS, ISR, OTHER)',
  })
  @IsEnum(TaxCategory)
  category: TaxCategory;

  @ApiProperty({
    description: 'Tax rate as percentage (e.g., 16 for 16%)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiPropertyOptional({ description: 'Is tax active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;
}
