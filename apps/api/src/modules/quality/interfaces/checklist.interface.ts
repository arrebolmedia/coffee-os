import { ChecklistType, ChecklistCategory } from '../dto';

export interface ChecklistItem {
  id: string;
  description: string;
  category: ChecklistCategory;
  regulation_reference?: string;
  notes?: string;
  completed: boolean;
  completed_at?: Date;
  completed_by?: string;
  completion_notes?: string;
  photo_url?: string;
}

export interface Checklist {
  id: string;
  name: string;
  type: ChecklistType;
  location_id: string;
  organization_id: string;
  scheduled_date?: Date;
  description?: string;
  items: ChecklistItem[];
  completed: boolean;
  completed_at?: Date;
  completed_by_user_id?: string;
  completion_percentage: number;
  created_at: Date;
  updated_at: Date;
}
