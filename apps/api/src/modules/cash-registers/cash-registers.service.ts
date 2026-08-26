import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { RecordDenominationDto } from './dto/record-denomination.dto';
import { RecordExpenseDto } from './dto/record-expense.dto';
import { QueryCashRegistersDto } from './dto/query-cash-registers.dto';

@Injectable()
export class CashRegistersService {
  constructor(private prisma: PrismaService) {}

  async create(createCashRegisterDto: CreateCashRegisterDto) {
    return this.prisma.cashRegister.create({
      data: createCashRegisterDto,
    });
  }

  async findAll(query: QueryCashRegistersDto, organizationId?: string) {
    const { skip, take, shiftId, locationId } = query;

    const where: any = {};
    // Multi-tenant filter (CashRegister stores organizationId directly).
    if (organizationId) where.organizationId = organizationId;
    if (shiftId) where.shiftId = shiftId;
    if (locationId) where.locationId = locationId;

    return this.prisma.cashRegister.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        denominations: true,
        expenses: true,
      },
    });
  }

  async findByShift(shiftId: string, organizationId?: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: {
        shiftId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        denominations: true,
        expenses: true,
      },
    });

    if (!register) {
      throw new NotFoundException(
        `Cash register for shift "${shiftId}" not found`,
      );
    }

    return register;
  }

  async findOne(id: string, organizationId?: string) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        denominations: true,
        expenses: true,
      },
    });

    // Ownership: a register from another org is reported as not found (404).
    if (
      !register ||
      (organizationId && register.organizationId !== organizationId)
    ) {
      throw new NotFoundException(`Cash register with ID "${id}" not found`);
    }

    return register;
  }

  async update(
    id: string,
    updateCashRegisterDto: UpdateCashRegisterDto,
    organizationId?: string,
  ) {
    await this.findOne(id, organizationId);

    return this.prisma.cashRegister.update({
      where: { id },
      data: updateCashRegisterDto,
      include: {
        denominations: true,
        expenses: true,
      },
    });
  }

  // Whitelist of valid denomination values (MXN bills + coins).
  private static readonly ALLOWED_DENOMINATIONS = new Set([
    '1000',
    '500',
    '200',
    '100',
    '50',
    '20',
    '10',
    '5',
    '2',
    '1',
    '0.5',
  ]);

  async recordDenominations(
    id: string,
    denominationDto: RecordDenominationDto,
    organizationId?: string,
  ) {
    await this.findOne(id, organizationId);

    // Filter entries to whitelisted denominations and coerce numeric counts
    // safely (NaN / negative / invalid → skipped).
    const entries: Array<{
      denomination: number;
      count: number;
      total: number;
    }> = [];
    for (const [keyRaw, rawCount] of Object.entries(denominationDto)) {
      const key = String(keyRaw);
      if (!CashRegistersService.ALLOWED_DENOMINATIONS.has(key)) continue;
      const denomination = parseFloat(key);
      if (!Number.isFinite(denomination) || denomination <= 0) continue;
      const count = Number(rawCount);
      if (!Number.isFinite(count) || isNaN(count) || count < 0) continue;
      if (count === 0) continue;
      entries.push({
        denomination,
        count,
        total: denomination * count,
      });
    }

    const total = entries.reduce((sum, e) => sum + e.total, 0);

    // Replace existing denominations atomically: delete previous and insert new.
    await this.prisma.$transaction(async (tx) => {
      await tx.cashDenomination.deleteMany({ where: { cashRegisterId: id } });
      for (const e of entries) {
        await tx.cashDenomination.create({
          data: {
            cashRegisterId: id,
            denomination: e.denomination,
            count: e.count,
            total: e.total,
          },
        });
      }
      await tx.cashRegister.update({
        where: { id },
        data: { countedCash: total },
      });
    });

    return this.findOne(id);
  }

  async recordExpense(
    id: string,
    expenseDto: RecordExpenseDto,
    organizationId?: string,
  ) {
    await this.findOne(id, organizationId);

    // Atomic increment of totalExpenses + creation of the expense record so
    // concurrent recordExpense calls can't race the sum.
    await this.prisma.$transaction(async (tx) => {
      await tx.cashExpense.create({
        data: {
          cashRegisterId: id,
          ...expenseDto,
        },
      });
      await tx.cashRegister.update({
        where: { id },
        data: { totalExpenses: { increment: expenseDto.amount } },
      });
    });

    return this.findOne(id);
  }

  async getSummary(id: string, organizationId?: string) {
    const register = await this.findOne(id, organizationId);

    // Calculate totals
    const denominationsTotal =
      register.denominations?.reduce((sum, d) => sum + d.total, 0) || 0;

    const expensesTotal =
      register.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const expectedCash = register.expectedCash || 0;
    // Use ?? so that a legitimate 0 countedCash is preserved rather than
    // overridden by denominationsTotal.
    const countedCash = register.countedCash ?? denominationsTotal;
    const variance = countedCash - expectedCash;

    return {
      id: register.id,
      shiftId: register.shiftId,
      expectedCash,
      countedCash,
      variance,
      totalExpenses: expensesTotal,
      netCash: countedCash - expensesTotal,
      denominations: register.denominations,
      expenses: register.expenses,
      notes: register.notes,
    };
  }

  async remove(id: string, organizationId?: string) {
    await this.findOne(id, organizationId);

    // Se devuelve la caja borrada, no el array crudo del $transaction: al
    // cliente le llegaba [{count:5},{count:2},{...}], que no es un contrato útil.
    const [, , deleted] = await this.prisma.$transaction([
      this.prisma.cashDenomination.deleteMany({
        where: { cashRegisterId: id },
      }),
      this.prisma.cashExpense.deleteMany({ where: { cashRegisterId: id } }),
      this.prisma.cashRegister.delete({ where: { id } }),
    ]);
    return deleted;
  }

  private calculateDenominations(
    denominations: Record<string, number>,
  ): number {
    return Object.entries(denominations).reduce((total, [value, count]) => {
      return total + parseFloat(value) * count;
    }, 0);
  }
}
