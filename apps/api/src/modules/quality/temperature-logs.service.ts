import { Injectable } from '@nestjs/common';
import { CreateTemperatureLogDto, QueryTemperatureLogsDto, TemperatureUnit } from './dto';
import { TemperatureLog } from './interfaces';

interface TemperatureRange {
  min: number;
  max: number;
  unit: string;
}

@Injectable()
export class TemperatureLogsService {
  private logs: Map<string, TemperatureLog> = new Map();

  // NOM-251-SSA1-2009 temperature ranges (in Celsius)
  private readonly temperatureRanges: Record<string, TemperatureRange> = {
    REFRIGERATOR: { min: 0, max: 4, unit: 'CELSIUS' },
    FREEZER: { min: -18, max: -12, unit: 'CELSIUS' },
    HOT_HOLDING: { min: 60, max: 100, unit: 'CELSIUS' },
    COLD_HOLDING: { min: 0, max: 4, unit: 'CELSIUS' },
    COOKING: { min: 74, max: 100, unit: 'CELSIUS' },
    COOLING: { min: 0, max: 4, unit: 'CELSIUS' },
    RECEIVING: { min: 0, max: 7, unit: 'CELSIUS' },
  };

  async create(createDto: CreateTemperatureLogDto): Promise<TemperatureLog> {
    const id = this.generateId();
    const now = new Date();

    // Convert to Celsius if needed
    const tempCelsius =
      createDto.unit === 'FAHRENHEIT'
        ? this.fahrenheitToCelsius(createDto.temperature)
        : createDto.temperature;

    // Check if temperature is within safe range
    const range = this.temperatureRanges[createDto.type];
    const isWithinRange = tempCelsius >= range.min && tempCelsius <= range.max;
    const alertTriggered = !isWithinRange;

    const log: TemperatureLog = {
      id,
      location_id: createDto.location_id,
      organization_id: createDto.organization_id,
      type: createDto.type,
      temperature: createDto.temperature,
      unit: createDto.unit,
      equipment_name: createDto.equipment_name,
      product_name: createDto.product_name,
      location_detail: createDto.location_detail,
      recorded_by_user_id: createDto.recorded_by_user_id,
      recorded_at: createDto.recorded_at ? new Date(createDto.recorded_at) : now,
      notes: createDto.notes,
      is_within_range: isWithinRange,
      alert_triggered: alertTriggered,
      created_at: now,
    };

    this.logs.set(id, log);
    return log;
  }

  async findAll(query: QueryTemperatureLogsDto): Promise<TemperatureLog[]> {
    let logs = Array.from(this.logs.values());

    if (query.location_id) {
      logs = logs.filter((l) => l.location_id === query.location_id);
    }

    if (query.organization_id) {
      logs = logs.filter((l) => l.organization_id === query.organization_id);
    }

    if (query.type) {
      logs = logs.filter((l) => l.type === query.type);
    }

    if (query.equipment_name) {
      logs = logs.filter((l) =>
        l.equipment_name.toLowerCase().includes(query.equipment_name.toLowerCase()),
      );
    }

    if (query.start_date) {
      const startDate = new Date(query.start_date);
      logs = logs.filter((l) => l.recorded_at >= startDate);
    }

    if (query.end_date) {
      const endDate = new Date(query.end_date);
      logs = logs.filter((l) => l.recorded_at <= endDate);
    }

    return logs.sort((a, b) => b.recorded_at.getTime() - a.recorded_at.getTime());
  }

  async findOne(id: string): Promise<TemperatureLog | null> {
    return this.logs.get(id) || null;
  }

  async getAlerts(organizationId: string, locationId?: string): Promise<TemperatureLog[]> {
    let logs = Array.from(this.logs.values()).filter(
      (l) => l.organization_id === organizationId && l.alert_triggered,
    );

    if (locationId) {
      logs = logs.filter((l) => l.location_id === locationId);
    }

    return logs.sort((a, b) => b.recorded_at.getTime() - a.recorded_at.getTime());
  }

  async getStats(organizationId: string, locationId?: string): Promise<any> {
    let logs = Array.from(this.logs.values()).filter(
      (l) => l.organization_id === organizationId,
    );

    if (locationId) {
      logs = logs.filter((l) => l.location_id === locationId);
    }

    const total = logs.length;
    const alerts = logs.filter((l) => l.alert_triggered).length;
    const compliant = total - alerts;
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

    const byType = logs.reduce((acc, l) => {
      if (!acc[l.type]) {
        acc[l.type] = { total: 0, alerts: 0 };
      }
      acc[l.type].total += 1;
      if (l.alert_triggered) {
        acc[l.type].alerts += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; alerts: number }>);

    return {
      total,
      alerts,
      compliant,
      compliance_rate: complianceRate,
      by_type: byType,
    };
  }

  async delete(id: string): Promise<void> {
    this.logs.delete(id);
  }

  private fahrenheitToCelsius(fahrenheit: number): number {
    return ((fahrenheit - 32) * 5) / 9;
  }

  private generateId(): string {
    return `templog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
