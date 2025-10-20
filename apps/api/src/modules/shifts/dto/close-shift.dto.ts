import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ description: 'Closing cash amount' })
  @IsNumber()
  @Min(0)
  closingCash: number;

  @ApiProperty({ description: 'Closing card amount' })
  @IsNumber()
  @Min(0)
  closingCard: number;

  @ApiProperty({ description: 'Closing transfers amount' })
  @IsNumber()
  @Min(0)
  closingTransfers: number;

  @ApiProperty({ description: 'Closing other payments amount' })
  @IsNumber()
  @Min(0)
  closingOther: number;

  @ApiPropertyOptional({ description: 'Closing notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
