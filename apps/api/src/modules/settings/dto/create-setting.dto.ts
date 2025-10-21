import { IsUUID, IsEnum, IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { SettingType, SettingCategory } from '../interfaces';

export class CreateSettingDto {
  @IsUUID()
  organization_id: string;

  @IsEnum(SettingCategory)
  category: SettingCategory;

  @IsString()
  @MaxLength(200)
  key: string;

  @IsEnum(SettingType)
  type: SettingType;

  value: any;

  @IsOptional()
  default_value?: any;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean = false;

  @IsBoolean()
  @IsOptional()
  is_readonly?: boolean = false;
}
