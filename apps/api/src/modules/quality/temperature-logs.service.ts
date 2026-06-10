import { Injectable } from '@nestjs/common';
import {
  CreateTemperatureLogDto,
  QueryTemperatureLogsDto,
  TemperatureUnit,
} from './dto';
import { TemperatureLog } from './interfaces';
import { PrismaService } from '../database/prisma.service';

interface TemperatureRange {
  min: number;
  max: number;
}

@Injectable()
export class TemperatureLogsService {
  // NOM-251-SSA1-2009 temperature ranges (in Celsius)
  private readonly temperatureRanges: Record<string, TemperatureRange> = {
    REFRIGERATOR: { min: 0, max: 4 },
    FREEZER: { min: -18, max: -12 },
    HOT_HOLDING: { min: 60, max: 100 },
    COLD_HOLDING: { min: 0, max: 4 },
    COOKING: { min: 74, max: 100 },
    COOLING: { min: 0, max: 4 },
    RECEIVING: { min: 0, max: 7 },
  };

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateTemperatureLogDto): Promise<TemperatureLog> {
    const tempCelsius =
      createDto.unit === TemperatureUnit.FAHRENHEIT
        ? this.fahrenheitToCelsius(createDto.temperature)
        : createDto.temperature;

    const range = this.temperatureRanges[createDto.type];
    const isWithinRange = range
      ? tempCelsius >= range.min && tempCelsius <= range.max
      : true;

    const recordedAt = createDto.recorded_at
      ? new Date(createDto.recorded_at)
      : new Date();

    // QualityLog doesn't have first-class columns for organization_id,
    // subtype (REFRIGERATOR/FREEZER/...), product_name or in_range. Until
    // a migration adds a `metadata: Json` column we serialize the structured
    // fields as JSON inside `notes` so they survive round-trips and are
    // greppable in raw SQL.
    // TODO(schema): add `metadata Json?` to QualityLog and migrate this
    // payload into it; keep `notes` as the user-facing free-text field only.
    const meta = {
      subtype: createDto.type,
      organization_id: createDto.organization_id,
      product_name: createDto.product_name ?? null,
      location_detail: createDto.location_detail ?? null,
      in_range: isWithinRange,
      user_notes: createDto.notes ?? null,
    };

    const record = await this.prisma.qualityLog.create({
      data: {
        locationId: createDto.location_id,
        userId: createDto.recorded_by_user_id,
        type: 'TEMPERATURE',
        value: createDto.temperature,
        unit: createDto.unit,
        equipment: createDto.equipment_name,
        notes: JSON.stringify(meta),
        recordedAt,
      },
    });

    return this.toTemperatureLog(record, createDto, isWithinRange, recordedAt);
  }

  async findAll(query: QueryTemperatureLogsDto): Promise<TemperatureLog[]> {
    const where: any = { type: 'TEMPERATURE' };

    if (query.location_id) {
      where.locationId = query.location_id;
    }

    if (query.equipment_name) {
      where.equipment = { contains: query.equipment_name, mode: 'insensitive' };
    }

    if (query.start_date || query.end_date) {
      where.recordedAt = {};
      if (query.start_date) where.recordedAt.gte = new Date(query.start_date);
      if (query.end_date) where.recordedAt.lte = new Date(query.end_date);
    }

    const records = await this.prisma.qualityLog.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    });

    let logs = records.map((r) => this.parseQualityLog(r));

    // Post-filter fields encoded in notes (organization_id, type, alert)
    if (query.organization_id) {
      logs = logs.filter((l) => l.organization_id === query.organization_id);
    }

    if (query.type) {
      logs = logs.filter((l) => l.type === query.type);
    }

    return logs;
  }

  async findOne(id: string): Promise<TemperatureLog | null> {
    const record = await this.prisma.qualityLog.findUnique({ where: { id } });
    if (!record || record.type !== 'TEMPERATURE') return null;
    return this.parseQualityLog(record);
  }

  async getAlerts(
    organizationId: string,
    locationId?: string,
  ): Promise<TemperatureLog[]> {
    const where: any = { type: 'TEMPERATURE' };
    if (locationId) where.locationId = locationId;

    const records = await this.prisma.qualityLog.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    });

    return records
      .map((r) => this.parseQualityLog(r))
      .filter(
        (l) =>
          l.alert_triggered &&
          (!organizationId || l.organization_id === organizationId),
      );
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    const where: any = { type: 'TEMPERATURE' };
    if (locationId) where.locationId = locationId;

    const records = await this.prisma.qualityLog.findMany({ where });
    const logs = records
      .map((r) => this.parseQualityLog(r))
      .filter((l) => !organizationId || l.organization_id === organizationId);

    const total = logs.length;
    const alerts = logs.filter((l) => l.alert_triggered).length;
    const compliant = total - alerts;
    const complianceRate =
      total > 0 ? Math.round((compliant / total) * 100) : 0;

    const byType = logs.reduce(
      (acc, l) => {
        if (!acc[l.type]) acc[l.type] = { total: 0, alerts: 0 };
        acc[l.type].total += 1;
        if (l.alert_triggered) acc[l.type].alerts += 1;
        return acc;
      },
      {} as Record<string, { total: number; alerts: number }>,
    );

    return {
      total,
      alerts,
      compliant,
      compliance_rate: complianceRate,
      by_type: byType,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.qualityLog.delete({ where: { id } });
  }

  // Parses a QualityLog Prisma record back into the TemperatureLog interface.
  // Supports both the new JSON-encoded `notes` (preferred) and the legacy
  // pipe-separated key:value format for forward compatibility while older
  // rows still exist.
  private parseQualityLog(record: any): TemperatureLog {
    const raw: string = record.notes ?? '';

    let subtype: string | undefined;
    let organizationId = '';
    let productName: string | undefined;
    let locationDetail: string | undefined;
    let userNotes: string | undefined;
    let isWithinRange = true;

    if (raw.trim().startsWith('{')) {
      // New format: JSON.
      try {
        const meta = JSON.parse(raw);
        subtype = meta.subtype;
        organizationId = meta.organization_id ?? '';
        productName = meta.product_name ?? undefined;
        locationDetail = meta.location_detail ?? undefined;
        userNotes = meta.user_notes ?? undefined;
        isWithinRange = meta.in_range !== false;
      } catch {
        // Fallthrough to legacy parser on malformed JSON.
      }
    }

    if (!subtype) {
      // Legacy pipe-separated parser kept for backward compatibility.
      const parts = raw.split('|');
      const plainNotes: string[] = [];
      const meta: Record<string, string> = {};
      parts.forEach((part: string) => {
        const colonIdx = part.indexOf(':');
        if (colonIdx > -1) {
          const key = part.slice(0, colonIdx);
          const val = part.slice(colonIdx + 1);
          if (
            ['product', 'detail', 'subtype', 'org', 'in_range'].includes(key)
          ) {
            meta[key] = val;
          } else {
            plainNotes.push(part);
          }
        } else if (part) {
          plainNotes.push(part);
        }
      });
      subtype = meta['subtype'];
      organizationId = organizationId || (meta['org'] ?? '');
      productName = productName ?? meta['product'];
      locationDetail = locationDetail ?? meta['detail'];
      isWithinRange = meta['in_range'] !== 'false';
      if (!userNotes && plainNotes.length > 0) userNotes = plainNotes.join(' ');
    }

    return {
      id: record.id,
      location_id: record.locationId,
      organization_id: organizationId,
      type: (subtype as any) ?? 'REFRIGERATOR',
      temperature: record.value,
      unit: record.unit as any,
      equipment_name: record.equipment ?? '',
      product_name: productName,
      location_detail: locationDetail,
      recorded_by_user_id: record.userId,
      recorded_at: record.recordedAt,
      notes: userNotes || undefined,
      is_within_range: isWithinRange,
      alert_triggered: !isWithinRange,
      created_at: record.recordedAt,
    };
  }

  private toTemperatureLog(
    record: any,
    dto: CreateTemperatureLogDto,
    isWithinRange: boolean,
    recordedAt: Date,
  ): TemperatureLog {
    return {
      id: record.id,
      location_id: dto.location_id,
      organization_id: dto.organization_id,
      type: dto.type,
      temperature: dto.temperature,
      unit: dto.unit,
      equipment_name: dto.equipment_name,
      product_name: dto.product_name,
      location_detail: dto.location_detail,
      recorded_by_user_id: dto.recorded_by_user_id,
      recorded_at: recordedAt,
      notes: dto.notes,
      is_within_range: isWithinRange,
      alert_triggered: !isWithinRange,
      created_at: recordedAt,
    };
  }

  private fahrenheitToCelsius(fahrenheit: number): number {
    return ((fahrenheit - 32) * 5) / 9;
  }
}
