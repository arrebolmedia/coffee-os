import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../interfaces';

export class QueryPurchaseOrdersDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  supplier_id?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from_date?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to_date?: Date;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
