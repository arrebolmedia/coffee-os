import { Injectable } from '@nestjs/common';
import { CreateCertificationDto, QueryCertificationsDto, CertificationStatus } from './dto';
import { Certification } from './interfaces';

@Injectable()
export class CertificationsService {
  private certifications: Map<string, Certification> = new Map();

  async create(createDto: CreateCertificationDto, organizationId: string): Promise<Certification> {
    const id = this.generateId();
    const now = new Date();

    const issueDate = new Date(createDto.issue_date);
    const expiryDate = createDto.expiry_date ? new Date(createDto.expiry_date) : undefined;

    // Calculate if expiring soon and days until expiry
    let isExpiringSoon = false;
    let daysUntilExpiry: number | undefined;
    let status = CertificationStatus.ACTIVE;

    if (expiryDate) {
      const today = new Date();
      const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilExpiry = daysDiff;

      if (daysDiff <= 0) {
        status = CertificationStatus.EXPIRED;
      } else if (daysDiff <= 30) {
        isExpiringSoon = true;
      }
    }

    const certification: Certification = {
      id,
      employee_id: createDto.employee_id,
      organization_id: organizationId,
      type: createDto.type,
      name: createDto.name,
      issuer: createDto.issuer,
      status,
      issue_date: issueDate,
      expiry_date: expiryDate,
      certificate_number: createDto.certificate_number,
      certificate_url: createDto.certificate_url,
      requires_renewal: createDto.requires_renewal ?? false,
      is_expiring_soon: isExpiringSoon,
      days_until_expiry: daysUntilExpiry,
      notes: createDto.notes,
      created_at: now,
      updated_at: now,
    };

    this.certifications.set(id, certification);
    return certification;
  }

  async findAll(query: QueryCertificationsDto): Promise<Certification[]> {
    let certs = Array.from(this.certifications.values());

    if (query.employee_id) {
      certs = certs.filter((c) => c.employee_id === query.employee_id);
    }

    if (query.organization_id) {
      certs = certs.filter((c) => c.organization_id === query.organization_id);
    }

    if (query.type) {
      certs = certs.filter((c) => c.type === query.type);
    }

    if (query.status) {
      certs = certs.filter((c) => c.status === query.status);
    }

    if (query.expiring_soon === 'true') {
      certs = certs.filter((c) => c.is_expiring_soon);
    }

    return certs;
  }

  async findOne(id: string): Promise<Certification | null> {
    return this.certifications.get(id) || null;
  }

  async updateStatus(id: string, status: CertificationStatus): Promise<Certification> {
    const cert = this.certifications.get(id);
    if (!cert) {
      throw new Error('Certification not found');
    }

    cert.status = status;
    cert.updated_at = new Date();

    this.certifications.set(id, cert);
    return cert;
  }

  async delete(id: string): Promise<void> {
    this.certifications.delete(id);
  }

  async getExpiring(organizationId: string, days: number = 30): Promise<Certification[]> {
    const certs = Array.from(this.certifications.values()).filter(
      (c) =>
        c.organization_id === organizationId &&
        c.status === CertificationStatus.ACTIVE &&
        c.days_until_expiry !== undefined &&
        c.days_until_expiry <= days &&
        c.days_until_expiry > 0,
    );

    return certs.sort((a, b) => (a.days_until_expiry || 0) - (b.days_until_expiry || 0));
  }

  async getStats(organizationId: string): Promise<any> {
    const certs = Array.from(this.certifications.values()).filter(
      (c) => c.organization_id === organizationId,
    );

    const total = certs.length;
    const active = certs.filter((c) => c.status === CertificationStatus.ACTIVE).length;
    const expired = certs.filter((c) => c.status === CertificationStatus.EXPIRED).length;
    const expiringSoon = certs.filter((c) => c.is_expiring_soon).length;

    const byType = certs.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      expired,
      expiring_soon: expiringSoon,
      by_type: byType,
    };
  }

  private generateId(): string {
    return `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
