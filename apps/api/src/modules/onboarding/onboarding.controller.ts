import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  CreateTrainingModuleDto,
  UpdateTrainingModuleDto,
  CreateOnboardingPlanDto,
  UpdateModuleProgressDto,
  CreateEvaluationDto,
  CompleteEvaluationDto,
  CreateCertificationDto,
} from './dto';
import {
  TrainingCategory,
  CompetencyLevel,
  EvaluationStatus,
  CertificationStatus,
} from './interfaces/onboarding.interface';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // ==================== TRAINING MODULES ====================

  @Post('modules')
  createTrainingModule(@Body() dto: CreateTrainingModuleDto) {
    return this.onboardingService.createTrainingModule(dto);
  }

  @Get('modules')
  findAllTrainingModules(
    @Query('organization_id') organization_id?: string,
    @Query('category') category?: TrainingCategory,
    @Query('level') level?: CompetencyLevel,
    @Query('is_active') is_active?: string,
  ) {
    const activeFilter = is_active !== undefined ? is_active === 'true' : undefined;
    return this.onboardingService.findAllTrainingModules(
      organization_id,
      category,
      level,
      activeFilter,
    );
  }

  @Get('modules/:id')
  findTrainingModuleById(@Param('id') id: string) {
    return this.onboardingService.findTrainingModuleById(id);
  }

  @Patch('modules/:id')
  updateTrainingModule(@Param('id') id: string, @Body() dto: UpdateTrainingModuleDto) {
    return this.onboardingService.updateTrainingModule(id, dto);
  }

  @Delete('modules/:id')
  deleteTrainingModule(@Param('id') id: string) {
    return this.onboardingService.deleteTrainingModule(id);
  }

  // ==================== ONBOARDING PLANS ====================

  @Post('plans')
  createOnboardingPlan(@Body() dto: CreateOnboardingPlanDto) {
    return this.onboardingService.createOnboardingPlan(dto);
  }

  @Get('plans')
  findAllOnboardingPlans(
    @Query('organization_id') organization_id?: string,
    @Query('is_active') is_active?: string,
  ) {
    const activeFilter = is_active !== undefined ? is_active === 'true' : undefined;
    return this.onboardingService.findAllOnboardingPlans(organization_id, activeFilter);
  }

  @Get('plans/:id')
  findOnboardingPlanById(@Param('id') id: string) {
    return this.onboardingService.findOnboardingPlanById(id);
  }

  @Get('plans/employee/:employee_id')
  findOnboardingPlanByEmployee(@Param('employee_id') employee_id: string) {
    return this.onboardingService.findOnboardingPlanByEmployee(employee_id);
  }

  // ==================== MODULE PROGRESS ====================

  @Post('progress/assign')
  assignModuleToEmployee(
    @Body('employee_id') employee_id: string,
    @Body('module_id') module_id: string,
    @Body('assigned_by') assigned_by?: string,
    @Body('mentor_id') mentor_id?: string,
  ) {
    return this.onboardingService.assignModuleToEmployee(
      employee_id,
      module_id,
      assigned_by,
      mentor_id,
    );
  }

  @Patch('progress/:id')
  updateModuleProgress(@Param('id') id: string, @Body() dto: UpdateModuleProgressDto) {
    return this.onboardingService.updateModuleProgress(id, dto);
  }

  @Get('progress/employee/:employee_id')
  findEmployeeModuleProgress(@Param('employee_id') employee_id: string) {
    return this.onboardingService.findEmployeeModuleProgress(employee_id);
  }

  // ==================== EVALUATIONS ====================

  @Post('evaluations')
  createEvaluation(@Body() dto: CreateEvaluationDto) {
    return this.onboardingService.createEvaluation(dto);
  }

  @Patch('evaluations/:id/start')
  startEvaluation(@Param('id') id: string) {
    return this.onboardingService.startEvaluation(id);
  }

  @Patch('evaluations/:id/complete')
  completeEvaluation(@Param('id') id: string, @Body() dto: CompleteEvaluationDto) {
    return this.onboardingService.completeEvaluation(id, dto);
  }

  @Get('evaluations')
  findAllEvaluations(
    @Query('organization_id') organization_id?: string,
    @Query('employee_id') employee_id?: string,
    @Query('status') status?: EvaluationStatus,
  ) {
    return this.onboardingService.findAllEvaluations(organization_id, employee_id, status);
  }

  // ==================== CERTIFICATIONS ====================

  @Post('certifications')
  createCertification(@Body() dto: CreateCertificationDto) {
    return this.onboardingService.createCertification(dto);
  }

  @Get('certifications')
  findAllCertifications(
    @Query('organization_id') organization_id?: string,
    @Query('employee_id') employee_id?: string,
    @Query('status') status?: CertificationStatus,
  ) {
    return this.onboardingService.findAllCertifications(organization_id, employee_id, status);
  }

  @Get('certifications/expiring/:organization_id')
  findExpiringCertifications(
    @Param('organization_id') organization_id: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.onboardingService.findExpiringCertifications(organization_id, daysNumber);
  }

  // ==================== REPORTS ====================

  @Get('stats/:organization_id')
  getOnboardingStats(@Param('organization_id') organization_id: string) {
    return this.onboardingService.getOnboardingStats(organization_id);
  }

  @Get('report/:employee_id')
  getEmployeeProgressReport(@Param('employee_id') employee_id: string) {
    return this.onboardingService.getEmployeeProgressReport(employee_id);
  }
}
