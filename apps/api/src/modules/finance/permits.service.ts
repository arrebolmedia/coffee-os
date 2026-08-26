import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePermitDto,
  PermitStatus,
  QueryFinanceDto,
  UpdatePermitDto,
} from './dto';
import { Permit } from './interfaces';

@Injectable()
export class PermitsService {
  constructor(private readonly prisma: PrismaService) {}

  private map(p: any): Permit {
    const mapped: Permit = {
      id: p.id,
      organization_id: p.organizationId,
      location_id: p.locationId,
      type: p.type,
      permit_number: p.permitNumber,
      issuing_authority: p.authority,
      issue_date: p.issuedDate ?? new Date(),
      expiry_date: p.expiryDate ?? new Date(),
      status: p.status,
      cost: p.cost ?? undefined,
      renewal_frequency: p.renewalFrequency ?? undefined,
      last_renewal_date: p.lastRenewalDate ?? undefined,
      renewal_cost: p.renewalCost ?? undefined,
      responsible_person: p.responsiblePerson ?? undefined,
      notes: p.notes ?? undefined,
      document_url: p.documentUrl ?? undefined,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
    this.calculateExpiryInfo(mapped);
    return mapped;
  }

  private calculateExpiryInfo(permit: Permit): void {
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (permit.expiry_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    permit.days_until_expiry = daysUntilExpiry;
    permit.is_expiring_soon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }

  async create(createDto: CreatePermitDto): Promise<Permit> {
    const permit = await this.prisma.permit.create({
      data: {
        organizationId: createDto.organization_id,
        locationId: createDto.location_id,
        type: createDto.type as any,
        name: createDto.permit_number,
        authority: createDto.issuing_authority,
        permitNumber: createDto.permit_number,
        status: PermitStatus.ACTIVE as any,
        issuedDate: new Date(createDto.issue_date),
        expiryDate: new Date(createDto.expiry_date),
        cost: createDto.cost,
        renewalFrequency: createDto.renewal_frequency,
        responsiblePerson: createDto.responsible_person,
        notes: createDto.notes,
        documentUrl: createDto.document_url,
      },
    });
    return this.map(permit);
  }

  async findAll(query: QueryFinanceDto): Promise<Permit[]> {
    const where: any = {};

    if (query.organization_id) where.organizationId = query.organization_id;
    if (query.location_id) where.locationId = query.location_id;

    if (query.search) {
      where.OR = [
        { permitNumber: { contains: query.search, mode: 'insensitive' } },
        { authority: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const permits = await this.prisma.permit.findMany({
      where,
      orderBy: { expiryDate: 'asc' },
    });
    return permits.map((p) => this.map(p));
  }

  async findOne(id: string, organizationId: string): Promise<Permit | null> {
    const permit = await this.prisma.permit.findFirst({
      where: { id, organizationId },
    });
    return permit ? this.map(permit) : null;
  }

  async update(
    id: string,
    updateDto: UpdatePermitDto,
    organizationId: string,
  ): Promise<Permit> {
    const existing = await this.prisma.permit.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Permit not found');

    const permit = await this.prisma.permit.update({
      where: { id },
      data: {
        ...(updateDto.status && { status: updateDto.status as any }),
        ...(updateDto.expiry_date && {
          expiryDate: new Date(updateDto.expiry_date),
        }),
        ...(updateDto.last_renewal_date && {
          lastRenewalDate: new Date(updateDto.last_renewal_date),
        }),
        ...(updateDto.renewal_cost !== undefined && {
          renewalCost: updateDto.renewal_cost,
        }),
        ...(updateDto.responsible_person !== undefined && {
          responsiblePerson: updateDto.responsible_person,
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.document_url !== undefined && {
          documentUrl: updateDto.document_url,
        }),
      },
    });
    return this.map(permit);
  }

  async renewPermit(
    id: string,
    newExpiryDate: Date,
    organizationId: string,
    renewalCost?: number,
  ): Promise<Permit> {
    const existing = await this.prisma.permit.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Permit not found');

    const permit = await this.prisma.permit.update({
      where: { id },
      data: {
        expiryDate: newExpiryDate,
        lastRenewalDate: new Date(),
        renewalCost,
        status: PermitStatus.ACTIVE as any,
      },
    });
    return this.map(permit);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.permit.delete({ where: { id } });
  }

  async getExpiringSoon(
    organizationId: string,
    daysThreshold = 30,
  ): Promise<Permit[]> {
    const now = new Date();
    const threshold = new Date(
      now.getTime() + daysThreshold * 24 * 60 * 60 * 1000,
    );

    const permits = await this.prisma.permit.findMany({
      where: {
        organizationId,
        expiryDate: { gte: now, lte: threshold },
      },
    });
    return permits.map((p) => this.map(p));
  }

  async getExpired(organizationId: string): Promise<Permit[]> {
    const permits = await this.prisma.permit.findMany({
      where: {
        organizationId,
        expiryDate: { lt: new Date() },
      },
    });
    return permits.map((p) => this.map(p));
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    const where: any = { organizationId };
    if (locationId) where.locationId = locationId;

    const now = new Date();
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, expired, expiringSoon, byType] = await Promise.all([
      this.prisma.permit.count({ where }),
      this.prisma.permit.count({
        where: { ...where, expiryDate: { lt: now } },
      }),
      this.prisma.permit.count({
        where: { ...where, expiryDate: { gte: now, lte: in30days } },
      }),
      this.prisma.permit.groupBy({ by: ['type'], where, _count: { id: true } }),
    ]);

    const active = total - expired - expiringSoon;

    const byTypeMap = byType.reduce(
      (acc, row) => {
        acc[row.type] = row._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total_permits: total,
      active: Math.max(0, active),
      renewal_due: expiringSoon,
      expired,
      by_type: byTypeMap,
      expiring_soon: expiringSoon,
    };
  }
}
