import {
  RecipeCategory,
  DifficultyLevel,
  PreparationMethod,
  AllergenType,
  RecipeIngredientDto,
  RecipeStepDto,
  PreparationParametersDto,
  NutritionalInfoDto,
} from '../dto';

export interface Recipe {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: RecipeCategory;
  preparation_method?: PreparationMethod;
  difficulty?: DifficultyLevel;
  servings: number;
  serving_size_ml?: number;
  ingredients: RecipeIngredient[];
  steps?: RecipeStep[];
  preparation_parameters?: PreparationParametersDto;
  nutritional_info?: NutritionalInfoDto;
  allergens?: AllergenType[];
  estimated_time_minutes?: number;
  target_margin_percentage?: number;
  image_url?: string;
  is_active: boolean;
  notes?: string;

  // Costeo calculado
  total_cost?: number;
  cost_per_serving?: number;
  suggested_price?: number;
  actual_margin_percentage?: number;

  created_at: Date;
  updated_at: Date;
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  inventory_item_id: string;
  inventory_item_name?: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  total_cost?: number;
  preparation_notes?: string;
}

export interface RecipeStep {
  id?: string;
  recipe_id?: string;
  step_number: number;
  instruction: string;
  duration_seconds?: number;
  image_url?: string;
  is_critical?: boolean;
}

export interface RecipeCostBreakdown {
  recipe_id: string;
  recipe_name: string;
  servings: number;
  ingredients_cost: IngredientCostDetail[];
  total_ingredients_cost: number;
  labor_cost?: number;
  overhead_cost?: number;
  total_cost: number;
  cost_per_serving: number;
  target_margin_percentage: number;
  suggested_price: number;
  suggested_price_per_serving: number;
}

export interface IngredientCostDetail {
  inventory_item_id: string;
  inventory_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
  percentage_of_total: number;
}

export interface ScaledRecipe extends Recipe {
  original_servings: number;
  scaled_servings: number;
  scaling_factor: number;
  scaled_ingredients: RecipeIngredient[];
}

export interface RecipeStats {
  total_recipes: number;
  by_category: { [key in RecipeCategory]?: number };
  by_difficulty: { [key in DifficultyLevel]?: number };
  by_preparation_method: { [key in PreparationMethod]?: number };
  average_cost: number;
  average_margin: number;
  total_value: number; // Valor total de todas las recetas
}

export interface RecipeProfitability {
  recipe_id: string;
  recipe_name: string;
  cost: number;
  suggested_price: number;
  actual_selling_price?: number;
  margin_percentage: number;
  units_sold?: number;
  total_revenue?: number;
  total_profit?: number;
  profitability_score: number; // Score basado en margen y volumen
}
