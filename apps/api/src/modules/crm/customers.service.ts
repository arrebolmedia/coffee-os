import { Injectable } from '@nestjs/common';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto, CustomerStatus } from './dto';
import { Customer } from './interfaces';
import { RFMService } from './rfm.service';

@Injectable()
export class CustomersService {
  private customers: Map<string, Customer> = new Map();

  constructor(private rfmService: RFMService) {}

  async create(createDto: CreateCustomerDto, organizationId: string): Promise<Customer> {
    const id = this.generateId();
    const now = new Date();

    const customer: Customer = {
      id,
      organization_id: organizationId,
      first_name: createDto.first_name,
      last_name: createDto.last_name,
      email: createDto.email,
      phone: createDto.phone,
      date_of_birth: createDto.date_of_birth ? new Date(createDto.date_of_birth) : undefined,
      gender: createDto.gender,
      preferred_language: createDto.preferred_language || 'es',
      notes: createDto.notes,

      // LFPDPPP Compliance
      consent_marketing: createDto.consent_marketing,
      consent_whatsapp: createDto.consent_whatsapp,
      consent_email: createDto.consent_email,
      consent_sms: createDto.consent_sms,
      consent_date: createDto.consent_date ? new Date(createDto.consent_date) : now,
      consent_ip_address: createDto.consent_ip_address,

      // Preferences
      favorite_drink: createDto.favorite_drink,
      dietary_restrictions: createDto.dietary_restrictions,
      allergies: createDto.allergies,

      // Initial status and metrics
      status: CustomerStatus.ACTIVE,
      loyalty_points: 0,
      total_visits: 0,
      total_spent: 0,

      created_at: now,
      updated_at: now,
    };

    this.customers.set(id, customer);
    return customer;
  }

  async findAll(query: QueryCustomersDto): Promise<Customer[]> {
    let customers = Array.from(this.customers.values());

    if (query.organization_id) {
      customers = customers.filter((c) => c.organization_id === query.organization_id);
    }

    if (query.status) {
      customers = customers.filter((c) => c.status === query.status);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.first_name.toLowerCase().includes(search) ||
          c.last_name.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search),
      );
    }

    if (query.segment_id) {
      customers = customers.filter((c) => c.rfm_segment === query.segment_id);
    }

    if (query.birthday_month) {
      const month = parseInt(query.birthday_month);
      customers = customers.filter((c) => c.date_of_birth?.getMonth() === month - 1);
    }

    return customers;
  }

  async findOne(id: string): Promise<Customer | null> {
    return this.customers.get(id) || null;
  }

  async update(id: string, updateDto: UpdateCustomerDto): Promise<Customer> {
    const customer = this.customers.get(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updated: Customer = {
      ...customer,
      first_name: updateDto.first_name ?? customer.first_name,
      last_name: updateDto.last_name ?? customer.last_name,
      email: updateDto.email ?? customer.email,
      phone: updateDto.phone ?? customer.phone,
      date_of_birth: updateDto.date_of_birth
        ? new Date(updateDto.date_of_birth)
        : customer.date_of_birth,
      gender: updateDto.gender ?? customer.gender,
      preferred_language: updateDto.preferred_language ?? customer.preferred_language,
      notes: updateDto.notes ?? customer.notes,
      consent_marketing: updateDto.consent_marketing ?? customer.consent_marketing,
      consent_whatsapp: updateDto.consent_whatsapp ?? customer.consent_whatsapp,
      consent_email: updateDto.consent_email ?? customer.consent_email,
      consent_sms: updateDto.consent_sms ?? customer.consent_sms,
      consent_date: updateDto.consent_date ? new Date(updateDto.consent_date) : customer.consent_date,
      consent_ip_address: updateDto.consent_ip_address ?? customer.consent_ip_address,
      favorite_drink: updateDto.favorite_drink ?? customer.favorite_drink,
      dietary_restrictions: updateDto.dietary_restrictions ?? customer.dietary_restrictions,
      allergies: updateDto.allergies ?? customer.allergies,
      status: updateDto.status ?? customer.status,
      blocked_reason: updateDto.blocked_reason ?? customer.blocked_reason,
      updated_at: new Date(),
    };

    this.customers.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.customers.delete(id);
  }

  async addVisit(customerId: string, orderTotal: number): Promise<Customer> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.total_visits += 1;
    customer.total_spent += orderTotal;
    customer.last_visit_date = new Date();
    customer.updated_at = new Date();

    // Recalculate RFM score
    const rfmScore = await this.rfmService.calculateCustomerRFM(customerId);
    if (rfmScore) {
      customer.rfm_segment = rfmScore.segment_name;
      customer.recency_score = rfmScore.recency_score;
      customer.frequency_score = rfmScore.frequency_score;
      customer.monetary_score = rfmScore.monetary_score;
    }

    this.customers.set(customerId, customer);
    return customer;
  }

  async getStats(organizationId: string): Promise<any> {
    const customers = Array.from(this.customers.values()).filter(
      (c) => c.organization_id === organizationId,
    );

    const total = customers.length;
    const active = customers.filter((c) => c.status === CustomerStatus.ACTIVE).length;
    const inactive = customers.filter((c) => c.status === CustomerStatus.INACTIVE).length;
    const blocked = customers.filter((c) => c.status === CustomerStatus.BLOCKED).length;

    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
    const avgLoyaltyPoints = total > 0 ? Math.round(totalLoyaltyPoints / total) : 0;

    const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const avgSpent = total > 0 ? Math.round(totalSpent / total) : 0;

    const totalVisits = customers.reduce((sum, c) => sum + c.total_visits, 0);
    const avgVisits = total > 0 ? Math.round((totalVisits / total) * 100) / 100 : 0;

    // Birthday this month
    const currentMonth = new Date().getMonth();
    const birthdaysThisMonth = customers.filter(
      (c) => c.date_of_birth && c.date_of_birth.getMonth() === currentMonth,
    ).length;

    // RFM segments distribution
    const bySegment = customers.reduce((acc, c) => {
      if (c.rfm_segment) {
        acc[c.rfm_segment] = (acc[c.rfm_segment] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Consent stats
    const consentMarketing = customers.filter((c) => c.consent_marketing).length;
    const consentWhatsApp = customers.filter((c) => c.consent_whatsapp).length;
    const consentEmail = customers.filter((c) => c.consent_email).length;
    const consentSMS = customers.filter((c) => c.consent_sms).length;

    return {
      total,
      active,
      inactive,
      blocked,
      total_loyalty_points: totalLoyaltyPoints,
      avg_loyalty_points: avgLoyaltyPoints,
      total_spent: totalSpent,
      avg_spent: avgSpent,
      total_visits: totalVisits,
      avg_visits: avgVisits,
      birthdays_this_month: birthdaysThisMonth,
      by_rfm_segment: bySegment,
      consent_stats: {
        marketing: consentMarketing,
        whatsapp: consentWhatsApp,
        email: consentEmail,
        sms: consentSMS,
      },
    };
  }

  private generateId(): string {
    return `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
