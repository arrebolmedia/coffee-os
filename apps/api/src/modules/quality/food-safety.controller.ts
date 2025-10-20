import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FoodSafetyService } from './food-safety.service';
import { CreateFoodSafetyIncidentDto, ResolveIncidentDto, QueryIncidentsDto } from './dto';
import { FoodSafetyIncident } from './interfaces';

@Controller('quality/food-safety')
export class FoodSafetyController {
  constructor(private readonly foodSafetyService: FoodSafetyService) {}

  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateFoodSafetyIncidentDto): Promise<FoodSafetyIncident> {
    return this.foodSafetyService.create(createDto);
  }

  @Get('incidents')
  async findAll(@Query() query: QueryIncidentsDto): Promise<FoodSafetyIncident[]> {
    return this.foodSafetyService.findAll(query);
  }

  @Get('incidents/critical')
  async getCritical(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<FoodSafetyIncident[]> {
    return this.foodSafetyService.getCriticalIncidents(organizationId, locationId);
  }

  @Get('stats')
  async getStats(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.foodSafetyService.getStats(organizationId, locationId);
  }

  @Get('incidents/:id')
  async findOne(@Param('id') id: string): Promise<FoodSafetyIncident> {
    const incident = await this.foodSafetyService.findOne(id);
    if (!incident) {
      throw new Error('Incident not found');
    }
    return incident;
  }

  @Patch('incidents/:id/resolve')
  async resolve(@Param('id') id: string, @Body() resolveDto: ResolveIncidentDto): Promise<FoodSafetyIncident> {
    return this.foodSafetyService.resolve(id, resolveDto);
  }

  @Delete('incidents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.foodSafetyService.delete(id);
  }
}
