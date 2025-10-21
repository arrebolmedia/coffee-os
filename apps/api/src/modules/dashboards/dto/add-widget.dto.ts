import { IsUUID, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WidgetConfig } from '../interfaces/dashboard.interface';

export class AddWidgetDto {
  @IsUUID()
  dashboard_id: string;

  @IsObject()
  widget: WidgetConfig;
}
