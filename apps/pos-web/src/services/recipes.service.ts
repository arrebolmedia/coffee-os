/**
 * CoffeeOS POS Web - Recipes Service
 * Servicio para gestión de recetas y preparaciones
 */

import { api } from '@/lib/api';
import {
  Recipe,
  RecipeIngredient,
  RecipeParameter,
  RecipeFilters,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

class RecipesService {
  private readonly baseUrl = '/recipes';

  // ============================================================================
  // RECIPES
  // ============================================================================

  async getRecipes(
    organizationId?: string,
    filters?: RecipeFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Recipe>> {
    const params = new URLSearchParams();

    // Add organization_id - CRITICAL for multi-tenant filtering
    // Super admins don't send this parameter to get all recipes
    if (organizationId) params.append('organization_id', organizationId);

    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.brew_method) params.append('brew_method', filters.brew_method);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.product_id) params.append('product_id', filters.product_id);

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order)
      params.append('sort_order', pagination.sort_order);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

    const response = await api.get<any>(url);

    const recipes: Recipe[] = this.unwrapArray<Recipe>(response);
    const total = this.resolveNumber(response, 'total', recipes.length);
    const limitFallback = pagination?.limit ?? (recipes.length || 1);
    const limit = this.resolveNumber(response, 'limit', limitFallback) || 1;
    const page = this.resolveNumber(response, 'page', pagination?.page ?? 1);
    const totalPages = this.resolveNumber(
      response,
      'totalPages',
      Math.max(1, Math.ceil(total / (limit || 1))),
    );

    return {
      data: recipes,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getRecipeById(id: string): Promise<Recipe> {
    const response = await api.get<any>(`${this.baseUrl}/${id}`);
    return this.unwrapSingle<Recipe>(response);
  }

  async getRecipeByProductId(productId: string): Promise<Recipe | null> {
    try {
      const response = await api.get<any>(
        `${this.baseUrl}/product/${productId}`,
      );
      return this.unwrapSingle<Recipe>(response);
    } catch (error) {
      // Return null if no recipe found for product
      return null;
    }
  }

  async createRecipe(data: Partial<Recipe>): Promise<Recipe> {
    const response = await api.post<any>(this.baseUrl, data);
    return this.unwrapSingle<Recipe>(response);
  }

  async updateRecipe(id: string, data: Partial<Recipe>): Promise<Recipe> {
    const response = await api.patch<any>(`${this.baseUrl}/${id}`, data);
    return this.unwrapSingle<Recipe>(response);
  }

  async deleteRecipe(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async duplicateRecipe(id: string, newName?: string): Promise<Recipe> {
    const response = await api.post<any>(`${this.baseUrl}/${id}/duplicate`, {
      name: newName,
    });
    return this.unwrapSingle<Recipe>(response);
  }

  async calculateRecipeCost(id: string): Promise<{ total_cost: number }> {
    const response = await api.get<any>(`${this.baseUrl}/${id}/cost`);
    return this.unwrapSingle<{ total_cost: number }>(response);
  }

  // ============================================================================
  // RECIPE INGREDIENTS
  // ============================================================================

  async getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
    const response = await api.get<any>(
      `${this.baseUrl}/${recipeId}/ingredients`,
    );
    return this.unwrapArray<RecipeIngredient>(response);
  }

  async addRecipeIngredient(
    recipeId: string,
    data: Partial<RecipeIngredient>,
  ): Promise<RecipeIngredient> {
    const response = await api.post<any>(
      `${this.baseUrl}/${recipeId}/ingredients`,
      data,
    );
    return this.unwrapSingle<RecipeIngredient>(response);
  }

  async updateRecipeIngredient(
    recipeId: string,
    ingredientId: string,
    data: Partial<RecipeIngredient>,
  ): Promise<RecipeIngredient> {
    const response = await api.put<any>(
      `${this.baseUrl}/${recipeId}/ingredients/${ingredientId}`,
      data,
    );
    return this.unwrapSingle<RecipeIngredient>(response);
  }

  async deleteRecipeIngredient(
    recipeId: string,
    ingredientId: string,
  ): Promise<void> {
    await api.delete(`${this.baseUrl}/${recipeId}/ingredients/${ingredientId}`);
  }

  async reorderRecipeIngredients(
    recipeId: string,
    ingredientIds: string[],
  ): Promise<void> {
    await api.patch(`${this.baseUrl}/${recipeId}/ingredients/reorder`, {
      ingredient_ids: ingredientIds,
    });
  }

  // ============================================================================
  // RECIPE PARAMETERS
  // ============================================================================

  async getRecipeParameters(recipeId: string): Promise<RecipeParameter[]> {
    const response = await api.get<any>(
      `${this.baseUrl}/${recipeId}/parameters`,
    );
    return this.unwrapArray<RecipeParameter>(response);
  }

  async addRecipeParameter(
    recipeId: string,
    data: Partial<RecipeParameter>,
  ): Promise<RecipeParameter> {
    const response = await api.post<any>(
      `${this.baseUrl}/${recipeId}/parameters`,
      data,
    );
    return this.unwrapSingle<RecipeParameter>(response);
  }

  async updateRecipeParameter(
    recipeId: string,
    parameterId: string,
    data: Partial<RecipeParameter>,
  ): Promise<RecipeParameter> {
    const response = await api.put<any>(
      `${this.baseUrl}/${recipeId}/parameters/${parameterId}`,
      data,
    );
    return this.unwrapSingle<RecipeParameter>(response);
  }

  async deleteRecipeParameter(
    recipeId: string,
    parameterId: string,
  ): Promise<void> {
    await api.delete(`${this.baseUrl}/${recipeId}/parameters/${parameterId}`);
  }

  // ============================================================================
  // RECIPE CATEGORIES
  // ============================================================================

  async getRecipeCategories(organizationId?: string): Promise<string[]> {
    const url = organizationId
      ? `${this.baseUrl}/categories?organization_id=${organizationId}`
      : `${this.baseUrl}/categories`;
    const response = await api.get<any>(url);
    return this.unwrapArray<string>(response);
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async bulkUpdateRecipeStatus(
    recipeIds: string[],
    status: string,
  ): Promise<void> {
    await api.patch(`${this.baseUrl}/bulk/status`, {
      recipe_ids: recipeIds,
      status,
    });
  }

  async exportRecipes(
    organizationId: string,
    filters?: RecipeFilters,
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.brew_method) params.append('brew_method', filters.brew_method);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = `${this.baseUrl}/export?${queryString}`;

    const response = await api.get<any>(url);

    return response as unknown as Blob;
  }

  // ============================================================================
  // RESPONSE HELPERS
  // ============================================================================

  private unwrapSingle<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as T;
    }
    return response as T;
  }

  private unwrapArray<T>(response: any): T[] {
    if (response && typeof response === 'object' && 'data' in response) {
      if (Array.isArray(response.data)) {
        return response.data as T[];
      }
      return [response.data] as T[];
    }

    if (Array.isArray(response)) {
      return response as T[];
    }

    return [response] as T[];
  }

  private resolveNumber(response: any, key: string, fallback: number): number {
    if (response && typeof response === 'object' && key in response) {
      const value = response[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return fallback;
  }
}

export const recipesService = new RecipesService();
