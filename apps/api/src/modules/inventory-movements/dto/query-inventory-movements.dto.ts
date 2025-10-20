import {
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, MovementReason } from '../inventory-movements.service';

export class QueryInventoryMovementsDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 50;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: MovementType,
    example: MovementType.IN,
  })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional({
    description: 'Filter by movement reason',
    enum: MovementReason,
    example: MovementReason.PURCHASE,
  })
  @IsOptional()
  @IsEnum(MovementReason)
  reason?: MovementReason;

  @ApiPropertyOptional({
    description: 'Filter by inventory item ID',
    example: 'clh1234567890',
  })
  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
