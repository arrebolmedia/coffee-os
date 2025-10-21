import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  TrainingModule,
  TrainingCategory,
  CompetencyLevel,
  TrainingModuleStatus,
  EmployeeModuleProgress,
  OnboardingPlan,
  Evaluation,
  EvaluationType,
  EvaluationStatus,
  Certification,
  CertificationStatus,
  OnboardingStats,
  EmployeeProgressReport,
} from './interfaces/onboarding.interface';
import {
  CreateTrainingModuleDto,
  UpdateTrainingModuleDto,
  CreateOnboardingPlanDto,
  UpdateModuleProgressDto,
  CreateEvaluationDto,
  CompleteEvaluationDto,
  CreateCertificationDto,
} from './dto';

@Injectable()
export class OnboardingService {
  private trainingModules: Map<string, TrainingModule> = new Map();
  private moduleProgress: Map<string, EmployeeModuleProgress> = new Map();
  private onboardingPlans: Map<string, OnboardingPlan> = new Map();
  private evaluations: Map<string, Evaluation> = new Map();
  private certifications: Map<string, Certification> = new Map();

  // ==================== TRAINING MODULES ====================

  /**
   * Crear módulo de entrenamiento
   */
  async createTrainingModule(dto: CreateTrainingModuleDto): Promise<TrainingModule> {
    const id = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const module: TrainingModule = {
      id,
      ...dto,
      is_active: dto.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.trainingModules.set(id, module);
    return module;
  }

  /**
   * Obtener todos los módulos de entrenamiento
   */
  async findAllTrainingModules(
    organization_id?: string,
    category?: TrainingCategory,
    level?: CompetencyLevel,
    is_active?: boolean,
  ): Promise<TrainingModule[]> {
    let modules = Array.from(this.trainingModules.values());

    if (organization_id) {
      modules = modules.filter((m) => m.organization_id === organization_id);
    }
    if (category) {
      modules = modules.filter((m) => m.category === category);
    }
    if (level) {
      modules = modules.filter((m) => m.level === level);
    }
    if (is_active !== undefined) {
      modules = modules.filter((m) => m.is_active === is_active);
    }

    return modules.sort((a, b) => a.order - b.order);
  }

  /**
   * Obtener módulo por ID
   */
  async findTrainingModuleById(id: string): Promise<TrainingModule> {
    const module = this.trainingModules.get(id);
    if (!module) {
      throw new NotFoundException(`Training module with ID ${id} not found`);
    }
    return module;
  }

  /**
   * Actualizar módulo de entrenamiento
   */
  async updateTrainingModule(id: string, dto: UpdateTrainingModuleDto): Promise<TrainingModule> {
    const module = await this.findTrainingModuleById(id);

    const updated: TrainingModule = {
      ...module,
      ...dto,
      updated_at: new Date(),
    };

    this.trainingModules.set(id, updated);
    return updated;
  }

  /**
   * Eliminar módulo de entrenamiento
   */
  async deleteTrainingModule(id: string): Promise<void> {
    // Verificar que no haya progreso asociado
    const hasProgress = Array.from(this.moduleProgress.values()).some(
      (p) => p.module_id === id,
    );
    if (hasProgress) {
      throw new BadRequestException('Cannot delete module with existing progress records');
    }

    this.trainingModules.delete(id);
  }

  // ==================== ONBOARDING PLANS ====================

  /**
   * Crear plan de onboarding
   */
  async createOnboardingPlan(dto: CreateOnboardingPlanDto): Promise<OnboardingPlan> {
    const id = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calcular target_completion_date (90 días después del start_date)
    const target_completion_date = new Date(dto.start_date);
    target_completion_date.setDate(target_completion_date.getDate() + 90);

    const plan: OnboardingPlan = {
      id,
      organization_id: dto.organization_id,
      employee_id: dto.employee_id,
      name: dto.name,
      description: dto.description,
      role: dto.role,
      start_date: dto.start_date,
      target_completion_date,
      mentor_id: dto.mentor_id,
      total_modules: 0,
      completed_modules: 0,
      progress_percentage: 0,
      is_active: true,
      is_completed: false,
      day_30_completed: false,
      day_60_completed: false,
      day_90_completed: false,
      notes: dto.notes,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.onboardingPlans.set(id, plan);
    return plan;
  }

  /**
   * Obtener todos los planes de onboarding
   */
  async findAllOnboardingPlans(
    organization_id?: string,
    is_active?: boolean,
  ): Promise<OnboardingPlan[]> {
    let plans = Array.from(this.onboardingPlans.values());

    if (organization_id) {
      plans = plans.filter((p) => p.organization_id === organization_id);
    }
    if (is_active !== undefined) {
      plans = plans.filter((p) => p.is_active === is_active);
    }

    return plans.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * Obtener plan por ID
   */
  async findOnboardingPlanById(id: string): Promise<OnboardingPlan> {
    const plan = this.onboardingPlans.get(id);
    if (!plan) {
      throw new NotFoundException(`Onboarding plan with ID ${id} not found`);
    }
    return plan;
  }

  /**
   * Obtener plan por empleado
   */
  async findOnboardingPlanByEmployee(employee_id: string): Promise<OnboardingPlan | null> {
    const plan = Array.from(this.onboardingPlans.values()).find(
      (p) => p.employee_id === employee_id && p.is_active,
    );
    return plan || null;
  }

  /**
   * Asignar módulo a empleado
   */
  async assignModuleToEmployee(
    employee_id: string,
    module_id: string,
    assigned_by?: string,
    mentor_id?: string,
  ): Promise<EmployeeModuleProgress> {
    // Verificar que el módulo existe
    const module = await this.findTrainingModuleById(module_id);
    
    // Verificar que el plan de onboarding existe
    const plan = await this.findOnboardingPlanByEmployee(employee_id);
    if (!plan) {
      throw new BadRequestException('Employee does not have an active onboarding plan');
    }

    const id = `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const progress: EmployeeModuleProgress = {
      id,
      organization_id: module.organization_id,
      employee_id,
      module_id,
      status: TrainingModuleStatus.NOT_STARTED,
      progress_percentage: 0,
      evaluation_attempts: 0,
      assigned_by,
      mentor_id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.moduleProgress.set(id, progress);

    // Actualizar total_modules en el plan
    await this.updatePlanProgress(plan.id);

    return progress;
  }

  /**
   * Actualizar progreso de módulo
   */
  async updateModuleProgress(
    id: string,
    dto: UpdateModuleProgressDto,
  ): Promise<EmployeeModuleProgress> {
    const progress = this.moduleProgress.get(id);
    if (!progress) {
      throw new NotFoundException(`Module progress with ID ${id} not found`);
    }

    const updated: EmployeeModuleProgress = {
      ...progress,
      ...dto,
      updated_at: new Date(),
    };

    // Si se marca como completado, establecer completed_at
    if (dto.status === TrainingModuleStatus.COMPLETED && !progress.completed_at) {
      updated.completed_at = new Date();
      updated.progress_percentage = 100;
    }

    // Si se está iniciando, establecer started_at
    if (dto.status === TrainingModuleStatus.IN_PROGRESS && !progress.started_at) {
      updated.started_at = new Date();
    }

    this.moduleProgress.set(id, updated);

    // Actualizar progreso del plan
    const plan = await this.findOnboardingPlanByEmployee(progress.employee_id);
    if (plan) {
      await this.updatePlanProgress(plan.id);
    }

    return updated;
  }

  /**
   * Obtener progreso de módulos de un empleado
   */
  async findEmployeeModuleProgress(employee_id: string): Promise<EmployeeModuleProgress[]> {
    const progress = Array.from(this.moduleProgress.values()).filter(
      (p) => p.employee_id === employee_id,
    );

    return progress.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  /**
   * Actualizar progreso del plan de onboarding
   */
  private async updatePlanProgress(plan_id: string): Promise<OnboardingPlan> {
    const plan = await this.findOnboardingPlanById(plan_id);
    const progress = await this.findEmployeeModuleProgress(plan.employee_id);

    const total_modules = progress.length;
    const completed_modules = progress.filter(
      (p) => p.status === TrainingModuleStatus.COMPLETED,
    ).length;
    const progress_percentage = total_modules > 0 
      ? Math.round((completed_modules / total_modules) * 100)
      : 0;

    // Calcular días desde inicio
    const days_elapsed = Math.floor(
      (new Date().getTime() - plan.start_date.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Actualizar milestones
    const day_30_completed = days_elapsed >= 30 && progress_percentage >= 33;
    const day_60_completed = days_elapsed >= 60 && progress_percentage >= 66;
    const day_90_completed = days_elapsed >= 90 && progress_percentage === 100;
    const is_completed = progress_percentage === 100;

    const updated: OnboardingPlan = {
      ...plan,
      total_modules,
      completed_modules,
      progress_percentage,
      day_30_completed,
      day_60_completed,
      day_90_completed,
      is_completed,
      day_30_completed_at: day_30_completed && !plan.day_30_completed_at ? new Date() : plan.day_30_completed_at,
      day_60_completed_at: day_60_completed && !plan.day_60_completed_at ? new Date() : plan.day_60_completed_at,
      day_90_completed_at: day_90_completed && !plan.day_90_completed_at ? new Date() : plan.day_90_completed_at,
      actual_completion_date: is_completed && !plan.actual_completion_date ? new Date() : plan.actual_completion_date,
      updated_at: new Date(),
    };

    this.onboardingPlans.set(plan_id, updated);
    return updated;
  }

  // ==================== EVALUATIONS ====================

  /**
   * Crear evaluación
   */
  async createEvaluation(dto: CreateEvaluationDto): Promise<Evaluation> {
    const id = `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const evaluation: Evaluation = {
      id,
      organization_id: dto.organization_id,
      employee_id: dto.employee_id,
      module_id: dto.module_id,
      type: dto.type,
      status: EvaluationStatus.PENDING,
      title: dto.title,
      description: dto.description,
      max_score: dto.max_score,
      passing_score: dto.passing_score,
      scheduled_date: dto.scheduled_date,
      due_date: dto.due_date,
      evaluator_id: dto.evaluator_id,
      questions: dto.questions,
      attempt_number: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  /**
   * Iniciar evaluación
   */
  async startEvaluation(id: string): Promise<Evaluation> {
    const evaluation = this.evaluations.get(id);
    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${id} not found`);
    }

    if (evaluation.status !== EvaluationStatus.PENDING) {
      throw new BadRequestException('Can only start pending evaluations');
    }

    const updated: Evaluation = {
      ...evaluation,
      status: EvaluationStatus.IN_PROGRESS,
      started_at: new Date(),
      updated_at: new Date(),
    };

    this.evaluations.set(id, updated);
    return updated;
  }

  /**
   * Completar evaluación
   */
  async completeEvaluation(id: string, dto: CompleteEvaluationDto): Promise<Evaluation> {
    const evaluation = this.evaluations.get(id);
    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${id} not found`);
    }

    if (evaluation.status !== EvaluationStatus.IN_PROGRESS && evaluation.status !== EvaluationStatus.PENDING) {
      throw new BadRequestException('Can only complete in-progress or pending evaluations');
    }

    const passed = dto.score >= evaluation.passing_score;

    const updated: Evaluation = {
      ...evaluation,
      status: passed ? EvaluationStatus.PASSED : EvaluationStatus.FAILED,
      score: dto.score,
      passed,
      answers: dto.answers,
      feedback: dto.feedback,
      strengths: dto.strengths,
      areas_for_improvement: dto.areas_for_improvement,
      completed_at: new Date(),
      updated_at: new Date(),
    };

    this.evaluations.set(id, updated);

    // Si es evaluación de módulo y pasó, actualizar progreso
    if (evaluation.module_id && passed) {
      const progress = Array.from(this.moduleProgress.values()).find(
        (p) => p.employee_id === evaluation.employee_id && p.module_id === evaluation.module_id,
      );
      
      if (progress) {
        await this.updateModuleProgress(progress.id, {
          status: TrainingModuleStatus.COMPLETED,
          evaluation_score: dto.score,
        });
      }
    }

    return updated;
  }

  /**
   * Obtener evaluaciones
   */
  async findAllEvaluations(
    organization_id?: string,
    employee_id?: string,
    status?: EvaluationStatus,
  ): Promise<Evaluation[]> {
    let evaluations = Array.from(this.evaluations.values());

    if (organization_id) {
      evaluations = evaluations.filter((e) => e.organization_id === organization_id);
    }
    if (employee_id) {
      evaluations = evaluations.filter((e) => e.employee_id === employee_id);
    }
    if (status) {
      evaluations = evaluations.filter((e) => e.status === status);
    }

    return evaluations.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  // ==================== CERTIFICATIONS ====================

  /**
   * Crear certificación
   */
  async createCertification(dto: CreateCertificationDto): Promise<Certification> {
    const id = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generar número de certificado único
    const certificate_number = `CERT-${dto.organization_id.substr(0, 8).toUpperCase()}-${Date.now()}`;

    const certification: Certification = {
      id,
      organization_id: dto.organization_id,
      employee_id: dto.employee_id,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      level: dto.level,
      issued_date: dto.issued_date,
      expiry_date: dto.expiry_date,
      status: CertificationStatus.ACTIVE,
      issued_by: dto.issued_by,
      modules_completed: dto.modules_completed,
      evaluations_passed: dto.evaluations_passed,
      certificate_number,
      certificate_url: dto.certificate_url,
      is_renewable: dto.is_renewable,
      renewal_reminder_days: dto.renewal_reminder_days,
      notes: dto.notes,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.certifications.set(id, certification);
    return certification;
  }

  /**
   * Obtener certificaciones
   */
  async findAllCertifications(
    organization_id?: string,
    employee_id?: string,
    status?: CertificationStatus,
  ): Promise<Certification[]> {
    let certifications = Array.from(this.certifications.values());

    if (organization_id) {
      certifications = certifications.filter((c) => c.organization_id === organization_id);
    }
    if (employee_id) {
      certifications = certifications.filter((c) => c.employee_id === employee_id);
    }
    if (status) {
      certifications = certifications.filter((c) => c.status === status);
    }

    return certifications.sort((a, b) => b.issued_date.getTime() - a.issued_date.getTime());
  }

  /**
   * Obtener certificaciones que expiran pronto
   */
  async findExpiringCertifications(organization_id: string, days: number = 30): Promise<Certification[]> {
    const now = new Date();
    const target_date = new Date();
    target_date.setDate(target_date.getDate() + days);

    const certifications = Array.from(this.certifications.values()).filter(
      (c) =>
        c.organization_id === organization_id &&
        c.status === CertificationStatus.ACTIVE &&
        c.expiry_date &&
        c.expiry_date >= now &&
        c.expiry_date <= target_date,
    );

    return certifications.sort((a, b) => a.expiry_date!.getTime() - b.expiry_date!.getTime());
  }

  // ==================== REPORTS & STATS ====================

  /**
   * Obtener estadísticas de onboarding
   */
  async getOnboardingStats(organization_id: string): Promise<OnboardingStats> {
    const plans = await this.findAllOnboardingPlans(organization_id);
    const progress = Array.from(this.moduleProgress.values()).filter(
      (p) => p.organization_id === organization_id,
    );
    const evaluations = await this.findAllEvaluations(organization_id);
    const certifications = await this.findAllCertifications(organization_id);

    const active_plans = plans.filter((p) => p.is_active && !p.is_completed);
    const completed_plans = plans.filter((p) => p.is_completed);

    // Calcular fase actual de cada plan activo
    const now = new Date();
    const in_day_30 = active_plans.filter((p) => {
      const days = Math.floor((now.getTime() - p.start_date.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30;
    }).length;
    const in_day_60 = active_plans.filter((p) => {
      const days = Math.floor((now.getTime() - p.start_date.getTime()) / (1000 * 60 * 60 * 24));
      return days > 30 && days <= 60;
    }).length;
    const in_day_90 = active_plans.filter((p) => {
      const days = Math.floor((now.getTime() - p.start_date.getTime()) / (1000 * 60 * 60 * 24));
      return days > 60 && days <= 90;
    }).length;

    const total_modules_assigned = progress.length;
    const total_modules_completed = progress.filter(
      (p) => p.status === TrainingModuleStatus.COMPLETED,
    ).length;

    const passed_evaluations = evaluations.filter((e) => e.status === EvaluationStatus.PASSED);
    const failed_evaluations = evaluations.filter((e) => e.status === EvaluationStatus.FAILED);
    const avg_score = passed_evaluations.length > 0
      ? passed_evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / passed_evaluations.length
      : 0;

    const active_certifications = certifications.filter((c) => c.status === CertificationStatus.ACTIVE);
    const expiring_soon = (await this.findExpiringCertifications(organization_id)).length;

    const avg_progress = active_plans.length > 0
      ? active_plans.reduce((sum, p) => sum + p.progress_percentage, 0) / active_plans.length
      : 0;

    const avg_completion_days = completed_plans.length > 0
      ? completed_plans.reduce((sum, p) => {
          const days = Math.floor(
            (p.actual_completion_date!.getTime() - p.start_date.getTime()) / (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0) / completed_plans.length
      : 0;

    const completion_rate = plans.length > 0
      ? (completed_plans.filter((p) => {
          const days = Math.floor(
            (p.actual_completion_date!.getTime() - p.start_date.getTime()) / (1000 * 60 * 60 * 24),
          );
          return days <= 90;
        }).length / plans.length) * 100
      : 0;

    // Calcular por categoría
    const modules_by_category = {} as Record<TrainingCategory, number>;
    const completion_by_category = {} as Record<TrainingCategory, number>;
    
    Object.values(TrainingCategory).forEach((cat) => {
      const cat_modules = Array.from(this.trainingModules.values()).filter(
        (m) => m.organization_id === organization_id && m.category === cat,
      );
      modules_by_category[cat] = cat_modules.length;
      
      const cat_progress = progress.filter((p) => {
        const module = this.trainingModules.get(p.module_id);
        return module && module.category === cat && p.status === TrainingModuleStatus.COMPLETED;
      });
      completion_by_category[cat] = cat_progress.length;
    });

    return {
      organization_id,
      active_onboarding_count: active_plans.length,
      completed_onboarding_count: completed_plans.length,
      in_day_30_count: in_day_30,
      in_day_60_count: in_day_60,
      in_day_90_count: in_day_90,
      average_progress_percentage: Math.round(avg_progress),
      total_modules_assigned,
      total_modules_completed,
      total_evaluations: evaluations.length,
      total_evaluations_passed: passed_evaluations.length,
      total_evaluations_failed: failed_evaluations.length,
      average_evaluation_score: Math.round(avg_score),
      total_certifications_issued: certifications.length,
      total_certifications_active: active_certifications.length,
      certifications_expiring_soon: expiring_soon,
      average_completion_days: Math.round(avg_completion_days),
      completion_rate: Math.round(completion_rate),
      modules_by_category,
      completion_by_category,
    };
  }

  /**
   * Obtener reporte de progreso individual
   */
  async getEmployeeProgressReport(employee_id: string): Promise<EmployeeProgressReport> {
    const plan = await this.findOnboardingPlanByEmployee(employee_id);
    if (!plan) {
      throw new NotFoundException(`No active onboarding plan found for employee ${employee_id}`);
    }

    const progress = await this.findEmployeeModuleProgress(employee_id);
    const evaluations = await this.findAllEvaluations(undefined, employee_id);
    const certifications = await this.findAllCertifications(undefined, employee_id);

    const now = new Date();
    const current_day = Math.floor((now.getTime() - plan.start_date.getTime()) / (1000 * 60 * 60 * 24));
    
    let current_phase: '30' | '60' | '90' | 'complete';
    if (plan.is_completed) {
      current_phase = 'complete';
    } else if (current_day <= 30) {
      current_phase = '30';
    } else if (current_day <= 60) {
      current_phase = '60';
    } else {
      current_phase = '90';
    }

    const completed_modules = progress.filter((p) => p.status === TrainingModuleStatus.COMPLETED).length;
    const in_progress_modules = progress.filter((p) => p.status === TrainingModuleStatus.IN_PROGRESS).length;
    const not_started_modules = progress.filter((p) => p.status === TrainingModuleStatus.NOT_STARTED).length;

    const passed_evals = evaluations.filter((e) => e.status === EvaluationStatus.PASSED);
    const failed_evals = evaluations.filter((e) => e.status === EvaluationStatus.FAILED);
    const pending_evals = evaluations.filter((e) => e.status === EvaluationStatus.PENDING);
    
    const avg_score = passed_evals.length > 0
      ? passed_evals.reduce((sum, e) => sum + (e.score || 0), 0) / passed_evals.length
      : 0;

    const expected_progress = Math.min((current_day / 90) * 100, 100);
    const is_on_track = plan.progress_percentage >= expected_progress - 10; // 10% tolerance
    const days_difference = Math.round(((plan.progress_percentage - expected_progress) / 100) * 90);

    const total_training_hours = progress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) / 60;

    // Obtener próximos módulos (no iniciados, ordenados por order)
    const next_module_ids = progress
      .filter((p) => p.status === TrainingModuleStatus.NOT_STARTED)
      .map((p) => p.module_id)
      .slice(0, 3);
    const next_modules = next_module_ids
      .map((id) => this.trainingModules.get(id))
      .filter((m) => m !== undefined) as TrainingModule[];

    // Evaluaciones próximas
    const upcoming_evaluations = evaluations
      .filter((e) => e.status === EvaluationStatus.PENDING && e.scheduled_date)
      .sort((a, b) => a.scheduled_date!.getTime() - b.scheduled_date!.getTime())
      .slice(0, 3);

    return {
      employee_id,
      onboarding_plan: plan,
      current_day,
      current_phase,
      progress_percentage: plan.progress_percentage,
      total_modules: progress.length,
      completed_modules,
      in_progress_modules,
      not_started_modules,
      total_evaluations: evaluations.length,
      passed_evaluations: passed_evals.length,
      failed_evaluations: failed_evals.length,
      pending_evaluations: pending_evals.length,
      average_score: Math.round(avg_score),
      certifications_earned: certifications.filter((c) => c.status === CertificationStatus.ACTIVE).length,
      is_on_track,
      days_behind: days_difference < 0 ? Math.abs(days_difference) : undefined,
      days_ahead: days_difference > 0 ? days_difference : undefined,
      next_modules,
      upcoming_evaluations,
      total_training_hours: Math.round(total_training_hours * 10) / 10,
    };
  }
}
