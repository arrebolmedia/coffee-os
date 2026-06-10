import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from '../customers.service';
import { RFMService } from '../rfm.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, CustomerStatus } from '../dto';

describe('CustomersService', () => {
  let service: CustomersService;

  const mockPrismaService: any = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(async (cb: any) => cb(mockPrismaService)),
  };

  const mockRfmService = {
    calculateCustomerRFM: jest.fn().mockResolvedValue(null),
  };

  // Canonical Prisma-shaped record (camelCase, as Prisma returns)
  const mockPrismaCustomer = {
    id: 'cust-id-123',
    organizationId: 'org_1',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@example.com',
    phone: null,
    dateOfBirth: null,
    gender: null,
    preferredLanguage: 'es',
    notes: null,
    consentMarketing: true,
    consentWhatsapp: true,
    consentEmail: true,
    consentSms: false,
    consentDate: new Date(),
    consentIpAddress: null,
    favoriteDrink: null,
    dietaryRestrictions: null,
    allergies: null,
    status: 'ACTIVE',
    blockedReason: null,
    loyaltyPoints: 0,
    totalVisits: 0,
    totalSpent: 0,
    lastVisitDate: null,
    rfmSegment: null,
    recencyScore: null,
    frequencyScore: null,
    monetaryScore: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RFMService, useValue: mockRfmService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer with LFPDPPP compliance', async () => {
      mockPrismaService.customer.create.mockResolvedValue(mockPrismaCustomer);

      const createDto: CreateCustomerDto = {
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@example.com',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: false,
      };

      const result = await service.create(createDto, 'org_1');

      expect(result).toBeDefined();
      expect(result.first_name).toBe('Juan');
      expect(result.last_name).toBe('Pérez');
      expect(result.consent_marketing).toBe(true);
      expect(result.consent_sms).toBe(false);
      expect(result.status).toBe(CustomerStatus.ACTIVE);
      expect(result.loyalty_points).toBe(0);
    });

    it('should set default preferred language to Spanish', async () => {
      mockPrismaService.customer.create.mockResolvedValue(mockPrismaCustomer);

      const createDto: CreateCustomerDto = {
        first_name: 'María',
        last_name: 'González',
        consent_marketing: false,
        consent_whatsapp: false,
        consent_email: false,
        consent_sms: false,
      };

      const result = await service.create(createDto, 'org_1');
      expect(result.preferred_language).toBe('es');
    });

    it('should store customer preferences', async () => {
      const customPrismaCustomer = {
        ...mockPrismaCustomer,
        favoriteDrink: 'Latte',
        dietaryRestrictions: 'Lactose intolerant',
        allergies: 'Nuts',
      };
      mockPrismaService.customer.create.mockResolvedValue(customPrismaCustomer);

      const createDto: CreateCustomerDto = {
        first_name: 'Carlos',
        last_name: 'Ramírez',
        favorite_drink: 'Latte',
        dietary_restrictions: 'Lactose intolerant',
        allergies: 'Nuts',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      };

      const result = await service.create(createDto, 'org_1');

      expect(result.favorite_drink).toBe('Latte');
      expect(result.dietary_restrictions).toBe('Lactose intolerant');
      expect(result.allergies).toBe('Nuts');
    });
  });

  describe('findAll', () => {
    it('should return mapped customers', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([
        mockPrismaCustomer,
      ]);
      const result = await service.findAll({});
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('Juan');
    });

    it('should pass organization_id filter to Prisma', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([
        mockPrismaCustomer,
      ]);
      await service.findAll({ organization_id: 'org_1' });
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org_1' }),
        }),
      );
    });

    it('should pass status filter to Prisma', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([
        mockPrismaCustomer,
      ]);
      await service.findAll({ status: CustomerStatus.ACTIVE });
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CustomerStatus.ACTIVE }),
        }),
      );
    });

    it('should return empty array when no customers found', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      const result = await service.findAll({ organization_id: 'nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return null when customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      const result = await service.findOne('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should return mapped customer when found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(
        mockPrismaCustomer,
      );
      const result = await service.findOne('cust-id-123');
      expect(result).toBeDefined();
      expect(result!.id).toBe('cust-id-123');
      expect(result!.organization_id).toBe('org_1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      await expect(
        service.update('bad-id', { phone: '+52 55 1234' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update customer fields', async () => {
      const updatedCustomer = {
        ...mockPrismaCustomer,
        phone: '+52 55 9999 8888',
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(
        mockPrismaCustomer,
      );
      mockPrismaService.customer.update.mockResolvedValue(updatedCustomer);

      const result = await service.update('cust-id-123', {
        phone: '+52 55 9999 8888',
      });

      expect(result.phone).toBe('+52 55 9999 8888');
    });

    it('should update customer status', async () => {
      const blockedCustomer = {
        ...mockPrismaCustomer,
        status: 'BLOCKED',
        blockedReason: 'Fraudulent activity',
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(
        mockPrismaCustomer,
      );
      mockPrismaService.customer.update.mockResolvedValue(blockedCustomer);

      const result = await service.update('cust-id-123', {
        status: CustomerStatus.BLOCKED,
        blocked_reason: 'Fraudulent activity',
      });

      expect(result.status).toBe(CustomerStatus.BLOCKED);
      expect(result.blocked_reason).toBe('Fraudulent activity');
    });
  });

  describe('addVisit', () => {
    it('should throw NotFoundException when customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      await expect(service.addVisit('bad-id', 100)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should increment visit count and total spent', async () => {
      const visitedCustomer = {
        ...mockPrismaCustomer,
        totalVisits: 1,
        totalSpent: 150,
        lastVisitDate: new Date(),
      };
      mockPrismaService.customer.findUnique
        .mockResolvedValueOnce(mockPrismaCustomer) // exists check
        .mockResolvedValue(visitedCustomer); // final fetch
      mockPrismaService.customer.update.mockResolvedValue(visitedCustomer);

      const result = await service.addVisit('cust-id-123', 150);

      expect(result.total_visits).toBe(1);
      expect(result.total_spent).toBe(150);
      expect(result.last_visit_date).toBeDefined();
    });

    it('should call prisma.update with increment operators', async () => {
      mockPrismaService.customer.findUnique
        .mockResolvedValueOnce(mockPrismaCustomer)
        .mockResolvedValue(mockPrismaCustomer);
      mockPrismaService.customer.update.mockResolvedValue(mockPrismaCustomer);

      await service.addVisit('cust-id-123', 200);

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalVisits: { increment: 1 },
            totalSpent: { increment: 200 },
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should call prisma.customer.delete with correct id', async () => {
      mockPrismaService.customer.delete.mockResolvedValue(undefined);
      await service.delete('cust-id-123');
      expect(mockPrismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: 'cust-id-123' },
      });
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrismaService.customer.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3) // active
        .mockResolvedValueOnce(1) // inactive
        .mockResolvedValueOnce(1) // blocked
        .mockResolvedValueOnce(2) // loyalty_active
        .mockResolvedValueOnce(1) // new_today
        .mockResolvedValueOnce(4) // consentMarketing
        .mockResolvedValueOnce(3) // consentWhatsapp
        .mockResolvedValueOnce(4) // consentEmail
        .mockResolvedValueOnce(2); // consentSms

      mockPrismaService.customer.aggregate.mockResolvedValue({
        _sum: { loyaltyPoints: 100, totalSpent: 2500, totalVisits: 10 },
        _avg: { loyaltyPoints: 20, totalSpent: 500, totalVisits: 2 },
      });

      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.customer.groupBy.mockResolvedValue([]);

      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(5);
      expect(stats.active).toBe(3);
      expect(stats.inactive).toBe(1);
      expect(stats.blocked).toBe(1);
      expect(stats.total_spent).toBe(2500);
      expect(stats.total_visits).toBe(10);
      expect(stats.avg_loyalty_points).toBe(20);
      expect(stats).toHaveProperty('consent_stats');
      expect(stats).toHaveProperty('by_rfm_segment');
      expect(stats).toHaveProperty('birthdays_this_month');
    });
  });
});
