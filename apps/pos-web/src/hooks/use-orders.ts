/**
 * CoffeeOS POS Web - Orders Hooks
 * React Query hooks para órdenes y ventas
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/services/orders.service';
import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/store/ui.store';
import { Order, OrderFilters, PaginationParams, PaymentMethod } from '@/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (
    orgId: string,
    filters?: OrderFilters,
    pagination?: PaginationParams,
  ) => [...orderKeys.lists(), { orgId, filters, pagination }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  receipt: (id: string) => [...orderKeys.all, 'receipt', id] as const,
  stats: (orgId: string, type: 'daily' | 'weekly' | 'monthly', date: string) =>
    [...orderKeys.all, 'stats', orgId, type, date] as const,
};

// ============================================================================
// ORDERS HOOKS
// ============================================================================

export function useOrders(
  filters?: OrderFilters,
  pagination?: PaginationParams,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: orderKeys.list(user?.organizationId || '', filters, pagination),
    queryFn: () =>
      ordersService.getOrders(user?.organizationId || '', filters, pagination),
    enabled: !!user?.organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersService.getOrderById(id),
    enabled: !!id && enabled,
  });
}

// useCreateOrder is consolidated in use-pos.ts (which targets the /pos/orders
// transactional endpoint). Re-exported here to preserve existing imports.
export { useCreateOrder } from '@/hooks/use-pos';

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
      ordersService.updateOrderStatus(id, status),
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      showToast('success', 'Estado actualizado exitosamente');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al actualizar estado');
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ordersService.cancelOrder(id, reason),
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      showToast('success', 'Orden cancelada exitosamente');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al cancelar orden');
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({
      orderId,
      payment,
    }: {
      orderId: string;
      payment: { method: PaymentMethod; amount: number; reference?: string };
    }) => ordersService.addPayment(orderId, payment),
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      showToast('success', 'Pago registrado exitosamente');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al registrar pago');
    },
  });
}

// ============================================================================
// RECEIPT HOOKS
// ============================================================================

export function useReceipt(orderId: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.receipt(orderId),
    queryFn: () => ordersService.getReceipt(orderId),
    enabled: !!orderId && enabled,
  });
}

export function usePrintReceipt() {
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: (orderId: string) => ordersService.printReceipt(orderId),
    onSuccess: () => {
      showToast('success', 'Ticket enviado a impresora');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al imprimir ticket');
    },
  });
}

export function useEmailReceipt() {
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ orderId, email }: { orderId: string; email: string }) =>
      ordersService.emailReceipt(orderId, email),
    onSuccess: () => {
      showToast('success', 'Ticket enviado por email');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al enviar email');
    },
  });
}

export function useWhatsAppReceipt() {
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ orderId, phone }: { orderId: string; phone: string }) =>
      ordersService.whatsappReceipt(orderId, phone),
    onSuccess: () => {
      showToast('success', 'Ticket enviado por WhatsApp');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al enviar WhatsApp');
    },
  });
}

// ============================================================================
// STATISTICS HOOKS
// ============================================================================

export function useDailySales(date: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: orderKeys.stats(
      user?.organizationId || '',
      'daily',
      date.toISOString().split('T')[0],
    ),
    queryFn: () =>
      ordersService.getDailySales(user?.organizationId || '', date),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
