import {
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlertDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  kpi_code: string;

  @IsObject()
  condition: {
    operator: 'greater_than' | 'less_than' | 'equals' | 'between';
    value: number;
    value2?: number;
  };

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  notification_channels: Array<'email' | 'sms' | 'push' | 'webhook'>;

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsUUID()
  created_by: string;
}
