import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  async create(createShiftDto: CreateShiftDto) {
    // Check if there's an active shift for this location
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        organizationId: createShiftDto.organizationId,
        locationId: createShiftDto.locationId,
        status: ShiftStatus.OPEN,
      },
    });

    if (activeShift) {
      throw new BadRequestException(
        'There is already an active shift for this location. Close it before opening a new one.',
      );
    }

    return this.prisma.shift.create({
      data: {
        ...createShiftDto,
        status: ShiftStatus.OPEN,
        openedAt: new Date(),
      },
    });
  }

  async findAll(query: QueryShiftsDto) {
    const { skip, take, status, userId, locationId } = query;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (locationId) where.locationId = locationId;

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
      where: { status },
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

  async close(id: string, closeShiftDto: CloseShiftDto) {
    const shift = await this.findOne(id);

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('Shift is already closed');
    }

    const { closingCash, closingCard, closingTransfers, closingOther, notes } =
      closeShiftDto;

    const totalClosing =
      closingCash + closingCard + closingTransfers + closingOther;
    const totalExpected = shift.openingCash; // Simplified - in real app would calculate from transactions

    const variance = totalClosing - totalExpected;

    return this.prisma.shift.update({
      where: { id },
      data: {
        status: ShiftStatus.CLOSED,
        closedAt: new Date(),
        closingCash,
        closingCard,
        closingTransfers,
        closingOther,
        totalClosing,
        totalExpected,
        variance,
        closingNotes: notes,
      },
    });
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
