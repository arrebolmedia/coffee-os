import { IncidentType, IncidentSeverity, IncidentStatus } from '../dto';

export interface FoodSafetyIncident {
  id: string;
  location_id: string;
  organization_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  product_affected?: string;
  location_detail?: string;
  reported_by_user_id: string;
  reported_at: Date;
  incident_date: Date;
  photo_urls?: string[];
  immediate_action_taken?: string;
  resolution_notes?: string;
  corrective_action?: string;
  preventive_action?: string;
  resolved_by_user_id?: string;
  resolved_at?: Date;
  resolution_photo_urls?: string[];
  created_at: Date;
  updated_at: Date;
}
