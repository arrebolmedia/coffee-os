/**
 * CoffeeOS POS Web - Recipes Hooks
 * React Query hooks para recetas, ingredientes y parámetros
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recipesService } from '@/services/recipes.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';
import {
  PaginationParams,
  Recipe,
  RecipeFilters,
  RecipeIngredient,
  RecipeParameter,
} from '@/types';

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
  parameters: (recipeId: string) =>
    [...recipeKeys.all, recipeId, 'parameters'] as const,
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

export function useDuplicateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) =>
      recipesService.duplicateRecipe(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      toast.success('Receta duplicada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al duplicar receta');
    },
  });
}

export function useBulkUpdateRecipeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeIds,
      status,
    }: {
      recipeIds: string[];
      status: string;
    }) => recipesService.bulkUpdateRecipeStatus(recipeIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      toast.success('Estados actualizados exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar estados');
    },
  });
}

// ============================================================================
// RECIPE INGREDIENTS HOOKS
// ============================================================================

export function useRecipeIngredients(recipeId: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.ingredients(recipeId),
    queryFn: () => recipesService.getRecipeIngredients(recipeId),
    enabled: !!recipeId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddRecipeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: string;
      data: Partial<RecipeIngredient>;
    }) => recipesService.addRecipeIngredient(recipeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.ingredients(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.cost(variables.recipeId),
      });
      toast.success('Ingrediente agregado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar ingrediente');
    },
  });
}

export function useUpdateRecipeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      ingredientId,
      data,
    }: {
      recipeId: string;
      ingredientId: string;
      data: Partial<RecipeIngredient>;
    }) => recipesService.updateRecipeIngredient(recipeId, ingredientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.ingredients(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.cost(variables.recipeId),
      });
      toast.success('Ingrediente actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar ingrediente');
    },
  });
}

export function useDeleteRecipeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      ingredientId,
    }: {
      recipeId: string;
      ingredientId: string;
    }) => recipesService.deleteRecipeIngredient(recipeId, ingredientId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.ingredients(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.cost(variables.recipeId),
      });
      toast.success('Ingrediente eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar ingrediente');
    },
  });
}

export function useReorderRecipeIngredients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      ingredientIds,
    }: {
      recipeId: string;
      ingredientIds: string[];
    }) => recipesService.reorderRecipeIngredients(recipeId, ingredientIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.ingredients(variables.recipeId),
      });
      toast.success('Orden actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al reordenar ingredientes');
    },
  });
}

// ============================================================================
// RECIPE PARAMETERS HOOKS
// ============================================================================

export function useRecipeParameters(recipeId: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.parameters(recipeId),
    queryFn: () => recipesService.getRecipeParameters(recipeId),
    enabled: !!recipeId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddRecipeParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: string;
      data: Partial<RecipeParameter>;
    }) => recipesService.addRecipeParameter(recipeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.parameters(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.recipeId),
      });
      toast.success('Parámetro agregado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar parámetro');
    },
  });
}

export function useUpdateRecipeParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      parameterId,
      data,
    }: {
      recipeId: string;
      parameterId: string;
      data: Partial<RecipeParameter>;
    }) => recipesService.updateRecipeParameter(recipeId, parameterId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.parameters(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.recipeId),
      });
      toast.success('Parámetro actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar parámetro');
    },
  });
}

export function useDeleteRecipeParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      parameterId,
    }: {
      recipeId: string;
      parameterId: string;
    }) => recipesService.deleteRecipeParameter(recipeId, parameterId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recipeKeys.parameters(variables.recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.recipeId),
      });
      toast.success('Parámetro eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar parámetro');
    },
  });
}

// ============================================================================
// EXPORT HOOK
// ============================================================================

export function useExportRecipes() {
  return useMutation({
    mutationFn: ({
      organizationId,
      filters,
    }: {
      organizationId: string;
      filters?: RecipeFilters;
    }) => recipesService.exportRecipes(organizationId, filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipes-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Recetas exportadas exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al exportar recetas');
    },
  });
}
