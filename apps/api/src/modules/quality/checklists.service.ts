import { Injectable } from '@nestjs/common';
import { CreateChecklistDto, CompleteChecklistDto, QueryChecklistsDto } from './dto';
import { Checklist, ChecklistItem } from './interfaces';

@Injectable()
export class ChecklistsService {
  private checklists: Map<string, Checklist> = new Map();

  async create(createChecklistDto: CreateChecklistDto): Promise<Checklist> {
    const id = this.generateId();
    const now = new Date();

    const checklistItems: ChecklistItem[] = createChecklistDto.items.map((item) => ({
      id: this.generateId(),
      description: item.description,
      category: item.category,
      regulation_reference: item.regulation_reference,
      notes: item.notes,
      completed: false,
    }));

    const checklist: Checklist = {
      id,
      name: createChecklistDto.name,
      type: createChecklistDto.type,
      location_id: createChecklistDto.location_id,
      organization_id: createChecklistDto.organization_id,
      scheduled_date: createChecklistDto.scheduled_date ? new Date(createChecklistDto.scheduled_date) : undefined,
      description: createChecklistDto.description,
      items: checklistItems,
      completed: false,
      completion_percentage: 0,
      created_at: now,
      updated_at: now,
    };

    this.checklists.set(id, checklist);
    return checklist;
  }

  async findAll(query: QueryChecklistsDto): Promise<Checklist[]> {
    let checklists = Array.from(this.checklists.values());

    if (query.location_id) {
      checklists = checklists.filter((c) => c.location_id === query.location_id);
    }

    if (query.organization_id) {
      checklists = checklists.filter((c) => c.organization_id === query.organization_id);
    }

    if (query.type) {
      checklists = checklists.filter((c) => c.type === query.type);
    }

    if (query.category) {
      checklists = checklists.filter((c) =>
        c.items.some((item) => item.category === query.category),
      );
    }

    if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true';
      checklists = checklists.filter((c) => c.completed === isCompleted);
    }

    if (query.start_date) {
      const startDate = new Date(query.start_date);
      checklists = checklists.filter((c) => c.created_at >= startDate);
    }

    if (query.end_date) {
      const endDate = new Date(query.end_date);
      checklists = checklists.filter((c) => c.created_at <= endDate);
    }

    return checklists;
  }

  async findOne(id: string): Promise<Checklist | null> {
    return this.checklists.get(id) || null;
  }

  async complete(id: string, completeDto: CompleteChecklistDto): Promise<Checklist> {
    const checklist = this.checklists.get(id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const now = new Date();

    // Update each item completion status
    completeDto.items.forEach((completion) => {
      const item = checklist.items.find((i) => i.id === completion.item_id);
      if (item) {
        item.completed = completion.completed;
        item.completed_at = completion.completed ? now : undefined;
        item.completed_by = completion.completed ? completeDto.completed_by_user_id : undefined;
        item.completion_notes = completion.notes;
        item.photo_url = completion.photo_url;
      }
    });

    // Calculate completion percentage
    const completedItems = checklist.items.filter((i) => i.completed).length;
    checklist.completion_percentage = Math.round((completedItems / checklist.items.length) * 100);
    checklist.completed = checklist.completion_percentage === 100;

    if (checklist.completed) {
      checklist.completed_at = now;
      checklist.completed_by_user_id = completeDto.completed_by_user_id;
    }

    checklist.updated_at = now;

    this.checklists.set(id, checklist);
    return checklist;
  }

  async delete(id: string): Promise<void> {
    this.checklists.delete(id);
  }

  async getComplianceStats(organizationId: string, locationId?: string): Promise<any> {
    let checklists = Array.from(this.checklists.values()).filter(
      (c) => c.organization_id === organizationId,
    );

    if (locationId) {
      checklists = checklists.filter((c) => c.location_id === locationId);
    }

    const total = checklists.length;
    const completed = checklists.filter((c) => c.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byType = checklists.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgCompletionPercentage =
      total > 0
        ? Math.round(
            checklists.reduce((sum, c) => sum + c.completion_percentage, 0) / total,
          )
        : 0;

    return {
      total,
      completed,
      pending,
      completion_rate: completionRate,
      by_type: byType,
      avg_completion_percentage: avgCompletionPercentage,
    };
  }

  private generateId(): string {
    return `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
