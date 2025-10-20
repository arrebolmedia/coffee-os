import { IsOptional, IsString, IsEnum } from 'class-validator';
import { EmployeeStatus, EmploymentType, EmployeeRole } from './create-employee.dto';
import { OnboardingPeriod } from './create-onboarding-plan.dto';
import { CertificationType, CertificationStatus } from './create-certification.dto';
import { EvaluationPeriod, PerformanceRating } from './create-evaluation.dto';

export class QueryEmployeesDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @IsOptional()
  @IsEnum(EmploymentType)
  employment_type?: EmploymentType;

  @IsOptional()
  @IsString()
  search?: string; // Search by name, email, phone
}

export class QueryOnboardingPlansDto {
  @IsOptional()
  @IsString()
  employee_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(OnboardingPeriod)
  period?: OnboardingPeriod;

  @IsOptional()
  @IsString()
  completed?: string; // 'true' | 'false'
}

export class QueryCertificationsDto {
  @IsOptional()
  @IsString()
  employee_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(CertificationType)
  type?: CertificationType;

  @IsOptional()
  @IsEnum(CertificationStatus)
  status?: CertificationStatus;

  @IsOptional()
  @IsString()
  expiring_soon?: string; // 'true' to get certs expiring in 30 days
}

export class QueryEvaluationsDto {
  @IsOptional()
  @IsString()
  employee_id?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(EvaluationPeriod)
  period?: EvaluationPeriod;

  @IsOptional()
  @IsEnum(PerformanceRating)
  rating?: PerformanceRating;
}
