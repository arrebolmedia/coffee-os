import { TemperatureType, TemperatureUnit } from '../dto';

export interface TemperatureLog {
  id: string;
  location_id: string;
  organization_id: string;
  type: TemperatureType;
  temperature: number;
  unit: TemperatureUnit;
  equipment_name: string;
  product_name?: string;
  location_detail?: string;
  recorded_by_user_id: string;
  recorded_at: Date;
  notes?: string;
  is_within_range: boolean;
  alert_triggered: boolean;
  created_at: Date;
}
