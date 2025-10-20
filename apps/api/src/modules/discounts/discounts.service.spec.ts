import { Test, TestingModule } from '@nestjs/testing';
import { DiscountsService, DiscountType } from './discounts.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DiscountsService', () => {
  let service: DiscountsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    discount: {
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
        DiscountsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DiscountsService>(DiscountsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a percentage discount', async () => {
      const dto = {
        code: 'SUMMER20',
        name: 'Summer 20%',
        type: DiscountType.PERCENTAGE,
        value: 20,
        organizationId: 'org-1',
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(null);
      mockPrismaService.discount.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);

      expect(result).toHaveProperty('id');
      expect(prisma.discount.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should throw if code already exists', async () => {
      const dto = {
        code: 'SUMMER20',
        name: 'Summer 20%',
        type: DiscountType.PERCENTAGE,
        value: 20,
        organizationId: 'org-1',
      };

      mockPrismaService.discount.findUnique.mockResolvedValue({
        id: '1',
        code: 'SUMMER20',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if percentage is invalid', async () => {
      const dto = {
        code: 'INVALID',
        name: 'Invalid',
        type: DiscountType.PERCENTAGE,
        value: 150,
        organizationId: 'org-1',
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if fixed amount is negative', async () => {
      const dto = {
        code: 'INVALID',
        name: 'Invalid',
        type: DiscountType.FIXED_AMOUNT,
        value: -10,
        organizationId: 'org-1',
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if validFrom is after validUntil', async () => {
      const dto = {
        code: 'INVALID',
        name: 'Invalid',
        type: DiscountType.PERCENTAGE,
        value: 10,
        validFrom: new Date('2024-12-31'),
        validUntil: new Date('2024-01-01'),
        organizationId: 'org-1',
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all discounts with pagination', async () => {
      const query = { skip: 0, take: 10 };
      const discounts = [
        { id: '1', code: 'SUMMER20' },
        { id: '2', code: 'WINTER10' },
      ];

      mockPrismaService.discount.findMany.mockResolvedValue(discounts);

      const result = await service.findAll(query);

      expect(result).toEqual(discounts);
      expect(prisma.discount.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      const query = { isActive: true };

      mockPrismaService.discount.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.discount.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by type', async () => {
      const query = { type: DiscountType.PERCENTAGE };

      mockPrismaService.discount.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(prisma.discount.findMany).toHaveBeenCalledWith({
        where: { type: DiscountType.PERCENTAGE },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findActive', () => {
    it('should return active discounts within date range', async () => {
      const discounts = [{ id: '1', code: 'ACTIVE1', isActive: true }];

      mockPrismaService.discount.findMany.mockResolvedValue(discounts);

      const result = await service.findActive();

      expect(result).toEqual(discounts);
      expect(prisma.discount.findMany).toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('should return discounts by type', async () => {
      const type = DiscountType.PERCENTAGE;
      const discounts = [{ id: '1', type }];

      mockPrismaService.discount.findMany.mockResolvedValue(discounts);

      const result = await service.findByType(type);

      expect(result).toEqual(discounts);
      expect(prisma.discount.findMany).toHaveBeenCalledWith({
        where: { type },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByCode', () => {
    it('should return discount by code', async () => {
      const code = 'SUMMER20';
      const discount = { id: '1', code };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      const result = await service.findByCode(code);

      expect(result).toEqual(discount);
      expect(prisma.discount.findUnique).toHaveBeenCalledWith({
        where: { code },
      });
    });

    it('should throw NotFoundException if code not found', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('NOTFOUND')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a discount by id', async () => {
      const discount = { id: '1', code: 'SUMMER20' };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      const result = await service.findOne('1');

      expect(result).toEqual(discount);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a discount', async () => {
      const id = '1';
      const dto = { name: 'Updated Name' };
      const existing = { id, code: 'SUMMER20' };
      const updated = { ...existing, ...dto };

      mockPrismaService.discount.findUnique.mockResolvedValue(existing);
      mockPrismaService.discount.update.mockResolvedValue(updated);

      const result = await service.update(id, dto);

      expect(result).toEqual(updated);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
    });

    it('should throw if updating to existing code', async () => {
      const id = '1';
      const dto = { code: 'EXISTING' };

      mockPrismaService.discount.findUnique
        .mockResolvedValueOnce({ id: '1', code: 'OLD' })
        .mockResolvedValueOnce({ id: '2', code: 'EXISTING' });

      await expect(service.update(id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a discount', async () => {
      const id = '1';
      const discount = { id, isActive: false };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);
      mockPrismaService.discount.update.mockResolvedValue({
        ...discount,
        isActive: true,
      });

      const result = await service.activate(id);

      expect(result.isActive).toBe(true);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id },
        data: { isActive: true },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a discount', async () => {
      const id = '1';
      const discount = { id, isActive: true };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);
      mockPrismaService.discount.update.mockResolvedValue({
        ...discount,
        isActive: false,
      });

      const result = await service.deactivate(id);

      expect(result.isActive).toBe(false);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id },
        data: { isActive: false },
      });
    });
  });

  describe('remove', () => {
    it('should delete a discount', async () => {
      const id = '1';
      const discount = { id, code: 'SUMMER20' };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);
      mockPrismaService.discount.delete.mockResolvedValue(discount);

      const result = await service.remove(id);

      expect(result).toEqual(discount);
      expect(prisma.discount.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount', async () => {
      const discount = {
        id: '1',
        type: DiscountType.PERCENTAGE,
        value: 20,
        isActive: true,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      const result = await service.calculateDiscount('1', 100);

      expect(result).toBe(20); // 20% of 100
    });

    it('should calculate fixed amount discount', async () => {
      const discount = {
        id: '1',
        type: DiscountType.FIXED_AMOUNT,
        value: 15,
        isActive: true,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      const result = await service.calculateDiscount('1', 100);

      expect(result).toBe(15);
    });

    it('should apply max discount amount', async () => {
      const discount = {
        id: '1',
        type: DiscountType.PERCENTAGE,
        value: 50,
        maxDiscountAmount: 25,
        isActive: true,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      const result = await service.calculateDiscount('1', 100);

      expect(result).toBe(25); // 50% would be 50, but max is 25
    });

    it('should throw if discount is not active', async () => {
      const discount = {
        id: '1',
        isActive: false,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      await expect(service.calculateDiscount('1', 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if minimum purchase not met', async () => {
      const discount = {
        id: '1',
        isActive: true,
        minPurchaseAmount: 50,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      await expect(service.calculateDiscount('1', 30)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if usage limit reached', async () => {
      const discount = {
        id: '1',
        isActive: true,
        usageLimit: 10,
        usageCount: 10,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      await expect(service.calculateDiscount('1', 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not exceed subtotal', async () => {
      const discount = {
        id: '1',
        type: DiscountType.FIXED_AMOUNT,
        value: 150,
        isActive: true,
      };

      mockPrismaService.discount.findUnique.mockResolvedValue(discount);

      const result = await service.calculateDiscount('1', 100);

      expect(result).toBe(100); // Can't discount more than subtotal
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      const id = '1';
      const updated = { id, usageCount: 5 };

      mockPrismaService.discount.update.mockResolvedValue(updated);

      const result = await service.incrementUsage(id);

      expect(result).toEqual(updated);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id },
        data: { usageCount: { increment: 1 } },
      });
    });
  });
});
