import {
  IsUUID,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsObject,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Channel } from '../interfaces/notification.interface';

export class CreateBatchDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  template_id: string;

  @IsEnum(Channel)
  channel: Channel;

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsObject()
  @IsOptional()
  individual_data?: Record<string, Record<string, any>>;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  @IsUUID()
  created_by: string;
}
