import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and hyphens',
  })
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitOfMeasure: string; // ml, g, unit, kg, l, etc.

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  costPerUnit?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  parLevel?: number; // Ideal stock level

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  reorderPoint?: number; // When to reorder

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string; // Dairy, Coffee, Supplies, etc.

  @IsString()
  @IsOptional()
  supplierId?: string;
}
