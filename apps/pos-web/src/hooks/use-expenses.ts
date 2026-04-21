/**
 * CoffeeOS - Expenses Hooks
 * React Query hooks para gestión de gastos
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesService } from '@/services/expenses.service';
import { useAuth } from '@/hooks/use-auth';
import { Expense, PaginationParams } from '@/types';
import toast from 'react-hot-toast';

// Query keys
export const expensesKeys = {
  all: ['expenses'] as const,
  lists: () => [...expensesKeys.all, 'list'] as const,
  list: (orgId: string, filters?: any) =>
    [...expensesKeys.lists(), orgId, filters] as const,
  details: () => [...expensesKeys.all, 'detail'] as const,
  detail: (id: string) => [...expensesKeys.details(), id] as const,
  summary: (orgId: string, month?: string) =>
    [...expensesKeys.all, 'summary', orgId, month] as const,
  byCategory: (orgId: string, startDate?: string, endDate?: string) =>
    [...expensesKeys.all, 'by-category', orgId, startDate, endDate] as const,
};

/**
 * Hook to get expenses list
 */
export function useExpenses(
  filters?: {
    location_id?: string;
    category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  },
  pagination?: PaginationParams,
) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: expensesKeys.list(organizationId, { filters, pagination }),
    queryFn: () =>
      expensesService.getExpenses(organizationId, filters, pagination),
    enabled: !!organizationId,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Hook to get expense by ID
 */
export function useExpense(expenseId: string, enabled = true) {
  return useQuery({
    queryKey: expensesKeys.detail(expenseId),
    queryFn: () => expensesService.getExpenseById(expenseId),
    enabled: enabled && !!expenseId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to create expense
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: (data: Partial<Expense>) =>
      expensesService.createExpense({
        ...data,
        organization_id: organizationId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.summary(organizationId),
      });
      toast.success('Gasto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear gasto');
    },
  });
}

/**
 * Hook to update expense
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) =>
      expensesService.updateExpense(id, data),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.detail(expense.id),
      });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.summary(organizationId),
      });
      toast.success('Gasto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al actualizar gasto',
      );
    },
  });
}

/**
 * Hook to delete expense
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: (id: string) => expensesService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.summary(organizationId),
      });
      toast.success('Gasto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al eliminar gasto');
    },
  });
}

/**
 * Hook to mark expense as paid
 */
export function useMarkExpenseAsPaid() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        payment_method: string;
        payment_reference?: string;
        paid_date?: string;
        notes?: string;
      };
    }) => expensesService.markAsPaid(id, data),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.detail(expense.id),
      });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.summary(organizationId),
      });
      toast.success('Gasto marcado como pagado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al marcar pago');
    },
  });
}

/**
 * Hook to cancel expense
 */
export function useCancelExpense() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      expensesService.cancelExpense(id, reason),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.detail(expense.id),
      });
      queryClient.invalidateQueries({
        queryKey: expensesKeys.summary(organizationId),
      });
      toast.success('Gasto cancelado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al cancelar gasto');
    },
  });
}

/**
 * Hook to get expenses summary
 */
export function useExpensesSummary(month?: string) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: expensesKeys.summary(organizationId, month),
    queryFn: () => expensesService.getExpensesSummary(organizationId, month),
    enabled: !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get expenses by category
 */
export function useExpensesByCategory(startDate?: string, endDate?: string) {
  const { session } = useAuth();
  const organizationId = session?.user?.organizationId || '';

  return useQuery({
    queryKey: expensesKeys.byCategory(organizationId, startDate, endDate),
    queryFn: () =>
      expensesService.getExpensesByCategory(organizationId, startDate, endDate),
    enabled: !!organizationId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to upload attachment
 */
export function useUploadExpenseAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, file }: { expenseId: string; file: File }) =>
      expensesService.uploadAttachment(expenseId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: expensesKeys.detail(variables.expenseId),
      });
      toast.success('Archivo adjuntado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al adjuntar archivo',
      );
    },
  });
}
