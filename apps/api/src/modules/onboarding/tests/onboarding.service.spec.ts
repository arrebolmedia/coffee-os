import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OnboardingService } from '../onboarding.service';
import {
  TrainingCategory,
  CompetencyLevel,
  TrainingModuleStatus,
  EvaluationType,
  EvaluationStatus,
  CertificationStatus,
} from '../interfaces/onboarding.interface';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnboardingService],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    
    // Limpiar almacenamiento
    (service as any).trainingModules.clear();
    (service as any).moduleProgress.clear();
    (service as any).onboardingPlans.clear();
    (service as any).evaluations.clear();
    (service as any).certifications.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== TRAINING MODULES ====================

  describe('createTrainingModule', () => {
    it('should create a training module with all fields', async () => {
      const dto = {
        organization_id: 'org-1',
        name: 'Espresso Fundamentals',
        description: 'Learn the basics of espresso extraction',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.NOVICE,
        objectives: ['Understand espresso variables', 'Dial in grinder', 'Pull consistent shots'],
        duration_minutes: 120,
        content_url: 'https://training.com/espresso-101',
        prerequisites: [],
        required_for_role: ['barista'],
        has_evaluation: true,
        passing_score: 80,
        order: 1,
        days_target: 7,
        tags: ['espresso', 'basics'],
        is_active: true,
      };

      const result = await service.createTrainingModule(dto);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.category).toBe(TrainingCategory.ESPRESSO);
      expect(result.level).toBe(CompetencyLevel.NOVICE);
      expect(result.has_evaluation).toBe(true);
      expect(result.passing_score).toBe(80);
      expect(result.is_active).toBe(true);
    });

    it('should create module without optional fields', async () => {
      const dto = {
        organization_id: 'org-1',
        name: 'Basic Module',
        description: 'Basic training',
        category: TrainingCategory.POS,
        level: CompetencyLevel.NOVICE,
        objectives: ['Learn POS'],
        duration_minutes: 30,
        has_evaluation: false,
        order: 1,
        days_target: 5,
      };

      const result = await service.createTrainingModule(dto);

      expect(result.id).toBeDefined();
      expect(result.content_url).toBeUndefined();
      expect(result.passing_score).toBeUndefined();
      expect(result.is_active).toBe(true); // Default value
    });

    it('should set is_active to true by default', async () => {
      const dto = {
        organization_id: 'org-1',
        name: 'Test Module',
        description: 'Test',
        category: TrainingCategory.QUALITY,
        level: CompetencyLevel.INTERMEDIATE,
        objectives: ['Test'],
        duration_minutes: 60,
        has_evaluation: false,
        order: 1,
        days_target: 10,
      };

      const result = await service.createTrainingModule(dto);
      expect(result.is_active).toBe(true);
    });
  });

  describe('findAllTrainingModules', () => {
    beforeEach(async () => {
      await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Espresso 101',
        description: 'Espresso basics',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.NOVICE,
        objectives: ['Learn basics'],
        duration_minutes: 60,
        has_evaluation: true,
        order: 1,
        days_target: 5,
      });

      await service.createTrainingModule({
        organization_id: 'org-2',
        name: 'Drinks 101',
        description: 'Drinks basics',
        category: TrainingCategory.DRINKS,
        level: CompetencyLevel.INTERMEDIATE,
        objectives: ['Learn drinks'],
        duration_minutes: 90,
        has_evaluation: false,
        order: 2,
        days_target: 15,
      });
    });

    it('should return all modules', async () => {
      const result = await service.findAllTrainingModules();
      expect(result).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAllTrainingModules('org-1');
      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org-1');
    });

    it('should filter by category', async () => {
      const result = await service.findAllTrainingModules(undefined, TrainingCategory.ESPRESSO);
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(TrainingCategory.ESPRESSO);
    });

    it('should filter by level', async () => {
      const result = await service.findAllTrainingModules(undefined, undefined, CompetencyLevel.NOVICE);
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe(CompetencyLevel.NOVICE);
    });

    it('should filter by is_active', async () => {
      const result = await service.findAllTrainingModules(undefined, undefined, undefined, true);
      expect(result).toHaveLength(2);
    });

    it('should sort by order', async () => {
      const result = await service.findAllTrainingModules();
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
    });
  });

  describe('findTrainingModuleById', () => {
    it('should return module by id', async () => {
      const created = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test Module',
        description: 'Test',
        category: TrainingCategory.QUALITY,
        level: CompetencyLevel.ADVANCED,
        objectives: ['Test'],
        duration_minutes: 30,
        has_evaluation: false,
        order: 1,
        days_target: 20,
      });

      const result = await service.findTrainingModuleById(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if module not found', async () => {
      await expect(service.findTrainingModuleById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTrainingModule', () => {
    it('should update training module', async () => {
      const created = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Original Name',
        description: 'Original',
        category: TrainingCategory.SAFETY,
        level: CompetencyLevel.NOVICE,
        objectives: ['Safety basics'],
        duration_minutes: 45,
        has_evaluation: false,
        order: 1,
        days_target: 3,
      });

      const updated = await service.updateTrainingModule(created.id, {
        name: 'Updated Name',
        duration_minutes: 60,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.duration_minutes).toBe(60);
      expect(updated.category).toBe(TrainingCategory.SAFETY); // Unchanged
    });
  });

  describe('deleteTrainingModule', () => {
    it('should delete module without progress', async () => {
      const created = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test',
        description: 'Test',
        category: TrainingCategory.CLEANING,
        level: CompetencyLevel.NOVICE,
        objectives: ['Clean'],
        duration_minutes: 30,
        has_evaluation: false,
        order: 1,
        days_target: 1,
      });

      await service.deleteTrainingModule(created.id);

      await expect(service.findTrainingModuleById(created.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if module has progress', async () => {
      const module = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test',
        description: 'Test',
        category: TrainingCategory.INVENTORY,
        level: CompetencyLevel.INTERMEDIATE,
        objectives: ['Inventory'],
        duration_minutes: 60,
        has_evaluation: false,
        order: 1,
        days_target: 10,
      });

      const plan = await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      await service.assignModuleToEmployee('emp-1', module.id);

      await expect(service.deleteTrainingModule(module.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== ONBOARDING PLANS ====================

  describe('createOnboardingPlan', () => {
    it('should create onboarding plan with 90-day target', async () => {
      const start_date = new Date(2024, 0, 1); // Jan 1, 2024
      const dto = {
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Barista Onboarding',
        description: 'Complete barista training program',
        role: 'barista',
        start_date,
        mentor_id: 'mentor-1',
        notes: 'First employee',
      };

      const result = await service.createOnboardingPlan(dto);

      expect(result.id).toBeDefined();
      expect(result.employee_id).toBe('emp-1');
      expect(result.start_date).toEqual(start_date);
      
      // Target completion date should be 90 days later
      const expected_completion = new Date(2024, 0, 1);
      expected_completion.setDate(expected_completion.getDate() + 90);
      expect(result.target_completion_date).toEqual(expected_completion);
      
      expect(result.is_active).toBe(true);
      expect(result.is_completed).toBe(false);
      expect(result.progress_percentage).toBe(0);
    });
  });

  describe('findAllOnboardingPlans', () => {
    beforeEach(async () => {
      await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Plan 1',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      await service.createOnboardingPlan({
        organization_id: 'org-2',
        employee_id: 'emp-2',
        name: 'Plan 2',
        role: 'manager',
        start_date: new Date(2024, 0, 15),
      });
    });

    it('should return all plans', async () => {
      const result = await service.findAllOnboardingPlans();
      expect(result).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAllOnboardingPlans('org-1');
      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org-1');
    });

    it('should filter by is_active', async () => {
      const result = await service.findAllOnboardingPlans(undefined, true);
      expect(result).toHaveLength(2);
      result.forEach((plan) => expect(plan.is_active).toBe(true));
    });
  });

  describe('findOnboardingPlanByEmployee', () => {
    it('should return active plan for employee', async () => {
      await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      const result = await service.findOnboardingPlanByEmployee('emp-1');
      expect(result).toBeDefined();
      expect(result!.employee_id).toBe('emp-1');
    });

    it('should return null if no active plan found', async () => {
      const result = await service.findOnboardingPlanByEmployee('non-existent');
      expect(result).toBeNull();
    });
  });

  // ==================== MODULE PROGRESS ====================

  describe('assignModuleToEmployee', () => {
    let module_id: string;
    let employee_id: string;

    beforeEach(async () => {
      const module = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test Module',
        description: 'Test',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.NOVICE,
        objectives: ['Learn'],
        duration_minutes: 60,
        has_evaluation: false,
        order: 1,
        days_target: 5,
      });
      module_id = module.id;

      employee_id = 'emp-1';
      await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id,
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });
    });

    it('should assign module to employee', async () => {
      const result = await service.assignModuleToEmployee(employee_id, module_id, 'assigner-1', 'mentor-1');

      expect(result.id).toBeDefined();
      expect(result.employee_id).toBe(employee_id);
      expect(result.module_id).toBe(module_id);
      expect(result.status).toBe(TrainingModuleStatus.NOT_STARTED);
      expect(result.progress_percentage).toBe(0);
      expect(result.assigned_by).toBe('assigner-1');
      expect(result.mentor_id).toBe('mentor-1');
    });

    it('should update plan total_modules count', async () => {
      await service.assignModuleToEmployee(employee_id, module_id);

      const plan = await service.findOnboardingPlanByEmployee(employee_id);
      expect(plan!.total_modules).toBe(1);
    });

    it('should throw BadRequestException if no onboarding plan exists', async () => {
      await expect(
        service.assignModuleToEmployee('no-plan-employee', module_id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if module does not exist', async () => {
      await expect(
        service.assignModuleToEmployee(employee_id, 'non-existent-module'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateModuleProgress', () => {
    let progress_id: string;
    let plan_id: string;

    beforeEach(async () => {
      const module = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test Module',
        description: 'Test',
        category: TrainingCategory.DRINKS,
        level: CompetencyLevel.INTERMEDIATE,
        objectives: ['Make drinks'],
        duration_minutes: 90,
        has_evaluation: false,
        order: 1,
        days_target: 10,
      });

      const plan = await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });
      plan_id = plan.id;

      const progress = await service.assignModuleToEmployee('emp-1', module.id);
      progress_id = progress.id;
    });

    it('should update progress status and percentage', async () => {
      const result = await service.updateModuleProgress(progress_id, {
        status: TrainingModuleStatus.IN_PROGRESS,
        progress_percentage: 50,
      });

      expect(result.status).toBe(TrainingModuleStatus.IN_PROGRESS);
      expect(result.progress_percentage).toBe(50);
      expect(result.started_at).toBeDefined();
    });

    it('should set completed_at when status is COMPLETED', async () => {
      const result = await service.updateModuleProgress(progress_id, {
        status: TrainingModuleStatus.COMPLETED,
      });

      expect(result.status).toBe(TrainingModuleStatus.COMPLETED);
      expect(result.completed_at).toBeDefined();
      expect(result.progress_percentage).toBe(100);
    });

    it('should update plan progress when module completed', async () => {
      await service.updateModuleProgress(progress_id, {
        status: TrainingModuleStatus.COMPLETED,
      });

      const plan = await service.findOnboardingPlanById(plan_id);
      expect(plan.completed_modules).toBe(1);
      expect(plan.progress_percentage).toBe(100); // 1 of 1 module
    });
  });

  describe('findEmployeeModuleProgress', () => {
    it('should return all progress for employee', async () => {
      const module1 = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Module 1',
        description: 'Test',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.NOVICE,
        objectives: ['Learn'],
        duration_minutes: 30,
        has_evaluation: false,
        order: 1,
        days_target: 5,
      });

      const module2 = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Module 2',
        description: 'Test',
        category: TrainingCategory.QUALITY,
        level: CompetencyLevel.INTERMEDIATE,
        objectives: ['Quality'],
        duration_minutes: 45,
        has_evaluation: false,
        order: 2,
        days_target: 15,
      });

      await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      await service.assignModuleToEmployee('emp-1', module1.id);
      await service.assignModuleToEmployee('emp-1', module2.id);

      const result = await service.findEmployeeModuleProgress('emp-1');
      expect(result).toHaveLength(2);
    });
  });

  // ==================== EVALUATIONS ====================

  describe('createEvaluation', () => {
    it('should create evaluation', async () => {
      const dto = {
        organization_id: 'org-1',
        employee_id: 'emp-1',
        module_id: 'module-1',
        type: EvaluationType.THEORETICAL,
        title: 'Espresso Knowledge Test',
        description: 'Test espresso fundamentals',
        max_score: 100,
        passing_score: 80,
        scheduled_date: new Date(2024, 0, 15),
        evaluator_id: 'evaluator-1',
      };

      const result = await service.createEvaluation(dto);

      expect(result.id).toBeDefined();
      expect(result.status).toBe(EvaluationStatus.PENDING);
      expect(result.attempt_number).toBe(1);
      expect(result.max_score).toBe(100);
      expect(result.passing_score).toBe(80);
    });
  });

  describe('startEvaluation', () => {
    it('should start pending evaluation', async () => {
      const evaluation = await service.createEvaluation({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        type: EvaluationType.PRACTICAL,
        title: 'Practical Test',
        max_score: 100,
        passing_score: 70,
      });

      const result = await service.startEvaluation(evaluation.id);

      expect(result.status).toBe(EvaluationStatus.IN_PROGRESS);
      expect(result.started_at).toBeDefined();
    });

    it('should throw BadRequestException if not pending', async () => {
      const evaluation = await service.createEvaluation({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        type: EvaluationType.OBSERVATION,
        title: 'Observation',
        max_score: 100,
        passing_score: 75,
      });

      await service.startEvaluation(evaluation.id);

      await expect(service.startEvaluation(evaluation.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeEvaluation', () => {
    let evaluation_id: string;

    beforeEach(async () => {
      const evaluation = await service.createEvaluation({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        type: EvaluationType.THEORETICAL,
        title: 'Test',
        max_score: 100,
        passing_score: 80,
      });
      evaluation_id = evaluation.id;
      await service.startEvaluation(evaluation_id);
    });

    it('should complete evaluation with passing score', async () => {
      const result = await service.completeEvaluation(evaluation_id, {
        score: 85,
        feedback: 'Great job!',
        strengths: ['Knowledge', 'Speed'],
        areas_for_improvement: ['Technique'],
      });

      expect(result.status).toBe(EvaluationStatus.PASSED);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(85);
      expect(result.completed_at).toBeDefined();
    });

    it('should complete evaluation with failing score', async () => {
      const result = await service.completeEvaluation(evaluation_id, {
        score: 65,
        feedback: 'Needs improvement',
      });

      expect(result.status).toBe(EvaluationStatus.FAILED);
      expect(result.passed).toBe(false);
      expect(result.score).toBe(65);
    });

    it('should update module progress if evaluation passed', async () => {
      const module = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test Module',
        description: 'Test',
        category: TrainingCategory.SAFETY,
        level: CompetencyLevel.ADVANCED,
        objectives: ['Safety'],
        duration_minutes: 30,
        has_evaluation: true,
        passing_score: 80,
        order: 1,
        days_target: 3,
      });

      await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-2',
        name: 'Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      const progress = await service.assignModuleToEmployee('emp-2', module.id);

      const eval2 = await service.createEvaluation({
        organization_id: 'org-1',
        employee_id: 'emp-2',
        module_id: module.id,
        type: EvaluationType.THEORETICAL,
        title: 'Module Eval',
        max_score: 100,
        passing_score: 80,
      });

      await service.startEvaluation(eval2.id);
      await service.completeEvaluation(eval2.id, { score: 90 });

      const updated_progress = (service as any).moduleProgress.get(progress.id);
      expect(updated_progress.status).toBe(TrainingModuleStatus.COMPLETED);
      expect(updated_progress.evaluation_score).toBe(90);
    });
  });

  describe('findAllEvaluations', () => {
    beforeEach(async () => {
      await service.createEvaluation({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        type: EvaluationType.THEORETICAL,
        title: 'Test 1',
        max_score: 100,
        passing_score: 80,
      });

      await service.createEvaluation({
        organization_id: 'org-2',
        employee_id: 'emp-2',
        type: EvaluationType.PRACTICAL,
        title: 'Test 2',
        max_score: 100,
        passing_score: 70,
      });
    });

    it('should return all evaluations', async () => {
      const result = await service.findAllEvaluations();
      expect(result).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAllEvaluations('org-1');
      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org-1');
    });

    it('should filter by employee_id', async () => {
      const result = await service.findAllEvaluations(undefined, 'emp-1');
      expect(result).toHaveLength(1);
      expect(result[0].employee_id).toBe('emp-1');
    });

    it('should filter by status', async () => {
      const result = await service.findAllEvaluations(undefined, undefined, EvaluationStatus.PENDING);
      expect(result).toHaveLength(2);
    });
  });

  // ==================== CERTIFICATIONS ====================

  describe('createCertification', () => {
    it('should create certification with unique number', async () => {
      const dto = {
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Barista Level 1',
        description: 'Basic barista certification',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.INTERMEDIATE,
        issued_date: new Date(2024, 0, 30),
        expiry_date: new Date(2025, 0, 30),
        issued_by: 'manager-1',
        modules_completed: ['module-1', 'module-2'],
        evaluations_passed: ['eval-1'],
        is_renewable: true,
        renewal_reminder_days: 30,
      };

      const result = await service.createCertification(dto);

      expect(result.id).toBeDefined();
      expect(result.certificate_number).toContain('CERT-');
      expect(result.status).toBe(CertificationStatus.ACTIVE);
      expect(result.is_renewable).toBe(true);
    });
  });

  describe('findAllCertifications', () => {
    beforeEach(async () => {
      await service.createCertification({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Cert 1',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.ADVANCED,
        issued_date: new Date(2024, 0, 1),
        issued_by: 'manager-1',
        is_renewable: false,
      });

      await service.createCertification({
        organization_id: 'org-2',
        employee_id: 'emp-2',
        name: 'Cert 2',
        category: TrainingCategory.DRINKS,
        level: CompetencyLevel.EXPERT,
        issued_date: new Date(2024, 0, 15),
        issued_by: 'manager-2',
        is_renewable: true,
      });
    });

    it('should return all certifications', async () => {
      const result = await service.findAllCertifications();
      expect(result).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAllCertifications('org-1');
      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org-1');
    });

    it('should filter by employee_id', async () => {
      const result = await service.findAllCertifications(undefined, 'emp-1');
      expect(result).toHaveLength(1);
      expect(result[0].employee_id).toBe('emp-1');
    });

    it('should filter by status', async () => {
      const result = await service.findAllCertifications(undefined, undefined, CertificationStatus.ACTIVE);
      expect(result).toHaveLength(2);
    });
  });

  describe('findExpiringCertifications', () => {
    it('should return certifications expiring within days', async () => {
      const now = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);
      const later = new Date();
      later.setDate(later.getDate() + 60);

      await service.createCertification({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Expiring Soon',
        category: TrainingCategory.QUALITY,
        level: CompetencyLevel.INTERMEDIATE,
        issued_date: new Date(2023, 0, 1),
        expiry_date: soon,
        issued_by: 'manager-1',
        is_renewable: true,
      });

      await service.createCertification({
        organization_id: 'org-1',
        employee_id: 'emp-2',
        name: 'Expiring Later',
        category: TrainingCategory.SAFETY,
        level: CompetencyLevel.ADVANCED,
        issued_date: new Date(2023, 0, 1),
        expiry_date: later,
        issued_by: 'manager-1',
        is_renewable: true,
      });

      const result = await service.findExpiringCertifications('org-1', 30);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Expiring Soon');
    });
  });

  // ==================== REPORTS & STATS ====================

  describe('getOnboardingStats', () => {
    it('should calculate comprehensive onboarding statistics', async () => {
      // Create modules
      await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Module 1',
        description: 'Test',
        category: TrainingCategory.ESPRESSO,
        level: CompetencyLevel.NOVICE,
        objectives: ['Learn'],
        duration_minutes: 60,
        has_evaluation: false,
        order: 1,
        days_target: 5,
      });

      // Create plan
      await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      const result = await service.getOnboardingStats('org-1');

      expect(result.organization_id).toBe('org-1');
      expect(result.active_onboarding_count).toBeGreaterThanOrEqual(0);
      expect(result.modules_by_category).toBeDefined();
      expect(result.completion_by_category).toBeDefined();
    });
  });

  describe('getEmployeeProgressReport', () => {
    it('should generate comprehensive employee progress report', async () => {
      const module = await service.createTrainingModule({
        organization_id: 'org-1',
        name: 'Test Module',
        description: 'Test',
        category: TrainingCategory.CUSTOMER_SERVICE,
        level: CompetencyLevel.NOVICE,
        objectives: ['Customer service'],
        duration_minutes: 90,
        has_evaluation: true,
        passing_score: 75,
        order: 1,
        days_target: 10,
      });

      const plan = await service.createOnboardingPlan({
        organization_id: 'org-1',
        employee_id: 'emp-1',
        name: 'Test Plan',
        role: 'barista',
        start_date: new Date(2024, 0, 1),
      });

      await service.assignModuleToEmployee('emp-1', module.id);

      const result = await service.getEmployeeProgressReport('emp-1');

      expect(result.employee_id).toBe('emp-1');
      expect(result.onboarding_plan).toBeDefined();
      expect(result.current_day).toBeGreaterThanOrEqual(0);
      expect(result.current_phase).toBeDefined();
      expect(result.total_modules).toBe(1);
      expect(result.is_on_track).toBeDefined();
    });

    it('should throw NotFoundException if no plan found', async () => {
      await expect(service.getEmployeeProgressReport('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
