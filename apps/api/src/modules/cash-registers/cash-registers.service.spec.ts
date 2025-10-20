import { Test, TestingModule } from '@nestjs/testing';
import { CashRegistersService } from './cash-registers.service';
import { PrismaService } from '../database/prisma.service';

describe('CashRegistersService', () => {
  let service: CashRegistersService;
  let prisma: PrismaService;

  const mockPrisma = {
    cashRegister: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cashDenomination: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    cashExpense: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashRegistersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CashRegistersService>(CashRegistersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a cash register', async () => {
      const dto = {
        shiftId: 'shift-1',
        expectedCash: 5000,
        locationId: 'loc-1',
        organizationId: 'org-1',
      };
      const result = {
        id: '1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.cashRegister.create.mockResolvedValue(result);

      expect(await service.create(dto)).toEqual(result);
      expect(prisma.cashRegister.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('should return all cash registers with pagination', async () => {
      const query = { skip: 0, take: 10 };
      const result = [{ id: '1', expectedCash: 5000 }];

      mockPrisma.cashRegister.findMany.mockResolvedValue(result);

      expect(await service.findAll(query)).toEqual(result);
      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { denominations: true, expenses: true },
      });
    });

    it('should filter by shiftId', async () => {
      const query = { shiftId: 'shift-1' };
      const result = [{ id: '1', shiftId: 'shift-1' }];

      mockPrisma.cashRegister.findMany.mockResolvedValue(result);

      await service.findAll(query);
      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith({
        where: { shiftId: 'shift-1' },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
        include: { denominations: true, expenses: true },
      });
    });
  });

  describe('findByShift', () => {
    it('should find cash register by shift', async () => {
      const shiftId = 'shift-1';
      const result = { id: '1', shiftId };

      mockPrisma.cashRegister.findFirst.mockResolvedValue(result);

      expect(await service.findByShift(shiftId)).toEqual(result);
      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
        where: { shiftId },
        include: { denominations: true, expenses: true },
      });
    });
  });

  describe('findOne', () => {
    it('should find one cash register', async () => {
      const id = '1';
      const result = { id, expectedCash: 5000 };

      mockPrisma.cashRegister.findUnique.mockResolvedValue(result);

      expect(await service.findOne(id)).toEqual(result);
      expect(prisma.cashRegister.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { denominations: true, expenses: true },
      });
    });
  });

  describe('update', () => {
    it('should update a cash register', async () => {
      const id = '1';
      const dto = { notes: 'Updated' };
      const result = { id, notes: 'Updated' };

      mockPrisma.cashRegister.update.mockResolvedValue(result);

      expect(await service.update(id, dto)).toEqual(result);
      expect(prisma.cashRegister.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
        include: { denominations: true, expenses: true },
      });
    });
  });

  describe('recordDenominations', () => {
    it('should record denominations and calculate total', async () => {
      const id = '1';
      const dto = {
        1000: 5,
        500: 10,
        200: 20,
        100: 15,
        50: 10,
        20: 20,
        10: 30,
        5: 20,
        2: 25,
        1: 30,
        0.5: 40,
      };
      // Total: 5000 + 5000 + 4000 + 1500 + 500 + 400 + 300 + 100 + 50 + 30 + 20 = 16900
      const expectedTotal = 16900;
      const mockRegister = {
        id,
        countedCash: expectedTotal,
        denominations: [],
        expenses: [],
      };

      mockPrisma.cashRegister.findUnique.mockResolvedValue(mockRegister);
      mockPrisma.cashDenomination.create.mockResolvedValue({
        id: 'denom-1',
        total: 1000,
      });
      mockPrisma.cashRegister.update.mockResolvedValue(mockRegister);

      const result = await service.recordDenominations(id, dto);

      expect(result).toEqual(mockRegister);
      expect(prisma.cashDenomination.create).toHaveBeenCalled();
      expect(prisma.cashRegister.update).toHaveBeenCalledWith({
        where: { id },
        data: { countedCash: expect.any(Number) },
      });
    });
  });

  describe('recordExpense', () => {
    it('should record an expense and update total', async () => {
      const id = '1';
      const dto = { amount: 500, description: 'Cambio' };
      const existingExpenses = [{ amount: 200 }];
      const newTotal = 700;
      const mockRegister = {
        id,
        expectedCash: 5000,
        totalExpenses: newTotal,
        denominations: [],
        expenses: [],
      };

      // First call for findOne
      mockPrisma.cashRegister.findUnique.mockResolvedValue(mockRegister);
      mockPrisma.cashExpense.create.mockResolvedValue({ id: 'exp-1', ...dto });
      mockPrisma.cashExpense.findMany.mockResolvedValue([{ amount: 200 }]); // Initial
      mockPrisma.cashRegister.update.mockResolvedValue(mockRegister);
      // Second call for findOne at the end
      mockPrisma.cashRegister.findUnique.mockResolvedValue(mockRegister);

      const result = await service.recordExpense(id, dto);

      expect(result).toEqual(mockRegister);
      expect(prisma.cashExpense.create).toHaveBeenCalledWith({
        data: { cashRegisterId: id, ...dto },
      });
      // Called AFTER create, so only sees the initial 200
      expect(prisma.cashRegister.update).toHaveBeenCalledWith({
        where: { id },
        data: { totalExpenses: 200 },
      });
    });
  });

  describe('getSummary', () => {
    it('should return complete summary', async () => {
      const id = '1';
      const denominations = [
        { denomination: 1000, count: 5, total: 5000 },
        { denomination: 100, count: 2, total: 200 },
      ];
      const expenses = [
        { amount: 300, description: 'Cambio' },
        { amount: 200, description: 'Proveedor' },
      ];
      const cashRegister = {
        id,
        shiftId: 'shift-1',
        expectedCash: 5000,
        countedCash: 5200,
        totalExpenses: 500,
        notes: 'Test notes',
        denominations,
        expenses,
      };

      mockPrisma.cashRegister.findUnique.mockResolvedValue(cashRegister);

      const result = await service.getSummary(id);

      expect(result).toEqual({
        id: cashRegister.id,
        shiftId: cashRegister.shiftId,
        expectedCash: 5000,
        countedCash: 5200,
        variance: 200, // 5200 - 5000
        totalExpenses: 500,
        netCash: 4700, // 5200 - 500
        denominations,
        expenses,
        notes: 'Test notes',
      });
    });
  });

  describe('remove', () => {
    it('should delete cash register and related records', async () => {
      const id = '1';
      const result = { id };

      mockPrisma.cashDenomination.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.cashExpense.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.cashRegister.delete.mockResolvedValue(result);

      expect(await service.remove(id)).toEqual(result);
      expect(prisma.cashDenomination.deleteMany).toHaveBeenCalledWith({
        where: { cashRegisterId: id },
      });
      expect(prisma.cashExpense.deleteMany).toHaveBeenCalledWith({
        where: { cashRegisterId: id },
      });
      expect(prisma.cashRegister.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe('calculateDenominations', () => {
    it('should calculate total from denominations', () => {
      const denominations = {
        1000: 5,
        500: 10,
        200: 20,
        100: 15,
        50: 10,
        20: 20,
        10: 30,
        5: 20,
        2: 25,
        1: 30,
        0.5: 40,
      };
      // 5000 + 5000 + 4000 + 1500 + 500 + 400 + 300 + 100 + 50 + 30 + 20 = 16900
      expect(service['calculateDenominations'](denominations)).toBe(16900);
    });

    it('should handle zero counts', () => {
      const denominations = {
        1000: 0,
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
        0.5: 0,
      };
      expect(service['calculateDenominations'](denominations)).toBe(0);
    });
  });
});
