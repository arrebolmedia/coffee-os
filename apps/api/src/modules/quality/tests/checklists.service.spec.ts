import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChecklistsService } from '../checklists.service';
import {
  ChecklistCategory,
  ChecklistType,
  CompleteChecklistDto,
  CreateChecklistDto,
} from '../dto';
import { PrismaService } from '../../database/prisma.service';

const ITEM_1_ID = 'item_id_1';
const ITEM_2_ID = 'item_id_2';

function makeChecklist(overrides: Partial<any> = {}) {
  return {
    id: 'cl_1',
    name: 'Test Checklist',
    description: null,
    scope: 'OPENING',
    frequency: 'daily',
    active: true,
    createdAt: new Date('2025-10-01T00:00:00Z'),
    updatedAt: new Date('2025-10-01T00:00:00Z'),
    items: [
      {
        id: ITEM_1_ID,
        checklistId: 'cl_1',
        label: 'Limpiar mesas',
        description: 'NOM-251 Art. 5.1',
        type: 'BOOLEAN',
        required: true,
        sortOrder: 0,
        minValue: null,
        maxValue: null,
        unit: null,
        active: true,
      },
    ],
    taskRuns: [],
    ...overrides,
  };
}

const prismaMock = {
  checklist: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  taskRun: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  taskRunResponse: {
    upsert: jest.fn(),
  },
};

describe('ChecklistsService', () => {
  let service: ChecklistsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ChecklistsService>(ChecklistsService);
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

      const record = makeChecklist({
        name: createDto.name,
        items: [
          {
            id: ITEM_1_ID,
            checklistId: 'cl_1',
            label: 'Limpiar mesas y sillas',
            description: 'NOM-251-SSA1-2009 Art. 5.1',
            type: 'BOOLEAN',
            required: true,
            sortOrder: 0,
            minValue: null,
            maxValue: null,
            unit: null,
            active: true,
          },
          {
            id: ITEM_2_ID,
            checklistId: 'cl_1',
            label: 'Verificar temperatura de refrigerador',
            description: 'NOM-251-SSA1-2009 Art. 5.2',
            type: 'BOOLEAN',
            required: true,
            sortOrder: 1,
            minValue: null,
            maxValue: null,
            unit: null,
            active: true,
          },
        ],
      });

      prismaMock.checklist.create.mockResolvedValue(record);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('cl_1');
      expect(result.name).toBe(createDto.name);
      expect(result.type).toBe(ChecklistType.DAILY);
      expect(result.items).toHaveLength(2);
      expect(result.completion_percentage).toBe(0);
      expect(result.completed).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all checklists when no filters', async () => {
      prismaMock.checklist.findMany.mockResolvedValue([
        makeChecklist({ id: 'cl_1', scope: 'OPENING' }),
        makeChecklist({ id: 'cl_2', scope: 'MID_SHIFT' }),
        makeChecklist({ id: 'cl_3', scope: 'OPENING' }),
      ]);

      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by location_id via taskRuns (where clause)', async () => {
      // location_id is now pushed into the Prisma where clause via the
      // taskRuns relation, so the database returns only matching records.
      prismaMock.checklist.findMany.mockResolvedValue([
        makeChecklist({
          id: 'cl_1',
          taskRuns: [
            {
              id: 'tr_1',
              locationId: 'loc_1',
              status: 'COMPLETED',
              completedAt: new Date(),
              userId: 'u1',
            },
          ],
        }),
      ]);

      const result = await service.findAll({ location_id: 'loc_1' });

      expect(prismaMock.checklist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskRuns: { some: { locationId: 'loc_1' } },
          }),
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].location_id).toBe('loc_1');
    });

    it('should filter by type via scope mapping', async () => {
      prismaMock.checklist.findMany.mockResolvedValue([
        makeChecklist({ id: 'cl_1', scope: 'OPENING' }),
      ]);

      await service.findAll({ type: ChecklistType.DAILY });

      expect(prismaMock.checklist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scope: 'OPENING' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a checklist by id', async () => {
      prismaMock.checklist.findUnique.mockResolvedValue(makeChecklist());

      const result = await service.findOne('cl_1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('cl_1');
    });

    it('should return null for non-existent id', async () => {
      prismaMock.checklist.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('complete', () => {
    it('should throw NotFoundException for non-existent checklist', async () => {
      prismaMock.checklist.findUnique.mockResolvedValue(null);

      const completeDto: CompleteChecklistDto = {
        completed_by_user_id: 'user_1',
        items: [],
      };

      await expect(
        service.complete('non_existent', completeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update items and return completion data', async () => {
      const checklist = makeChecklist({
        items: [
          {
            id: ITEM_1_ID,
            label: 'Task 1',
            type: 'BOOLEAN',
            required: true,
            sortOrder: 0,
            active: true,
            description: null,
            checklistId: 'cl_1',
            minValue: null,
            maxValue: null,
            unit: null,
          },
          {
            id: ITEM_2_ID,
            label: 'Task 2',
            type: 'BOOLEAN',
            required: true,
            sortOrder: 1,
            active: true,
            description: null,
            checklistId: 'cl_1',
            minValue: null,
            maxValue: null,
            unit: null,
          },
        ],
      });

      // findUnique called twice: once for checklist lookup, once after upserts
      prismaMock.checklist.findUnique
        .mockResolvedValueOnce(checklist)
        .mockResolvedValueOnce(checklist);
      prismaMock.taskRun.findFirst.mockResolvedValue(null);

      const completeDto: CompleteChecklistDto = {
        completed_by_user_id: 'user_1',
        items: [
          { item_id: ITEM_1_ID, completed: true, notes: 'Done' },
          { item_id: ITEM_2_ID, completed: true },
        ],
      };

      const result = await service.complete('cl_1', completeDto);

      expect(result.completion_percentage).toBe(100);
      expect(result.completed).toBe(true);
      expect(result.completed_by_user_id).toBe('user_1');
    });
  });

  describe('delete', () => {
    it('should call prisma delete', async () => {
      prismaMock.checklist.delete.mockResolvedValue({});

      await service.delete('cl_1');

      expect(prismaMock.checklist.delete).toHaveBeenCalledWith({
        where: { id: 'cl_1' },
      });
    });
  });

  describe('getComplianceStats', () => {
    it('should return compliance statistics', async () => {
      prismaMock.checklist.findMany.mockResolvedValue([
        makeChecklist({
          id: 'cl_1',
          scope: 'OPENING',
          taskRuns: [
            { status: 'COMPLETED', userId: 'u1', completedAt: new Date() },
          ],
        }),
        makeChecklist({ id: 'cl_2', scope: 'MID_SHIFT', taskRuns: [] }),
      ]);

      const stats = await service.getComplianceStats('org_1');

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.completion_rate).toBe(50);
    });

    it('should group by type', async () => {
      prismaMock.checklist.findMany.mockResolvedValue([
        makeChecklist({ id: 'cl_1', scope: 'OPENING', taskRuns: [] }),
        makeChecklist({ id: 'cl_2', scope: 'MID_SHIFT', taskRuns: [] }),
      ]);

      const stats = await service.getComplianceStats('org_1');

      expect(stats.by_type).toBeDefined();
      expect(stats.by_type[ChecklistType.DAILY]).toBe(1);
      expect(stats.by_type[ChecklistType.WEEKLY]).toBe(1);
    });
  });
});
