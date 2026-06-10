import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SettingCategory } from '../interfaces';

export class TemplateItemDto {
  @IsString()
  key: string;

  @IsString()
  type: string;

  value: any;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  is_public?: boolean;

  @IsOptional()
  is_readonly?: boolean;

  @IsOptional()
  validation_rules?: any[];
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsEnum(SettingCategory)
  category: SettingCategory;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  settings: TemplateItemDto[];
}
