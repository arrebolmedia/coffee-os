import { IsObject, IsUUID } from 'class-validator';
import { WidgetConfig } from '../interfaces/dashboard.interface';

export class AddWidgetDto {
  @IsUUID()
  dashboard_id: string;

  @IsObject()
  widget: WidgetConfig;
}
