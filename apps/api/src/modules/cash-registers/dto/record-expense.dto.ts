import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordExpenseDto {
  @ApiProperty({ description: 'Expense amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Expense description' })
  @IsString()
  @MaxLength(200)
  description: string;

  @ApiPropertyOptional({ description: 'Expense category' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Recipient/vendor' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipient?: string;
}
