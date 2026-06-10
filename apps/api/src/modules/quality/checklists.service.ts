import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ChecklistType,
  CompleteChecklistDto,
  CreateChecklistDto,
  QueryChecklistsDto,
} from './dto';
import { Checklist, ChecklistItem } from './interfaces';
import { PrismaService } from '../database/prisma.service';

// The domain DTO uses `ChecklistType` (DAILY/WEEKLY/MONTHLY/CUSTOM) but the
// Prisma schema only has `ChecklistScope` (OPENING/CLOSING/MID_SHIFT/NOM_251/
// SAFETY/MAINTENANCE). Until the schema gains a real `type` column we map
// each DTO type to the nearest scope so callers can still query/filter, but
// this is lossy: WEEKLY/MONTHLY/CUSTOM all collide with their scope buddies.
// TODO(schema): add `type ChecklistType` column to `Checklist` and migrate.
const TYPE_TO_SCOPE: Record<string, string> = {
  DAILY: 'OPENING',
  WEEKLY: 'MID_SHIFT',
  MONTHLY: 'CLOSING',
  CUSTOM: 'SAFETY',
};

const SCOPE_TO_TYPE: Record<string, ChecklistType> = {
  OPENING: ChecklistType.DAILY,
  MID_SHIFT: ChecklistType.WEEKLY,
  CLOSING: ChecklistType.MONTHLY,
  NOM_251: ChecklistType.CUSTOM,
  SAFETY: ChecklistType.CUSTOM,
  MAINTENANCE: ChecklistType.CUSTOM,
};

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChecklistDto: CreateChecklistDto): Promise<Checklist> {
    const scope = TYPE_TO_SCOPE[createChecklistDto.type] ?? 'SAFETY';

    const created = await this.prisma.checklist.create({
      data: {
        name: createChecklistDto.name,
        description: createChecklistDto.description,
        scope: scope as any,
        frequency: createChecklistDto.type.toLowerCase(),
        items: {
          create: createChecklistDto.items.map((item, index) => ({
            label: item.description,
            description: item.regulation_reference ?? item.notes,
            type: 'BOOLEAN' as any,
            required: true,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });

    return this.toChecklistInterface(
      created,
      createChecklistDto.location_id,
      createChecklistDto.organization_id,
    );
  }

  async findAll(query: QueryChecklistsDto): Promise<Checklist[]> {
    const where: any = {};

    if (query.type) {
      where.scope = TYPE_TO_SCOPE[query.type];
    }

    if (query.start_date) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.start_date) };
    }

    if (query.end_date) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.end_date) };
    }

    // location_id and completed both filter via the taskRuns relation.
    // Combine them into a single `some` predicate so the database does the work.
    const taskRunPredicate: any = {};
    if (query.location_id) taskRunPredicate.locationId = query.location_id;

    if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true';
      if (isCompleted) {
        where.taskRuns = { some: { ...taskRunPredicate, status: 'COMPLETED' } };
      } else if (query.location_id) {
        // "not completed at this location": there's at least one run at this
        // location AND no completed run at this location.
        where.AND = [
          { taskRuns: { some: { locationId: query.location_id } } },
          {
            taskRuns: {
              none: { locationId: query.location_id, status: 'COMPLETED' },
            },
          },
        ];
      } else {
        where.taskRuns = { none: { status: 'COMPLETED' } };
      }
    } else if (query.location_id) {
      where.taskRuns = { some: taskRunPredicate };
    }

    const records = await this.prisma.checklist.findMany({
      where,
      include: { items: true, taskRuns: true },
    });

    return records.map((c) =>
      this.toChecklistInterface(c, query.location_id, query.organization_id),
    );
  }

  async findOne(id: string): Promise<Checklist | null> {
    const record = await this.prisma.checklist.findUnique({
      where: { id },
      include: { items: true, taskRuns: true },
    });

    if (!record) return null;
    return this.toChecklistInterface(record);
  }

  async complete(
    id: string,
    completeDto: CompleteChecklistDto,
  ): Promise<Checklist> {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Find or create an in-progress TaskRun for this checklist
    // We need a locationId — fall back to a placeholder if not provided
    const existingRun = await this.prisma.taskRun.findFirst({
      where: { checklistId: id, status: 'IN_PROGRESS' },
      include: { responses: true },
    });

    const totalItems = checklist.items.length;
    const completedCount = completeDto.items.filter((i) => i.completed).length;
    const allCompleted = completedCount === totalItems;

    if (existingRun) {
      // Upsert responses and update status
      await Promise.all(
        completeDto.items.map((completion) =>
          this.prisma.taskRunResponse.upsert({
            where: {
              taskRunId_checklistItemId: {
                taskRunId: existingRun.id,
                checklistItemId: completion.item_id,
              },
            },
            create: {
              taskRunId: existingRun.id,
              checklistItemId: completion.item_id,
              booleanValue: completion.completed,
              textValue: completion.notes,
            },
            update: {
              booleanValue: completion.completed,
              textValue: completion.notes,
            },
          }),
        ),
      );

      if (allCompleted) {
        await this.prisma.taskRun.update({
          where: { id: existingRun.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }
    }

    const updated = await this.prisma.checklist.findUnique({
      where: { id },
      include: { items: true, taskRuns: true },
    });

    const result = this.toChecklistInterface(updated!);
    // Overlay completion data from dto
    result.items = result.items.map((item) => {
      const completion = completeDto.items.find((c) => c.item_id === item.id);
      if (completion) {
        return {
          ...item,
          completed: completion.completed,
          completed_at: completion.completed ? new Date() : undefined,
          completed_by: completion.completed
            ? completeDto.completed_by_user_id
            : undefined,
          completion_notes: completion.notes,
          photo_url: completion.photo_url,
        };
      }
      return item;
    });
    result.completion_percentage = Math.round(
      (completedCount / Math.max(totalItems, 1)) * 100,
    );
    result.completed = allCompleted;
    if (allCompleted) {
      result.completed_at = new Date();
      result.completed_by_user_id = completeDto.completed_by_user_id;
    }
    result.updated_at = new Date();

    return result;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.checklist.delete({ where: { id } });
  }

  async getComplianceStats(
    organizationId: string,
    locationId?: string,
  ): Promise<any> {
    const where: any = {};
    if (locationId) {
      where.taskRuns = { some: { locationId } };
    }

    const records = await this.prisma.checklist.findMany({
      where,
      include: { taskRuns: true },
    });

    const total = records.length;
    const completed = records.filter((c) =>
      (c as any).taskRuns.some((r: any) => r.status === 'COMPLETED'),
    ).length;
    const pending = total - completed;
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const byType = records.reduce(
      (acc, c) => {
        const type = SCOPE_TO_TYPE[(c as any).scope] ?? ChecklistType.CUSTOM;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      completed,
      pending,
      completion_rate: completionRate,
      by_type: byType,
      avg_completion_percentage: completionRate,
    };
  }

  // Maps a Prisma checklist record to the domain interface
  private toChecklistInterface(
    record: any,
    locationId?: string,
    organizationId?: string,
  ): Checklist {
    const items: ChecklistItem[] = (record.items ?? []).map((item: any) => ({
      id: item.id,
      description: item.label,
      // The Prisma ChecklistItem model has no `category` column, so we cannot
      // round-trip the original CreateDto category. Return null rather than
      // pretending every item is CLEANING. TODO(schema): add category column.
      category: null,
      regulation_reference: item.description ?? undefined,
      notes: undefined,
      completed: false,
    }));

    const taskRuns: any[] = record.taskRuns ?? [];
    const completedRun = taskRuns.find((r) => r.status === 'COMPLETED');

    return {
      id: record.id,
      name: record.name,
      type: SCOPE_TO_TYPE[record.scope] ?? ChecklistType.CUSTOM,
      location_id: locationId ?? taskRuns[0]?.locationId ?? '',
      organization_id: organizationId ?? '',
      description: record.description ?? undefined,
      items,
      completed: !!completedRun,
      completed_at: completedRun?.completedAt ?? undefined,
      completed_by_user_id: completedRun?.userId ?? undefined,
      completion_percentage: completedRun ? 100 : 0,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }
}
