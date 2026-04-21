/**
 * CoffeeOS POS Web - Inventory Automation Hooks
 * React Query hooks para automatización de inventario
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  inventoryAutomationService,
  type RecipeIngredientLink,
  type TheoreticalStock,
  type StockReconciliation,
  type StockDeductionLog,
  type AutoDeductConfig,
} from '@/services/inventory-automation.service';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const inventoryAutomationKeys = {
  all: ['inventory-automation'] as const,
  recipeLinks: (recipeId: string) =>
    [...inventoryAutomationKeys.all, 'recipe-links', recipeId] as const,
  theoreticalStock: (itemId: string) =>
    [...inventoryAutomationKeys.all, 'theoretical-stock', itemId] as const,
  orgTheoreticalStock: (orgId: string, filters?: any) =>
    [
      ...inventoryAutomationKeys.all,
      'org-theoretical-stock',
      orgId,
      filters,
    ] as const,
  reconciliationHistory: (itemId: string) =>
    [...inventoryAutomationKeys.all, 'reconciliation-history', itemId] as const,
  deductionLogs: (filters: any) =>
    [...inventoryAutomationKeys.all, 'deduction-logs', filters] as const,
  autoDeductConfig: (orgId: string) =>
    [...inventoryAutomationKeys.all, 'config', orgId] as const,
  accuracyReport: (orgId: string, dateRange: any) =>
    [
      ...inventoryAutomationKeys.all,
      'accuracy-report',
      orgId,
      dateRange,
    ] as const,
  usageReport: (orgId: string, dateRange: any) =>
    [...inventoryAutomationKeys.all, 'usage-report', orgId, dateRange] as const,
};

// ============================================================================
// RECIPE-INVENTORY LINKING HOOKS
// ============================================================================

/**
 * Get all ingredient links for a recipe
 */
export function useRecipeIngredientLinks(recipeId: string, enabled = true) {
  return useQuery({
    queryKey: inventoryAutomationKeys.recipeLinks(recipeId),
    queryFn: () =>
      inventoryAutomationService.getRecipeIngredientLinks(recipeId),
    enabled: enabled && !!recipeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Link a recipe ingredient to an inventory item
 */
export function useLinkRecipeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      recipe_id: string;
      recipe_ingredient_id: string;
      inventory_item_id: string;
      conversion_factor: number;
      unit_mapping: {
        recipe_unit: string;
        inventory_unit: string;
      };
      auto_deduct?: boolean;
    }) => inventoryAutomationService.linkRecipeIngredient(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.recipeLinks(variables.recipe_id),
      });
      toast.success('Ingrediente vinculado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al vincular ingrediente');
    },
  });
}

/**
 * Update a recipe-inventory link
 */
export function useUpdateRecipeIngredientLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      linkId,
      data,
    }: {
      linkId: string;
      data: Partial<RecipeIngredientLink>;
    }) => inventoryAutomationService.updateRecipeIngredientLink(linkId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.all,
      });
      toast.success('Vínculo actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar vínculo');
    },
  });
}

/**
 * Delete a recipe-inventory link
 */
export function useDeleteRecipeIngredientLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) =>
      inventoryAutomationService.deleteRecipeIngredientLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.all,
      });
      toast.success('Vínculo eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar vínculo');
    },
  });
}

/**
 * Auto-link recipe ingredients to inventory (AI matching)
 */
export function useAutoLinkRecipeIngredients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) =>
      inventoryAutomationService.autoLinkRecipeIngredients(recipeId),
    onSuccess: (result, recipeId) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.recipeLinks(recipeId),
      });
      toast.success(`${result.linked} ingredientes vinculados automáticamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error en vinculación automática');
    },
  });
}

// ============================================================================
// THEORETICAL STOCK HOOKS
// ============================================================================

/**
 * Get theoretical stock for a single item
 */
export function useTheoreticalStock(
  inventoryItemId: string,
  startDate?: Date,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...inventoryAutomationKeys.theoreticalStock(inventoryItemId),
      startDate,
    ],
    queryFn: () =>
      inventoryAutomationService.calculateTheoreticalStock(
        inventoryItemId,
        startDate,
      ),
    enabled: enabled && !!inventoryItemId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get theoretical stock for all items in organization
 */
export function useOrganizationTheoreticalStock(
  organizationId: string,
  filters?: {
    show_discrepancies_only?: boolean;
    min_discrepancy_percentage?: number;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: inventoryAutomationKeys.orgTheoreticalStock(
      organizationId,
      filters,
    ),
    queryFn: () =>
      inventoryAutomationService.getOrganizationTheoreticalStock(
        organizationId,
        filters,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// STOCK DEDUCTION HOOKS
// ============================================================================

/**
 * Deduct stock for an order
 */
export function useDeductStockForOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      inventoryAutomationService.deductStockForOrder(orderId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.all,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(
        `Stock descontado: ${result.total_items_deducted} items actualizados`,
      );
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al descontar stock');
    },
  });
}

/**
 * Preview stock deduction without executing
 */
export function usePreviewStockDeduction(orderId: string, enabled = true) {
  return useQuery({
    queryKey: [...inventoryAutomationKeys.all, 'preview', orderId],
    queryFn: () => inventoryAutomationService.previewStockDeduction(orderId),
    enabled: enabled && !!orderId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Reverse stock deduction (for cancellations)
 */
export function useReverseStockDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      inventoryAutomationService.reverseStockDeduction(orderId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.all,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`${result.reversed} items revertidos`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al revertir descuento');
    },
  });
}

/**
 * Get stock deduction logs
 */
export function useStockDeductionLogs(
  filters: {
    organization_id: string;
    start_date?: Date;
    end_date?: Date;
    inventory_item_id?: string;
    status?: StockDeductionLog['status'];
  },
  enabled = true,
) {
  return useQuery({
    queryKey: inventoryAutomationKeys.deductionLogs(filters),
    queryFn: () => inventoryAutomationService.getStockDeductionLogs(filters),
    enabled: enabled && !!filters.organization_id,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// ============================================================================
// RECONCILIATION HOOKS
// ============================================================================

/**
 * Create a stock reconciliation
 */
export function useCreateReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      inventory_item_id: string;
      physical_count: number;
      reason: string;
      notes?: string;
      performed_by: string;
    }) => inventoryAutomationService.createReconciliation(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.theoreticalStock(
          variables.inventory_item_id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.reconciliationHistory(
          variables.inventory_item_id,
        ),
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Conciliación registrada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar conciliación');
    },
  });
}

/**
 * Get reconciliation history
 */
export function useReconciliationHistory(
  inventoryItemId: string,
  limit = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...inventoryAutomationKeys.reconciliationHistory(inventoryItemId),
      limit,
    ],
    queryFn: () =>
      inventoryAutomationService.getReconciliationHistory(
        inventoryItemId,
        limit,
      ),
    enabled: enabled && !!inventoryItemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Bulk reconciliation for multiple items
 */
export function useBulkReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      items,
      performedBy,
    }: {
      items: Array<{
        inventory_item_id: string;
        physical_count: number;
        notes?: string;
      }>;
      performedBy: string;
    }) => inventoryAutomationService.bulkReconciliation(items, performedBy),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.all,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`${result.reconciled} items conciliados`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error en conciliación masiva');
    },
  });
}

// ============================================================================
// CONFIGURATION HOOKS
// ============================================================================

/**
 * Get auto-deduction configuration
 */
export function useAutoDeductConfig(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: inventoryAutomationKeys.autoDeductConfig(organizationId),
    queryFn: () =>
      inventoryAutomationService.getAutoDeductConfig(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Update auto-deduction configuration
 */
export function useUpdateAutoDeductConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      config,
    }: {
      organizationId: string;
      config: Partial<AutoDeductConfig>;
    }) =>
      inventoryAutomationService.updateAutoDeductConfig(organizationId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryAutomationKeys.autoDeductConfig(
          variables.organizationId,
        ),
      });
      toast.success('Configuración actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar configuración');
    },
  });
}

// ============================================================================
// ANALYTICS & REPORTS HOOKS
// ============================================================================

/**
 * Get inventory accuracy report
 */
export function useInventoryAccuracyReport(
  organizationId: string,
  dateRange: { start: Date; end: Date },
  enabled = true,
) {
  return useQuery({
    queryKey: inventoryAutomationKeys.accuracyReport(organizationId, dateRange),
    queryFn: () =>
      inventoryAutomationService.getInventoryAccuracyReport(
        organizationId,
        dateRange,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get ingredient usage report
 */
export function useIngredientUsageReport(
  organizationId: string,
  dateRange: { start: Date; end: Date },
  enabled = true,
) {
  return useQuery({
    queryKey: inventoryAutomationKeys.usageReport(organizationId, dateRange),
    queryFn: () =>
      inventoryAutomationService.getIngredientUsageReport(
        organizationId,
        dateRange,
      ),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if item has stock discrepancy
 */
export function useHasStockDiscrepancy(
  inventoryItemId: string,
  threshold = 5, // 5% threshold
) {
  const { data: theoreticalStock } = useTheoreticalStock(
    inventoryItemId,
    undefined,
    !!inventoryItemId,
  );

  if (!theoreticalStock) return { hasDiscrepancy: false, percentage: 0 };

  const hasDiscrepancy =
    Math.abs(theoreticalStock.discrepancy_percentage) > threshold;

  return {
    hasDiscrepancy,
    percentage: theoreticalStock.discrepancy_percentage,
    discrepancy: theoreticalStock.discrepancy,
  };
}

/**
 * Hook to format stock status
 */
export function useStockStatus(theoreticalStock: TheoreticalStock | undefined) {
  if (!theoreticalStock) {
    return {
      status: 'unknown',
      color: 'gray',
      message: 'Sin datos',
    };
  }

  const discrepancy = Math.abs(theoreticalStock.discrepancy_percentage);

  if (discrepancy < 2) {
    return {
      status: 'excellent',
      color: 'green',
      message: 'Stock preciso',
    };
  } else if (discrepancy < 5) {
    return {
      status: 'good',
      color: 'blue',
      message: 'Ligera diferencia',
    };
  } else if (discrepancy < 10) {
    return {
      status: 'warning',
      color: 'yellow',
      message: 'Requiere atención',
    };
  } else {
    return {
      status: 'critical',
      color: 'red',
      message: 'Discrepancia crítica',
    };
  }
}

/**
 * Hook to invalidate all inventory automation queries
 */
export function useInvalidateInventoryAutomation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: inventoryAutomationKeys.all,
    });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    toast.success('Datos actualizados');
  };
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  RecipeIngredientLink,
  TheoreticalStock,
  StockReconciliation,
  StockDeductionLog,
  AutoDeductConfig,
};
