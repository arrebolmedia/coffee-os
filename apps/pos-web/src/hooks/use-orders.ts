/**
 * CoffeeOS POS Web - Orders Hooks
 * React Query hooks para órdenes y ventas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/services/orders.service';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useOfflineStore } from '@/store/offline.store';
import { Order, Cart, OrderFilters, PaginationParams, PaymentMethod } from '@/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (orgId: string, filters?: OrderFilters, pagination?: PaginationParams) =>
    [...orderKeys.lists(), { orgId, filters, pagination }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  receipt: (id: string) => [...orderKeys.all, 'receipt', id] as const,
  stats: (orgId: string, type: 'daily' | 'weekly' | 'monthly', date: string) =>
    [...orderKeys.all, 'stats', orgId, type, date] as const,
};

// ============================================================================
// ORDERS HOOKS
// ============================================================================

export function useOrders(filters?: OrderFilters, pagination?: PaginationParams) {
  const context = useAuthStore((state) => state.context);

  return useQuery({
    queryKey: orderKeys.list(context?.organization_id || '', filters, pagination),
    queryFn: () => ordersService.getOrders(context?.organization_id || '', filters, pagination),
    enabled: !!context?.organization_id,
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

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  const context = useAuthStore((state) => state.context);
  const isOnline = useOfflineStore((state) => state.isOnline);
  const addToSyncQueue = useOfflineStore((state) => state.addToSyncQueue);

  return useMutation({
    mutationFn: async (data: {
      cart: Cart;
      customer_id?: string;
      payment_method?: PaymentMethod;
      notes?: string;
    }) => {
      if (!context) throw new Error('No context available');

      const orderData = {
        organization_id: context.organization_id,
        location_id: context.location_id,
        ...data,
      };

      if (isOnline) {
        // Online: Send directly to server
        return await ordersService.createOrder(orderData);
      } else {
        // Offline: Add to sync queue and return optimistic response
        const optimisticOrder: Order = {
          id: `offline-${Date.now()}`,
          organization_id: context.organization_id,
          location_id: context.location_id,
          order_number: `OFF-${Date.now()}`,
          status: 'PENDING' as any,
          customer_id: data.customer_id,
          items: data.cart.items.map((item) => ({
            id: item.id,
            product_id: item.product.id,
            product_name: item.product.name,
            product_sku: item.product.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            modifiers: item.selected_modifiers,
            subtotal: item.subtotal,
            notes: item.notes,
          })),
          subtotal: data.cart.subtotal,
          tax: data.cart.tax,
          discount: data.cart.discount,
          total: data.cart.total,
          payment_method: data.payment_method,
          payment_status: 'PENDING' as any,
          payments: [],
          cashier_id: 'offline',
          cashier_name: 'Offline User',
          notes: data.notes,
          created_at: new Date(),
          updated_at: new Date(),
        };

        addToSyncQueue('ORDER', 'CREATE', orderData);
        return optimisticOrder;
      }
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      showToast('success', `Orden ${order.order_number} creada exitosamente`);
      
      if (!isOnline) {
        showToast(
          'info',
          'Orden guardada offline. Se sincronizará cuando haya conexión.',
          7000
        );
      }
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Error al crear orden');
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
      ordersService.updateOrderStatus(id, status),
    onSuccess: (order) => {
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
    onSuccess: (order) => {
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
    onSuccess: (order) => {
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
  const context = useAuthStore((state) => state.context);

  return useQuery({
    queryKey: orderKeys.stats(
      context?.organization_id || '',
      'daily',
      date.toISOString().split('T')[0]
    ),
    queryFn: () => ordersService.getDailySales(context?.organization_id || '', date),
    enabled: !!context?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
