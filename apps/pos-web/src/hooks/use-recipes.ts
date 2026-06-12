/**
 * CoffeeOS POS Web - Recipes Hooks
 * React Query hooks para recetas e ingredientes.
 *
 * Los hooks de endpoints fantasma (duplicate, ingredients CRUD, parameters,
 * bulk/status, export) fueron eliminados junto con sus métodos de servicio:
 * esos endpoints no existen en el backend.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recipesService } from '@/services/recipes.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';
import { PaginationParams, Recipe, RecipeFilters } from '@/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (
    orgId: string,
    filters?: RecipeFilters,
    pagination?: PaginationParams,
  ) => [...recipeKeys.lists(), { orgId, filters, pagination }] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  byProduct: (productId: string) =>
    [...recipeKeys.all, 'product', productId] as const,
  ingredients: (recipeId: string) =>
    [...recipeKeys.all, recipeId, 'ingredients'] as const,
  categories: (orgId: string) =>
    [...recipeKeys.all, 'categories', orgId] as const,
  cost: (recipeId: string) => [...recipeKeys.all, recipeId, 'cost'] as const,
};

// ============================================================================
// RECIPES HOOKS
// ============================================================================

export function useRecipes(
  filters?: RecipeFilters,
  pagination?: PaginationParams,
) {
  const { user } = useAuth();

  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: recipeKeys.list(organizationId || 'all', filters, pagination),
    queryFn: () =>
      recipesService.getRecipes(organizationId, filters, pagination),
    enabled: !!user, // Require authenticated user
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecipe(id: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => recipesService.getRecipeById(id),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecipeByProduct(productId: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.byProduct(productId),
    queryFn: () => recipesService.getRecipeByProductId(productId),
    enabled: !!productId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecipeCategories() {
  const { user } = useAuth();

  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: recipeKeys.categories(organizationId || 'all'),
    queryFn: () => recipesService.getRecipeCategories(organizationId),
    enabled: !!user, // Require authenticated user
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRecipeCost(recipeId: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.cost(recipeId),
    queryFn: () => recipesService.calculateRecipeCost(recipeId),
    enabled: !!recipeId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (costs can change frequently)
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Recipe>) => recipesService.createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      toast.success('Receta creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear receta');
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Recipe> }) =>
      recipesService.updateRecipe(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.id),
      });
      toast.success('Receta actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar receta');
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesService.deleteRecipe(id),
    onSuccess: async () => {
      // Invalidar todas las queries de recetas
      await queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      // Forzar refetch inmediato
      await queryClient.refetchQueries({
        queryKey: recipeKeys.lists(),
        type: 'active',
      });
      toast.success('Receta eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar receta');
    },
  });
}

// ============================================================================
// RECIPE INGREDIENTS HOOKS
// ============================================================================

/**
 * Lee los ingredientes desde GET /recipes/:id (el backend no expone un
 * endpoint dedicado de ingredientes).
 */
export function useRecipeIngredients(recipeId: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.ingredients(recipeId),
    queryFn: () => recipesService.getRecipeIngredients(recipeId),
    enabled: !!recipeId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
