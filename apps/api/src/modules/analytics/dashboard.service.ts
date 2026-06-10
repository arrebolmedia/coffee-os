import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto } from './dto';
import {
  DashboardAlert,
  DashboardSummary,
  EmployeePerformance,
  TrendData,
} from './interfaces';
import { SalesAnalyticsService } from './sales-analytics.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly salesAnalyticsService: SalesAnalyticsService,
    private readonly productAnalyticsService: ProductAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  async getDashboard(query: QueryAnalyticsDto): Promise<DashboardSummary> {
    const now = new Date();

    // Today's metrics
    const todayQuery: QueryAnalyticsDto = {
      ...query,
      start_date: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString(),
      end_date: now.toISOString(),
    };

    const salesMetrics =
      await this.salesAnalyticsService.getSalesMetrics(todayQuery);
    const topProducts = await this.productAnalyticsService.getTopProducts(
      query,
      'revenue',
      5,
    );

    // Generate alerts (real data when available)
    const alerts = await this.generateAlerts(query);

    // Top employees (no data source available — empty until tracked)
    const topEmployees = this.getTopEmployees();

    // Sales trend (last 7 days)
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const trendQuery: QueryAnalyticsDto = {
      ...query,
      start_date: last7Days.toISOString(),
      end_date: now.toISOString(),
    };

    const salesTrend =
      await this.salesAnalyticsService.getSalesTrend(trendQuery);
    const salesTrendData: TrendData[] = salesTrend.map((day: any) => {
      const date = new Date(day.period ?? day.date);
      return {
        date,
        value: day.sales,
        label: date.toLocaleDateString('es-MX', { weekday: 'short' }),
      };
    });

    // Customer trend
    const customerTrendData: TrendData[] = salesTrend.map((day: any) => {
      const date = new Date(day.period ?? day.date);
      return {
        date,
        value: day.customers ?? 0,
        label: date.toLocaleDateString('es-MX', { weekday: 'short' }),
      };
    });

    return {
      organization_id: query.organization_id,
      location_id: query.location_id,
      generated_at: now,
      period_start: new Date(query.start_date),
      period_end: new Date(query.end_date),
      today_sales: salesMetrics.gross_sales,
      today_orders: salesMetrics.total_orders,
      today_customers: salesMetrics.total_customers,
      today_avg_order_value: salesMetrics.avg_order_value,
      alerts: alerts,
      top_products: topProducts,
      top_employees: topEmployees,
      sales_trend: salesTrendData,
      customer_trend: customerTrendData,
    };
  }

  /**
   * Generate dashboard alerts from real data sources.
   *
   * Currently implemented:
   *   - INVENTORY: low-stock alert from InventoryItem.currentStock <= reorderPoint
   *   - COMPLIANCE: permit expiring soon from Permit.expiryDate within 15 days
   *
   * TODO: labor%, sales-vs-target and quality alerts require additional
   * aggregation (PnL, sales targets, pending checklists) — not implemented yet.
   */
  private async generateAlerts(
    query: QueryAnalyticsDto,
  ): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    if (!query.organization_id) {
      return alerts;
    }

    // Inventory alerts: items below or equal to reorder point.
    // Postgres-specific: column-to-column comparison via raw query.
    try {
      const rows: Array<{ count: bigint | number }> = await this.prisma
        .$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "inventory_items"
        WHERE "organization_id" = ${query.organization_id}
          AND "active" = true
          AND "current_stock" <= "reorder_point"
      `;
      const lowStockCount = Number(rows[0]?.count ?? 0);
      if (lowStockCount > 0) {
        alerts.push({
          type: lowStockCount > 5 ? 'CRITICAL' : 'WARNING',
          category: 'INVENTORY',
          message: `Bajo stock en ${lowStockCount} productos`,
          value: lowStockCount,
          action_required: 'Revisar inventario y hacer pedido',
        });
      }
    } catch {
      // No alert if query fails (e.g. table missing in test env)
    }

    // Compliance alerts: permits expiring within the next 15 days
    try {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + 15);
      const permitWhere: any = {
        organizationId: query.organization_id,
        status: 'ACTIVE',
        expiryDate: { gte: now, lte: cutoff },
      };
      if (query.location_id) permitWhere.locationId = query.location_id;

      const soonToExpire = await this.prisma.permit.findMany({
        where: permitWhere,
        select: { id: true, name: true, expiryDate: true },
        orderBy: { expiryDate: 'asc' },
        take: 5,
      });

      for (const p of soonToExpire) {
        if (!p.expiryDate) continue;
        const daysLeft = Math.max(
          0,
          Math.ceil(
            (p.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        alerts.push({
          type: daysLeft <= 7 ? 'CRITICAL' : 'WARNING',
          category: 'COMPLIANCE',
          message: `Permiso "${p.name}" vence en ${daysLeft} días`,
          value: daysLeft,
          threshold: 15,
          action_required: 'Iniciar proceso de renovación',
        });
      }
    } catch {
      // ignore — missing model or schema mismatch
    }

    return alerts;
  }

  private getTopEmployees(): EmployeePerformance[] {
    // TODO: Employee performance tracking requires sales attribution per user
    // (e.g. tickets.userId aggregation). Not implemented yet.
    return [];
  }

  /**
   * KPI dashboard with real calculations where data is available.
   *
   * Values that cannot be computed from the schema are returned as `null`
   * alongside an `unavailable: { <key>: 'reason' }` map so consumers can
   * distinguish "no data yet" from "value is zero".
   */
  async getKPIDashboard(query: QueryAnalyticsDto): Promise<any> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    const ticketWhere: any = {
      status: 'CLOSED',
      closedAt: { gte: startDate, lte: endDate },
    };
    if (query.location_id) {
      ticketWhere.locationId = query.location_id;
    } else if (query.organization_id) {
      ticketWhere.location = { organizationId: query.organization_id };
    }

    // Aggregate revenue
    const tickets = await this.prisma.ticket.findMany({
      where: ticketWhere,
      include: {
        lines: { include: { product: { select: { cost: true } } } },
      },
    });

    const revenue = tickets.reduce((s, t) => s + t.total, 0);
    const totalOrders = tickets.length;

    // COGS — sum of (lines.quantity * product.cost). Cost may be 0 for some products.
    let cogs = 0;
    let costsKnown = true;
    for (const t of tickets) {
      for (const line of t.lines ?? []) {
        const cost = line.product?.cost;
        if (cost == null) {
          costsKnown = false;
          continue;
        }
        cogs += cost * line.quantity;
      }
    }

    // Labor expenses for the same period
    let labor: number | null = null;
    try {
      const laborAgg = await this.prisma.expense.aggregate({
        where: {
          ...(query.organization_id
            ? { organizationId: query.organization_id }
            : {}),
          ...(query.location_id ? { locationId: query.location_id } : {}),
          category: 'LABOR',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { totalAmount: true },
      });
      labor = laborAgg._sum.totalAmount ?? 0;
    } catch {
      labor = null;
    }

    const grossMarginPercent =
      revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 1000) / 10 : null;
    const cogsPercent =
      revenue > 0 ? Math.round((cogs / revenue) * 1000) / 10 : null;
    const laborPercent =
      revenue > 0 && labor != null
        ? Math.round((labor / revenue) * 1000) / 10
        : null;
    const primeCostPercent =
      revenue > 0 && labor != null
        ? Math.round(((cogs + labor) / revenue) * 1000) / 10
        : null;

    // Operations
    const periodMs = endDate.getTime() - startDate.getTime();
    const periodDays = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
    const ordersPerDay =
      totalOrders > 0 ? Math.round((totalOrders / periodDays) * 10) / 10 : 0;
    const avgOrderValue =
      totalOrders > 0 ? Math.round((revenue / totalOrders) * 100) / 100 : 0;

    const unavailable: Record<string, string> = {};
    if (grossMarginPercent === null)
      unavailable.gross_margin_percent = 'no_revenue';
    if (!costsKnown) unavailable.cogs_quality = 'partial_costs_unknown';
    if (labor === null) unavailable.labor_percent = 'expense_query_failed';
    if (primeCostPercent === null)
      unavailable.prime_cost_percent = 'missing_labor_or_revenue';

    return {
      period_start: startDate,
      period_end: endDate,
      organization_id: query.organization_id,
      location_id: query.location_id,

      // Profitability — computed from period revenue & cogs
      gross_margin_percent: grossMarginPercent,
      net_margin_percent: null, // requires full PnL (operating expenses)
      ebitda_margin_percent: null, // requires full PnL

      // Efficiency
      prime_cost_percent: primeCostPercent,
      labor_percent: laborPercent,
      cogs_percent: cogsPercent,

      // Operations
      avg_order_value: avgOrderValue,
      orders_per_day: ordersPerDay,
      revenue_per_hour: null, // requires hours-open per day, not tracked

      // Customer — no NPS/retention tables in schema
      customer_retention_rate: null,
      avg_customer_visits: null,
      nps_score: null,

      // Inventory — turnover/days-of-inventory not yet computed
      inventory_turnover: null,
      days_of_inventory: null,
      waste_percent: null,

      // Status indicators — only fill thresholds for values we computed
      status: {
        gross_margin: this.statusByThreshold(grossMarginPercent, 65, 50),
        labor_percent: this.statusByThreshold(laborPercent, 25, 30, true),
        prime_cost: this.statusByThreshold(primeCostPercent, 60, 70, true),
        waste: null,
        inventory_turnover: null,
      },

      // Flags for unavailable KPIs
      unavailable,
    };
  }

  // Returns 'GOOD' | 'WARNING' | 'CRITICAL' | null. `inverted=true` means lower=better.
  private statusByThreshold(
    value: number | null,
    good: number,
    warn: number,
    inverted = false,
  ): 'GOOD' | 'WARNING' | 'CRITICAL' | null {
    if (value === null) return null;
    if (inverted) {
      if (value <= good) return 'GOOD';
      if (value <= warn) return 'WARNING';
      return 'CRITICAL';
    }
    if (value >= good) return 'GOOD';
    if (value >= warn) return 'WARNING';
    return 'CRITICAL';
  }
}
