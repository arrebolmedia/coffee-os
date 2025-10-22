/**
 * CoffeeOS Admin - React Query Hooks
 * Custom hooks for data fetching with React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { productService } from '@/services/product.service';
import { orderService } from '@/services/order.service';
import { dashboardService } from '@/services/dashboard.service';
import { categoryService } from '@/services/category.service';
import type { ListParams } from '@/types';

// ============================================================================
// AUTH HOOKS
// ============================================================================

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['current-user'], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

// ============================================================================
// PRODUCT HOOKS
// ============================================================================

export function useProducts(params?: ListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.getProducts(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productService.getProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productService.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productIds: string[]) =>
      productService.bulkDelete({ product_ids: productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productIds, status }: { productIds: string[]; status: any }) =>
      productService.bulkUpdateStatus({ product_ids: productIds, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      file,
      onProgress,
    }: {
      productId: string;
      file: File;
      onProgress?: (progress: number) => void;
    }) => productService.uploadImage(productId, file, onProgress),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => productService.deleteImage(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', productId] });
    },
  });
}

// ============================================================================
// ORDER HOOKS
// ============================================================================

export function useOrders(params?: ListParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderService.getOrders(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderService.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      orderService.updateOrderStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      orderService.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOrderStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['order-stats', startDate, endDate],
    queryFn: () => orderService.getStats(startDate, endDate),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useRecentOrders(limit: number = 10) {
  return useQuery({
    queryKey: ['orders', 'recent', limit],
    queryFn: () => orderService.getRecentOrders(limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 1 * 60 * 1000, // Refetch every minute
  });
}

// ============================================================================
// CATEGORY HOOKS
// ============================================================================

export function useCategories(params?: ListParams) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoryService.getCategories(params),
    staleTime: 2 * 60 * 1000, // 2 minutes (categories don't change often)
  });
}

export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => categoryService.getActiveCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => categoryService.getCategory(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      categoryService.updateCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables.id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryService.reorderCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
