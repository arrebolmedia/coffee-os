import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  Channel,
  TemplateCategory,
} from '../interfaces/notification.interface';

export class CreatePreferenceDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  organization_id: string;

  @IsEnum(Channel)
  channel: Channel;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsOptional()
  quiet_hours_start?: string; // HH:mm

  @IsString()
  @IsOptional()
  quiet_hours_end?: string; // HH:mm

  @IsString()
  @IsOptional()
  timezone?: string;
}
