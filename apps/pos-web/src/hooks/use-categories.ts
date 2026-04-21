/**
 * Categories Hooks - React Query hooks for category management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  categoriesService,
  type Category,
  type QueryCategoriesParams,
  type CreateCategoryDto,
} from '@/services/categories.service';

// Query Keys
export const categoriesKeys = {
  all: ['categories'] as const,
  lists: () => [...categoriesKeys.all, 'list'] as const,
  list: (params: QueryCategoriesParams) =>
    [...categoriesKeys.lists(), params] as const,
  details: () => [...categoriesKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoriesKeys.details(), id] as const,
  tree: (organizationId: string) =>
    [...categoriesKeys.all, 'tree', organizationId] as const,
  stats: (organizationId: string) =>
    [...categoriesKeys.all, 'stats', organizationId] as const,
};

/**
 * Hook para obtener categorías con filtros
 */
export function useCategories(params?: QueryCategoriesParams) {
  return useQuery({
    queryKey: categoriesKeys.list(params || {}),
    queryFn: () => categoriesService.getCategories(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener categoría por ID
 */
export function useCategory(id: string, enabled = true) {
  return useQuery({
    queryKey: categoriesKeys.detail(id),
    queryFn: () => categoriesService.getCategoryById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook para obtener árbol de categorías
 */
export function useCategoryTree(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: categoriesKeys.tree(organizationId),
    queryFn: () => categoriesService.getCategoryTree(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener estadísticas
 */
export function useCategoryStats(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: categoriesKeys.stats(organizationId),
    queryFn: () => categoriesService.getStats(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para crear categoría
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryDto) =>
      categoriesService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.lists() });
      toast.success('Categoría creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear categoría');
    },
  });
}

/**
 * Hook para actualizar categoría
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCategoryDto>;
    }) => categoriesService.updateCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: categoriesKeys.detail(variables.id),
      });
      toast.success('Categoría actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar categoría');
    },
  });
}

/**
 * Hook para eliminar categoría
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoriesService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.lists() });
      toast.success('Categoría eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar categoría');
    },
  });
}
