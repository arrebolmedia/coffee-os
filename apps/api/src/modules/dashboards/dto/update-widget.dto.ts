import { IsObject, IsUUID } from 'class-validator';

export class UpdateWidgetDto {
  @IsUUID()
  dashboard_id: string;

  @IsUUID()
  widget_id: string;

  @IsObject()
  updates: Partial<any>; // WidgetConfig updates
}
