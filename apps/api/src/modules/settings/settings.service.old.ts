import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Setting, SettingsStats, SettingType, SettingCategory } from './interfaces';
import { CreateSettingDto, UpdateSettingDto, QuerySettingsDto } from './dto';

@Injectable()
export class SettingsService {
  private readonly settings = new Map<string, Setting>();

  async create(dto: CreateSettingDto): Promise<Setting> {
    // Check key uniqueness per org+category
    const existing = Array.from(this.settings.values()).find(
      (s) =>
        s.organization_id === dto.organization_id &&
        s.category === dto.category &&
        s.key === dto.key,
    );
    if (existing) {
      throw new ConflictException(
        `Setting ${dto.category}.${dto.key} already exists`,
      );
    }

    // Validate value type
    this.validateValue(dto.type, dto.value);

    const setting: Setting = {
      id: `set-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      organization_id: dto.organization_id,
      category: dto.category,
      key: dto.key,
      type: dto.type,
      value: dto.value,
      default_value: dto.default_value,
      description: dto.description,
      is_public: dto.is_public ?? false,
      is_readonly: dto.is_readonly ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.settings.set(setting.id, setting);
    return setting;
  }

  async findAll(query: QuerySettingsDto): Promise<Setting[]> {
    let arr = Array.from(this.settings.values());

    if (query.organization_id) {
      arr = arr.filter((s) => s.organization_id === query.organization_id);
    }

    if (query.category) {
      arr = arr.filter((s) => s.category === query.category);
    }

    if (query.type) {
      arr = arr.filter((s) => s.type === query.type);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      arr = arr.filter(
        (s) =>
          s.key.toLowerCase().includes(search) ||
          (s.description && s.description.toLowerCase().includes(search)),
      );
    }

    // Sort
    const sortBy = query.sort_by || 'key';
    const order = query.order || 'asc';

    arr.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Setting];
      let bValue: any = b[sortBy as keyof Setting];

      if (aValue === undefined)
        aValue = order === 'asc' ? '' : Number.MIN_VALUE;
      if (bValue === undefined)
        bValue = order === 'asc' ? '' : Number.MIN_VALUE;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return arr;
  }

  async findById(id: string): Promise<Setting> {
    const s = this.settings.get(id);
    if (!s) throw new NotFoundException('Setting not found');
    return s;
  }

  async findByKey(
    organizationId: string,
    category: SettingCategory,
    key: string,
  ): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(
      (s) =>
        s.organization_id === organizationId &&
        s.category === category &&
        s.key === key,
    );
  }

  async update(id: string, dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.findById(id);

    // Prevent updating readonly settings
    if (setting.is_readonly) {
      throw new BadRequestException('Setting is readonly');
    }

    // Validate value type if provided
    if (dto.value !== undefined) {
      this.validateValue(setting.type, dto.value);
    }

    Object.assign(setting, {
      ...dto,
      updated_at: new Date(),
    });

    this.settings.set(id, setting);
    return setting;
  }

  async delete(id: string): Promise<void> {
    const setting = await this.findById(id);

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot delete readonly setting');
    }

    this.settings.delete(id);
  }

  async resetToDefault(id: string): Promise<Setting> {
    const setting = await this.findById(id);

    if (setting.is_readonly) {
      throw new BadRequestException('Cannot reset readonly setting');
    }

    if (setting.default_value === undefined) {
      throw new BadRequestException('Setting has no default value');
    }

    setting.value = setting.default_value;
    setting.updated_at = new Date();
    this.settings.set(id, setting);
    return setting;
  }

  async getStats(organizationId: string): Promise<SettingsStats> {
    const arr = Array.from(this.settings.values()).filter(
      (s) => s.organization_id === organizationId,
    );

    const by_category: Partial<Record<SettingCategory, number>> = {};
    const by_type: Partial<Record<SettingType, number>> = {};
    let public_count = 0;
    let readonly_count = 0;

    arr.forEach((s) => {
      by_category[s.category] = (by_category[s.category] || 0) + 1;
      by_type[s.type] = (by_type[s.type] || 0) + 1;
      if (s.is_public) public_count++;
      if (s.is_readonly) readonly_count++;
    });

    return {
      total: arr.length,
      by_category,
      by_type,
      public_count,
      readonly_count,
    };
  }

  // Helper for type validation
  private validateValue(type: SettingType, value: any): void {
    switch (type) {
      case SettingType.STRING:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string');
        }
        break;
      case SettingType.NUMBER:
        if (typeof value !== 'number') {
          throw new BadRequestException('Value must be a number');
        }
        break;
      case SettingType.BOOLEAN:
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Value must be a boolean');
        }
        break;
      case SettingType.JSON:
        // JSON can be object or array
        if (typeof value !== 'object' || value === null) {
          throw new BadRequestException('Value must be a JSON object or array');
        }
        break;
    }
  }
}
