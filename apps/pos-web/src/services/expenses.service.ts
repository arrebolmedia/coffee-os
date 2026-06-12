/**
 * CoffeeOS POS Web - Expenses Service
 * Servicio para gestión de gastos operativos
 */

import { api } from '@/lib/api';
import { Expense } from '@/types';

/** Devuelve undefined para strings vacíos (los DTOs rechazan '' en fechas/enums). */
function emptyToUndefined(value?: string | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

class ExpensesService {
  private readonly baseUrl = '/finance/expenses';

  // ============================================================================
  // EXPENSES CRUD
  // ============================================================================

  /**
   * GET /finance/expenses devuelve un array plano (sin paginación).
   * QueryFinanceDto solo acepta: organization_id, location_id, start_date,
   * end_date, period, search — el ValidationPipe global rechaza extras
   * (forbidNonWhitelisted), así que category/status se filtran client-side.
   */
  async getExpenses(
    _organizationId: string,
    filters?: {
      location_id?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
    },
  ): Promise<Expense[]> {
    const params = new URLSearchParams();

    // organization_id sale del JWT en el backend; no es necesario enviarlo.
    if (filters?.location_id) params.append('location_id', filters.location_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const result = await api.get<Expense[]>(
      query ? `${this.baseUrl}?${query}` : this.baseUrl,
    );
    return Array.isArray(result) ? result : [];
  }

  async getExpenseById(id: string): Promise<Expense> {
    return await api.get<Expense>(`${this.baseUrl}/${id}`);
  }

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    // Solo campos de CreateExpenseDto — extras provocan 400
    // (forbidNonWhitelisted). organization_id sí es parte del DTO de creación.
    const payload = {
      organization_id: data.organization_id,
      location_id: data.location_id ?? undefined,
      category: data.category,
      description: data.description,
      amount: data.amount,
      tax_amount: data.tax_amount,
      due_date: emptyToUndefined(data.due_date),
      vendor_name: emptyToUndefined(data.vendor_name),
      vendor_rfc: emptyToUndefined(data.vendor_rfc),
      invoice_number: emptyToUndefined(data.invoice_number),
      notes: emptyToUndefined(data.notes),
      attachment_url: emptyToUndefined(data.attachment_url),
    };
    return await api.post<Expense>(this.baseUrl, payload);
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    // Solo campos de UpdateExpenseDto — total_amount/organization_id/
    // location_id NO son parte del DTO y provocarían 400.
    const payload: Record<string, unknown> = {};
    if (data.category !== undefined) payload.category = data.category;
    if (data.description !== undefined) payload.description = data.description;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.tax_amount !== undefined) payload.tax_amount = data.tax_amount;
    if (emptyToUndefined(data.due_date) !== undefined)
      payload.due_date = emptyToUndefined(data.due_date);
    if (data.status !== undefined) payload.status = data.status;
    if (data.payment_method !== undefined)
      payload.payment_method = data.payment_method;
    if (emptyToUndefined(data.paid_date) !== undefined)
      payload.paid_date = emptyToUndefined(data.paid_date);
    if (data.payment_reference !== undefined)
      payload.payment_reference = data.payment_reference;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.attachment_url !== undefined)
      payload.attachment_url = data.attachment_url;

    return await api.patch<Expense>(`${this.baseUrl}/${id}`, payload);
  }

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  /**
   * POST /finance/expenses/:id/pay — el controller lee body.reference (no
   * payment_reference) y hace new Date(body.paid_date), así que paid_date
   * SIEMPRE se envía (default: hoy en ISO).
   */
  async markAsPaid(
    id: string,
    data: {
      payment_method: string;
      reference?: string;
      paid_date?: string;
    },
  ): Promise<Expense> {
    const payload = {
      payment_method: data.payment_method,
      reference: data.reference,
      paid_date: emptyToUndefined(data.paid_date) ?? new Date().toISOString(),
    };
    return await api.post<Expense>(`${this.baseUrl}/${id}/pay`, payload);
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
