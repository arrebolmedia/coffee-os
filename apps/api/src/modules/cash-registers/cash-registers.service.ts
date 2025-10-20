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

  async findAll(query: QueryCashRegistersDto) {
    const { skip, take, shiftId, locationId } = query;

    const where: any = {};
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

  async findByShift(shiftId: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { shiftId },
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

  async findOne(id: string) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        denominations: true,
        expenses: true,
      },
    });

    if (!register) {
      throw new NotFoundException(`Cash register with ID "${id}" not found`);
    }

    return register;
  }

  async update(id: string, updateCashRegisterDto: UpdateCashRegisterDto) {
    await this.findOne(id);

    return this.prisma.cashRegister.update({
      where: { id },
      data: updateCashRegisterDto,
      include: {
        denominations: true,
        expenses: true,
      },
    });
  }

  async recordDenominations(
    id: string,
    denominationDto: RecordDenominationDto,
  ) {
    await this.findOne(id);

    // Create denomination records
    const denominations = await Promise.all(
      Object.entries(denominationDto).map(([denomination, count]) => {
        if (count === 0) return null;

        return this.prisma.cashDenomination.create({
          data: {
            cashRegisterId: id,
            denomination: parseFloat(denomination),
            count,
            total: parseFloat(denomination) * count,
          },
        });
      }),
    );

    // Calculate total from denominations
    const total = denominations
      .filter((d) => d !== null)
      .reduce((sum, d) => sum + d.total, 0);

    // Update cash register with counted total
    await this.prisma.cashRegister.update({
      where: { id },
      data: { countedCash: total },
    });

    return this.findOne(id);
  }

  async recordExpense(id: string, expenseDto: RecordExpenseDto) {
    await this.findOne(id);

    // Create expense record
    await this.prisma.cashExpense.create({
      data: {
        cashRegisterId: id,
        ...expenseDto,
      },
    });

    // Get all expenses and update total
    const expenses = await this.prisma.cashExpense.findMany({
      where: { cashRegisterId: id },
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Update cash register
    await this.prisma.cashRegister.update({
      where: { id },
      data: { totalExpenses },
    });

    return this.findOne(id);
  }

  async getSummary(id: string) {
    const register = await this.findOne(id);

    // Calculate totals
    const denominationsTotal =
      register.denominations?.reduce((sum, d) => sum + d.total, 0) || 0;

    const expensesTotal =
      register.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const expectedCash = register.expectedCash || 0;
    const countedCash = register.countedCash || denominationsTotal;
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

  async remove(id: string) {
    await this.findOne(id);

    // Delete related records first
    await this.prisma.cashDenomination.deleteMany({
      where: { cashRegisterId: id },
    });

    await this.prisma.cashExpense.deleteMany({
      where: { cashRegisterId: id },
    });

    return this.prisma.cashRegister.delete({
      where: { id },
    });
  }

  private calculateDenominations(
    denominations: Record<string, number>,
  ): number {
    return Object.entries(denominations).reduce((total, [value, count]) => {
      return total + parseFloat(value) * count;
    }, 0);
  }
}
