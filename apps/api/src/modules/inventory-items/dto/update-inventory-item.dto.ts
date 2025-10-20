import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryItemDto } from './create-inventory-item.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateInventoryItemDto extends PartialType(
  CreateInventoryItemDto,
) {
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
