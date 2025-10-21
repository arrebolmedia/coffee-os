import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  WasteLog,
  WasteCategory,
  WasteReason,
  DisposalMethod,
  SustainabilityMetric,
  SustainabilityTarget,
  SustainabilityMetricType,
  WasteStats,
  SustainabilityReport,
} from './interfaces/waste.interface';
import {
  CreateWasteLogDto,
  UpdateWasteLogDto,
  CreateSustainabilityMetricDto,
  CreateSustainabilityTargetDto,
  QueryWasteLogsDto,
} from './dto';

/**
 * Servicio para gestión de desperdicios y sostenibilidad
 */
@Injectable()
export class WasteService {
  private wasteLogs: Map<string, WasteLog> = new Map();
  private metrics: Map<string, SustainabilityMetric> = new Map();
  private targets: Map<string, SustainabilityTarget> = new Map();

  /**
   * ==================== WASTE LOGS ====================
   */

  /**
   * Crear un registro de desperdicio
   */
  async createWasteLog(dto: CreateWasteLogDto): Promise<WasteLog> {
    const id = `waste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total cost if cost_per_unit is provided
    const total_cost = dto.cost_per_unit 
      ? dto.cost_per_unit * dto.quantity 
      : undefined;

    const wasteLog: WasteLog = {
      id,
      ...dto,
      total_cost,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.wasteLogs.set(id, wasteLog);
    return wasteLog;
  }

  /**
   * Obtener todos los waste logs (con filtros opcionales)
   */
  async findAllWasteLogs(query?: QueryWasteLogsDto): Promise<WasteLog[]> {
    let logs = Array.from(this.wasteLogs.values());

    if (query) {
      if (query.organization_id) {
        logs = logs.filter((log) => log.organization_id === query.organization_id);
      }
      if (query.location_id) {
        logs = logs.filter((log) => log.location_id === query.location_id);
      }
      if (query.category) {
        logs = logs.filter((log) => log.category === query.category);
      }
      if (query.reason) {
        logs = logs.filter((log) => log.reason === query.reason);
      }
      if (query.disposal_method) {
        logs = logs.filter((log) => log.disposal_method === query.disposal_method);
      }
      if (query.start_date) {
        logs = logs.filter(
          (log) => log.created_at >= new Date(query.start_date!),
        );
      }
      if (query.end_date) {
        logs = logs.filter(
          (log) => log.created_at <= new Date(query.end_date!),
        );
      }
    }

    return logs.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * Obtener un waste log por ID
   */
  async findWasteLogById(id: string): Promise<WasteLog> {
    const wasteLog = this.wasteLogs.get(id);
    if (!wasteLog) {
      throw new NotFoundException(`WasteLog with ID ${id} not found`);
    }
    return wasteLog;
  }

  /**
   * Actualizar un waste log
   */
  async updateWasteLog(
    id: string,
    dto: UpdateWasteLogDto,
  ): Promise<WasteLog> {
    const wasteLog = await this.findWasteLogById(id);

    // Recalculate total cost if quantity or cost_per_unit changed
    let total_cost = wasteLog.total_cost;
    if (dto.quantity !== undefined || dto.cost_per_unit !== undefined) {
      const quantity = dto.quantity ?? wasteLog.quantity;
      const cost_per_unit = dto.cost_per_unit ?? wasteLog.cost_per_unit;
      total_cost = cost_per_unit ? cost_per_unit * quantity : undefined;
    }

    const updated: WasteLog = {
      ...wasteLog,
      ...dto,
      total_cost,
      updated_at: new Date(),
    };

    this.wasteLogs.set(id, updated);
    return updated;
  }

  /**
   * Eliminar un waste log
   */
  async deleteWasteLog(id: string): Promise<void> {
    const wasteLog = await this.findWasteLogById(id);
    this.wasteLogs.delete(id);
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
      (log) =>
        log.created_at >= new Date(now.getTime() - 24 * 60 * 60 * 1000),
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
        daily_average: daily.length > 0 ? daily.reduce((sum, log) => sum + (log.total_cost || 0), 0) / daily.length : 0,
        weekly_average: weekly.length > 0 ? weekly.reduce((sum, log) => sum + (log.total_cost || 0), 0) / weekly.length : 0,
        monthly_average: monthly.length > 0 ? monthly.reduce((sum, log) => sum + (log.total_cost || 0), 0) / monthly.length : 0,
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
    const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: SustainabilityMetric = {
      id,
      ...dto,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.metrics.set(id, metric);
    return metric;
  }

  /**
   * Obtener todas las métricas (filtradas)
   */
  async findAllMetrics(
    organization_id?: string,
    metric_type?: SustainabilityMetricType,
  ): Promise<SustainabilityMetric[]> {
    let metrics = Array.from(this.metrics.values());

    if (organization_id) {
      metrics = metrics.filter(
        (metric) => metric.organization_id === organization_id,
      );
    }
    if (metric_type) {
      metrics = metrics.filter((metric) => metric.metric_type === metric_type);
    }

    return metrics.sort(
      (a, b) => b.period_start.getTime() - a.period_start.getTime(),
    );
  }

  /**
   * Obtener una métrica por ID
   */
  async findMetricById(id: string): Promise<SustainabilityMetric> {
    const metric = this.metrics.get(id);
    if (!metric) {
      throw new NotFoundException(`Metric with ID ${id} not found`);
    }
    return metric;
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
    const id = `target-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const target: SustainabilityTarget = {
      id,
      ...dto,
      is_active: dto.is_active !== false,
      achieved: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.targets.set(id, target);
    return target;
  }

  /**
   * Obtener todos los targets (filtrados)
   */
  async findAllTargets(
    organization_id?: string,
    is_active?: boolean,
  ): Promise<SustainabilityTarget[]> {
    let targets = Array.from(this.targets.values());

    if (organization_id) {
      targets = targets.filter(
        (target) => target.organization_id === organization_id,
      );
    }
    if (is_active !== undefined) {
      targets = targets.filter((target) => target.is_active === is_active);
    }

    return targets.sort(
      (a, b) => b.start_date.getTime() - a.start_date.getTime(),
    );
  }

  /**
   * Obtener un target por ID
   */
  async findTargetById(id: string): Promise<SustainabilityTarget> {
    const target = this.targets.get(id);
    if (!target) {
      throw new NotFoundException(`Target with ID ${id} not found`);
    }
    return target;
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
    const achieved_at = achieved && !target.achieved ? new Date() : target.achieved_at;

    const updated: SustainabilityTarget = {
      ...target,
      current_value,
      achieved,
      achieved_at,
      updated_at: new Date(),
    };

    this.targets.set(id, updated);
    return updated;
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
      (m) =>
        m.period_start >= period_start && m.period_end <= period_end,
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
      period_start.getTime() -
        (period_end.getTime() - period_start.getTime()),
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
