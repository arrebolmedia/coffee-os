import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionLineItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsArray()
  @IsOptional()
  modifiers?: string[]; // Array of modifier IDs

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class CreateTransactionDto {
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  customerPhone?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionLineItemDto)
  lineItems: TransactionLineItemDto[];
}
