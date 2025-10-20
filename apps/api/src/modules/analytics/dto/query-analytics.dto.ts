import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum TimeGranularity {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum MetricType {
  SALES = 'SALES',
  ORDERS = 'ORDERS',
  CUSTOMERS = 'CUSTOMERS',
  PRODUCTS = 'PRODUCTS',
  INVENTORY = 'INVENTORY',
  LABOR = 'LABOR',
  FINANCIAL = 'FINANCIAL',
  WASTE = 'WASTE',
}

export enum ComparisonType {
  PREVIOUS_PERIOD = 'PREVIOUS_PERIOD',
  SAME_PERIOD_LAST_YEAR = 'SAME_PERIOD_LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

export class QueryAnalyticsDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsEnum(TimeGranularity)
  granularity?: TimeGranularity;

  @IsOptional()
  @IsEnum(MetricType)
  metric_type?: MetricType;

  @IsOptional()
  @IsEnum(ComparisonType)
  comparison?: ComparisonType;
}
