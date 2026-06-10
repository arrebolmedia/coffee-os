import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  CreateFoodSafetyIncidentDto,
  QueryIncidentsDto,
  ResolveIncidentDto,
} from './dto';
import { FoodSafetyIncident } from './interfaces';

/**
 * FoodSafetyService — stub implementation.
 *
 * There is no Prisma model for food-safety incidents in the current schema.
 * Read operations return empty results; write operations throw NotImplementedException
 * so callers receive an honest error instead of silently losing data.
 *
 * To fully implement this service, add a FoodSafetyIncident model to the Prisma
 * schema and run `prisma migrate dev`.
 */
@Injectable()
export class FoodSafetyService {
  async create(
    _createDto: CreateFoodSafetyIncidentDto,
  ): Promise<FoodSafetyIncident> {
    throw new NotImplementedException(
      'FoodSafetyIncident model does not exist in the database schema. Add it to schema.prisma and run prisma migrate.',
    );
  }

  async findAll(_query: QueryIncidentsDto): Promise<FoodSafetyIncident[]> {
    return [];
  }

  async findOne(_id: string): Promise<FoodSafetyIncident | null> {
    return null;
  }

  async resolve(
    _id: string,
    _resolveDto: ResolveIncidentDto,
  ): Promise<FoodSafetyIncident> {
    throw new NotImplementedException(
      'FoodSafetyIncident model does not exist in the database schema.',
    );
  }

  async delete(_id: string): Promise<void> {
    throw new NotImplementedException(
      'FoodSafetyIncident model does not exist in the database schema.',
    );
  }

  async getStats(_organizationId: string, _locationId?: string): Promise<any> {
    return {
      total: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      by_severity: {},
      by_type: {},
      avg_resolution_hours: 0,
    };
  }

  async getCriticalIncidents(
    _organizationId: string,
    _locationId?: string,
  ): Promise<FoodSafetyIncident[]> {
    return [];
  }
}
