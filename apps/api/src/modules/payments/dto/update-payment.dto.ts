import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../payments.service';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;
}
