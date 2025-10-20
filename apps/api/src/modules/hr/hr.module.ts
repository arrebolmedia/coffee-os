import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { OnboardingController } from './onboarding.controller';
import { CertificationsController } from './certifications.controller';
import { EvaluationsController } from './evaluations.controller';
import { EmployeesService } from './employees.service';
import { OnboardingService } from './onboarding.service';
import { CertificationsService } from './certifications.service';
import { EvaluationsService } from './evaluations.service';

@Module({
  controllers: [
    EmployeesController,
    OnboardingController,
    CertificationsController,
    EvaluationsController,
  ],
  providers: [EmployeesService, OnboardingService, CertificationsService, EvaluationsService],
  exports: [EmployeesService, OnboardingService, CertificationsService, EvaluationsService],
})
export class HrModule {}
