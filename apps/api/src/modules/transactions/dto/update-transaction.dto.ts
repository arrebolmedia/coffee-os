import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;
}
