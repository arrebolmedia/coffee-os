/**
 * SuppliersService — Prisma-backed implementation.
 *
 * Maps to the `Supplier` model in `packages/database/prisma/schema.prisma`:
 *   id, organizationId, name, contactName, email, phone, address,
 *   paymentTerms (free-form string), leadTime (int days), active.
 *
 * TODO migration: campos NO soportados por el schema actual y removidos del
 * DTO/interface para no ocultar pérdida de datos:
 *   - code (string)            → usar id (cuid) o agregar al schema
 *   - legal_name
 *   - status enum (active|inactive|suspended) → mapeado a boolean `active`
 *   - website, city, state, postal_code, country, tax_id
 *   - credit_limit, discount_percentage
 *   - rating, on_time_delivery_rate, is_preferred
 *   - categories, certifications, tags, notes
 *
 * Métodos removidos por dependencia con campos faltantes:
 *   - findByCode (no hay `code`)
 *   - updateRating (no hay `rating` ni `on_time_delivery_rate`)
 *
 * El endpoint findAll filtra estrictamente por organizationId.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { Supplier, SupplierStats } from './interfaces';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private toSupplier(row: any): Supplier {
    return {
      id: row.id,
      organization_id: row.organizationId,
      name: row.name,
      contact_person: row.contactName ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      payment_terms: row.paymentTerms ?? undefined,
      lead_time_days: row.leadTime ?? undefined,
      active: row.active,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const created = await this.prisma.supplier.create({
      data: {
        organizationId: createSupplierDto.organization_id,
        name: createSupplierDto.name,
        contactName: createSupplierDto.contact_person,
        email: createSupplierDto.email,
        phone: createSupplierDto.phone,
        address: createSupplierDto.address,
        paymentTerms: createSupplierDto.payment_terms,
        leadTime: createSupplierDto.lead_time_days,
        active: createSupplierDto.active ?? true,
      },
    });
    return this.toSupplier(created);
  }

  async findAll(
    query: QuerySuppliersDto,
    organizationId?: string,
  ): Promise<Supplier[]> {
    const where: any = {};

    // Multi-tenant: the caller's organizationId (from JWT) takes precedence;
    // query.organization_id from the request is intentionally ignored.
    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (query.active !== undefined) {
      where.active = query.active;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortField =
      query.sort_by === 'created_at' ? 'createdAt' : query.sort_by || 'name';
    const orderBy: any = { [sortField]: query.order || 'asc' };

    const rows = await this.prisma.supplier.findMany({ where, orderBy });
    return rows.map((r) => this.toSupplier(r));
  }

  async findById(id: string, organizationId?: string): Promise<Supplier> {
    const row = await this.prisma.supplier.findUnique({ where: { id } });
    // Ownership: a supplier from another org is reported as not found (404).
    if (!row || (organizationId && row.organizationId !== organizationId)) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return this.toSupplier(row);
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    organizationId?: string,
  ): Promise<Supplier> {
    await this.findById(id, organizationId);

    const data: any = {};
    if (updateSupplierDto.name !== undefined)
      data.name = updateSupplierDto.name;
    if (updateSupplierDto.contact_person !== undefined)
      data.contactName = updateSupplierDto.contact_person;
    if (updateSupplierDto.email !== undefined)
      data.email = updateSupplierDto.email;
    if (updateSupplierDto.phone !== undefined)
      data.phone = updateSupplierDto.phone;
    if (updateSupplierDto.address !== undefined)
      data.address = updateSupplierDto.address;
    if (updateSupplierDto.payment_terms !== undefined)
      data.paymentTerms = updateSupplierDto.payment_terms;
    if (updateSupplierDto.lead_time_days !== undefined)
      data.leadTime = updateSupplierDto.lead_time_days;
    if (updateSupplierDto.active !== undefined)
      data.active = updateSupplierDto.active;

    const updated = await this.prisma.supplier.update({
      where: { id },
      data,
    });
    return this.toSupplier(updated);
  }

  /** Soft delete: marca active=false. */
  async delete(id: string, organizationId?: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.prisma.supplier.update({
      where: { id },
      data: { active: false },
    });
  }

  async getStats(organizationId: string): Promise<SupplierStats> {
    const [total, activeCount] = await Promise.all([
      this.prisma.supplier.count({ where: { organizationId } }),
      this.prisma.supplier.count({ where: { organizationId, active: true } }),
    ]);
    return {
      total_suppliers: total,
      active_count: activeCount,
      inactive_count: total - activeCount,
    };
  }
}
