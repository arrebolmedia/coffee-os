/**
 * CoffeeOS POS Web - Inventory Hooks
 * React Query hooks para inventario
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryItem, inventoryService } from '@/services/inventory.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (orgId: string) => [...inventoryKeys.lists(), orgId] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  stats: (orgId: string) => [...inventoryKeys.all, 'stats', orgId] as const,
  movements: (itemId: string) =>
    [...inventoryKeys.all, 'movements', itemId] as const,
};

// ============================================================================
// INVENTORY HOOKS
// ============================================================================

/**
 * Hook para obtener todos los items de inventario
 */
export function useInventory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: inventoryKeys.list(user?.organizationId || ''),
    queryFn: () =>
      inventoryService.getInventoryItems(user?.organizationId || ''),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para obtener un item de inventario específico
 */
export function useInventoryItem(id: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => inventoryService.getInventoryItem(id),
    enabled: !!id && enabled,
  });
}

/**
 * Hook para obtener estadísticas de inventario
 */
export function useInventoryStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: inventoryKeys.stats(user?.organizationId || ''),
    queryFn: () =>
      inventoryService.getInventoryStats(user?.organizationId || ''),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para obtener movimientos de un item
 */
export function useInventoryMovements(itemId: string) {
  return useQuery({
    queryKey: inventoryKeys.movements(itemId),
    queryFn: () => inventoryService.getMovements(itemId),
    enabled: !!itemId,
  });
}

/**
 * Hook para ajustar stock
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      quantity,
      operation,
      notes,
    }: {
      id: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
      notes?: string;
    }) => inventoryService.adjustStock(id, quantity, operation, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      toast.success('Stock ajustado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al ajustar stock');
    },
  });
}

/**
 * Hook para crear item de inventario
 */
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      inventoryService.createInventoryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success('Item de inventario creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear item de inventario');
    },
  });
}

/**
 * Hook para actualizar item de inventario
 */
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      inventoryService.updateInventoryItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.detail(variables.id),
      });
      toast.success('Item de inventario actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar item de inventario');
    },
  });
}

/**
 * Hook para eliminar item de inventario
 */
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success('Item de inventario eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar item de inventario');
    },
  });
}
