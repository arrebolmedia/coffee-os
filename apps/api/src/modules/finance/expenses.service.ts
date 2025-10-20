import { Injectable } from '@nestjs/common';
import { CreateExpenseDto, UpdateExpenseDto, QueryFinanceDto, ExpenseStatus } from './dto';
import { Expense } from './interfaces';

@Injectable()
export class ExpensesService {
  private expenses: Map<string, Expense> = new Map();

  async create(createDto: CreateExpenseDto, createdByUserId?: string): Promise<Expense> {
    const id = this.generateId();
    const now = new Date();

    const totalAmount = createDto.amount + (createDto.tax_amount || 0);

    const expense: Expense = {
      id,
      organization_id: createDto.organization_id,
      location_id: createDto.location_id,
      category: createDto.category,
      description: createDto.description,
      amount: createDto.amount,
      tax_amount: createDto.tax_amount,
      total_amount: totalAmount,
      due_date: createDto.due_date ? new Date(createDto.due_date) : undefined,
      status: ExpenseStatus.PENDING,
      vendor_name: createDto.vendor_name,
      vendor_rfc: createDto.vendor_rfc,
      invoice_number: createDto.invoice_number,
      notes: createDto.notes,
      attachment_url: createDto.attachment_url,
      created_by_user_id: createdByUserId,
      created_at: now,
      updated_at: now,
    };

    this.expenses.set(id, expense);
    return expense;
  }

  async findAll(query: QueryFinanceDto): Promise<Expense[]> {
    let expenses = Array.from(this.expenses.values());

    if (query.organization_id) {
      expenses = expenses.filter((e) => e.organization_id === query.organization_id);
    }

    if (query.location_id) {
      expenses = expenses.filter((e) => e.location_id === query.location_id);
    }

    if (query.start_date && query.end_date) {
      const start = new Date(query.start_date);
      const end = new Date(query.end_date);
      expenses = expenses.filter((e) => {
        const expenseDate = e.created_at;
        return expenseDate >= start && expenseDate <= end;
      });
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      expenses = expenses.filter(
        (e) =>
          e.description.toLowerCase().includes(search) ||
          e.vendor_name?.toLowerCase().includes(search) ||
          e.invoice_number?.toLowerCase().includes(search),
      );
    }

    return expenses.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async findOne(id: string): Promise<Expense | null> {
    return this.expenses.get(id) || null;
  }

  async update(id: string, updateDto: UpdateExpenseDto): Promise<Expense> {
    const expense = this.expenses.get(id);
    if (!expense) {
      throw new Error('Expense not found');
    }

    Object.assign(expense, updateDto);
    
    if (updateDto.due_date) {
      expense.due_date = new Date(updateDto.due_date);
    }
    if (updateDto.paid_date) {
      expense.paid_date = new Date(updateDto.paid_date);
    }
    
    expense.updated_at = new Date();

    this.expenses.set(id, expense);
    return expense;
  }

  async markAsPaid(id: string, paidDate: Date, paymentMethod: string, reference?: string): Promise<Expense> {
    const expense = this.expenses.get(id);
    if (!expense) {
      throw new Error('Expense not found');
    }

    expense.status = ExpenseStatus.PAID;
    expense.paid_date = paidDate;
    expense.payment_method = paymentMethod as any;
    expense.payment_reference = reference;
    expense.updated_at = new Date();

    this.expenses.set(id, expense);
    return expense;
  }

  async delete(id: string): Promise<void> {
    this.expenses.delete(id);
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    let expenses = Array.from(this.expenses.values()).filter(
      (e) => e.organization_id === organizationId,
    );

    if (locationId) {
      expenses = expenses.filter((e) => e.location_id === locationId);
    }

    const total = expenses.length;
    const pending = expenses.filter((e) => e.status === ExpenseStatus.PENDING).length;
    const paid = expenses.filter((e) => e.status === ExpenseStatus.PAID).length;
    const overdue = expenses.filter((e) => {
      if (e.status === ExpenseStatus.PENDING && e.due_date) {
        return new Date() > e.due_date;
      }
      return false;
    }).length;

    const totalAmount = expenses.reduce((sum, e) => sum + e.total_amount, 0);
    const pendingAmount = expenses
      .filter((e) => e.status === ExpenseStatus.PENDING)
      .reduce((sum, e) => sum + e.total_amount, 0);
    const paidAmount = expenses
      .filter((e) => e.status === ExpenseStatus.PAID)
      .reduce((sum, e) => sum + e.total_amount, 0);

    // By category
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_expenses: total,
      pending_count: pending,
      paid_count: paid,
      overdue_count: overdue,
      total_amount: totalAmount,
      pending_amount: pendingAmount,
      paid_amount: paidAmount,
      by_category: byCategory,
    };
  }

  private generateId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
