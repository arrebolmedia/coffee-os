import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RecipeCategory,
  PreparationMethod,
  DifficultyLevel,
} from './create-recipe.dto';

export class QueryRecipesDto {
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(RecipeCategory)
  category?: RecipeCategory;

  @IsOptional()
  @IsEnum(PreparationMethod)
  preparation_method?: PreparationMethod;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsString()
  is_active?: string; // 'true' or 'false'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  min_margin?: number;

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'cost' | 'margin' | 'created_at';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}
