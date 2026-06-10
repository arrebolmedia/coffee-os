import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CloseTicketPaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CloseTicketDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CloseTicketPaymentDto)
  payments?: CloseTicketPaymentDto[];
}
