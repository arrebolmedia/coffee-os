import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Channel, TemplateCategory } from '../interfaces';

export class CreateTemplateDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsEnum(Channel)
  channel: Channel;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  subject?: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  html_body?: string;

  @IsArray()
  @IsOptional()
  variables?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsUUID()
  created_by: string;
}
