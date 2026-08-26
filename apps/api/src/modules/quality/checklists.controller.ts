import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import {
  CompleteChecklistDto,
  CreateChecklistDto,
  QueryChecklistsDto,
} from './dto';
import { Checklist } from './interfaces';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('quality/checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createChecklistDto: CreateChecklistDto,
  ): Promise<Checklist> {
    return this.checklistsService.create(createChecklistDto);
  }

  @Get()
  async findAll(
    @Query() query: QueryChecklistsDto,
    @CurrentOrg() organizationId: string,
  ): Promise<Checklist[]> {
    return this.checklistsService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('stats')
  async getStats(
    @CurrentOrg() organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.checklistsService.getComplianceStats(
      organizationId,
      locationId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Checklist> {
    const checklist = await this.checklistsService.findOne(id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }
    return checklist;
  }

  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteChecklistDto,
  ): Promise<Checklist> {
    return this.checklistsService.complete(id, completeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.checklistsService.delete(id);
  }
}
