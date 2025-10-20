import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashRegisterDto {
  @ApiProperty({ description: 'Shift ID' })
  @IsString()
  shiftId: string;

  @ApiProperty({ description: 'Expected cash amount' })
  @IsNumber()
  @Min(0)
  expectedCash: number;

  @ApiPropertyOptional({ description: 'Counted cash amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  countedCash?: number;

  @ApiPropertyOptional({ description: 'Total expenses' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalExpenses?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ description: 'Location ID' })
  @IsString()
  locationId: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;
}
