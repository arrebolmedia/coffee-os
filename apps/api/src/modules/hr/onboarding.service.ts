import { Injectable } from '@nestjs/common';
import {
  CreateOnboardingPlanDto,
  CompleteOnboardingTaskDto,
  QueryOnboardingPlansDto,
  OnboardingPeriod,
} from './dto';
import { OnboardingPlan, OnboardingTask } from './interfaces';

@Injectable()
export class OnboardingService {
  private plans: Map<string, OnboardingPlan> = new Map();

  async create(createDto: CreateOnboardingPlanDto, organizationId: string): Promise<OnboardingPlan> {
    const id = this.generateId();
    const now = new Date();

    const tasks: OnboardingTask[] = createDto.tasks.map((task) => ({
      id: this.generateId(),
      title: task.title,
      description: task.description,
      category: task.category,
      period: task.period,
      assigned_to: task.assigned_to,
      required: task.required ?? true,
      completed: false,
    }));

    const plan: OnboardingPlan = {
      id,
      employee_id: createDto.employee_id,
      organization_id: organizationId,
      tasks,
      completion_percentage: 0,
      day_30_completed: false,
      day_60_completed: false,
      day_90_completed: false,
      created_by_user_id: createDto.created_by_user_id,
      notes: createDto.notes,
      created_at: now,
      updated_at: now,
    };

    this.plans.set(id, plan);
    return plan;
  }

  async findAll(query: QueryOnboardingPlansDto): Promise<OnboardingPlan[]> {
    let plans = Array.from(this.plans.values());

    if (query.employee_id) {
      plans = plans.filter((p) => p.employee_id === query.employee_id);
    }

    if (query.organization_id) {
      plans = plans.filter((p) => p.organization_id === query.organization_id);
    }

    if (query.period) {
      plans = plans.filter((p) => p.tasks.some((t) => t.period === query.period));
    }

    if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true';
      plans = plans.filter((p) => p.completion_percentage === 100 === isCompleted);
    }

    return plans;
  }

  async findOne(id: string): Promise<OnboardingPlan | null> {
    return this.plans.get(id) || null;
  }

  async completeTask(planId: string, completeDto: CompleteOnboardingTaskDto): Promise<OnboardingPlan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('Onboarding plan not found');
    }

    const task = plan.tasks.find((t) => t.id === completeDto.task_id);
    if (!task) {
      throw new Error('Task not found');
    }

    task.completed = completeDto.completed;
    task.completed_by = completeDto.completed ? completeDto.completed_by_user_id : undefined;
    task.completed_at = completeDto.completed
      ? completeDto.completed_at
        ? new Date(completeDto.completed_at)
        : new Date()
      : undefined;
    task.notes = completeDto.notes;

    // Calculate completion percentage
    const completedTasks = plan.tasks.filter((t) => t.completed).length;
    plan.completion_percentage = Math.round((completedTasks / plan.tasks.length) * 100);

    // Check period completions
    const day30Tasks = plan.tasks.filter((t) => t.period === OnboardingPeriod.DAY_30);
    const day60Tasks = plan.tasks.filter((t) => t.period === OnboardingPeriod.DAY_60);
    const day90Tasks = plan.tasks.filter((t) => t.period === OnboardingPeriod.DAY_90);

    plan.day_30_completed = day30Tasks.every((t) => t.completed);
    plan.day_60_completed = day60Tasks.every((t) => t.completed);
    plan.day_90_completed = day90Tasks.every((t) => t.completed);

    plan.updated_at = new Date();

    this.plans.set(planId, plan);
    return plan;
  }

  async delete(id: string): Promise<void> {
    this.plans.delete(id);
  }

  async getStats(organizationId: string): Promise<any> {
    const plans = Array.from(this.plans.values()).filter(
      (p) => p.organization_id === organizationId,
    );

    const total = plans.length;
    const completed = plans.filter((p) => p.completion_percentage === 100).length;
    const inProgress = total - completed;

    const day30Completed = plans.filter((p) => p.day_30_completed).length;
    const day60Completed = plans.filter((p) => p.day_60_completed).length;
    const day90Completed = plans.filter((p) => p.day_90_completed).length;

    const avgCompletion =
      total > 0
        ? Math.round(plans.reduce((sum, p) => sum + p.completion_percentage, 0) / total)
        : 0;

    return {
      total,
      completed,
      in_progress: inProgress,
      day_30_completed: day30Completed,
      day_60_completed: day60Completed,
      day_90_completed: day90Completed,
      avg_completion_percentage: avgCompletion,
    };
  }

  private generateId(): string {
    return `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
