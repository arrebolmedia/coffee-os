import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketModifierDto {
  @IsString()
  modifierId!: string;

  @IsNumber()
  priceDelta!: number;
}

export class CreateTicketLineDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketModifierDto)
  modifiers?: CreateTicketModifierDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTicketDto {
  @IsString()
  locationId!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketLineDto)
  lines!: CreateTicketLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
