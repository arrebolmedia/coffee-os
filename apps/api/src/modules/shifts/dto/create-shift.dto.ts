import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty({ description: 'Opening cash amount' })
  @IsNumber()
  @Min(0)
  openingCash: number;

  @ApiPropertyOptional({ description: 'Opening notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  openingNotes?: string;

  @ApiProperty({ description: 'User ID (cashier)' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Location ID' })
  @IsString()
  locationId: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;
}
