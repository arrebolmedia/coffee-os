import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateExpenseDto,
  ExpenseStatus,
  QueryFinanceDto,
  UpdateExpenseDto,
} from './dto';
import { Expense } from './interfaces';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private map(e: any): Expense {
    return {
      id: e.id,
      organization_id: e.organizationId,
      location_id: e.locationId,
      category: e.category,
      description: e.description,
      amount: e.amount,
      tax_amount: e.taxAmount ?? undefined,
      total_amount: e.totalAmount,
      due_date: e.dueDate ?? undefined,
      status: e.status,
      vendor_name: e.vendorName ?? undefined,
      vendor_rfc: e.vendorRfc ?? undefined,
      invoice_number: e.invoiceNumber ?? undefined,
      payment_method: e.paymentMethod ?? undefined,
      paid_date: e.paidDate ?? undefined,
      payment_reference: e.paymentReference ?? undefined,
      attachment_url: e.attachmentUrl ?? undefined,
      notes: e.notes ?? undefined,
      created_by_user_id: e.createdByUserId ?? undefined,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    };
  }

  async create(
    createDto: CreateExpenseDto,
    createdByUserId?: string,
  ): Promise<Expense> {
    const totalAmount = createDto.amount + (createDto.tax_amount ?? 0);
    const expense = await this.prisma.expense.create({
      data: {
        organizationId: createDto.organization_id,
        locationId: createDto.location_id,
        category: createDto.category as any,
        description: createDto.description,
        amount: createDto.amount,
        taxAmount: createDto.tax_amount,
        totalAmount,
        dueDate: createDto.due_date ? new Date(createDto.due_date) : undefined,
        status: ExpenseStatus.PENDING as any,
        vendorName: createDto.vendor_name,
        vendorRfc: createDto.vendor_rfc,
        invoiceNumber: createDto.invoice_number,
        notes: createDto.notes,
        attachmentUrl: createDto.attachment_url,
        createdByUserId,
      },
    });
    return this.map(expense);
  }

  async findAll(query: QueryFinanceDto): Promise<Expense[]> {
    const where: any = {};

    if (query.organization_id) where.organizationId = query.organization_id;
    if (query.location_id) where.locationId = query.location_id;

    if (query.start_date && query.end_date) {
      where.createdAt = {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      };
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { vendorName: { contains: query.search, mode: 'insensitive' } },
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return expenses.map((e) => this.map(e));
  }

  async findOne(id: string, organizationId: string): Promise<Expense | null> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId },
    });
    return expense ? this.map(expense) : null;
  }

  async update(
    id: string,
    updateDto: UpdateExpenseDto,
    organizationId: string,
  ): Promise<Expense> {
    const existing = await this.prisma.expense.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    const anyDto = updateDto as any;
    const amountProvided = anyDto.amount !== undefined;
    const taxAmountProvided = anyDto.tax_amount !== undefined;

    const data: any = {
      ...(updateDto.category && { category: updateDto.category as any }),
      ...(updateDto.description && { description: updateDto.description }),
      ...(updateDto.due_date && { dueDate: new Date(updateDto.due_date) }),
      ...(updateDto.status && { status: updateDto.status as any }),
      ...(updateDto.payment_method && {
        paymentMethod: updateDto.payment_method as any,
      }),
      ...(updateDto.paid_date && { paidDate: new Date(updateDto.paid_date) }),
      ...(updateDto.payment_reference !== undefined && {
        paymentReference: updateDto.payment_reference,
      }),
      ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
      ...(updateDto.attachment_url !== undefined && {
        attachmentUrl: updateDto.attachment_url,
      }),
    };

    if (amountProvided) data.amount = anyDto.amount;
    if (taxAmountProvided) data.taxAmount = anyDto.tax_amount;

    // Recalculate totalAmount when amount or taxAmount change.
    if (amountProvided || taxAmountProvided) {
      const newAmount = amountProvided ? anyDto.amount : existing.amount;
      const newTaxAmount = taxAmountProvided
        ? (anyDto.tax_amount ?? 0)
        : (existing.taxAmount ?? 0);
      data.totalAmount = newAmount + newTaxAmount;
    }

    const expense = await this.prisma.expense.update({
      where: { id },
      data,
    });
    return this.map(expense);
  }

  async markAsPaid(
    id: string,
    paidDate: Date,
    paymentMethod: string,
    organizationId: string,
    reference?: string,
  ): Promise<Expense> {
    const existing = await this.prisma.expense.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.PAID as any,
        paidDate,
        paymentMethod: paymentMethod as any,
        paymentReference: reference,
      },
    });
    return this.map(expense);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.expense.delete({ where: { id } });
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    const where: any = { organizationId };
    if (locationId) where.locationId = locationId;

    const now = new Date();

    const [
      total,
      pending,
      paid,
      overdue,
      totalAgg,
      pendingAgg,
      paidAgg,
      byCategory,
    ] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.count({
        where: { ...where, status: 'PENDING' as any },
      }),
      this.prisma.expense.count({ where: { ...where, status: 'PAID' as any } }),
      this.prisma.expense.count({
        where: { ...where, status: 'PENDING' as any, dueDate: { lt: now } },
      }),
      this.prisma.expense.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.expense.aggregate({
        where: { ...where, status: 'PENDING' as any },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...where, status: 'PAID' as any },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { totalAmount: true },
      }),
    ]);

    const byCategoryMap = byCategory.reduce(
      (acc, row) => {
        acc[row.category] = row._sum.totalAmount ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total_expenses: total,
      pending_count: pending,
      paid_count: paid,
      overdue_count: overdue,
      total_amount: totalAgg._sum.totalAmount ?? 0,
      pending_amount: pendingAgg._sum.totalAmount ?? 0,
      paid_amount: paidAgg._sum.totalAmount ?? 0,
      by_category: byCategoryMap,
    };
  }
}
