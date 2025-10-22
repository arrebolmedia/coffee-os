import { IsArray, IsString, IsBoolean, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of product IDs to delete',
    example: ['clm1...', 'clm2...'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}

export class BulkUpdateStatusDto {
  @ApiProperty({
    description: 'Array of product IDs to update',
    example: ['clm1...', 'clm2...'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({
    description: 'New active status',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}

export class BulkUpdateCategoryDto {
  @ApiProperty({
    description: 'Array of product IDs to update',
    example: ['clm1...', 'clm2...'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({
    description: 'Category ID to assign',
    example: 'clm3...',
  })
  @IsString()
  categoryId: string;
}

export class ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Search query (name, SKU)',
    example: 'café',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 'clm1...',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
