import { IsNotEmpty, IsString, IsEmail, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  TEMPORARY = 'TEMPORARY',
  CONTRACT = 'CONTRACT',
}

export enum EmployeeRole {
  BARISTA = 'BARISTA',
  CASHIER = 'CASHIER',
  COOK = 'COOK',
  MANAGER = 'MANAGER',
  ASSISTANT_MANAGER = 'ASSISTANT_MANAGER',
  SHIFT_SUPERVISOR = 'SHIFT_SUPERVISOR',
  CLEANER = 'CLEANER',
  DELIVERY = 'DELIVERY',
}

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsEnum(EmployeeRole)
  role: EmployeeRole;

  @IsEnum(EmploymentType)
  employment_type: EmploymentType;

  @IsNotEmpty()
  @IsDateString()
  hire_date: string;

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
  @IsString()
  rfc?: string; // Mexican tax ID

  @IsOptional()
  @IsString()
  curp?: string; // Mexican national ID

  @IsOptional()
  @IsString()
  nss?: string; // Mexican social security number
}
