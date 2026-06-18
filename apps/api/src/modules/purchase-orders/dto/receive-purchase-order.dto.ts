import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  // entity ids are cuid (Prisma @default(cuid())), not UUID — using @IsUUID
  // here rejected every real inventory item id and broke receiving.
  @IsString()
  @IsNotEmpty()
  inventory_item_id: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity_received: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @IsString()
  received_by: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
