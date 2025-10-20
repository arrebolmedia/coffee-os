import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

export class CreateDiscountDto {
  @ApiProperty({ description: 'Unique discount code' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Discount name' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Discount description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: DiscountType,
    description: 'Type of discount',
  })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Discount value (percentage or fixed amount)' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum purchase amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: Date;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @ApiPropertyOptional({ description: 'Usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Usage count', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageCount?: number;

  @ApiPropertyOptional({ description: 'Is discount active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;
}
