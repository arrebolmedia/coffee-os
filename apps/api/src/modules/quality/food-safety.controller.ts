import { Controller, Get, Query } from '@nestjs/common';
import { FoodSafetyService } from './food-safety.service';
import { QueryIncidentsDto } from './dto';
import { FoodSafetyIncident } from './interfaces';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

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
    @CurrentOrg() organizationId: string,
  ): Promise<FoodSafetyIncident[]> {
    return this.foodSafetyService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('incidents/critical')
  async getCritical(
    @CurrentOrg() organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<FoodSafetyIncident[]> {
    return this.foodSafetyService.getCriticalIncidents(
      organizationId,
      locationId,
    );
  }

  @Get('stats')
  async getStats(
    @CurrentOrg() organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.foodSafetyService.getStats(organizationId, locationId);
  }
}
