import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from '../customers.service';
import { RFMService } from '../rfm.service';
import { CreateCustomerDto, CustomerStatus } from '../dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let rfmService: RFMService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, RFMService],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    rfmService = module.get<RFMService>(RFMService);
  });

  afterEach(() => {
    service['customers'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer with LFPDPPP compliance', async () => {
      const createDto: CreateCustomerDto = {
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan.perez@example.com',
        phone: '+52 55 1234 5678',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: false,
      };

      const result = await service.create(createDto, 'org_1');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.first_name).toBe('Juan');
      expect(result.last_name).toBe('Pérez');
      expect(result.consent_marketing).toBe(true);
      expect(result.consent_whatsapp).toBe(true);
      expect(result.consent_email).toBe(true);
      expect(result.consent_sms).toBe(false);
      expect(result.status).toBe(CustomerStatus.ACTIVE);
      expect(result.loyalty_points).toBe(0);
    });

    it('should set default preferred language to Spanish', async () => {
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
    beforeEach(async () => {
      await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@example.com',
        phone: '1234567',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_1');

      await service.create({
        first_name: 'María',
        last_name: 'González',
        email: 'maria@example.com',
        consent_marketing: false,
        consent_whatsapp: false,
        consent_email: false,
        consent_sms: false,
      }, 'org_1');

      await service.create({
        first_name: 'Carlos',
        last_name: 'Ramírez',
        email: 'carlos@example.com',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_2');
    });

    it('should return all customers when no filters', async () => {
      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll({ organization_id: 'org_1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const result = await service.findAll({ status: CustomerStatus.ACTIVE });
      expect(result).toHaveLength(3);
    });

    it('should search by name', async () => {
      const result = await service.findAll({ search: 'juan' });
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('Juan');
    });

    it('should search by email', async () => {
      const result = await service.findAll({ search: 'maria@' });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update customer information', async () => {
      const customer = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_1');

      const result = await service.update(customer.id, {
        phone: '+52 55 9999 8888',
        favorite_drink: 'Cappuccino',
      });

      expect(result.phone).toBe('+52 55 9999 8888');
      expect(result.favorite_drink).toBe('Cappuccino');
    });

    it('should update customer status', async () => {
      const customer = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_1');

      const result = await service.update(customer.id, {
        status: CustomerStatus.BLOCKED,
        blocked_reason: 'Fraudulent activity',
      });

      expect(result.status).toBe(CustomerStatus.BLOCKED);
      expect(result.blocked_reason).toBe('Fraudulent activity');
    });
  });

  describe('addVisit', () => {
    it('should increment visit count and total spent', async () => {
      const customer = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_1');

      const result = await service.addVisit(customer.id, 150);

      expect(result.total_visits).toBe(1);
      expect(result.total_spent).toBe(150);
      expect(result.last_visit_date).toBeDefined();
    });

    it('should accumulate multiple visits', async () => {
      const customer = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_1');

      await service.addVisit(customer.id, 100);
      await service.addVisit(customer.id, 200);
      const result = await service.addVisit(customer.id, 150);

      expect(result.total_visits).toBe(3);
      expect(result.total_spent).toBe(450);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const customer1 = await service.create({
        first_name: 'Customer 1',
        last_name: 'Test',
        date_of_birth: '1990-10-15',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: false,
      }, 'org_1');

      const customer2 = await service.create({
        first_name: 'Customer 2',
        last_name: 'Test',
        consent_marketing: false,
        consent_whatsapp: false,
        consent_email: false,
        consent_sms: false,
      }, 'org_1');

      await service.addVisit(customer1.id, 500);
      await service.addVisit(customer2.id, 300);
    });

    it('should return customer statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.total_spent).toBe(800);
      expect(stats.total_visits).toBe(2);
    });

    it('should calculate averages', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.avg_spent).toBe(400);
      expect(stats.avg_visits).toBe(1);
    });

    it('should count birthdays this month', async () => {
      const stats = await service.getStats('org_1');

      // October birthdays (customer 1 has birthday on Oct 15)
      expect(stats.birthdays_this_month).toBe(1);
    });

    it('should count consent stats', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.consent_stats.marketing).toBe(1);
      expect(stats.consent_stats.whatsapp).toBe(1);
      expect(stats.consent_stats.email).toBe(1);
      expect(stats.consent_stats.sms).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete customer', async () => {
      const customer = await service.create({
        first_name: 'Juan',
        last_name: 'Pérez',
        consent_marketing: true,
        consent_whatsapp: true,
        consent_email: true,
        consent_sms: true,
      }, 'org_1');

      await service.delete(customer.id);
      const result = await service.findOne(customer.id);
      expect(result).toBeNull();
    });
  });
});
