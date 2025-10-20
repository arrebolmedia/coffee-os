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
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto, CompleteChecklistDto, QueryChecklistsDto } from './dto';
import { Checklist } from './interfaces';

@Controller('quality/checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createChecklistDto: CreateChecklistDto): Promise<Checklist> {
    return this.checklistsService.create(createChecklistDto);
  }

  @Get()
  async findAll(@Query() query: QueryChecklistsDto): Promise<Checklist[]> {
    return this.checklistsService.findAll(query);
  }

  @Get('stats')
  async getStats(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.checklistsService.getComplianceStats(organizationId, locationId);
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
  async complete(@Param('id') id: string, @Body() completeDto: CompleteChecklistDto): Promise<Checklist> {
    return this.checklistsService.complete(id, completeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.checklistsService.delete(id);
  }
}
