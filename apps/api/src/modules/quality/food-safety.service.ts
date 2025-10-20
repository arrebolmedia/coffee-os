import { Injectable } from '@nestjs/common';
import { CreateFoodSafetyIncidentDto, ResolveIncidentDto, QueryIncidentsDto, IncidentStatus } from './dto';
import { FoodSafetyIncident } from './interfaces';

@Injectable()
export class FoodSafetyService {
  private incidents: Map<string, FoodSafetyIncident> = new Map();

  async create(createDto: CreateFoodSafetyIncidentDto): Promise<FoodSafetyIncident> {
    const id = this.generateId();
    const now = new Date();

    const incident: FoodSafetyIncident = {
      id,
      location_id: createDto.location_id,
      organization_id: createDto.organization_id,
      type: createDto.type,
      severity: createDto.severity,
      status: IncidentStatus.OPEN,
      description: createDto.description,
      product_affected: createDto.product_affected,
      location_detail: createDto.location_detail,
      reported_by_user_id: createDto.reported_by_user_id,
      reported_at: now,
      incident_date: createDto.incident_date ? new Date(createDto.incident_date) : now,
      photo_urls: createDto.photo_urls,
      immediate_action_taken: createDto.immediate_action_taken,
      created_at: now,
      updated_at: now,
    };

    this.incidents.set(id, incident);
    return incident;
  }

  async findAll(query: QueryIncidentsDto): Promise<FoodSafetyIncident[]> {
    let incidents = Array.from(this.incidents.values());

    if (query.location_id) {
      incidents = incidents.filter((i) => i.location_id === query.location_id);
    }

    if (query.organization_id) {
      incidents = incidents.filter((i) => i.organization_id === query.organization_id);
    }

    if (query.type) {
      incidents = incidents.filter((i) => i.type === query.type);
    }

    if (query.severity) {
      incidents = incidents.filter((i) => i.severity === query.severity);
    }

    if (query.status) {
      incidents = incidents.filter((i) => i.status === query.status);
    }

    if (query.start_date) {
      const startDate = new Date(query.start_date);
      incidents = incidents.filter((i) => i.incident_date >= startDate);
    }

    if (query.end_date) {
      const endDate = new Date(query.end_date);
      incidents = incidents.filter((i) => i.incident_date <= endDate);
    }

    return incidents.sort((a, b) => b.incident_date.getTime() - a.incident_date.getTime());
  }

  async findOne(id: string): Promise<FoodSafetyIncident | null> {
    return this.incidents.get(id) || null;
  }

  async resolve(id: string, resolveDto: ResolveIncidentDto): Promise<FoodSafetyIncident> {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new Error('Incident not found');
    }

    const now = new Date();

    incident.status = resolveDto.status;
    incident.resolution_notes = resolveDto.resolution_notes;
    incident.corrective_action = resolveDto.corrective_action;
    incident.preventive_action = resolveDto.preventive_action;
    incident.resolved_by_user_id = resolveDto.resolved_by_user_id;
    incident.resolved_at = now;
    incident.resolution_photo_urls = resolveDto.resolution_photo_urls;
    incident.updated_at = now;

    this.incidents.set(id, incident);
    return incident;
  }

  async delete(id: string): Promise<void> {
    this.incidents.delete(id);
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    let incidents = Array.from(this.incidents.values()).filter(
      (i) => i.organization_id === organizationId,
    );

    if (locationId) {
      incidents = incidents.filter((i) => i.location_id === locationId);
    }

    const total = incidents.length;
    const open = incidents.filter((i) => i.status === 'OPEN').length;
    const inProgress = incidents.filter((i) => i.status === 'IN_PROGRESS').length;
    const resolved = incidents.filter((i) => i.status === 'RESOLVED').length;
    const closed = incidents.filter((i) => i.status === 'CLOSED').length;

    const bySeverity = incidents.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = incidents.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average resolution time for resolved incidents
    const resolvedIncidents = incidents.filter((i) => i.resolved_at);
    const avgResolutionHours =
      resolvedIncidents.length > 0
        ? Math.round(
            resolvedIncidents.reduce((sum, i) => {
              const hours =
                (i.resolved_at.getTime() - i.reported_at.getTime()) / (1000 * 60 * 60);
              return sum + hours;
            }, 0) / resolvedIncidents.length,
          )
        : 0;

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      closed,
      by_severity: bySeverity,
      by_type: byType,
      avg_resolution_hours: avgResolutionHours,
    };
  }

  async getCriticalIncidents(organizationId: string, locationId?: string): Promise<FoodSafetyIncident[]> {
    let incidents = Array.from(this.incidents.values()).filter(
      (i) => i.organization_id === organizationId && i.severity === 'CRITICAL' && i.status !== 'CLOSED',
    );

    if (locationId) {
      incidents = incidents.filter((i) => i.location_id === locationId);
    }

    return incidents.sort((a, b) => b.incident_date.getTime() - a.incident_date.getTime());
  }

  private generateId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
