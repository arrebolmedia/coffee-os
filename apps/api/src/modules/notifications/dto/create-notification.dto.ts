import { IsEnum, IsString, IsOptional, IsUUID, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { Channel } from '../interfaces';

export class CreateNotificationDto {
  @IsUUID()
  organization_id: string;

  @IsEnum(Channel)
  channel: Channel;

  @IsString()
  to: string;

  @IsUUID()
  @IsOptional()
  template_id?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  scheduled_at?: Date;
}
