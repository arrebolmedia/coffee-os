import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ description: 'Closing cash amount' })
  @IsNumber()
  @Min(0)
  closingCash: number;

  @ApiPropertyOptional({ description: 'Closing card amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCard?: number;

  @ApiPropertyOptional({ description: 'Closing transfers amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingTransfers?: number;

  @ApiPropertyOptional({ description: 'Closing other payments amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingOther?: number;

  @ApiPropertyOptional({ description: 'Closing notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
