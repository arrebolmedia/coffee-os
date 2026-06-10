import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Channel, NotificationPriority } from '../interfaces';

export class CreateNotificationDto {
  @IsUUID()
  organization_id: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsEnum(Channel)
  channel: Channel;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  to: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cc?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bcc?: string[];

  @IsUUID()
  @IsOptional()
  template_id?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  html_body?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsArray()
  @IsOptional()
  attachments?: any[];

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  max_attempts?: number;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  scheduled_at?: Date;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
