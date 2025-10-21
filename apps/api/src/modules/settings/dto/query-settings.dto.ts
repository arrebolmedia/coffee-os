import { IsUUID, IsEnum, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { SettingCategory, SettingType } from '../interfaces';

export class QuerySettingsDto {
  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsEnum(SettingCategory)
  @IsOptional()
  category?: SettingCategory;

  @IsEnum(SettingType)
  @IsOptional()
  type?: SettingType;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sort_by?: string = 'key';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'asc';
}
