import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsService, ShiftStatus } from './shifts.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    shift: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new shift', async () => {
      const dto = {
        openingCash: 1000,
        userId: 'user-1',
        locationId: 'loc-1',
        organizationId: 'org-1',
      };

      mockPrismaService.shift.findFirst.mockResolvedValue(null);
      mockPrismaService.shift.create.mockResolvedValue({
        id: '1',
        ...dto,
        status: ShiftStatus.OPEN,
      });

      const result = await service.create(dto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(ShiftStatus.OPEN);
    });

    it('should throw if there is an active shift', async () => {
      const dto = {
        openingCash: 1000,
        userId: 'user-1',
        locationId: 'loc-1',
        organizationId: 'org-1',
      };

      mockPrismaService.shift.findFirst.mockResolvedValue({
        id: '1',
        status: ShiftStatus.OPEN,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all shifts with pagination', async () => {
      const query = { skip: 0, take: 10 };
      const shifts = [
        { id: '1', openingCash: 1000 },
        { id: '2', openingCash: 1500 },
      ];

      mockPrismaService.shift.findMany.mockResolvedValue(shifts);

      const result = await service.findAll(query);

      expect(result).toEqual(shifts);
    });

    it('should filter by status', async () => {
      const query = { status: ShiftStatus.OPEN };

      mockPrismaService.shift.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.shift.findMany).toHaveBeenCalledWith({
        where: { status: ShiftStatus.OPEN },
        skip: undefined,
        take: undefined,
        orderBy: { openedAt: 'desc' },
      });
    });

    it('should filter by userId', async () => {
      const query = { userId: 'user-1' };

      mockPrismaService.shift.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.shift.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: undefined,
        take: undefined,
        orderBy: { openedAt: 'desc' },
      });
    });

    it('should filter by locationId', async () => {
      const query = { locationId: 'loc-1' };

      mockPrismaService.shift.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.shift.findMany).toHaveBeenCalledWith({
        where: { locationId: 'loc-1' },
        skip: undefined,
        take: undefined,
        orderBy: { openedAt: 'desc' },
      });
    });
  });

  describe('findActive', () => {
    it('should return active shift', async () => {
      const shift = { id: '1', status: ShiftStatus.OPEN };

      mockPrismaService.shift.findFirst.mockResolvedValue(shift);

      const result = await service.findActive();

      expect(result).toEqual(shift);
    });
  });

  describe('findByStatus', () => {
    it('should return shifts by status', async () => {
      const shifts = [{ id: '1', status: ShiftStatus.CLOSED }];

      mockPrismaService.shift.findMany.mockResolvedValue(shifts);

      const result = await service.findByStatus(ShiftStatus.CLOSED);

      expect(result).toEqual(shifts);
    });
  });

  describe('findOne', () => {
    it('should return a shift by id', async () => {
      const shift = { id: '1', openingCash: 1000 };

      mockPrismaService.shift.findUnique.mockResolvedValue(shift);

      const result = await service.findOne('1');

      expect(result).toEqual(shift);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.shift.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a shift', async () => {
      const id = '1';
      const dto = { openingNotes: 'Updated' };
      const existing = { id, openingCash: 1000 };
      const updated = { ...existing, ...dto };

      mockPrismaService.shift.findUnique.mockResolvedValue(existing);
      mockPrismaService.shift.update.mockResolvedValue(updated);

      const result = await service.update(id, dto);

      expect(result).toEqual(updated);
    });
  });

  describe('close', () => {
    it('should close a shift', async () => {
      const id = '1';
      const dto = {
        closingCash: 1200,
        closingCard: 300,
        closingTransfers: 100,
        closingOther: 50,
      };
      const shift = {
        id,
        status: ShiftStatus.OPEN,
        openingCash: 1000,
      };

      mockPrismaService.shift.findUnique.mockResolvedValue(shift);
      mockPrismaService.shift.update.mockResolvedValue({
        ...shift,
        status: ShiftStatus.CLOSED,
        ...dto,
      });

      const result = await service.close(id, dto);

      expect(result.status).toBe(ShiftStatus.CLOSED);
    });

    it('should throw if shift is already closed', async () => {
      const id = '1';
      const dto = {
        closingCash: 1200,
        closingCard: 300,
        closingTransfers: 100,
        closingOther: 50,
      };
      const shift = {
        id,
        status: ShiftStatus.CLOSED,
        openingCash: 1000,
      };

      mockPrismaService.shift.findUnique.mockResolvedValue(shift);

      await expect(service.close(id, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a closed shift', async () => {
      const id = '1';
      const shift = {
        id,
        status: ShiftStatus.CLOSED,
      };

      mockPrismaService.shift.findUnique.mockResolvedValue(shift);
      mockPrismaService.shift.delete.mockResolvedValue(shift);

      const result = await service.remove(id);

      expect(result).toEqual(shift);
    });

    it('should throw if shift is open', async () => {
      const id = '1';
      const shift = {
        id,
        status: ShiftStatus.OPEN,
      };

      mockPrismaService.shift.findUnique.mockResolvedValue(shift);

      await expect(service.remove(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculateShiftSummary', () => {
    it('should return shift summary', async () => {
      const shift = {
        id: '1',
        openedAt: new Date('2024-01-01T08:00:00'),
        closedAt: new Date('2024-01-01T20:00:00'),
        status: ShiftStatus.CLOSED,
        openingCash: 1000,
        totalClosing: 1650,
        totalExpected: 1500,
        variance: 150,
      };

      mockPrismaService.shift.findUnique.mockResolvedValue(shift);

      const result = await service.calculateShiftSummary('1');

      expect(result).toEqual({
        shiftId: '1',
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        status: ShiftStatus.CLOSED,
        openingCash: 1000,
        totalClosing: 1650,
        totalExpected: 1500,
        variance: 150,
      });
    });
  });
});
