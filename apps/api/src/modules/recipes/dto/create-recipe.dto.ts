import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Length,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RecipeCategory {
  ESPRESSO = 'espresso',
  FILTRADO = 'filtrado',
  COLD_BREW = 'cold_brew',
  LECHE = 'leche',
  BEBIDAS_FRIAS = 'bebidas_frias',
  POSTRES = 'postres',
  ALIMENTOS = 'alimentos',
  OTROS = 'otros',
}

export enum PreparationMethod {
  ESPRESSO_MACHINE = 'espresso_machine',
  V60 = 'v60',
  CHEMEX = 'chemex',
  AEROPRESS = 'aeropress',
  FRENCH_PRESS = 'french_press',
  COLD_BREW_MAKER = 'cold_brew_maker',
  BLENDER = 'blender',
  STEAMER = 'steamer',
  MANUAL = 'manual',
}

export enum DifficultyLevel {
  FACIL = 'facil',
  INTERMEDIO = 'intermedio',
  AVANZADO = 'avanzado',
  EXPERTO = 'experto',
}

export enum AllergenType {
  LECHE = 'leche',
  GLUTEN = 'gluten',
  HUEVO = 'huevo',
  SOYA = 'soya',
  FRUTOS_SECOS = 'frutos_secos',
  MARISCOS = 'mariscos',
  PESCADO = 'pescado',
  SULFITOS = 'sulfitos',
}

export class RecipeIngredientDto {
  @IsNotEmpty()
  @IsString()
  inventory_item_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_per_unit?: number;

  @IsOptional()
  @IsString()
  preparation_notes?: string;
}

export class RecipeStepDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  step_number: number;

  @IsNotEmpty()
  @IsString()
  @Length(1, 500)
  instruction: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_seconds?: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsBoolean()
  is_critical?: boolean;
}

export class PreparationParametersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  dose_grams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  extraction_time_seconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(15)
  pressure_bars?: number;

  @IsOptional()
  @IsString()
  grind_size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  water_temperature_celsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bloom_time_seconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_brew_time_seconds?: number;

  @IsOptional()
  @IsString()
  pour_pattern?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  steep_time_hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  coffee_to_water_ratio?: number;

  @IsOptional()
  @IsString()
  water_quality_notes?: string;
}

export class NutritionalInfoDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein_grams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs_grams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat_grams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar_grams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  caffeine_mg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium_mg?: number;
}

export class CreateRecipeDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @IsNotEmpty()
  @IsEnum(RecipeCategory)
  category: RecipeCategory;

  @IsOptional()
  @IsEnum(PreparationMethod)
  preparation_method?: PreparationMethod;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  servings: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serving_size_ml?: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps?: RecipeStepDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreparationParametersDto)
  preparation_parameters?: PreparationParametersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  nutritional_info?: NutritionalInfoDto;

  @IsOptional()
  @IsArray()
  @IsEnum(AllergenType, { each: true })
  allergens?: AllergenType[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_time_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  target_margin_percentage?: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
