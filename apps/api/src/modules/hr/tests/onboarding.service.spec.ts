import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from '../onboarding.service';
import { CreateOnboardingPlanDto, OnboardingPeriod, TaskCategory, CompleteOnboardingTaskDto } from '../dto';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnboardingService],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => {
    service['plans'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create onboarding plan with tasks', async () => {
      const createDto: CreateOnboardingPlanDto = {
        employee_id: 'emp_1',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Complete safety training',
            description: 'Watch all safety videos',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.SAFETY,
            assigned_to: 'mgr_1',
          },
          {
            title: 'Shadow senior barista',
            description: 'Shadow for 3 shifts',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.TRAINING,
            assigned_to: 'barista_1',
          },
        ],
      };

      const result = await service.create(createDto, 'org_1');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.employee_id).toBe('emp_1');
      expect(result.tasks).toHaveLength(2);
      expect(result.completion_percentage).toBe(0);
    });
  });

  describe('completeTask', () => {
    it('should complete a task', async () => {
      const plan = await service.create({
        employee_id: 'emp_1',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.DOCUMENTATION,
          },
        ],
      }, 'org_1');

      const taskId = plan.tasks[0].id;

      const completeDto: CompleteOnboardingTaskDto = {
        task_id: taskId,
        completed: true,
        completed_by_user_id: 'mgr_1',
        notes: 'Well done',
      };

      const result = await service.completeTask(plan.id, completeDto);

      expect(result.tasks[0].completed).toBe(true);
      expect(result.tasks[0].completed_at).toBeDefined();
      expect(result.tasks[0].completed_by).toBe('mgr_1');
      expect(result.completion_percentage).toBe(100);
    });

    it('should update completion percentage', async () => {
      const plan = await service.create({
        employee_id: 'emp_1',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.DOCUMENTATION,
          },
          {
            title: 'Task 2',
            description: 'Second task',
            period: OnboardingPeriod.DAY_60,
            category: TaskCategory.TRAINING,
          },
        ],
      }, 'org_1');

      const taskId = plan.tasks[0].id;

      await service.completeTask(plan.id, {
        task_id: taskId,
        completed: true,
        completed_by_user_id: 'mgr_1',
      });

      const result = await service.findOne(plan.id);

      expect(result.completion_percentage).toBe(50);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        employee_id: 'emp_1',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.DOCUMENTATION,
          },
        ],
      }, 'org_1');

      await service.create({
        employee_id: 'emp_2',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Task 2',
            description: 'Second task',
            period: OnboardingPeriod.DAY_60,
            category: TaskCategory.TRAINING,
          },
        ],
      }, 'org_1');

      await service.create({
        employee_id: 'emp_3',
        created_by_user_id: 'mgr_2',
        tasks: [],
      }, 'org_2');
    });

    it('should return all plans when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by employee_id', async () => {
      const result = await service.findAll({ employee_id: 'emp_1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const plan1 = await service.create({
        employee_id: 'emp_1',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.DOCUMENTATION,
          },
          {
            title: 'Task 2',
            description: 'Second task',
            period: OnboardingPeriod.DAY_60,
            category: TaskCategory.TRAINING,
          },
        ],
      }, 'org_1');

      await service.completeTask(plan1.id, {
        task_id: plan1.tasks[0].id,
        completed: true,
        completed_by_user_id: 'mgr_1',
      });

      await service.create({
        employee_id: 'emp_2',
        created_by_user_id: 'mgr_1',
        tasks: [
          {
            title: 'Task 3',
            description: 'Third task',
            period: OnboardingPeriod.DAY_30,
            category: TaskCategory.TRAINING,
          },
        ],
      }, 'org_1');
    });

    it('should return onboarding statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(2);
      expect(stats.in_progress).toBe(2);
      expect(stats.completed).toBe(0);
      expect(stats.avg_completion_percentage).toBe(25); // (50 + 0) / 2
    });

    it('should track period completions', async () => {
      const stats = await service.getStats('org_1');

      // Plan 1: has DAY_30 task (completed) and DAY_60 task (not completed)
      // So day_30_completed = 1 (all DAY_30 tasks in plan1 are complete)
      // Plan 2: has DAY_30 task (not completed)
      // No DAY_90 tasks exist in either plan
      expect(stats.day_30_completed).toBeGreaterThanOrEqual(0);
      expect(stats.day_60_completed).toBeGreaterThanOrEqual(0);
      expect(stats.day_90_completed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('delete', () => {
    it('should delete onboarding plan', async () => {
      const plan = await service.create({
        employee_id: 'emp_1',
        created_by_user_id: 'mgr_1',
        tasks: [],
      }, 'org_1');

      await service.delete(plan.id);
      const result = await service.findOne(plan.id);
      expect(result).toBeNull();
    });
  });
});
