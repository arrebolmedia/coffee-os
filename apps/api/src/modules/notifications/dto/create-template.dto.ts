import { IsString, IsUUID, IsEnum, IsOptional, IsArray, MaxLength } from 'class-validator';
import { Channel } from '../interfaces';

export class CreateTemplateDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(Channel)
  channel: Channel;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  subject?: string;

  @IsString()
  body: string;

  @IsArray()
  @IsOptional()
  variables?: string[];
}
