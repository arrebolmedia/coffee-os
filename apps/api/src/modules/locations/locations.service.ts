import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationsDto,
} from './dto';
import {
  Location,
  LocationStatus,
  LocationType,
  LocationStats,
} from './interfaces';

@Injectable()
export class LocationsService {
  private readonly locations = new Map<string, Location>();

  async create(createDto: CreateLocationDto): Promise<Location> {
    const existing = Array.from(this.locations.values()).find(
      (loc) =>
        loc.code === createDto.code &&
        loc.organization_id === createDto.organization_id,
    );

    if (existing) {
      throw new ConflictException(
        `Location with code ${createDto.code} already exists in this organization`,
      );
    }

    const location: Location = {
      id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...createDto,
      status: createDto.status || LocationStatus.ACTIVE,
      allow_online_orders: createDto.allow_online_orders ?? true,
      allow_delivery: createDto.allow_delivery ?? false,
      allow_pickup: createDto.allow_pickup ?? true,
      allow_dine_in: createDto.allow_dine_in ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.locations.set(location.id, location);
    return location;
  }

  async findAll(query: QueryLocationsDto): Promise<Location[]> {
    let locations = Array.from(this.locations.values());

    if (query.organization_id) {
      locations = locations.filter(
        (loc) => loc.organization_id === query.organization_id,
      );
    }

    if (query.status) {
      locations = locations.filter((loc) => loc.status === query.status);
    }

    if (query.type) {
      locations = locations.filter((loc) => loc.type === query.type);
    }

    if (query.allow_online_orders !== undefined) {
      locations = locations.filter(
        (loc) => loc.allow_online_orders === query.allow_online_orders,
      );
    }

    if (query.allow_delivery !== undefined) {
      locations = locations.filter(
        (loc) => loc.allow_delivery === query.allow_delivery,
      );
    }

    if (query.city) {
      locations = locations.filter(
        (loc) => loc.city.toLowerCase() === query.city!.toLowerCase(),
      );
    }

    if (query.state) {
      locations = locations.filter(
        (loc) => loc.state.toLowerCase() === query.state!.toLowerCase(),
      );
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      locations = locations.filter(
        (loc) =>
          loc.name.toLowerCase().includes(search) ||
          loc.code.toLowerCase().includes(search) ||
          loc.city.toLowerCase().includes(search) ||
          loc.address.toLowerCase().includes(search),
      );
    }

    const sortBy = query.sort_by || 'name';
    const order = query.order || 'asc';

    locations.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Location];
      let bValue: any = b[sortBy as keyof Location];

      if (aValue === undefined) aValue = order === 'asc' ? '' : Number.MIN_VALUE;
      if (bValue === undefined) bValue = order === 'asc' ? '' : Number.MIN_VALUE;

      if (aValue instanceof Date && bValue instanceof Date) {
        return order === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

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

    return locations;
  }

  async findById(id: string): Promise<Location> {
    const location = this.locations.get(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<Location | undefined> {
    return Array.from(this.locations.values()).find(
      (loc) => loc.organization_id === organizationId && loc.code === code,
    );
  }

  async update(id: string, updateDto: UpdateLocationDto): Promise<Location> {
    const location = await this.findById(id);

    if (updateDto.code && updateDto.code !== location.code) {
      const existing = await this.findByCode(
        location.organization_id,
        updateDto.code,
      );
      if (existing) {
        throw new ConflictException(
          `Location with code ${updateDto.code} already exists in this organization`,
        );
      }
    }

    const updatedLocation: Location = {
      ...location,
      ...updateDto,
      updated_at: new Date(),
    };

    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async delete(id: string): Promise<void> {
    const location = await this.findById(id);
    this.locations.delete(location.id);
  }

  async activate(id: string): Promise<Location> {
    const location = await this.findById(id);

    const updatedLocation: Location = {
      ...location,
      status: LocationStatus.ACTIVE,
      updated_at: new Date(),
    };

    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deactivate(id: string): Promise<Location> {
    const location = await this.findById(id);

    const updatedLocation: Location = {
      ...location,
      status: LocationStatus.INACTIVE,
      updated_at: new Date(),
    };

    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async updateHours(
    id: string,
    hours: any[],
  ): Promise<Location> {
    const location = await this.findById(id);

    if (hours.length > 7) {
      throw new BadRequestException('Cannot have more than 7 hours entries (one per day)');
    }

    const updatedLocation: Location = {
      ...location,
      hours,
      updated_at: new Date(),
    };

    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async getStats(organizationId: string): Promise<LocationStats> {
    const locations = Array.from(this.locations.values()).filter(
      (loc) => loc.organization_id === organizationId,
    );

    const byStatus: Record<LocationStatus, number> = {
      [LocationStatus.ACTIVE]: 0,
      [LocationStatus.INACTIVE]: 0,
      [LocationStatus.COMING_SOON]: 0,
      [LocationStatus.TEMPORARILY_CLOSED]: 0,
      [LocationStatus.PERMANENTLY_CLOSED]: 0,
    };

    const byType: Record<LocationType, number> = {
      [LocationType.FLAGSHIP]: 0,
      [LocationType.STANDARD]: 0,
      [LocationType.KIOSK]: 0,
      [LocationType.FOOD_TRUCK]: 0,
      [LocationType.POPUP]: 0,
    };

    let activeCount = 0;

    locations.forEach((location) => {
      byStatus[location.status]++;
      byType[location.type]++;

      if (location.status === LocationStatus.ACTIVE) {
        activeCount++;
      }
    });

    return {
      total_locations: locations.length,
      by_status: byStatus,
      by_type: byType,
      active_count: activeCount,
    };
  }
}
