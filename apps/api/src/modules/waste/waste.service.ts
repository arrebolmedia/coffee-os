import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Prisma,
  SustainabilityMetric as PrismaSustainabilityMetric,
  SustainabilityTarget as PrismaSustainabilityTarget,
  WasteLog as PrismaWasteLog,
} from '@prisma/client';
import {
  DisposalMethod,
  SustainabilityMetric,
  SustainabilityMetricType,
  SustainabilityReport,
  SustainabilityTarget,
  WasteCategory,
  WasteLog,
  WasteReason,
  WasteStats,
} from './interfaces/waste.interface';
import {
  CreateSustainabilityMetricDto,
  CreateSustainabilityTargetDto,
  CreateWasteLogDto,
  QueryWasteLogsDto,
  UpdateWasteLogDto,
} from './dto';
import { PrismaService } from '../database/prisma.service';

/**
 * Servicio para gestión de desperdicios y sostenibilidad
 *
 * Persistido en Prisma (antes 3 Maps en memoria — los registros de waste,
 * incluido el impacto financiero total_cost, se perdían al reiniciar).
 */
@Injectable()
export class WasteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ==================== MAPPERS ====================
   *
   * Convierten una fila Prisma (camelCase, null para opcionales) a la forma
   * de la interfaz pública (snake_case, undefined para opcionales). Los valores
   * string de los enums pasan sin cambios (la DB guarda 'food'/'expired'/etc.),
   * por eso casteamos las columnas string de vuelta a los tipos enum.
   */
  private toApiWasteLog(row: PrismaWasteLog): WasteLog {
    return {
      id: row.id,
      organization_id: row.organizationId,
      location_id: row.locationId ?? undefined,
      inventory_item_id: row.inventoryItemId ?? undefined,
      product_id: row.productId ?? undefined,
      item_name: row.itemName,
      category: row.category as WasteCategory,
      reason: row.reason as WasteReason,
      quantity: row.quantity,
      unit: row.unit,
      cost_per_unit: row.costPerUnit ?? undefined,
      total_cost: row.totalCost ?? undefined,
      disposal_method: row.disposalMethod as DisposalMethod,
      disposal_date: row.disposalDate ?? undefined,
      recorded_by: row.recordedBy,
      notes: row.notes ?? undefined,
      image_url: row.imageUrl ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiMetric(row: PrismaSustainabilityMetric): SustainabilityMetric {
    return {
      id: row.id,
      organization_id: row.organizationId,
      location_id: row.locationId ?? undefined,
      metric_type: row.metricType as SustainabilityMetricType,
      value: row.value,
      unit: row.unit,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      notes: row.notes ?? undefined,
      source: row.source ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiTarget(row: PrismaSustainabilityTarget): SustainabilityTarget {
    return {
      id: row.id,
      organization_id: row.organizationId,
      location_id: row.locationId ?? undefined,
      metric_type: row.metricType as SustainabilityMetricType,
      target_value: row.targetValue,
      current_value: row.currentValue ?? undefined,
      unit: row.unit,
      start_date: row.startDate,
      end_date: row.endDate,
      is_active: row.isActive,
      achieved: row.achieved,
      achieved_at: row.achievedAt ?? undefined,
      description: row.description ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  /**
   * ==================== WASTE LOGS ====================
   */

  /**
   * Crear un registro de desperdicio
   */
  async createWasteLog(dto: CreateWasteLogDto): Promise<WasteLog> {
    // Calculate total cost if cost_per_unit is provided
    const total_cost = dto.cost_per_unit
      ? dto.cost_per_unit * dto.quantity
      : null;

    const row = await this.prisma.wasteLog.create({
      data: {
        organizationId: dto.organization_id,
        locationId: dto.location_id ?? null,
        inventoryItemId: dto.inventory_item_id ?? null,
        productId: dto.product_id ?? null,
        itemName: dto.item_name,
        category: dto.category,
        reason: dto.reason,
        quantity: dto.quantity,
        unit: dto.unit,
        costPerUnit: dto.cost_per_unit ?? null,
        totalCost: total_cost,
        disposalMethod: dto.disposal_method,
        disposalDate: dto.disposal_date ?? null,
        recordedBy: dto.recorded_by,
        notes: dto.notes ?? null,
        imageUrl: dto.image_url ?? null,
      },
    });

    return this.toApiWasteLog(row);
  }

  /**
   * Obtener todos los waste logs (con filtros opcionales)
   */
  async findAllWasteLogs(query?: QueryWasteLogsDto): Promise<WasteLog[]> {
    const where: Prisma.WasteLogWhereInput = {};

    if (query) {
      if (query.organization_id) {
        where.organizationId = query.organization_id;
      }
      if (query.location_id) {
        where.locationId = query.location_id;
      }
      if (query.category) {
        where.category = query.category;
      }
      if (query.reason) {
        where.reason = query.reason;
      }
      if (query.disposal_method) {
        where.disposalMethod = query.disposal_method;
      }
      if (query.start_date || query.end_date) {
        where.createdAt = {};
        if (query.start_date) {
          where.createdAt.gte = new Date(query.start_date);
        }
        if (query.end_date) {
          where.createdAt.lte = new Date(query.end_date);
        }
      }
    }

    const rows = await this.prisma.wasteLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toApiWasteLog(row));
  }

  /**
   * Obtener un waste log por ID
   */
  async findWasteLogById(id: string): Promise<WasteLog> {
    const row = await this.prisma.wasteLog.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`WasteLog with ID ${id} not found`);
    }
    return this.toApiWasteLog(row);
  }

  /**
   * Actualizar un waste log
   */
  async updateWasteLog(id: string, dto: UpdateWasteLogDto): Promise<WasteLog> {
    const wasteLog = await this.findWasteLogById(id);

    // Recalculate total cost if quantity or cost_per_unit changed
    let total_cost = wasteLog.total_cost;
    if (dto.quantity !== undefined || dto.cost_per_unit !== undefined) {
      const quantity = dto.quantity ?? wasteLog.quantity;
      const cost_per_unit = dto.cost_per_unit ?? wasteLog.cost_per_unit;
      total_cost = cost_per_unit ? cost_per_unit * quantity : undefined;
    }

    const data: Prisma.WasteLogUpdateInput = {
      totalCost: total_cost ?? null,
    };

    if (dto.organization_id !== undefined)
      data.organizationId = dto.organization_id;
    if (dto.location_id !== undefined) data.locationId = dto.location_id;
    if (dto.inventory_item_id !== undefined)
      data.inventoryItemId = dto.inventory_item_id;
    if (dto.product_id !== undefined) data.productId = dto.product_id;
    if (dto.item_name !== undefined) data.itemName = dto.item_name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.cost_per_unit !== undefined) data.costPerUnit = dto.cost_per_unit;
    if (dto.disposal_method !== undefined)
      data.disposalMethod = dto.disposal_method;
    if (dto.disposal_date !== undefined) data.disposalDate = dto.disposal_date;
    if (dto.recorded_by !== undefined) data.recordedBy = dto.recorded_by;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.image_url !== undefined) data.imageUrl = dto.image_url;

    const row = await this.prisma.wasteLog.update({ where: { id }, data });
    return this.toApiWasteLog(row);
  }

  /**
   * Eliminar un waste log
   */
  async deleteWasteLog(id: string): Promise<void> {
    await this.findWasteLogById(id);
    await this.prisma.wasteLog.delete({ where: { id } });
  }

  /**
   * Obtener estadísticas de desperdicio
   */
  async getWasteStats(organization_id: string): Promise<WasteStats> {
    const logs = await this.findAllWasteLogs({ organization_id });

    // Initialize counters
    const by_category: Record<WasteCategory, number> = {
      [WasteCategory.FOOD]: 0,
      [WasteCategory.BEVERAGE]: 0,
      [WasteCategory.PACKAGING]: 0,
      [WasteCategory.PAPER]: 0,
      [WasteCategory.PLASTIC]: 0,
      [WasteCategory.GLASS]: 0,
      [WasteCategory.METAL]: 0,
      [WasteCategory.ORGANIC]: 0,
      [WasteCategory.HAZARDOUS]: 0,
      [WasteCategory.OTHER]: 0,
    };

    const by_reason: Record<WasteReason, number> = {
      [WasteReason.EXPIRED]: 0,
      [WasteReason.DAMAGED]: 0,
      [WasteReason.OVERPRODUCTION]: 0,
      [WasteReason.SPILLAGE]: 0,
      [WasteReason.CUSTOMER_RETURN]: 0,
      [WasteReason.QUALITY_ISSUE]: 0,
      [WasteReason.PREPARATION_ERROR]: 0,
      [WasteReason.EQUIPMENT_FAILURE]: 0,
      [WasteReason.OTHER]: 0,
    };

    const by_disposal: Record<DisposalMethod, number> = {
      [DisposalMethod.TRASH]: 0,
      [DisposalMethod.RECYCLING]: 0,
      [DisposalMethod.COMPOST]: 0,
      [DisposalMethod.DONATION]: 0,
      [DisposalMethod.BIODIGESTER]: 0,
      [DisposalMethod.INCINERATION]: 0,
      [DisposalMethod.SPECIAL_HANDLING]: 0,
    };

    let total_cost = 0;
    let total_weight_kg = 0;
    const items_map = new Map<string, { quantity: number; cost: number }>();

    for (const log of logs) {
      by_category[log.category]++;
      by_reason[log.reason]++;
      by_disposal[log.disposal_method]++;

      if (log.total_cost) {
        total_cost += log.total_cost;
      }

      // Assume quantity is in kg (or convert if unit is different)
      if (log.unit === 'kg') {
        total_weight_kg += log.quantity;
      }

      // Track top items
      const existing = items_map.get(log.item_name) || { quantity: 0, cost: 0 };
      items_map.set(log.item_name, {
        quantity: existing.quantity + log.quantity,
        cost: existing.cost + (log.total_cost || 0),
      });
    }

    // Calculate top items
    const top_items = Array.from(items_map.entries())
      .map(([item_name, data]) => ({
        item_name,
        quantity: data.quantity,
        cost: data.cost,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Calculate trends
    const now = new Date();
    const daily = logs.filter(
      (log) => log.created_at >= new Date(now.getTime() - 24 * 60 * 60 * 1000),
    );
    const weekly = logs.filter(
      (log) =>
        log.created_at >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    );
    const monthly = logs.filter(
      (log) =>
        log.created_at >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    return {
      total_logs: logs.length,
      total_cost,
      total_weight_kg,
      by_category,
      by_reason,
      by_disposal,
      top_items,
      trends: {
        daily_average:
          daily.length > 0
            ? daily.reduce((sum, log) => sum + (log.total_cost || 0), 0) /
              daily.length
            : 0,
        weekly_average:
          weekly.length > 0
            ? weekly.reduce((sum, log) => sum + (log.total_cost || 0), 0) /
              weekly.length
            : 0,
        monthly_average:
          monthly.length > 0
            ? monthly.reduce((sum, log) => sum + (log.total_cost || 0), 0) /
              monthly.length
            : 0,
      },
    };
  }

  /**
   * ==================== SUSTAINABILITY METRICS ====================
   */

  /**
   * Crear una métrica de sostenibilidad
   */
  async createMetric(
    dto: CreateSustainabilityMetricDto,
  ): Promise<SustainabilityMetric> {
    const row = await this.prisma.sustainabilityMetric.create({
      data: {
        organizationId: dto.organization_id,
        locationId: dto.location_id ?? null,
        metricType: dto.metric_type,
        value: dto.value,
        unit: dto.unit,
        periodStart: dto.period_start,
        periodEnd: dto.period_end,
        notes: dto.notes ?? null,
        source: dto.source ?? null,
      },
    });

    return this.toApiMetric(row);
  }

  /**
   * Obtener todas las métricas (filtradas)
   */
  async findAllMetrics(
    organization_id?: string,
    metric_type?: SustainabilityMetricType,
  ): Promise<SustainabilityMetric[]> {
    const where: Prisma.SustainabilityMetricWhereInput = {};

    if (organization_id) {
      where.organizationId = organization_id;
    }
    if (metric_type) {
      where.metricType = metric_type;
    }

    const rows = await this.prisma.sustainabilityMetric.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });

    return rows.map((row) => this.toApiMetric(row));
  }

  /**
   * Obtener una métrica por ID
   */
  async findMetricById(id: string): Promise<SustainabilityMetric> {
    const row = await this.prisma.sustainabilityMetric.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Metric with ID ${id} not found`);
    }
    return this.toApiMetric(row);
  }

  /**
   * ==================== SUSTAINABILITY TARGETS ====================
   */

  /**
   * Crear un target de sostenibilidad
   */
  async createTarget(
    dto: CreateSustainabilityTargetDto,
  ): Promise<SustainabilityTarget> {
    const row = await this.prisma.sustainabilityTarget.create({
      data: {
        organizationId: dto.organization_id,
        locationId: dto.location_id ?? null,
        metricType: dto.metric_type,
        targetValue: dto.target_value,
        unit: dto.unit,
        startDate: dto.start_date,
        endDate: dto.end_date,
        isActive: dto.is_active !== false,
        achieved: false,
        description: dto.description ?? null,
      },
    });

    return this.toApiTarget(row);
  }

  /**
   * Obtener todos los targets (filtrados)
   */
  async findAllTargets(
    organization_id?: string,
    is_active?: boolean,
  ): Promise<SustainabilityTarget[]> {
    const where: Prisma.SustainabilityTargetWhereInput = {};

    if (organization_id) {
      where.organizationId = organization_id;
    }
    if (is_active !== undefined) {
      where.isActive = is_active;
    }

    const rows = await this.prisma.sustainabilityTarget.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });

    return rows.map((row) => this.toApiTarget(row));
  }

  /**
   * Obtener un target por ID
   */
  async findTargetById(id: string): Promise<SustainabilityTarget> {
    const row = await this.prisma.sustainabilityTarget.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Target with ID ${id} not found`);
    }
    return this.toApiTarget(row);
  }

  /**
   * Actualizar progreso de un target
   */
  async updateTargetProgress(
    id: string,
    current_value: number,
  ): Promise<SustainabilityTarget> {
    const target = await this.findTargetById(id);

    // Check if target is achieved
    const achieved = current_value >= target.target_value;
    const achieved_at =
      achieved && !target.achieved ? new Date() : target.achieved_at;

    const row = await this.prisma.sustainabilityTarget.update({
      where: { id },
      data: {
        currentValue: current_value,
        achieved,
        achievedAt: achieved_at ?? null,
      },
    });

    return this.toApiTarget(row);
  }

  /**
   * ==================== REPORTS ====================
   */

  /**
   * Generar reporte de sostenibilidad
   */
  async generateSustainabilityReport(
    organization_id: string,
    period_start: Date,
    period_end: Date,
  ): Promise<SustainabilityReport> {
    // Get all metrics for the period
    const allMetrics = await this.findAllMetrics(organization_id);
    const periodMetrics = allMetrics.filter(
      (m) => m.period_start >= period_start && m.period_end <= period_end,
    );

    // Calculate aggregate metrics
    const metrics_by_type = new Map<SustainabilityMetricType, number[]>();
    for (const metric of periodMetrics) {
      const values = metrics_by_type.get(metric.metric_type) || [];
      values.push(metric.value);
      metrics_by_type.set(metric.metric_type, values);
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;

    const metrics = {
      carbon_footprint_kg_co2e: avg(
        metrics_by_type.get(SustainabilityMetricType.CARBON_FOOTPRINT) || [],
      ),
      water_usage_liters: avg(
        metrics_by_type.get(SustainabilityMetricType.WATER_USAGE) || [],
      ),
      energy_consumption_kwh: avg(
        metrics_by_type.get(SustainabilityMetricType.ENERGY_CONSUMPTION) || [],
      ),
      waste_generated_kg: avg(
        metrics_by_type.get(SustainabilityMetricType.WASTE_GENERATED) || [],
      ),
      recycling_rate_percentage: avg(
        metrics_by_type.get(SustainabilityMetricType.RECYCLING_RATE) || [],
      ),
      compost_rate_percentage: avg(
        metrics_by_type.get(SustainabilityMetricType.COMPOST_RATE) || [],
      ),
    };

    // Get active targets
    const targets = await this.findAllTargets(organization_id, true);
    const targets_progress = targets.map((target) => {
      const current_value = target.current_value || 0;
      const progress_percentage = (current_value / target.target_value) * 100;
      const on_track = progress_percentage >= 75; // Threshold: 75% progress
      return {
        metric_type: target.metric_type,
        target_value: target.target_value,
        current_value,
        progress_percentage,
        on_track,
      };
    });

    // Calculate improvements (compare to previous period)
    const previous_period_start = new Date(
      period_start.getTime() - (period_end.getTime() - period_start.getTime()),
    );
    const previous_period_end = period_start;
    const previousMetrics = allMetrics.filter(
      (m) =>
        m.period_start >= previous_period_start &&
        m.period_end <= previous_period_end,
    );

    const previous_by_type = new Map<SustainabilityMetricType, number[]>();
    for (const metric of previousMetrics) {
      const values = previous_by_type.get(metric.metric_type) || [];
      values.push(metric.value);
      previous_by_type.set(metric.metric_type, values);
    }

    const improvements = Array.from(metrics_by_type.entries()).map(
      ([metric_type, current_values]) => {
        const current_avg = avg(current_values);
        const previous_values = previous_by_type.get(metric_type) || [];
        const previous_avg = avg(previous_values);

        const change_percentage =
          previous_avg > 0
            ? ((current_avg - previous_avg) / previous_avg) * 100
            : 0;

        // Determine trend (lower is better for waste/carbon, higher is better for recycling)
        const is_lower_better = [
          SustainabilityMetricType.CARBON_FOOTPRINT,
          SustainabilityMetricType.WASTE_GENERATED,
          SustainabilityMetricType.WATER_USAGE,
          SustainabilityMetricType.ENERGY_CONSUMPTION,
        ].includes(metric_type);

        let trend: 'improving' | 'worsening' | 'stable';
        if (Math.abs(change_percentage) < 5) {
          trend = 'stable';
        } else if (is_lower_better) {
          trend = change_percentage < 0 ? 'improving' : 'worsening';
        } else {
          trend = change_percentage > 0 ? 'improving' : 'worsening';
        }

        return {
          metric_type,
          change_percentage,
          trend,
        };
      },
    );

    return {
      organization_id,
      period_start,
      period_end,
      metrics,
      targets_progress,
      improvements,
    };
  }
}
