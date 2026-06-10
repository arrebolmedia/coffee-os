import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  DisposalMethod,
  WasteCategory,
  WasteReason,
} from '../interfaces/waste.interface';

export class QueryWasteLogsDto {
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsEnum(WasteCategory)
  category?: WasteCategory;

  @IsOptional()
  @IsEnum(WasteReason)
  reason?: WasteReason;

  @IsOptional()
  @IsEnum(DisposalMethod)
  disposal_method?: DisposalMethod;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  start_date?: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  end_date?: Date;
}
