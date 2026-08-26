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
import { OnboardingService } from './onboarding.service';
import {
  CompleteOnboardingTaskDto,
  CreateOnboardingPlanDto,
  QueryOnboardingPlansDto,
} from './dto';
import { OnboardingPlan } from './interfaces';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('hr/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateOnboardingPlanDto,
    @CurrentOrg() organizationId: string,
  ): Promise<OnboardingPlan> {
    return this.onboardingService.create(createDto, organizationId);
  }

  @Get()
  async findAll(
    @Query() query: QueryOnboardingPlansDto,
    @CurrentOrg() organizationId: string,
  ): Promise<OnboardingPlan[]> {
    return this.onboardingService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('stats')
  async getStats(@CurrentOrg() organizationId: string): Promise<any> {
    return this.onboardingService.getStats(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<OnboardingPlan> {
    const plan = await this.onboardingService.findOne(id);
    if (!plan) {
      throw new Error('Onboarding plan not found');
    }
    return plan;
  }

  @Patch(':id/tasks')
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteOnboardingTaskDto,
  ): Promise<OnboardingPlan> {
    return this.onboardingService.completeTask(id, completeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.onboardingService.delete(id);
  }
}
