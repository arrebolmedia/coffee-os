import { OnboardingPeriod, TaskCategory } from '../dto';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  period: OnboardingPeriod;
  assigned_to?: string;
  required: boolean;
  completed: boolean;
  completed_by?: string;
  completed_at?: Date;
  notes?: string;
}

export interface OnboardingPlan {
  id: string;
  employee_id: string;
  organization_id: string;
  tasks: OnboardingTask[];
  completion_percentage: number;
  day_30_completed: boolean;
  day_60_completed: boolean;
  day_90_completed: boolean;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  notes?: string;
}
