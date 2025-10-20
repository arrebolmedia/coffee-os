import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationsService } from '../evaluations.service';
import { CreateEvaluationDto, EvaluationPeriod, PerformanceRating } from '../dto';

describe('EvaluationsService', () => {
  let service: EvaluationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluationsService],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
  });

  afterEach(() => {
    service['evaluations'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an evaluation', async () => {
      const createDto: CreateEvaluationDto = {
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-01-31',
        overall_rating: PerformanceRating.GOOD,
        punctuality_score: 4,
        quality_of_work_score: 5,
        customer_service_score: 4,
        teamwork_score: 5,
        initiative_score: 4,
      };

      const result = await service.create(createDto, 'org_1');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.employee_id).toBe('emp_1');
      expect(result.overall_rating).toBe(PerformanceRating.GOOD);
    });

    it('should calculate average score', async () => {
      const createDto: CreateEvaluationDto = {
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-01-31',
        overall_rating: PerformanceRating.GOOD,
        punctuality_score: 4,
        quality_of_work_score: 4,
        customer_service_score: 4,
        teamwork_score: 4,
        initiative_score: 4,
      };

      const result = await service.create(createDto, 'org_1');

      expect(result.average_score).toBe(4);
    });

    it('should include comments', async () => {
      const createDto: CreateEvaluationDto = {
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.QUARTERLY,
        evaluation_date: '2025-03-31',
        overall_rating: PerformanceRating.EXCELLENT,
        punctuality_score: 5,
        quality_of_work_score: 5,
        customer_service_score: 5,
        teamwork_score: 5,
        initiative_score: 5,
        strengths: 'Excellent coffee knowledge',
        areas_for_improvement: 'Time management',
        goals: 'Become shift supervisor',
        evaluator_comments: 'Outstanding performance',
      };

      const result = await service.create(createDto, 'org_1');

      expect(result.strengths).toBe('Excellent coffee knowledge');
      expect(result.areas_for_improvement).toBe('Time management');
      expect(result.goals).toBe('Become shift supervisor');
      expect(result.evaluator_comments).toBe('Outstanding performance');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-01-31',
        overall_rating: PerformanceRating.GOOD,
        punctuality_score: 4,
        quality_of_work_score: 5,
        customer_service_score: 4,
        teamwork_score: 5,
        initiative_score: 4,
      }, 'org_1');

      await service.create({
        employee_id: 'emp_2',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.QUARTERLY,
        evaluation_date: '2025-03-31',
        overall_rating: PerformanceRating.EXCELLENT,
        punctuality_score: 5,
        quality_of_work_score: 5,
        customer_service_score: 5,
        teamwork_score: 5,
        initiative_score: 5,
      }, 'org_1');

      await service.create({
        employee_id: 'emp_3',
        evaluator_user_id: 'mgr_2',
        period: EvaluationPeriod.ANNUAL,
        evaluation_date: '2024-12-31',
        overall_rating: PerformanceRating.SATISFACTORY,
        punctuality_score: 3,
        quality_of_work_score: 3,
        customer_service_score: 3,
        teamwork_score: 3,
        initiative_score: 3,
      }, 'org_2');
    });

    it('should return all evaluations when no filters', async () => {
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

    it('should filter by period', async () => {
      const result = await service.findAll({ period: EvaluationPeriod.MONTHLY });
      expect(result).toHaveLength(1);
    });

    it('should filter by rating', async () => {
      const result = await service.findAll({ rating: PerformanceRating.EXCELLENT });
      expect(result).toHaveLength(1);
    });
  });

  describe('getEmployeeHistory', () => {
    beforeEach(async () => {
      await service.create({
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-01-31',
        overall_rating: PerformanceRating.GOOD,
        punctuality_score: 4,
        quality_of_work_score: 5,
        customer_service_score: 4,
        teamwork_score: 5,
        initiative_score: 4,
      }, 'org_1');

      await service.create({
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-02-28',
        overall_rating: PerformanceRating.EXCELLENT,
        punctuality_score: 5,
        quality_of_work_score: 5,
        customer_service_score: 5,
        teamwork_score: 5,
        initiative_score: 5,
      }, 'org_1');
    });

    it('should return employee evaluation history', async () => {
      const result = await service.getEmployeeHistory('emp_1');
      expect(result).toHaveLength(2);
    });

    it('should sort by date descending', async () => {
      const result = await service.getEmployeeHistory('emp_1');
      expect(result[0].evaluation_date.getMonth()).toBe(1); // February (0-indexed)
      expect(result[1].evaluation_date.getMonth()).toBe(0); // January
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-01-31',
        overall_rating: PerformanceRating.GOOD,
        punctuality_score: 4,
        quality_of_work_score: 4,
        customer_service_score: 4,
        teamwork_score: 4,
        initiative_score: 4,
      }, 'org_1');

      await service.create({
        employee_id: 'emp_2',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.QUARTERLY,
        evaluation_date: '2025-03-31',
        overall_rating: PerformanceRating.EXCELLENT,
        punctuality_score: 5,
        quality_of_work_score: 5,
        customer_service_score: 5,
        teamwork_score: 5,
        initiative_score: 5,
      }, 'org_1');
    });

    it('should return evaluation statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(2);
      expect(stats.avg_overall_score).toBe(4.5); // (4+5)/2
    });

    it('should group by rating', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_rating[PerformanceRating.GOOD]).toBe(1);
      expect(stats.by_rating[PerformanceRating.EXCELLENT]).toBe(1);
    });

    it('should calculate average scores per category', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.avg_punctuality).toBe(4.5);
      expect(stats.avg_quality_of_work).toBe(4.5);
      expect(stats.avg_customer_service).toBe(4.5);
      expect(stats.avg_teamwork).toBe(4.5);
      expect(stats.avg_initiative).toBe(4.5);
    });
  });

  describe('delete', () => {
    it('should delete evaluation', async () => {
      const evaluation = await service.create({
        employee_id: 'emp_1',
        evaluator_user_id: 'mgr_1',
        period: EvaluationPeriod.MONTHLY,
        evaluation_date: '2025-01-31',
        overall_rating: PerformanceRating.GOOD,
        punctuality_score: 4,
        quality_of_work_score: 5,
        customer_service_score: 4,
        teamwork_score: 5,
        initiative_score: 4,
      }, 'org_1');

      await service.delete(evaluation.id);
      const result = await service.findOne(evaluation.id);
      expect(result).toBeNull();
    });
  });
});
