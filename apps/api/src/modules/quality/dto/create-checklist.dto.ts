import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ChecklistType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export enum ChecklistCategory {
  CLEANING = 'CLEANING',
  FOOD_SAFETY = 'FOOD_SAFETY',
  EQUIPMENT = 'EQUIPMENT',
  PERSONNEL = 'PERSONNEL',
  HYGIENE = 'HYGIENE',
  TEMPERATURE = 'TEMPERATURE',
  STORAGE = 'STORAGE',
  WASTE = 'WASTE',
}

export class ChecklistItemDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsEnum(ChecklistCategory)
  category: ChecklistCategory;

  @IsOptional()
  @IsString()
  regulation_reference?: string; // e.g., "NOM-251-SSA1-2009 Art. 5.1"

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateChecklistDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(ChecklistType)
  type: ChecklistType;

  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items: ChecklistItemDto[];

  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
