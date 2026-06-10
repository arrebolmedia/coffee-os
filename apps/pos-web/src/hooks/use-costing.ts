/**
 * CoffeeOS POS Web - Costing Hooks
 * React Query hooks para cálculo de costos y análisis de rentabilidad
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  type CostBreakdown,
  costingService,
  type MarginAnalysis,
  type ProductCOGS,
  type ProfitabilityReport,
} from '@/services/costing.service';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const costingKeys = {
  all: ['costing'] as const,
  productCOGS: (productId: string) =>
    [...costingKeys.all, 'product-cogs', productId] as const,
  bulkCOGS: (productIds: string[]) =>
    [...costingKeys.all, 'bulk-cogs', productIds.join(',')] as const,
  costBreakdown: (productId: string) =>
    [...costingKeys.all, 'cost-breakdown', productId] as const,
  marginAnalysis: (productId: string) =>
    [...costingKeys.all, 'margin-analysis', productId] as const,
  bulkMarginAnalysis: (organizationId: string) =>
    [...costingKeys.all, 'bulk-margin', organizationId] as const,
  profitabilityReport: (organizationId: string) =>
    [...costingKeys.all, 'profitability', organizationId] as const,
  recommendedPrice: (productId: string, targetMargin: number) =>
    [...costingKeys.all, 'recommended-price', productId, targetMargin] as const,
  marginAlerts: (threshold: number) =>
    [...costingKeys.all, 'margin-alerts', threshold] as const,
};

// ============================================================================
// PRODUCT COGS HOOKS
// ============================================================================

/**
 * Hook para obtener el COGS de un producto específico
 * @param productId - ID del producto
 * @param enabled - Habilitar/deshabilitar query
 */
export function useProductCOGS(productId: string, enabled = true) {
  return useQuery({
    queryKey: costingKeys.productCOGS(productId),
    queryFn: () => costingService.calculateProductCOGS(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    throwOnError: false, // No lanzar error en UI
  });
}

/**
 * Hook para obtener el COGS de múltiples productos
 * @param productIds - Array de IDs de productos
 * @param enabled - Habilitar/deshabilitar query
 */
export function useBulkCOGS(productIds: string[], enabled = true) {
  return useQuery({
    queryKey: costingKeys.bulkCOGS(productIds),
    queryFn: () => costingService.calculateBulkCOGS(productIds),
    enabled: enabled && productIds.length > 0,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });
}

/**
 * Hook para obtener el desglose detallado de costos de un producto
 * @param productId - ID del producto
 * @param enabled - Habilitar/deshabilitar query
 */
export function useCostBreakdown(productId: string, enabled = true) {
  return useQuery({
    queryKey: costingKeys.costBreakdown(productId),
    queryFn: () => costingService.getCostBreakdown(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });
}

// ============================================================================
// MARGIN ANALYSIS HOOKS
// ============================================================================

/**
 * Hook para obtener análisis de margen de un producto
 * @param productId - ID del producto
 * @param enabled - Habilitar/deshabilitar query
 */
export function useMarginAnalysis(productId: string, enabled = true) {
  return useQuery({
    queryKey: costingKeys.marginAnalysis(productId),
    queryFn: () => costingService.getMarginAnalysis(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });
}

/**
 * Hook para obtener análisis de margen de todos los productos
 * @param organizationId - ID de la organización
 * @param enabled - Habilitar/deshabilitar query
 */
export function useBulkMarginAnalysis(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: costingKeys.bulkMarginAnalysis(organizationId),
    queryFn: () => costingService.getBulkMarginAnalysis(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    throwOnError: false,
  });
}

/**
 * Hook para obtener alertas de margen bajo
 * @param organizationId - ID de la organización
 * @param threshold - Umbral de margen (default 60%)
 * @param enabled - Habilitar/deshabilitar query
 */
export function useMarginAlerts(
  organizationId: string,
  threshold = 60,
  enabled = true,
) {
  return useQuery({
    queryKey: costingKeys.marginAlerts(threshold),
    queryFn: async () => {
      const analysis =
        await costingService.getBulkMarginAnalysis(organizationId);
      return analysis.filter((item) => item.margin_percentage < threshold);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// PROFITABILITY REPORT HOOKS
// ============================================================================

/**
 * Hook para obtener reporte de rentabilidad completo
 * @param organizationId - ID de la organización
 * @param enabled - Habilitar/deshabilitar query
 */
export function useProfitabilityReport(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: costingKeys.profitabilityReport(organizationId),
    queryFn: () => costingService.getProfitabilityReport(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para obtener precio recomendado basado en margen objetivo
 * @param productId - ID del producto
 * @param targetMargin - Margen objetivo (default 65%)
 * @param enabled - Habilitar/deshabilitar query
 */
export function useRecommendedPrice(
  productId: string,
  targetMargin = 65,
  enabled = true,
) {
  return useQuery({
    queryKey: costingKeys.recommendedPrice(productId, targetMargin),
    queryFn: () => costingService.getRecommendedPrice(productId, targetMargin),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook para obtener el color del badge según el margen
 * @param marginPercentage - Porcentaje de margen
 * @returns Color del badge y texto
 */
export function useMarginBadge(marginPercentage: number) {
  if (marginPercentage >= 70) {
    return {
      color: 'green',
      text: 'Excelente',
      bgClass: 'bg-green-100 text-green-800',
      iconClass: 'text-green-600',
    };
  } else if (marginPercentage >= 60) {
    return {
      color: 'blue',
      text: 'Bueno',
      bgClass: 'bg-blue-100 text-blue-800',
      iconClass: 'text-blue-600',
    };
  } else if (marginPercentage >= 40) {
    return {
      color: 'yellow',
      text: 'Bajo',
      bgClass: 'bg-yellow-100 text-yellow-800',
      iconClass: 'text-yellow-600',
    };
  } else {
    return {
      color: 'red',
      text: 'Crítico',
      bgClass: 'bg-red-100 text-red-800',
      iconClass: 'text-red-600',
    };
  }
}

/**
 * Hook para formatear montos de dinero
 * @param amount - Monto a formatear
 * @returns String formateado
 */
export function useFormatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

/**
 * Hook para invalidar todas las queries de costing
 */
export function useInvalidateCosting() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: costingKeys.all });
    toast.success('Datos de costeo actualizados');
  };
}

// ============================================================================
// COMPUTED HOOKS
// ============================================================================

/**
 * Hook para obtener métricas resumidas de un producto
 * @param productId - ID del producto
 */
export function useProductMetrics(productId: string) {
  const { data: cogs, isLoading: cogsLoading } = useProductCOGS(productId);
  const { data: analysis, isLoading: analysisLoading } =
    useMarginAnalysis(productId);

  const isLoading = cogsLoading || analysisLoading;

  const metrics = {
    totalCost: cogs?.total_cost || 0,
    salePrice: cogs?.sale_price || 0,
    grossMargin: cogs?.gross_margin || 0,
    marginPercentage: cogs?.margin_percentage || 0,
    marginStatus: analysis?.margin_status || 'warning',
    recommendation: analysis?.recommendation || '',
    hasRecipe: cogs?.has_recipe || false,
  };

  return { metrics, isLoading };
}

/**
 * Hook para obtener productos con margen bajo (dashboard widget)
 * @param organizationId - ID de la organización
 * @param limit - Número de productos a retornar
 */
export function useLowMarginProducts(
  organizationId: string,
  limit = 5,
  enabled = true,
) {
  return useQuery({
    queryKey: [...costingKeys.all, 'low-margin', organizationId, limit],
    queryFn: async () => {
      const analysis =
        await costingService.getBulkMarginAnalysis(organizationId);
      return analysis
        .filter((item) => item.margin_percentage < 60)
        .sort((a, b) => a.margin_percentage - b.margin_percentage)
        .slice(0, limit);
    },
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para obtener productos más rentables (dashboard widget)
 * @param organizationId - ID de la organización
 * @param limit - Número de productos a retornar
 */
export function useTopProfitableProducts(
  organizationId: string,
  limit = 5,
  enabled = true,
) {
  return useQuery({
    queryKey: [...costingKeys.all, 'top-profitable', organizationId, limit],
    queryFn: async () => {
      const report =
        await costingService.getProfitabilityReport(organizationId);
      return report.top_profitable.slice(0, limit);
    },
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para obtener distribución de márgenes (dashboard chart)
 * @param organizationId - ID de la organización
 */
export function useMarginDistribution(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: [...costingKeys.all, 'margin-distribution', organizationId],
    queryFn: async () => {
      const report =
        await costingService.getProfitabilityReport(organizationId);
      return {
        distribution: report.margin_distribution,
        avgMargin: report.avg_margin,
        totalProducts: report.total_products,
      };
    },
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type { ProductCOGS, MarginAnalysis, ProfitabilityReport, CostBreakdown };
