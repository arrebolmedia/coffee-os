import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSupplierDto, SupplierStatus } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { Supplier, SupplierStats } from './interfaces';

@Injectable()
export class SuppliersService {
  private readonly suppliers = new Map<string, Supplier>();

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const existing = Array.from(this.suppliers.values()).find(
      (s) =>
        s.code === createSupplierDto.code &&
        s.organization_id === createSupplierDto.organization_id,
    );

    if (existing) {
      throw new ConflictException(
        `Supplier with code ${createSupplierDto.code} already exists in this organization`,
      );
    }

    const supplier: Supplier = {
      id: `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...createSupplierDto,
      status: createSupplierDto.status || SupplierStatus.ACTIVE,
      on_time_delivery_rate: createSupplierDto.rating ? 85 : undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async findAll(query: QuerySuppliersDto): Promise<Supplier[]> {
    let suppliers = Array.from(this.suppliers.values());

    if (query.organization_id) {
      suppliers = suppliers.filter(
        (s) => s.organization_id === query.organization_id,
      );
    }

    if (query.status) {
      suppliers = suppliers.filter((s) => s.status === query.status);
    }

    if (query.is_preferred !== undefined) {
      suppliers = suppliers.filter(
        (s) => s.is_preferred === query.is_preferred,
      );
    }

    if (query.min_rating !== undefined) {
      suppliers = suppliers.filter(
        (s) => s.rating !== undefined && s.rating >= query.min_rating!,
      );
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      suppliers = suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.code.toLowerCase().includes(search) ||
          s.legal_name?.toLowerCase().includes(search) ||
          s.contact_person?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search),
      );
    }

    const sortBy = query.sort_by || 'name';
    const order = query.order || 'asc';

    suppliers.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Supplier];
      let bValue: any = b[sortBy as keyof Supplier];

      if (aValue === undefined) aValue = order === 'asc' ? '' : Number.MIN_VALUE;
      if (bValue === undefined) bValue = order === 'asc' ? '' : Number.MIN_VALUE;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return suppliers;
  }

  async findById(id: string): Promise<Supplier> {
    const supplier = this.suppliers.get(id);
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<Supplier | undefined> {
    return Array.from(this.suppliers.values()).find(
      (s) => s.organization_id === organizationId && s.code === code,
    );
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findById(id);

    if (
      updateSupplierDto.code &&
      updateSupplierDto.code !== supplier.code
    ) {
      const existing = await this.findByCode(
        supplier.organization_id,
        updateSupplierDto.code,
      );
      if (existing) {
        throw new ConflictException(
          `Supplier with code ${updateSupplierDto.code} already exists in this organization`,
        );
      }
    }

    const updatedSupplier: Supplier = {
      ...supplier,
      ...updateSupplierDto,
      updated_at: new Date(),
    };

    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async delete(id: string): Promise<void> {
    const supplier = await this.findById(id);
    this.suppliers.delete(supplier.id);
  }

  async updateRating(
    id: string,
    rating: number,
    onTimeDeliveryRate?: number,
  ): Promise<Supplier> {
    if (rating < 0 || rating > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    if (
      onTimeDeliveryRate !== undefined &&
      (onTimeDeliveryRate < 0 || onTimeDeliveryRate > 100)
    ) {
      throw new BadRequestException(
        'On-time delivery rate must be between 0 and 100',
      );
    }

    const supplier = await this.findById(id);

    const updatedSupplier: Supplier = {
      ...supplier,
      rating,
      on_time_delivery_rate:
        onTimeDeliveryRate !== undefined
          ? onTimeDeliveryRate
          : supplier.on_time_delivery_rate,
      updated_at: new Date(),
    };

    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async getStats(organizationId: string): Promise<SupplierStats> {
    const suppliers = Array.from(this.suppliers.values()).filter(
      (s) => s.organization_id === organizationId,
    );

    const byStatus: Record<SupplierStatus, number> = {
      [SupplierStatus.ACTIVE]: 0,
      [SupplierStatus.INACTIVE]: 0,
      [SupplierStatus.SUSPENDED]: 0,
    };

    let totalRating = 0;
    let ratedCount = 0;
    let preferredCount = 0;

    suppliers.forEach((supplier) => {
      byStatus[supplier.status]++;

      if (supplier.rating !== undefined) {
        totalRating += supplier.rating;
        ratedCount++;
      }

      if (supplier.is_preferred) {
        preferredCount++;
      }
    });

    return {
      total_suppliers: suppliers.length,
      by_status: byStatus,
      preferred_count: preferredCount,
      average_rating: ratedCount > 0 ? totalRating / ratedCount : 0,
    };
  }
}
