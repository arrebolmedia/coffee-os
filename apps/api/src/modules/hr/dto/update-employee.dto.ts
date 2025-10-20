import { IsOptional, IsString, IsEmail, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { EmployeeStatus, EmploymentType, EmployeeRole } from './create-employee.dto';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @IsOptional()
  @IsEnum(EmploymentType)
  employment_type?: EmploymentType;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsNumber()
  hourly_rate?: number;

  @IsOptional()
  @IsNumber()
  monthly_salary?: number;

  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  emergency_contact_phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsDateString()
  termination_date?: string;

  @IsOptional()
  @IsString()
  termination_reason?: string;
}
