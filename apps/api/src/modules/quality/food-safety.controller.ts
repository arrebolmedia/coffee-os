import { Controller, Get, Query } from '@nestjs/common';
import { FoodSafetyService } from './food-safety.service';
import { QueryIncidentsDto } from './dto';
import { FoodSafetyIncident } from './interfaces';

/**
 * Food-safety incidents are currently NOT persisted (no Prisma model). To
 * avoid exposing endpoints that would silently lose data, only the read
 * endpoints — all of which return empty results — are routed. Write
 * endpoints (POST/PATCH/DELETE incidents) will reappear once the
 * `FoodSafetyIncident` model is added to the schema.
 */
@Controller('quality/food-safety')
export class FoodSafetyController {
  constructor(private readonly foodSafetyService: FoodSafetyService) {}

  @Get('incidents')
  async findAll(
    @Query() query: QueryIncidentsDto,
  ): Promise<FoodSafetyIncident[]> {
    return this.foodSafetyService.findAll(query);
  }

  @Get('incidents/critical')
  async getCritical(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<FoodSafetyIncident[]> {
    return this.foodSafetyService.getCriticalIncidents(
      organizationId,
      locationId,
    );
  }

  @Get('stats')
  async getStats(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.foodSafetyService.getStats(organizationId, locationId);
  }
}
