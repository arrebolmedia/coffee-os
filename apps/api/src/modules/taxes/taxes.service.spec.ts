import { Test, TestingModule } from '@nestjs/testing';
import { TaxesService, TaxCategory } from './taxes.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TaxesService', () => {
  let service: TaxesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tax: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TaxesService>(TaxesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tax', async () => {
      const dto = {
        name: 'IVA 16%',
        category: TaxCategory.IVA,
        rate: 16,
        organizationId: 'org-1',
      };

      mockPrismaService.tax.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);

      expect(result).toHaveProperty('id');
      expect(prisma.tax.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('should return all taxes with pagination', async () => {
      const query = { skip: 0, take: 10 };
      const taxes = [
        { id: '1', name: 'IVA 16%' },
        { id: '2', name: 'IEPS 8%' },
      ];

      mockPrismaService.tax.findMany.mockResolvedValue(taxes);

      const result = await service.findAll(query);

      expect(result).toEqual(taxes);
      expect(prisma.tax.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by active status', async () => {
      const query = { isActive: true };

      mockPrismaService.tax.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.tax.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: undefined,
        take: undefined,
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by category', async () => {
      const query = { category: TaxCategory.IVA };

      mockPrismaService.tax.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.tax.findMany).toHaveBeenCalledWith({
        where: { category: TaxCategory.IVA },
        skip: undefined,
        take: undefined,
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findActive', () => {
    it('should return active taxes', async () => {
      const taxes = [{ id: '1', name: 'IVA 16%', isActive: true }];

      mockPrismaService.tax.findMany.mockResolvedValue(taxes);

      const result = await service.findActive();

      expect(result).toEqual(taxes);
      expect(prisma.tax.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findByCategory', () => {
    it('should return taxes by category', async () => {
      const category = TaxCategory.IVA;
      const taxes = [{ id: '1', category }];

      mockPrismaService.tax.findMany.mockResolvedValue(taxes);

      const result = await service.findByCategory(category);

      expect(result).toEqual(taxes);
      expect(prisma.tax.findMany).toHaveBeenCalledWith({
        where: { category },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a tax by id', async () => {
      const tax = { id: '1', name: 'IVA 16%' };

      mockPrismaService.tax.findUnique.mockResolvedValue(tax);

      const result = await service.findOne('1');

      expect(result).toEqual(tax);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.tax.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a tax', async () => {
      const id = '1';
      const dto = { name: 'Updated Name' };
      const existing = { id, name: 'IVA 16%' };
      const updated = { ...existing, ...dto };

      mockPrismaService.tax.findUnique.mockResolvedValue(existing);
      mockPrismaService.tax.update.mockResolvedValue(updated);

      const result = await service.update(id, dto);

      expect(result).toEqual(updated);
      expect(prisma.tax.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.tax.findUnique.mockResolvedValue(null);

      await expect(service.update('999', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a tax', async () => {
      const id = '1';
      const tax = { id, name: 'IVA 16%' };

      mockPrismaService.tax.findUnique.mockResolvedValue(tax);
      mockPrismaService.tax.delete.mockResolvedValue(tax);

      const result = await service.remove(id);

      expect(result).toEqual(tax);
      expect(prisma.tax.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.tax.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax amount', async () => {
      const tax = {
        id: '1',
        rate: 16,
        isActive: true,
      };

      mockPrismaService.tax.findUnique.mockResolvedValue(tax);

      const result = await service.calculateTax('1', 100);

      expect(result).toBe(16); // 16% of 100
    });

    it('should return 0 if tax is not active', async () => {
      const tax = {
        id: '1',
        rate: 16,
        isActive: false,
      };

      mockPrismaService.tax.findUnique.mockResolvedValue(tax);

      const result = await service.calculateTax('1', 100);

      expect(result).toBe(0);
    });
  });

  describe('calculateMultipleTaxes', () => {
    it('should calculate multiple taxes', async () => {
      const taxes = [
        { id: '1', rate: 16, isActive: true },
        { id: '2', rate: 8, isActive: true },
      ];

      mockPrismaService.tax.findMany.mockResolvedValue(taxes);

      const result = await service.calculateMultipleTaxes(['1', '2'], 100);

      expect(result.total).toBe(24); // 16 + 8
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toEqual({ taxId: '1', amount: 16 });
      expect(result.breakdown[1]).toEqual({ taxId: '2', amount: 8 });
    });

    it('should only calculate active taxes', async () => {
      const taxes = [{ id: '1', rate: 16, isActive: true }];

      mockPrismaService.tax.findMany.mockResolvedValue(taxes);

      const result = await service.calculateMultipleTaxes(['1', '2'], 100);

      expect(result.total).toBe(16);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should return 0 if no active taxes', async () => {
      mockPrismaService.tax.findMany.mockResolvedValue([]);

      const result = await service.calculateMultipleTaxes(['1'], 100);

      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });
});
