import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkUpdateItemDto {
  category: string;
  key: string;
  value: any;
}

export class BulkUpdateDto {
  @IsUUID()
  organization_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];
}
