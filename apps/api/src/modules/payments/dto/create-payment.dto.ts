import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../payments.service';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 150.0,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference (confirmation number, check number, etc.)',
    example: 'AUTH123456',
  })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    example: 'Customer paid with Visa ending in 1234',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Payment date and time (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  paidAt?: string;
}
