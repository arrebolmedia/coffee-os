/**
 * CoffeeOS - POS Hooks
 * React Query hooks para operaciones del punto de venta
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { POSService, CreateOrderDTO, Order } from '@/services/pos.service';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

// Query keys
export const posKeys = {
  all: ['pos'] as const,
  orders: () => [...posKeys.all, 'orders'] as const,
  order: (id: string) => [...posKeys.orders(), id] as const,
  todayOrders: (orgId: string) =>
    [...posKeys.orders(), 'today', orgId] as const,
  dateRangeOrders: (orgId: string, start: string, end: string) =>
    [...posKeys.orders(), 'range', orgId, start, end] as const,
  stats: (orgId: string) => [...posKeys.all, 'stats', orgId] as const,
  dailyStats: (orgId: string, date?: string) =>
    [...posKeys.stats(orgId), 'daily', date] as const,
  cashRegister: (orgId: string) =>
    [...posKeys.all, 'cash-register', orgId] as const,
};

/**
 * Hook to create order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: (data: CreateOrderDTO) => POSService.createOrder(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: posKeys.orders() });
      queryClient.invalidateQueries({
        queryKey: posKeys.todayOrders(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: posKeys.stats(organizationId),
      });
      toast.success(`Orden #${order.order_number} creada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear la orden');
    },
  });
}

/**
 * Hook to get order by ID
 */
export function useOrder(orderId: string, enabled = true) {
  return useQuery({
    queryKey: posKeys.order(orderId),
    queryFn: () => POSService.getOrder(orderId),
    enabled: enabled && !!orderId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get today's orders
 */
export function useTodayOrders() {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: posKeys.todayOrders(organizationId),
    queryFn: () => POSService.getTodayOrders(organizationId),
    enabled: !!organizationId,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to get orders by date range
 */
export function useOrdersByDateRange(
  startDate: string,
  endDate: string,
  enabled = true,
) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: posKeys.dateRangeOrders(organizationId, startDate, endDate),
    queryFn: () =>
      POSService.getOrdersByDateRange(organizationId, startDate, endDate),
    enabled: enabled && !!organizationId && !!startDate && !!endDate,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get daily sales stats
 */
export function useDailySalesStats(date?: string) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: posKeys.dailyStats(organizationId, date),
    queryFn: () => POSService.getDailySalesStats(organizationId, date),
    enabled: !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to cancel order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      POSService.cancelOrder(orderId, reason),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: posKeys.orders() });
      queryClient.invalidateQueries({ queryKey: posKeys.order(order.id) });
      queryClient.invalidateQueries({
        queryKey: posKeys.todayOrders(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: posKeys.stats(organizationId),
      });
      toast.success('Orden cancelada exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al cancelar la orden',
      );
    },
  });
}

/**
 * Hook to refund order
 */
export function useRefundOrder() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: ({
      orderId,
      reason,
      amount,
    }: {
      orderId: string;
      reason: string;
      amount?: number;
    }) => POSService.refundOrder(orderId, reason, amount),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: posKeys.orders() });
      queryClient.invalidateQueries({ queryKey: posKeys.order(order.id) });
      queryClient.invalidateQueries({
        queryKey: posKeys.todayOrders(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: posKeys.stats(organizationId),
      });
      toast.success('Reembolso procesado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al procesar el reembolso',
      );
    },
  });
}

/**
 * Hook to print receipt
 */
export function usePrintReceipt() {
  return useMutation({
    mutationFn: (orderId: string) => POSService.printReceipt(orderId),
    onSuccess: (data) => {
      // Open receipt in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.receipt);
        printWindow.document.close();
        printWindow.print();
      }
      toast.success('Imprimiendo recibo...');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al imprimir recibo');
    },
  });
}

/**
 * Hook to open cash register
 */
export function useOpenCashRegister() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';
  const userId = session?.user?.id || '';

  return useMutation({
    mutationFn: (initialAmount: number) =>
      POSService.openCashRegister(organizationId, initialAmount, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: posKeys.cashRegister(organizationId),
      });
      toast.success('Caja abierta exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al abrir caja');
    },
  });
}

/**
 * Hook to close cash register
 */
export function useCloseCashRegister() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: ({
      registerId,
      finalAmount,
      notes,
    }: {
      registerId: string;
      finalAmount: number;
      notes?: string;
    }) => POSService.closeCashRegister(registerId, finalAmount, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: posKeys.cashRegister(organizationId),
      });
      if (data.difference !== 0) {
        toast.success(
          `Caja cerrada. Diferencia: $${Math.abs(data.difference).toFixed(2)}`,
          { duration: 5000 },
        );
      } else {
        toast.success('Caja cerrada sin diferencias');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al cerrar caja');
    },
  });
}

/**
 * Hook to get current cash register
 */
export function useCurrentCashRegister() {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: posKeys.cashRegister(organizationId),
    queryFn: () => POSService.getCurrentCashRegister(organizationId),
    enabled: !!organizationId,
    staleTime: 60000, // 1 minute
  });
}
