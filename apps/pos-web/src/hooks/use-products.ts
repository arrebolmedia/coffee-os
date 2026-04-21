/**
 * CoffeeOS POS Web - Products Hooks
 * React Query hooks para productos, categorías y modificadores
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/services/products.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';
import {
  Product,
  Category,
  Modifier,
  ProductFilters,
  PaginationParams,
} from '@/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (
    orgId: string,
    filters?: ProductFilters,
    pagination?: PaginationParams,
  ) => [...productKeys.lists(), { orgId, filters, pagination }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  bySku: (sku: string, orgId: string) =>
    [...productKeys.all, 'sku', sku, orgId] as const,
  byBarcode: (barcode: string, orgId: string) =>
    [...productKeys.all, 'barcode', barcode, orgId] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (orgId: string) => [...categoryKeys.lists(), orgId] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

export const modifierKeys = {
  all: ['modifiers'] as const,
  lists: () => [...modifierKeys.all, 'list'] as const,
  list: (orgId: string) => [...modifierKeys.lists(), orgId] as const,
  details: () => [...modifierKeys.all, 'detail'] as const,
  detail: (id: string) => [...modifierKeys.details(), id] as const,
};

// ============================================================================
// PRODUCTS HOOKS
// ============================================================================

export function useProducts(
  filters?: ProductFilters,
  pagination?: PaginationParams,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: productKeys.list(user?.organizationId || '', filters, pagination),
    queryFn: () =>
      productsService.getProducts(
        user?.organizationId || '',
        filters,
        pagination,
      ),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getProductById(id),
    enabled: !!id && enabled,
  });
}

export function useProductBySku(sku: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: productKeys.bySku(sku, user?.organizationId || ''),
    queryFn: () =>
      productsService.getProductBySku(sku, user?.organizationId || ''),
    enabled: !!sku && !!user?.organizationId,
  });
}

export function useProductByBarcode(barcode: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: productKeys.byBarcode(barcode, user?.organizationId || ''),
    queryFn: () =>
      productsService.getProductByBarcode(barcode, user?.organizationId || ''),
    enabled: !!barcode && !!user?.organizationId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Product>) => productsService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Producto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear producto');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productsService.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
      toast.success('Producto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar producto');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Producto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar producto');
    },
  });
}

// ============================================================================
// CATEGORIES HOOKS
// ============================================================================

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: categoryKeys.list(user?.organizationId || ''),
    queryFn: () => productsService.getCategories(user?.organizationId || ''),
    enabled: !!user?.organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCategory(id: string, enabled = true) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => productsService.getCategoryById(id),
    enabled: !!id && enabled,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Category>) =>
      productsService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      toast.success('Categoría creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear categoría');
    },
  });
}

// ============================================================================
// MODIFIERS HOOKS
// ============================================================================

export function useModifiers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: modifierKeys.list(user?.organizationId || ''),
    queryFn: () => productsService.getModifiers(user?.organizationId || ''),
    enabled: !!user?.organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useModifier(id: string, enabled = true) {
  return useQuery({
    queryKey: modifierKeys.detail(id),
    queryFn: () => productsService.getModifierById(id),
    enabled: !!id && enabled,
  });
}
