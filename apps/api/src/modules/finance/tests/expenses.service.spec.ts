import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from '../expenses.service';
import { PrismaService } from '../../database/prisma.service';
import { ExpenseCategory, ExpenseStatus } from '../dto';

const mockExpense = {
  id: 'exp_1',
  organizationId: 'org_1',
  locationId: 'loc_1',
  category: 'RENT',
  description: 'Renta mensual',
  amount: 20000,
  taxAmount: 3200,
  totalAmount: 23200,
  dueDate: null,
  status: 'PENDING',
  vendorName: 'Inmobiliaria XYZ',
  vendorRfc: null,
  invoiceNumber: null,
  paymentMethod: null,
  paidDate: null,
  paymentReference: null,
  attachmentUrl: null,
  notes: null,
  createdByUserId: null,
  createdAt: new Date('2026-04-21'),
  updatedAt: new Date('2026-04-21'),
};

const mockPrismaService = {
  expense: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an expense with total amount', async () => {
      mockPrismaService.expense.create.mockResolvedValueOnce(mockExpense);

      const result = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.RENT,
        description: 'Renta mensual',
        amount: 20000,
        tax_amount: 3200,
        vendor_name: 'Inmobiliaria XYZ',
      });

      expect(result.id).toBe('exp_1');
      expect(result.total_amount).toBe(23200);
      expect(result.status).toBe(ExpenseStatus.PENDING);
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmount: 23200 }),
        }),
      );
    });

    it('should calculate total without tax', async () => {
      mockPrismaService.expense.create.mockResolvedValueOnce({
        ...mockExpense,
        taxAmount: null,
        totalAmount: 1500,
        amount: 1500,
      });

      const result = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.UTILITIES,
        description: 'Luz',
        amount: 1500,
      });

      expect(result.total_amount).toBe(1500);
    });
  });

  describe('findAll', () => {
    it('should return expenses filtered by org', async () => {
      mockPrismaService.expense.findMany.mockResolvedValueOnce([mockExpense]);

      const result = await service.findAll({ organization_id: 'org_1' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org_1' }),
        }),
      );
    });

    it('should apply location filter', async () => {
      mockPrismaService.expense.findMany.mockResolvedValueOnce([mockExpense]);

      await service.findAll({ organization_id: 'org_1', location_id: 'loc_1' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: 'loc_1' }),
        }),
      );
    });

    it('should apply search filter with OR clause', async () => {
      mockPrismaService.expense.findMany.mockResolvedValueOnce([mockExpense]);

      await service.findAll({ organization_id: 'org_1', search: 'renta' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return expense when found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValueOnce(mockExpense);

      const result = await service.findOne('exp_1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('exp_1');
    });

    it('should return null when not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValueOnce(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update expense fields', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValueOnce(mockExpense);
      mockPrismaService.expense.update.mockResolvedValueOnce({
        ...mockExpense,
        description: 'Renta actualizada',
        status: 'PAID',
      });

      const result = await service.update('exp_1', {
        description: 'Renta actualizada',
        status: ExpenseStatus.PAID,
      });

      expect(result.description).toBe('Renta actualizada');
      expect(result.status).toBe(ExpenseStatus.PAID);
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('bad_id', { description: 'x' }),
      ).rejects.toThrow('Expense not found');
    });
  });

  describe('markAsPaid', () => {
    it('should mark expense as paid', async () => {
      const paidDate = new Date('2026-04-21');
      mockPrismaService.expense.findUnique.mockResolvedValueOnce(mockExpense);
      mockPrismaService.expense.update.mockResolvedValueOnce({
        ...mockExpense,
        status: 'PAID',
        paidDate,
        paymentMethod: 'TRANSFER',
        paymentReference: 'REF123',
      });

      const result = await service.markAsPaid(
        'exp_1',
        paidDate,
        'TRANSFER',
        'REF123',
      );

      expect(result.status).toBe(ExpenseStatus.PAID);
      expect(result.payment_reference).toBe('REF123');
    });
  });

  describe('delete', () => {
    it('should delete expense', async () => {
      mockPrismaService.expense.delete.mockResolvedValueOnce(mockExpense);

      await service.delete('exp_1');

      expect(mockPrismaService.expense.delete).toHaveBeenCalledWith({
        where: { id: 'exp_1' },
      });
    });
  });

  describe('getStats', () => {
    it('should return expense statistics', async () => {
      mockPrismaService.expense.count
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(1) // paid
        .mockResolvedValueOnce(0); // overdue
      mockPrismaService.expense.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 24500 } }) // total
        .mockResolvedValueOnce({ _sum: { totalAmount: 21500 } }) // pending
        .mockResolvedValueOnce({ _sum: { totalAmount: 3000 } }); // paid
      mockPrismaService.expense.groupBy.mockResolvedValueOnce([
        { category: 'RENT', _sum: { totalAmount: 20000 } },
        { category: 'UTILITIES', _sum: { totalAmount: 1500 } },
        { category: 'MARKETING', _sum: { totalAmount: 3000 } },
      ]);

      const stats = await service.getStats('org_1');

      expect(stats.total_expenses).toBe(3);
      expect(stats.pending_count).toBe(2);
      expect(stats.paid_count).toBe(1);
      expect(stats.total_amount).toBe(24500);
      expect(stats.by_category['RENT']).toBe(20000);
    });
  });
});
