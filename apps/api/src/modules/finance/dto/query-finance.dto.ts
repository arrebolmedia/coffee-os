import { IsOptional, IsDateString, IsString, IsEnum } from 'class-validator';

export enum PeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export class QueryFinanceDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(PeriodType)
  period?: PeriodType;

  @IsOptional()
  @IsString()
  search?: string;
}
