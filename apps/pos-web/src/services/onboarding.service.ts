import { api } from '@/lib/api';
import {
  OnboardingPlan,
  OnboardingStats,
  OnboardingPeriod,
  TaskCategory,
} from '@/types';

interface CreateOnboardingPlanDto {
  employee_id: string;
  created_by_user_id: string;
  tasks: {
    title: string;
    description: string;
    category: TaskCategory;
    period: OnboardingPeriod;
    assigned_to?: string;
    required?: boolean;
  }[];
  notes?: string;
}

interface CompleteTaskDto {
  task_id: string;
  completed: boolean;
  completed_by_user_id?: string;
  completed_at?: string;
  notes?: string;
}

interface QueryOnboardingPlansParams {
  organization_id: string;
  employee_id?: string;
  period?: OnboardingPeriod;
  completed?: boolean;
}

class OnboardingService {
  private readonly baseUrl = '/hr/onboarding';

  /**
   * Create a new onboarding plan
   */
  async createPlan(
    data: CreateOnboardingPlanDto,
    organizationId: string,
  ): Promise<OnboardingPlan> {
    const queryString = new URLSearchParams({
      organization_id: organizationId,
    }).toString();
    return api.post<OnboardingPlan>(`${this.baseUrl}?${queryString}`, data);
  }

  /**
   * Get all onboarding plans
   */
  async getPlans(
    params: QueryOnboardingPlansParams,
  ): Promise<OnboardingPlan[]> {
    const queryString = new URLSearchParams(params as any).toString();
    return api.get<OnboardingPlan[]>(`${this.baseUrl}?${queryString}`);
  }

  /**
   * Get a specific onboarding plan
   */
  async getPlan(id: string): Promise<OnboardingPlan> {
    return api.get<OnboardingPlan>(`${this.baseUrl}/${id}`);
  }

  /**
   * Complete or uncomplete a task
   */
  async completeTask(
    planId: string,
    data: CompleteTaskDto,
  ): Promise<OnboardingPlan> {
    return api.patch<OnboardingPlan>(`${this.baseUrl}/${planId}/tasks`, data);
  }

  /**
   * Delete an onboarding plan
   */
  async deletePlan(id: string): Promise<void> {
    return api.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get onboarding statistics
   */
  async getStats(organizationId: string): Promise<OnboardingStats> {
    const queryString = new URLSearchParams({
      organization_id: organizationId,
    }).toString();
    return api.get<OnboardingStats>(`${this.baseUrl}/stats?${queryString}`);
  }
}

export const onboardingService = new OnboardingService();
