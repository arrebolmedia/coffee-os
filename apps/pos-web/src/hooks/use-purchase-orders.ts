/**
 * CoffeeOS - Purchase Orders Hooks
 * React Query hooks para gestión de órdenes de compra
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreatePurchaseOrderDTO,
  PurchaseOrdersService,
  ReceivePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
} from '@/services/purchase-orders.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

// Query keys
export const purchaseOrdersKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...purchaseOrdersKeys.all, 'list'] as const,
  list: (orgId: string, filters?: any) =>
    [...purchaseOrdersKeys.lists(), orgId, filters] as const,
  details: () => [...purchaseOrdersKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseOrdersKeys.details(), id] as const,
  stats: (orgId: string, dateRange?: any) =>
    [...purchaseOrdersKeys.all, 'stats', orgId, dateRange] as const,
};

/**
 * Hook to get purchase orders list
 */
export function usePurchaseOrders(filters?: {
  supplier_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: purchaseOrdersKeys.list(organizationId, filters),
    queryFn: () =>
      PurchaseOrdersService.getPurchaseOrders(organizationId, filters),
    enabled: !!organizationId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get purchase order by ID
 */
export function usePurchaseOrder(poId: string, enabled = true) {
  return useQuery({
    queryKey: purchaseOrdersKeys.detail(poId),
    queryFn: () => PurchaseOrdersService.getPurchaseOrder(poId),
    enabled: enabled && !!poId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get purchase order statistics
 */
export function usePurchaseOrderStats() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: purchaseOrdersKeys.stats(organizationId),
    queryFn: () => PurchaseOrdersService.getPurchaseOrderStats(organizationId),
    enabled: !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to create purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (
      data: Omit<CreatePurchaseOrderDTO, 'organization_id' | 'requested_by'>,
    ) =>
      PurchaseOrdersService.createPurchaseOrder({
        ...data,
        organization_id: organizationId,
        requested_by: user?.id || '',
      }),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.stats(organizationId),
      });
      toast.success(`Orden de compra ${po.order_number} creada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al crear orden de compra',
      );
    },
  });
}

/**
 * Hook to update purchase order
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseOrderDTO }) =>
      PurchaseOrdersService.updatePurchaseOrder(id, data),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(po.id),
      });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.stats(organizationId),
      });
      toast.success('Orden de compra actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar orden de compra',
      );
    },
  });
}

/**
 * Hook to delete purchase order
 */
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (id: string) => PurchaseOrdersService.deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.stats(organizationId),
      });
      toast.success('Orden de compra eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al eliminar orden de compra',
      );
    },
  });
}

/**
 * Hook to approve purchase order
 */
export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      PurchaseOrdersService.approvePurchaseOrder(id, user?.id || ''),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(po.id),
      });
      toast.success(`Orden ${po.order_number} aprobada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al aprobar orden de compra',
      );
    },
  });
}

/**
 * Hook to send purchase order to supplier
 */
export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PurchaseOrdersService.sendPurchaseOrder(id),
    onSuccess: (po) => {
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(po.id),
      });
      toast.success('Orden de compra enviada al proveedor');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al enviar orden de compra',
      );
    },
  });
}

/**
 * Hook to receive purchase order
 */
export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceivePurchaseOrderDTO }) =>
      PurchaseOrdersService.receivePurchaseOrder(id, data),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(po.id),
      });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.stats(organizationId),
      });
      // Invalidar inventario porque se recibieron productos
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`Orden ${po.order_number} recibida exitosamente`);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al recibir orden de compra',
      );
    },
  });
}

/**
 * Hook to cancel purchase order
 */
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PurchaseOrdersService.cancelPurchaseOrder(id),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(po.id),
      });
      toast.success(`Orden ${po.order_number} cancelada`);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al cancelar orden de compra',
      );
    },
  });
}

/**
 * Utility hook to invalidate all purchase orders queries
 */
export function useInvalidatePurchaseOrders() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.all });
  };
}

/**
 * Utility hook to get purchase order status badge color
 */
export function usePOStatusBadge(status: string): {
  color: string;
  bgColor: string;
  label: string;
} {
  const statusMap: Record<
    string,
    { color: string; bgColor: string; label: string }
  > = {
    draft: {
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      label: 'Borrador',
    },
    pending: {
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      label: 'Pendiente',
    },
    approved: {
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
      label: 'Aprobada',
    },
    ordered: {
      color: 'text-indigo-800',
      bgColor: 'bg-indigo-100',
      label: 'Ordenada',
    },
    partially_received: {
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      label: 'Parcial',
    },
    received: {
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      label: 'Recibida',
    },
    cancelled: {
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      label: 'Cancelada',
    },
  };

  return (
    statusMap[status] || {
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      label: status,
    }
  );
}

/**
 * Utility hook to format currency
 */
export function useFormatCurrency() {
  return (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };
}
