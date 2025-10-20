import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from '../expenses.service';
import { ExpenseCategory, ExpenseStatus } from '../dto';

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpensesService],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  afterEach(() => {
    service['expenses'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an expense', async () => {
      const expense = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.RENT,
        description: 'Renta mensual',
        amount: 20000,
        tax_amount: 3200,
        vendor_name: 'Inmobiliaria XYZ',
        vendor_rfc: 'IXY123456ABC',
      });

      expect(expense.id).toBeDefined();
      expect(expense.category).toBe(ExpenseCategory.RENT);
      expect(expense.total_amount).toBe(23200); // 20000 + 3200
      expect(expense.status).toBe(ExpenseStatus.PENDING);
    });

    it('should calculate total amount without tax', async () => {
      const expense = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.UTILITIES,
        description: 'Luz del mes',
        amount: 1500,
      });

      expect(expense.total_amount).toBe(1500);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.RENT,
        description: 'Renta',
        amount: 20000,
      });

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_2',
        category: ExpenseCategory.UTILITIES,
        description: 'Luz',
        amount: 1500,
      });

      await service.create({
        organization_id: 'org_2',
        location_id: 'loc_3',
        category: ExpenseCategory.MARKETING,
        description: 'Facebook Ads',
        amount: 3000,
      });
    });

    it('should return all expenses for organization', async () => {
      const expenses = await service.findAll({ organization_id: 'org_1' });

      expect(expenses).toHaveLength(2);
    });

    it('should filter by location', async () => {
      const expenses = await service.findAll({
        organization_id: 'org_1',
        location_id: 'loc_1',
      });

      expect(expenses).toHaveLength(1);
      expect(expenses[0].location_id).toBe('loc_1');
    });

    it('should search by description', async () => {
      const expenses = await service.findAll({
        organization_id: 'org_1',
        search: 'luz',
      });

      expect(expenses).toHaveLength(1);
      expect(expenses[0].description).toBe('Luz');
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const expenses = await service.findAll({
        organization_id: 'org_1',
        start_date: yesterday.toISOString(),
        end_date: today.toISOString(),
      });

      expect(expenses.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update expense', async () => {
      const expense = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.RENT,
        description: 'Renta',
        amount: 20000,
      });

      const updated = await service.update(expense.id, {
        description: 'Renta actualizada',
        status: ExpenseStatus.PAID,
      });

      expect(updated.description).toBe('Renta actualizada');
      expect(updated.status).toBe(ExpenseStatus.PAID);
    });
  });

  describe('markAsPaid', () => {
    it('should mark expense as paid', async () => {
      const expense = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.UTILITIES,
        description: 'Luz',
        amount: 1500,
      });

      const paidDate = new Date('2024-01-15');
      const paid = await service.markAsPaid(expense.id, paidDate, 'TRANSFER', 'REF123');

      expect(paid.status).toBe(ExpenseStatus.PAID);
      expect(paid.paid_date).toEqual(paidDate);
      expect(paid.payment_reference).toBe('REF123');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.RENT,
        description: 'Renta',
        amount: 20000,
      });

      await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.UTILITIES,
        description: 'Luz',
        amount: 1500,
      });

      const expense3 = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.MARKETING,
        description: 'Ads',
        amount: 3000,
      });

      await service.markAsPaid(expense3.id, new Date(), 'CASH');
    });

    it('should return expense statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total_expenses).toBe(3);
      expect(stats.pending_count).toBe(2);
      expect(stats.paid_count).toBe(1);
      expect(stats.total_amount).toBe(24500);
    });

    it('should group expenses by category', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.by_category[ExpenseCategory.RENT]).toBe(20000);
      expect(stats.by_category[ExpenseCategory.UTILITIES]).toBe(1500);
      expect(stats.by_category[ExpenseCategory.MARKETING]).toBe(3000);
    });
  });

  describe('delete', () => {
    it('should delete expense', async () => {
      const expense = await service.create({
        organization_id: 'org_1',
        location_id: 'loc_1',
        category: ExpenseCategory.OTHER,
        description: 'Test',
        amount: 100,
      });

      await service.delete(expense.id);
      const result = await service.findOne(expense.id);

      expect(result).toBeNull();
    });
  });
});
