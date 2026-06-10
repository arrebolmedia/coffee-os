/**
 * CoffeeOS POS Web - Expenses Service
 * Servicio para gestión de gastos operativos
 */

import { api } from '@/lib/api';
import { Expense, PaginatedResponse, PaginationParams } from '@/types';

class ExpensesService {
  private readonly baseUrl = '/finance/expenses';

  // ============================================================================
  // EXPENSES CRUD
  // ============================================================================

  async getExpenses(
    organizationId: string,
    filters?: {
      location_id?: string;
      category?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    },
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Expense>> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.location_id) params.append('location_id', filters.location_id);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order)
      params.append('sort_order', pagination.sort_order);

    return await api.get<PaginatedResponse<Expense>>(
      `${this.baseUrl}?${params.toString()}`,
    );
  }

  async getExpenseById(id: string): Promise<Expense> {
    return await api.get<Expense>(`${this.baseUrl}/${id}`);
  }

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    return await api.post<Expense>(this.baseUrl, data);
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    return await api.patch<Expense>(`${this.baseUrl}/${id}`, data);
  }

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  async markAsPaid(
    id: string,
    data: {
      payment_method: string;
      payment_reference?: string;
      paid_date?: string;
      notes?: string;
    },
  ): Promise<Expense> {
    return await api.post<Expense>(`${this.baseUrl}/${id}/pay`, data);
  }

  async cancelExpense(_id: string, _reason?: string): Promise<Expense> {
    throw new Error('cancelExpense is not supported by the backend');
  }

  // ============================================================================
  // REPORTS & STATS
  // ============================================================================

  async getExpensesByCategory(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<
    Array<{
      category: string;
      total_amount: number;
      count: number;
    }>
  > {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return await api.get<any>(`${this.baseUrl}/stats?${params.toString()}`);
  }

  async getExpensesSummary(
    organizationId: string,
    month?: string,
  ): Promise<{
    total_expenses: number;
    total_paid: number;
    total_pending: number;
    total_overdue: number;
    by_category: Record<string, number>;
  }> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);
    if (month) params.append('month', month);

    return await api.get<any>(`${this.baseUrl}/stats?${params.toString()}`);
  }

  // ============================================================================
  // ATTACHMENTS
  // ============================================================================

  async uploadAttachment(
    _expenseId: string,
    _file: File,
  ): Promise<{ url: string }> {
    // TODO: implementar cuando el backend exponga
    // POST /finance/expenses/:id/attachments (hoy no existe → 404 garantizado).
    throw new Error('Attachments no soportados aún');
  }
}

export const expensesService = new ExpensesService();
export default ExpensesService;
