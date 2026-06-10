/**
 * CoffeeOS - Customers Hooks
 * React Query hooks para gestión de clientes y CRM
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { useAuth } from '@/hooks/use-auth';
import { Customer, PaginationParams } from '@/types';
import toast from 'react-hot-toast';

// Query keys
export const customersKeys = {
  all: ['customers'] as const,
  lists: () => [...customersKeys.all, 'list'] as const,
  list: (orgId: string, filters?: any) =>
    [...customersKeys.lists(), orgId, filters] as const,
  details: () => [...customersKeys.all, 'detail'] as const,
  detail: (id: string) => [...customersKeys.details(), id] as const,
  search: (orgId: string, query: string) =>
    [...customersKeys.all, 'search', orgId, query] as const,
  loyalty: (customerId: string) =>
    [...customersKeys.detail(customerId), 'loyalty'] as const,
  loyaltyHistory: (customerId: string) =>
    [...customersKeys.loyalty(customerId), 'history'] as const,
  stats: (customerId: string) =>
    [...customersKeys.detail(customerId), 'stats'] as const,
};

/**
 * Hook to get customers list
 */
export function useCustomers(
  filters?: {
    search?: string;
    loyalty_tier?: string;
    rfm_segment?: string;
  },
  pagination?: PaginationParams,
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: customersKeys.list(organizationId, { filters, pagination }),
    queryFn: () =>
      customersService.getCustomers(organizationId, filters, pagination),
    enabled: !!organizationId,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Hook to get customer by ID
 */
export function useCustomer(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customersKeys.detail(customerId),
    queryFn: () => customersService.getCustomerById(customerId),
    enabled: enabled && !!customerId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to search customers
 */
export function useSearchCustomers(query: string, enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: customersKeys.search(organizationId, query),
    queryFn: () => customersService.searchCustomers(organizationId, query),
    enabled: enabled && !!organizationId && query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get customer by phone
 */
export function useCustomerByPhone(phone: string, enabled = true) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useQuery({
    queryKey: [...customersKeys.all, 'phone', phone, organizationId],
    queryFn: () => customersService.getCustomerByPhone(phone, organizationId),
    enabled: enabled && !!organizationId && !!phone,
    staleTime: 60000,
  });
}

/**
 * Hook to create customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  return useMutation({
    mutationFn: (data: Partial<Customer>) =>
      customersService.createCustomer({
        ...data,
        organization_id: organizationId,
      }),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      toast.success(
        `Cliente ${[customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.phone || 'nuevo'} creado exitosamente`,
      );
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear cliente');
    },
  });
}

/**
 * Hook to update customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      customersService.updateCustomer(id, data),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: customersKeys.detail(customer.id),
      });
      toast.success('Cliente actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar cliente',
      );
    },
  });
}

/**
 * Hook to delete customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      toast.success('Cliente eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al eliminar cliente',
      );
    },
  });
}

/**
 * Hook to get loyalty points
 */
export function useLoyaltyPoints(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customersKeys.loyalty(customerId),
    queryFn: () => customersService.getLoyaltyPoints(customerId),
    enabled: enabled && !!customerId,
    staleTime: 60000,
  });
}

/**
 * Hook to add loyalty points
 */
export function useAddLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      points,
      reason,
    }: {
      customerId: string;
      points: number;
      reason?: string;
    }) => customersService.addLoyaltyPoints(customerId, points, reason),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({
        queryKey: customersKeys.detail(customer.id),
      });
      queryClient.invalidateQueries({
        queryKey: customersKeys.loyalty(customer.id),
      });
      queryClient.invalidateQueries({
        queryKey: customersKeys.loyaltyHistory(customer.id),
      });
      toast.success('Puntos agregados exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al agregar puntos');
    },
  });
}

/**
 * Hook to redeem loyalty points
 */
export function useRedeemLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      points,
      reason,
    }: {
      customerId: string;
      points: number;
      reason?: string;
    }) => customersService.redeemLoyaltyPoints(customerId, points, reason),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({
        queryKey: customersKeys.detail(customer.id),
      });
      queryClient.invalidateQueries({
        queryKey: customersKeys.loyalty(customer.id),
      });
      queryClient.invalidateQueries({
        queryKey: customersKeys.loyaltyHistory(customer.id),
      });
      toast.success('Puntos canjeados exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al canjear puntos');
    },
  });
}

/**
 * Hook to get loyalty history
 */
export function useLoyaltyHistory(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customersKeys.loyaltyHistory(customerId),
    queryFn: () => customersService.getLoyaltyHistory(customerId),
    enabled: enabled && !!customerId,
    staleTime: 60000,
  });
}

/**
 * Hook to get customer stats
 */
export function useCustomerStats(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customersKeys.stats(customerId),
    queryFn: () => customersService.getCustomerStats(customerId),
    enabled: enabled && !!customerId,
    staleTime: 300000, // 5 minutes
  });
}
