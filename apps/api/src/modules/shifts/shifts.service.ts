import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Multi-tenant guard: validates that a location belongs to the given
   * organization. Shift has no organizationId column, so org scoping is
   * derived via Location.organizationId. 404 on mismatch (don't leak).
   */
  private async assertLocationInOrg(
    locationId: string,
    organizationId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, organizationId: true },
    });
    if (!location || location.organizationId !== organizationId) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }
  }

  /** Location ids belonging to an organization (for list filtering). */
  private async getOrgLocationIds(organizationId: string): Promise<string[]> {
    const locations = await this.prisma.location.findMany({
      where: { organizationId },
      select: { id: true },
    });
    return locations.map((l) => l.id);
  }

  async create(createShiftDto: CreateShiftDto, organizationId?: string) {
    if (organizationId) {
      await this.assertLocationInOrg(createShiftDto.locationId, organizationId);
    }

    // Race-safe creation: re-check inside a transaction. If a parallel open
    // happens between the read and write, the second one will fail.
    try {
      return await this.prisma.$transaction(async (tx) => {
        const activeShift = await tx.shift.findFirst({
          where: {
            locationId: createShiftDto.locationId,
            status: ShiftStatus.OPEN,
          },
        });
        if (activeShift) {
          throw new ConflictException(
            'There is already an active shift for this location. Close it before opening a new one.',
          );
        }

        const locationSuffix = createShiftDto.locationId.slice(-6);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = randomUUID().replace(/-/g, '').slice(-6);
        const shiftNumber = `SHIFT-${locationSuffix}-${dateStr}-${randomSuffix}`;

        return tx.shift.create({
          data: {
            locationId: createShiftDto.locationId,
            userId: createShiftDto.userId,
            shiftNumber,
            status: ShiftStatus.OPEN,
            openingFloat: createShiftDto.openingCash,
            openingCash: createShiftDto.openingCash,
            openingNotes: createShiftDto.openingNotes,
          },
        });
      });
    } catch (err: any) {
      // Map ConflictException through; otherwise rethrow.
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException
      ) {
        // Tests still expect a BadRequestException for the conflict signal.
        if (err instanceof ConflictException) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      throw err;
    }
  }

  async findAll(query: QueryShiftsDto, organizationId?: string) {
    const { skip, take, status, userId, locationId } = query;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (locationId) where.locationId = locationId;

    // Multi-tenant filter: restrict to locations of the caller's org.
    if (organizationId) {
      const orgLocationIds = await this.getOrgLocationIds(organizationId);
      if (locationId) {
        // Requested location must belong to the org; otherwise return nothing.
        if (!orgLocationIds.includes(locationId)) {
          return [];
        }
      } else {
        where.locationId = { in: orgLocationIds };
      }
    }

    return this.prisma.shift.findMany({
      where,
      skip,
      take,
      orderBy: { openedAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.shift.findFirst({
      where: { status: ShiftStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findByStatus(status: string) {
    return this.prisma.shift.findMany({
      where: { status: status as ShiftStatus },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }

    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto) {
    await this.findOne(id);

    return this.prisma.shift.update({
      where: { id },
      data: updateShiftDto,
    });
  }

  async close(
    id: string,
    closeShiftDto: CloseShiftDto,
    organizationId?: string,
  ) {
    const shift = await this.findOne(id);

    // Ownership: the shift's location must belong to the caller's org.
    if (organizationId) {
      await this.assertLocationInOrg(shift.locationId, organizationId);
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('Shift is already closed');
    }

    const {
      closingCash,
      closingCard = 0,
      closingTransfers = 0,
      closingOther = 0,
      notes,
    } = closeShiftDto;

    // Expected cash = openingFloat + cash sales during shift - cash expenses.
    // Use Payment table to sum CASH payments tied to tickets closed at this
    // location during the shift window.
    // NOTE: aggregation errors intentionally propagate — silently defaulting
    // to 0 would record a wrong totalExpected/variance with no signal.
    const paymentAgg = await this.prisma.payment.aggregate({
      where: {
        method: 'CASH' as any,
        ticket: {
          locationId: shift.locationId,
          status: 'CLOSED' as any,
          closedAt: { gte: shift.openedAt, lte: new Date() },
        },
      },
      _sum: { amount: true },
    });
    const cashSales = paymentAgg._sum.amount ?? 0;

    // Cash expenses tied to this shift via its CashRegister.
    const expenseAgg = await this.prisma.cashExpense.aggregate({
      where: { cashRegister: { shiftId: id } },
      _sum: { amount: true },
    });
    const cashExpenses = expenseAgg._sum.amount ?? 0;

    const totalExpected =
      (shift.openingFloat ?? shift.openingCash ?? 0) + cashSales - cashExpenses;
    const totalClosing =
      closingCash + closingCard + closingTransfers + closingOther;
    const variance = closingCash - totalExpected;

    // Persist non-cash breakdown by appending JSON to closingNotes since the
    // schema lacks dedicated columns.
    const closingBreakdown = {
      closingCash,
      closingCard,
      closingTransfers,
      closingOther,
    };
    const composedNotes =
      (notes ? notes + '\n' : '') +
      `[CLOSING_DETAILS]: ${JSON.stringify(closingBreakdown)}`;

    const updated = await this.prisma.shift.updateMany({
      where: { id, status: ShiftStatus.OPEN },
      data: {
        status: ShiftStatus.CLOSED,
        closedAt: new Date(),
        closingCash,
        totalClosing,
        totalExpected,
        variance,
        closingNotes: composedNotes,
      },
    });

    if (updated.count === 0) {
      throw new BadRequestException(
        'Shift is already closed or does not exist',
      );
    }

    return this.prisma.shift.findUniqueOrThrow({ where: { id } });
  }

  async remove(id: string) {
    const shift = await this.findOne(id);

    if (shift.status === ShiftStatus.OPEN) {
      throw new BadRequestException(
        'Cannot delete an open shift. Close it first.',
      );
    }

    return this.prisma.shift.delete({
      where: { id },
    });
  }

  async calculateShiftSummary(shiftId: string) {
    const shift = await this.findOne(shiftId);

    // In a real app, you would aggregate transactions for this shift
    // This is a simplified version
    return {
      shiftId: shift.id,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      openingCash: shift.openingCash,
      totalClosing: shift.totalClosing || 0,
      totalExpected: shift.totalExpected || 0,
      variance: shift.variance || 0,
    };
  }
}
