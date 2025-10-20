import { IsEnum, IsOptional, IsDateString, IsString, IsNumber, Min } from 'class-validator';
import { PermitStatus } from './create-permit.dto';

export class UpdatePermitDto {
  @IsOptional()
  @IsEnum(PermitStatus)
  status?: PermitStatus;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsDateString()
  last_renewal_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  renewal_cost?: number;

  @IsOptional()
  @IsString()
  responsible_person?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  document_url?: string;
}
