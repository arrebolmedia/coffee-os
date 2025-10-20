import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistsService } from '../checklists.service';
import { CreateChecklistDto, ChecklistType, ChecklistCategory, CompleteChecklistDto } from '../dto';

describe('ChecklistsService', () => {
  let service: ChecklistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChecklistsService],
    }).compile();

    service = module.get<ChecklistsService>(ChecklistsService);
  });

  afterEach(() => {
    // Clear all checklists after each test
    service['checklists'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a checklist successfully', async () => {
      const createDto: CreateChecklistDto = {
        name: 'Checklist Diario de Limpieza',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          {
            description: 'Limpiar mesas y sillas',
            category: ChecklistCategory.CLEANING,
            regulation_reference: 'NOM-251-SSA1-2009 Art. 5.1',
          },
          {
            description: 'Verificar temperatura de refrigerador',
            category: ChecklistCategory.TEMPERATURE,
            regulation_reference: 'NOM-251-SSA1-2009 Art. 5.2',
          },
        ],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.type).toBe(ChecklistType.DAILY);
      expect(result.items).toHaveLength(2);
      expect(result.completion_percentage).toBe(0);
      expect(result.completed).toBe(false);
    });

    it('should create checklist with scheduled date', async () => {
      const scheduledDate = '2025-10-25T09:00:00Z';
      const createDto: CreateChecklistDto = {
        name: 'Checklist Semanal',
        type: ChecklistType.WEEKLY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          {
            description: 'Verificar extintores',
            category: ChecklistCategory.EQUIPMENT,
          },
        ],
        scheduled_date: scheduledDate,
      };

      const result = await service.create(createDto);

      expect(result.scheduled_date).toEqual(new Date(scheduledDate));
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        name: 'Checklist 1',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task 1', category: ChecklistCategory.CLEANING },
        ],
      });

      await service.create({
        name: 'Checklist 2',
        type: ChecklistType.WEEKLY,
        location_id: 'loc_2',
        organization_id: 'org_1',
        items: [
          { description: 'Task 2', category: ChecklistCategory.FOOD_SAFETY },
        ],
      });

      await service.create({
        name: 'Checklist 3',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_2',
        items: [
          { description: 'Task 3', category: ChecklistCategory.HYGIENE },
        ],
      });
    });

    it('should return all checklists when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by location_id', async () => {
      const result = await service.findAll({ location_id: 'loc_1' });
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.location_id === 'loc_1')).toBe(true);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const result = await service.findAll({ type: ChecklistType.DAILY });
      expect(result).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const result = await service.findAll({ category: ChecklistCategory.CLEANING });
      expect(result).toHaveLength(1);
    });

    it('should filter by completion status', async () => {
      const result = await service.findAll({ completed: 'false' });
      expect(result).toHaveLength(3);
    });
  });

  describe('findOne', () => {
    it('should return a checklist by id', async () => {
      const created = await service.create({
        name: 'Test Checklist',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task', category: ChecklistCategory.CLEANING },
        ],
      });

      const result = await service.findOne(created.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.findOne('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('complete', () => {
    it('should complete checklist items', async () => {
      const checklist = await service.create({
        name: 'Test Checklist',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task 1', category: ChecklistCategory.CLEANING },
          { description: 'Task 2', category: ChecklistCategory.HYGIENE },
        ],
      });

      const completeDto: CompleteChecklistDto = {
        completed_by_user_id: 'user_1',
        items: [
          {
            item_id: checklist.items[0].id,
            completed: true,
            notes: 'Completado correctamente',
          },
        ],
      };

      const result = await service.complete(checklist.id, completeDto);

      expect(result.items[0].completed).toBe(true);
      expect(result.items[0].completion_notes).toBe('Completado correctamente');
      expect(result.completion_percentage).toBe(50);
      expect(result.completed).toBe(false);
    });

    it('should mark checklist as completed when all items done', async () => {
      const checklist = await service.create({
        name: 'Test Checklist',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task 1', category: ChecklistCategory.CLEANING },
          { description: 'Task 2', category: ChecklistCategory.HYGIENE },
        ],
      });

      const completeDto: CompleteChecklistDto = {
        completed_by_user_id: 'user_1',
        items: [
          { item_id: checklist.items[0].id, completed: true },
          { item_id: checklist.items[1].id, completed: true },
        ],
      };

      const result = await service.complete(checklist.id, completeDto);

      expect(result.completion_percentage).toBe(100);
      expect(result.completed).toBe(true);
      expect(result.completed_at).toBeDefined();
      expect(result.completed_by_user_id).toBe('user_1');
    });

    it('should throw error for non-existent checklist', async () => {
      const completeDto: CompleteChecklistDto = {
        completed_by_user_id: 'user_1',
        items: [],
      };

      await expect(service.complete('non_existent', completeDto)).rejects.toThrow(
        'Checklist not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete a checklist', async () => {
      const checklist = await service.create({
        name: 'Test Checklist',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task', category: ChecklistCategory.CLEANING },
        ],
      });

      await service.delete(checklist.id);
      const result = await service.findOne(checklist.id);
      expect(result).toBeNull();
    });
  });

  describe('getComplianceStats', () => {
    beforeEach(async () => {
      const checklist1 = await service.create({
        name: 'Checklist 1',
        type: ChecklistType.DAILY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task 1', category: ChecklistCategory.CLEANING },
        ],
      });

      await service.complete(checklist1.id, {
        completed_by_user_id: 'user_1',
        items: [{ item_id: checklist1.items[0].id, completed: true }],
      });

      await service.create({
        name: 'Checklist 2',
        type: ChecklistType.WEEKLY,
        location_id: 'loc_1',
        organization_id: 'org_1',
        items: [
          { description: 'Task 2', category: ChecklistCategory.HYGIENE },
        ],
      });
    });

    it('should return compliance statistics', async () => {
      const stats = await service.getComplianceStats('org_1');

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.completion_rate).toBe(50);
    });

    it('should filter stats by location', async () => {
      await service.create({
        name: 'Checklist 3',
        type: ChecklistType.DAILY,
        location_id: 'loc_2',
        organization_id: 'org_1',
        items: [
          { description: 'Task 3', category: ChecklistCategory.CLEANING },
        ],
      });

      const stats = await service.getComplianceStats('org_1', 'loc_1');

      expect(stats.total).toBe(2);
    });

    it('should group by type', async () => {
      const stats = await service.getComplianceStats('org_1');

      expect(stats.by_type).toBeDefined();
      expect(stats.by_type[ChecklistType.DAILY]).toBe(1);
      expect(stats.by_type[ChecklistType.WEEKLY]).toBe(1);
    });
  });
});
