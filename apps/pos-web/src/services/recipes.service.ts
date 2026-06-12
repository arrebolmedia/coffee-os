/**
 * CoffeeOS POS Web - Recipes Service
 * Servicio para gestión de recetas y preparaciones.
 *
 * Alineado al contrato real del backend (apps/api/src/modules/recipes):
 * - POST /recipes
 * - GET /recipes (query: organization_id, search, is_active, max_cost, sort_by, order)
 * - GET /recipes/categories
 * - GET /recipes/:id
 * - GET /recipes/product/:productId
 * - GET /recipes/:id/cost
 * - POST /recipes/:id/scale
 * - PATCH /recipes/:id
 * - DELETE /recipes/:id
 *
 * Los endpoints fantasma (duplicate, ingredients CRUD, parameters, bulk/status,
 * export) fueron eliminados: no existen en el backend.
 */

import { api } from '@/lib/api';
import {
  PaginatedResponse,
  PaginationParams,
  Recipe,
  RecipeFilters,
  RecipeIngredient,
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

    // Solo params que el backend (QueryRecipesDto) realmente soporta.
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined)
      params.append('is_active', String(filters.is_active));
    if (filters?.max_cost !== undefined)
      params.append('max_cost', String(filters.max_cost));

    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order) params.append('order', pagination.sort_order);

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
    } catch {
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

  async calculateRecipeCost(id: string): Promise<{ total_cost: number }> {
    const response = await api.get<any>(`${this.baseUrl}/${id}/cost`);
    return this.unwrapSingle<{ total_cost: number }>(response);
  }

  // ============================================================================
  // RECIPE INGREDIENTS
  // ============================================================================

  /**
   * El backend no expone GET /recipes/:id/ingredients; GET /recipes/:id ya
   * incluye los ingredientes, así que se leen de ahí.
   */
  async getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
    const recipe = await this.getRecipeById(recipeId);
    return recipe.ingredients ?? [];
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
