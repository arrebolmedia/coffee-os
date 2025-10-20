import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min, Max } from 'class-validator';

export enum TemperatureType {
  REFRIGERATOR = 'REFRIGERATOR',
  FREEZER = 'FREEZER',
  HOT_HOLDING = 'HOT_HOLDING',
  COLD_HOLDING = 'COLD_HOLDING',
  COOKING = 'COOKING',
  COOLING = 'COOLING',
  RECEIVING = 'RECEIVING',
}

export enum TemperatureUnit {
  CELSIUS = 'CELSIUS',
  FAHRENHEIT = 'FAHRENHEIT',
}

export class CreateTemperatureLogDto {
  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsEnum(TemperatureType)
  type: TemperatureType;

  @IsNotEmpty()
  @IsNumber()
  @Min(-50)
  @Max(200)
  temperature: number;

  @IsEnum(TemperatureUnit)
  unit: TemperatureUnit;

  @IsNotEmpty()
  @IsString()
  equipment_name: string; // e.g., "Refrigerador Principal", "Congelador 2"

  @IsOptional()
  @IsString()
  product_name?: string; // e.g., "Leche", "Carne molida"

  @IsOptional()
  @IsString()
  location_detail?: string; // e.g., "Estante superior", "Compartimento 3"

  @IsNotEmpty()
  @IsString()
  recorded_by_user_id: string;

  @IsOptional()
  @IsDateString()
  recorded_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
