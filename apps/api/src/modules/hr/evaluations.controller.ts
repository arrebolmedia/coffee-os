import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto, QueryEvaluationsDto } from './dto';
import { Evaluation } from './interfaces';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('hr/evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateEvaluationDto,
    @CurrentOrg() organizationId: string,
  ): Promise<Evaluation> {
    return this.evaluationsService.create(createDto, organizationId);
  }

  @Get()
  async findAll(
    @Query() query: QueryEvaluationsDto,
    @CurrentOrg() organizationId: string,
  ): Promise<Evaluation[]> {
    return this.evaluationsService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('stats')
  async getStats(@CurrentOrg() organizationId: string): Promise<any> {
    return this.evaluationsService.getStats(organizationId);
  }

  @Get('employee/:employeeId/history')
  async getHistory(
    @Param('employeeId') employeeId: string,
  ): Promise<Evaluation[]> {
    return this.evaluationsService.getEmployeeHistory(employeeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Evaluation> {
    const evaluation = await this.evaluationsService.findOne(id);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }
    return evaluation;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.evaluationsService.delete(id);
  }
}
