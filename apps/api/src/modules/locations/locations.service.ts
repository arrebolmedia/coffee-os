/**
 * LocationsService — Prisma-backed implementation.
 *
 * Maps to the `Location` model in `packages/database/prisma/schema.prisma`:
 *   id, organizationId, name, address, city, state, postalCode, country,
 *   phone, email, timezone, active, taxRate, currency.
 *
 * TODO migration: campos de DTO que NO existen aún en el schema y por lo tanto
 * NO se persisten — se eliminaron del DTO y del controller:
 *   - code (string)
 *   - type (enum: flagship | standard | kiosk | food_truck | popup)
 *   - status (enum: active | inactive | coming_soon | temporarily_closed | permanently_closed)
 *     → se mapea SOLO a `active: boolean` (active vs anything-else).
 *   - coordinates (lat/long)
 *   - hours (LocationHours[])
 *   - seating_capacity, max_occupancy
 *   - allow_online_orders, allow_delivery, allow_pickup, allow_dine_in
 *   - address_line_2, manager_id, opening_date, image_url, notes
 *   - findByCode endpoint (deprecated por ausencia de `code`)
 *
 * Cuando se agreguen estos campos al schema, ampliar este service.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLocationDto, QueryLocationsDto, UpdateLocationDto } from './dto';
import { Location, LocationStats } from './interfaces';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Convert a Prisma Location row to the public Location interface. */
  private toLocation(row: any): Location {
    return {
      id: row.id,
      organization_id: row.organizationId,
      name: row.name,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      postal_code: row.postalCode ?? undefined,
      country: row.country,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      timezone: row.timezone,
      active: row.active,
      tax_rate: row.taxRate,
      currency: row.currency,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async create(createDto: CreateLocationDto): Promise<Location> {
    const created = await this.prisma.location.create({
      data: {
        organizationId: createDto.organization_id,
        name: createDto.name,
        address: createDto.address,
        city: createDto.city,
        state: createDto.state,
        postalCode: createDto.postal_code,
        country: createDto.country ?? 'MX',
        phone: createDto.phone,
        email: createDto.email,
        timezone: createDto.timezone ?? 'America/Mexico_City',
        taxRate: createDto.tax_rate ?? 0.16,
        currency: createDto.currency ?? 'MXN',
        active: createDto.active ?? true,
      },
    });
    return this.toLocation(created);
  }

  async findAll(query: QueryLocationsDto): Promise<Location[]> {
    const where: any = {};

    if (query.organization_id) {
      where.organizationId = query.organization_id;
    }
    if (query.active !== undefined) {
      where.active = query.active;
    }
    if (query.city) {
      where.city = { equals: query.city, mode: 'insensitive' };
    }
    if (query.state) {
      where.state = { equals: query.state, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sort_by || 'name';
    const order: 'asc' | 'desc' = query.order || 'asc';
    const orderBy: any = { [this.mapSortField(sortBy)]: order };

    const rows = await this.prisma.location.findMany({ where, orderBy });
    return rows.map((r) => this.toLocation(r));
  }

  /** Map external sort field names to Prisma column names. */
  private mapSortField(field: string): string {
    switch (field) {
      case 'created_at':
        return 'createdAt';
      case 'updated_at':
        return 'updatedAt';
      case 'postal_code':
        return 'postalCode';
      default:
        return field;
    }
  }

  async findById(id: string): Promise<Location> {
    const row = await this.prisma.location.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return this.toLocation(row);
  }

  async update(id: string, updateDto: UpdateLocationDto): Promise<Location> {
    await this.findById(id); // throws if not found

    const data: any = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.address !== undefined) data.address = updateDto.address;
    if (updateDto.city !== undefined) data.city = updateDto.city;
    if (updateDto.state !== undefined) data.state = updateDto.state;
    if (updateDto.postal_code !== undefined)
      data.postalCode = updateDto.postal_code;
    if (updateDto.country !== undefined) data.country = updateDto.country;
    if (updateDto.phone !== undefined) data.phone = updateDto.phone;
    if (updateDto.email !== undefined) data.email = updateDto.email;
    if (updateDto.timezone !== undefined) data.timezone = updateDto.timezone;
    if (updateDto.tax_rate !== undefined) data.taxRate = updateDto.tax_rate;
    if (updateDto.currency !== undefined) data.currency = updateDto.currency;
    if (updateDto.active !== undefined) data.active = updateDto.active;

    const updated = await this.prisma.location.update({
      where: { id },
      data,
    });
    return this.toLocation(updated);
  }

  /** Soft delete: marca active=false en lugar de borrar el registro. */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.location.update({
      where: { id },
      data: { active: false },
    });
  }

  async activate(id: string): Promise<Location> {
    await this.findById(id);
    const updated = await this.prisma.location.update({
      where: { id },
      data: { active: true },
    });
    return this.toLocation(updated);
  }

  async deactivate(id: string): Promise<Location> {
    await this.findById(id);
    const updated = await this.prisma.location.update({
      where: { id },
      data: { active: false },
    });
    return this.toLocation(updated);
  }

  async getStats(organizationId: string): Promise<LocationStats> {
    const [total, activeCount] = await Promise.all([
      this.prisma.location.count({ where: { organizationId } }),
      this.prisma.location.count({ where: { organizationId, active: true } }),
    ]);
    return {
      total_locations: total,
      active_count: activeCount,
      inactive_count: total - activeCount,
    };
  }
}
