import { Injectable } from '@nestjs/common';
import { CreatePermitDto, UpdatePermitDto, QueryFinanceDto, PermitStatus } from './dto';
import { Permit } from './interfaces';

@Injectable()
export class PermitsService {
  private permits: Map<string, Permit> = new Map();

  async create(createDto: CreatePermitDto): Promise<Permit> {
    const id = this.generateId();
    const now = new Date();

    const permit: Permit = {
      id,
      organization_id: createDto.organization_id,
      location_id: createDto.location_id,
      type: createDto.type,
      permit_number: createDto.permit_number,
      issuing_authority: createDto.issuing_authority,
      issue_date: new Date(createDto.issue_date),
      expiry_date: new Date(createDto.expiry_date),
      status: PermitStatus.ACTIVE,
      cost: createDto.cost,
      renewal_frequency: createDto.renewal_frequency,
      responsible_person: createDto.responsible_person,
      notes: createDto.notes,
      document_url: createDto.document_url,
      created_at: now,
      updated_at: now,
    };

    // Calculate days until expiry
    this.calculateExpiryInfo(permit);

    this.permits.set(id, permit);
    return permit;
  }

  async findAll(query: QueryFinanceDto): Promise<Permit[]> {
    let permits = Array.from(this.permits.values());

    if (query.organization_id) {
      permits = permits.filter((p) => p.organization_id === query.organization_id);
    }

    if (query.location_id) {
      permits = permits.filter((p) => p.location_id === query.location_id);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      permits = permits.filter(
        (p) =>
          p.permit_number.toLowerCase().includes(search) ||
          p.issuing_authority.toLowerCase().includes(search) ||
          p.type.toLowerCase().includes(search),
      );
    }

    // Recalculate expiry info for all permits
    permits.forEach((p) => this.calculateExpiryInfo(p));

    return permits.sort((a, b) => {
      // Sort by expiry date (soonest first)
      return a.expiry_date.getTime() - b.expiry_date.getTime();
    });
  }

  async findOne(id: string): Promise<Permit | null> {
    const permit = this.permits.get(id);
    if (permit) {
      this.calculateExpiryInfo(permit);
    }
    return permit || null;
  }

  async update(id: string, updateDto: UpdatePermitDto): Promise<Permit> {
    const permit = this.permits.get(id);
    if (!permit) {
      throw new Error('Permit not found');
    }

    Object.assign(permit, updateDto);
    
    if (updateDto.expiry_date) {
      permit.expiry_date = new Date(updateDto.expiry_date);
    }
    if (updateDto.last_renewal_date) {
      permit.last_renewal_date = new Date(updateDto.last_renewal_date);
    }
    
    permit.updated_at = new Date();
    
    this.calculateExpiryInfo(permit);
    this.permits.set(id, permit);
    return permit;
  }

  async renewPermit(id: string, newExpiryDate: Date, renewalCost?: number): Promise<Permit> {
    const permit = this.permits.get(id);
    if (!permit) {
      throw new Error('Permit not found');
    }

    permit.last_renewal_date = new Date();
    permit.expiry_date = newExpiryDate;
    permit.renewal_cost = renewalCost;
    permit.status = PermitStatus.ACTIVE;
    permit.updated_at = new Date();

    this.calculateExpiryInfo(permit);
    this.permits.set(id, permit);
    return permit;
  }

  async delete(id: string): Promise<void> {
    this.permits.delete(id);
  }

  async getExpiringSoon(organizationId: string, daysThreshold: number = 30): Promise<Permit[]> {
    const permits = Array.from(this.permits.values()).filter(
      (p) => p.organization_id === organizationId,
    );

    return permits.filter((p) => {
      this.calculateExpiryInfo(p);
      return (
        p.days_until_expiry !== undefined &&
        p.days_until_expiry <= daysThreshold &&
        p.days_until_expiry >= 0
      );
    });
  }

  async getExpired(organizationId: string): Promise<Permit[]> {
    const permits = Array.from(this.permits.values()).filter(
      (p) => p.organization_id === organizationId,
    );

    return permits.filter((p) => {
      this.calculateExpiryInfo(p);
      return p.status === PermitStatus.EXPIRED || (p.days_until_expiry !== undefined && p.days_until_expiry < 0);
    });
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    let permits = Array.from(this.permits.values()).filter(
      (p) => p.organization_id === organizationId,
    );

    if (locationId) {
      permits = permits.filter((p) => p.location_id === locationId);
    }

    // Update statuses
    permits.forEach((p) => {
      this.calculateExpiryInfo(p);
      if (p.days_until_expiry !== undefined && p.days_until_expiry < 0) {
        p.status = PermitStatus.EXPIRED;
      } else if (p.days_until_expiry !== undefined && p.days_until_expiry <= 30) {
        p.status = PermitStatus.RENEWAL_DUE;
      }
    });

    const total = permits.length;
    const active = permits.filter((p) => p.status === PermitStatus.ACTIVE).length;
    const renewalDue = permits.filter((p) => p.status === PermitStatus.RENEWAL_DUE).length;
    const expired = permits.filter((p) => p.status === PermitStatus.EXPIRED).length;

    const byType = permits.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_permits: total,
      active: active,
      renewal_due: renewalDue,
      expired: expired,
      by_type: byType,
      expiring_soon: permits.filter((p) => p.is_expiring_soon).length,
    };
  }

  private calculateExpiryInfo(permit: Permit): void {
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (permit.expiry_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    permit.days_until_expiry = daysUntilExpiry;
    permit.is_expiring_soon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

    // Auto-update status
    if (daysUntilExpiry < 0) {
      permit.status = PermitStatus.EXPIRED;
    } else if (daysUntilExpiry <= 30) {
      permit.status = PermitStatus.RENEWAL_DUE;
    }
  }

  private generateId(): string {
    return `permit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
