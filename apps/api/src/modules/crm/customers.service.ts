import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomersDto,
  CustomerStatus,
} from './dto';
import { Customer } from './interfaces';
import { RFMService } from './rfm.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rfmService: RFMService,
  ) {}

  private mapToInterface(c: any): Customer {
    return {
      id: c.id,
      organization_id: c.organizationId,
      first_name: c.firstName,
      last_name: c.lastName,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      date_of_birth: c.dateOfBirth ?? undefined,
      gender: c.gender ?? undefined,
      preferred_language: c.preferredLanguage,
      notes: c.notes ?? undefined,
      consent_marketing: c.consentMarketing,
      consent_whatsapp: c.consentWhatsapp,
      consent_email: c.consentEmail,
      consent_sms: c.consentSms,
      consent_date: c.consentDate ?? undefined,
      consent_ip_address: c.consentIpAddress ?? undefined,
      favorite_drink: c.favoriteDrink ?? undefined,
      dietary_restrictions: c.dietaryRestrictions ?? undefined,
      allergies: c.allergies ?? undefined,
      status: c.status as CustomerStatus,
      blocked_reason: c.blockedReason ?? undefined,
      loyalty_points: c.loyaltyPoints,
      total_visits: c.totalVisits,
      total_spent: c.totalSpent,
      last_visit_date: c.lastVisitDate ?? undefined,
      rfm_segment: c.rfmSegment ?? undefined,
      recency_score: c.recencyScore ?? undefined,
      frequency_score: c.frequencyScore ?? undefined,
      monetary_score: c.monetaryScore ?? undefined,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }

  async create(
    createDto: CreateCustomerDto,
    organizationId: string,
  ): Promise<Customer> {
    const customer = await this.prisma.customer.create({
      data: {
        organizationId,
        firstName: createDto.first_name,
        lastName: createDto.last_name,
        email: createDto.email,
        phone: createDto.phone,
        dateOfBirth: createDto.date_of_birth
          ? new Date(createDto.date_of_birth)
          : null,
        gender: createDto.gender,
        preferredLanguage: createDto.preferred_language ?? 'es',
        notes: createDto.notes,
        consentMarketing: createDto.consent_marketing,
        consentWhatsapp: createDto.consent_whatsapp,
        consentEmail: createDto.consent_email,
        consentSms: createDto.consent_sms,
        consentDate: createDto.consent_date
          ? new Date(createDto.consent_date)
          : new Date(),
        consentIpAddress: createDto.consent_ip_address,
        favoriteDrink: createDto.favorite_drink,
        dietaryRestrictions: createDto.dietary_restrictions,
        allergies: createDto.allergies,
        status: 'ACTIVE',
      },
    });
    return this.mapToInterface(customer);
  }

  async findAll(query: QueryCustomersDto): Promise<Customer[]> {
    const where: any = {};

    if (query.organization_id) where.organizationId = query.organization_id;
    if (query.status) where.status = query.status;
    if (query.segment_id) where.rfmSegment = query.segment_id;

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    let customers = await this.prisma.customer.findMany({ where });

    // Birthday month filter — no native month extraction in Prisma typed API
    if (query.birthday_month) {
      const month = parseInt(query.birthday_month);
      customers = customers.filter(
        (c) => c.dateOfBirth && new Date(c.dateOfBirth).getMonth() === month - 1,
      );
    }

    return customers.map(this.mapToInterface.bind(this));
  }

  async findOne(id: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    return customer ? this.mapToInterface(customer) : null;
  }

  async update(id: string, updateDto: UpdateCustomerDto): Promise<Customer> {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Customer ${id} not found`);

    const data: any = {};
    if (updateDto.first_name !== undefined) data.firstName = updateDto.first_name;
    if (updateDto.last_name !== undefined) data.lastName = updateDto.last_name;
    if (updateDto.email !== undefined) data.email = updateDto.email;
    if (updateDto.phone !== undefined) data.phone = updateDto.phone;
    if (updateDto.date_of_birth !== undefined)
      data.dateOfBirth = new Date(updateDto.date_of_birth);
    if (updateDto.gender !== undefined) data.gender = updateDto.gender;
    if (updateDto.preferred_language !== undefined)
      data.preferredLanguage = updateDto.preferred_language;
    if (updateDto.notes !== undefined) data.notes = updateDto.notes;
    if (updateDto.consent_marketing !== undefined)
      data.consentMarketing = updateDto.consent_marketing;
    if (updateDto.consent_whatsapp !== undefined)
      data.consentWhatsapp = updateDto.consent_whatsapp;
    if (updateDto.consent_email !== undefined)
      data.consentEmail = updateDto.consent_email;
    if (updateDto.consent_sms !== undefined)
      data.consentSms = updateDto.consent_sms;
    if (updateDto.consent_date !== undefined)
      data.consentDate = new Date(updateDto.consent_date);
    if (updateDto.consent_ip_address !== undefined)
      data.consentIpAddress = updateDto.consent_ip_address;
    if (updateDto.favorite_drink !== undefined)
      data.favoriteDrink = updateDto.favorite_drink;
    if (updateDto.dietary_restrictions !== undefined)
      data.dietaryRestrictions = updateDto.dietary_restrictions;
    if (updateDto.allergies !== undefined) data.allergies = updateDto.allergies;
    if (updateDto.status !== undefined) data.status = updateDto.status;
    if (updateDto.blocked_reason !== undefined)
      data.blockedReason = updateDto.blocked_reason;

    const updated = await this.prisma.customer.update({ where: { id }, data });
    return this.mapToInterface(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  async addVisit(customerId: string, orderTotal: number): Promise<Customer> {
    const existing = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!existing) throw new NotFoundException(`Customer ${customerId} not found`);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        totalVisits: { increment: 1 },
        totalSpent: { increment: orderTotal },
        lastVisitDate: new Date(),
      },
    });

    // Recalculate RFM score (RFMService still in-memory; returns null if no data)
    const rfmScore = await this.rfmService.calculateCustomerRFM(customerId);
    if (rfmScore) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          rfmSegment: rfmScore.segment_name,
          recencyScore: rfmScore.recency_score,
          frequencyScore: rfmScore.frequency_score,
          monetaryScore: rfmScore.monetary_score,
        },
      });
    }

    const final = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    return this.mapToInterface(final!);
  }

  async getStats(organizationId: string): Promise<any> {
    const where = { organizationId };

    const [total, active, inactive, blocked, loyaltyActive] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.customer.count({ where: { ...where, status: 'INACTIVE' } }),
      this.prisma.customer.count({ where: { ...where, status: 'BLOCKED' } }),
      this.prisma.customer.count({
        where: { ...where, loyaltyPoints: { gt: 0 } },
      }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = await this.prisma.customer.count({
      where: { ...where, createdAt: { gte: today } },
    });

    const aggregates = await this.prisma.customer.aggregate({
      where,
      _sum: { loyaltyPoints: true, totalSpent: true, totalVisits: true },
      _avg: { loyaltyPoints: true, totalSpent: true, totalVisits: true },
    });

    // Birthday this month — filter in JS (no native month extraction in Prisma typed API)
    const currentMonth = new Date().getMonth();
    const allWithBirthday = await this.prisma.customer.findMany({
      where: { ...where, dateOfBirth: { not: null } },
      select: { dateOfBirth: true },
    });
    const birthdaysThisMonth = allWithBirthday.filter(
      (c) => c.dateOfBirth && new Date(c.dateOfBirth).getMonth() === currentMonth,
    ).length;

    // RFM segment distribution
    const rfmGroups = await this.prisma.customer.groupBy({
      by: ['rfmSegment'],
      where: { ...where, rfmSegment: { not: null } },
      _count: { rfmSegment: true },
    });
    const bySegment = rfmGroups.reduce(
      (acc, g) => {
        if (g.rfmSegment) acc[g.rfmSegment] = g._count.rfmSegment;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Consent stats
    const [consentMarketing, consentWhatsapp, consentEmail, consentSms] =
      await Promise.all([
        this.prisma.customer.count({ where: { ...where, consentMarketing: true } }),
        this.prisma.customer.count({ where: { ...where, consentWhatsapp: true } }),
        this.prisma.customer.count({ where: { ...where, consentEmail: true } }),
        this.prisma.customer.count({ where: { ...where, consentSms: true } }),
      ]);

    return {
      total,
      active,
      inactive,
      blocked,
      new_today: newToday,
      loyalty_active: loyaltyActive,
      total_loyalty_points: aggregates._sum.loyaltyPoints ?? 0,
      avg_loyalty_points: Math.round(aggregates._avg.loyaltyPoints ?? 0),
      total_spent: aggregates._sum.totalSpent ?? 0,
      avg_spent: Math.round(aggregates._avg.totalSpent ?? 0),
      total_visits: aggregates._sum.totalVisits ?? 0,
      avg_visits: Math.round(((aggregates._avg.totalVisits ?? 0) * 100)) / 100,
      birthdays_this_month: birthdaysThisMonth,
      by_rfm_segment: bySegment,
      consent_stats: {
        marketing: consentMarketing,
        whatsapp: consentWhatsapp,
        email: consentEmail,
        sms: consentSms,
      },
    };
  }
}
