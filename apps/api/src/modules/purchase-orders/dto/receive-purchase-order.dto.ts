import {
  IsArray,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @IsUUID()
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
