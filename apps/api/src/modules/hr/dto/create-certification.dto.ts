import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export enum CertificationType {
  FOOD_HANDLER = 'FOOD_HANDLER',
  BARISTA = 'BARISTA',
  MANAGER = 'MANAGER',
  FIRST_AID = 'FIRST_AID',
  FIRE_SAFETY = 'FIRE_SAFETY',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  SAFETY_HYGIENE = 'SAFETY_HYGIENE',
  COFFEE_EXPERT = 'COFFEE_EXPERT',
  EQUIPMENT_OPERATION = 'EQUIPMENT_OPERATION',
  CUSTOM = 'CUSTOM',
}

export enum CertificationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  REVOKED = 'REVOKED',
}

export class CreateCertificationDto {
  @IsNotEmpty()
  @IsString()
  employee_id: string;

  @IsEnum(CertificationType)
  type: CertificationType;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsNotEmpty()
  @IsDateString()
  issue_date: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  certificate_number?: string;

  @IsOptional()
  @IsString()
  certificate_url?: string; // URL to certificate PDF/image

  @IsOptional()
  @IsBoolean()
  requires_renewal?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
