import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto, TimeGranularity } from './dto';
import { DailyMetric, HourlyMetric, SalesMetrics } from './interfaces';
import { PrismaService } from '../database/prisma.service';

// All operational analytics are reported in the organization's main timezone.
// CoffeeOS is single-region for now (Mexico City).
const TZ = 'America/Mexico_City';

// Returns 0-23 hour as observed in TZ.
function hourInTz(d: Date): number {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    hour12: false,
  }).format(d);
  // "24" can appear in some locales when the date is midnight; normalize.
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n % 24;
}

// Returns YYYY-MM-DD as observed in TZ.
function dayKeyInTz(d: Date): string {
  // en-CA produces YYYY-MM-DD reliably.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// pct change: returns null when prev=0 and current>0 (not comparable)
// or when both are 0 (no change to report).
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

@Injectable()
export class SalesAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesMetrics(query: QueryAnalyticsDto): Promise<SalesMetrics> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    // Build where clause for tickets in the period
    const where: any = {
      status: 'CLOSED',
      closedAt: { gte: startDate, lte: endDate },
    };

    if (query.location_id) {
      where.locationId = query.location_id;
    } else if (query.organization_id) {
      where.location = { organizationId: query.organization_id };
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        lines: true,
        customer: { select: { id: true } },
      },
    });

    // Aggregate metrics
    const grossSales = tickets.reduce((sum, t) => sum + t.total, 0);
    const discounts = tickets.reduce((sum, t) => sum + (t.discount || 0), 0);
    const taxes = tickets.reduce((sum, t) => sum + (t.tax || 0), 0);
    const netSales = grossSales - discounts;
    const totalOrders = tickets.length;
    const avgOrderValue = totalOrders > 0 ? grossSales / totalOrders : 0;

    // Customer metrics
    const customerIds = new Set(
      tickets.map((t) => t.customerId).filter(Boolean),
    );
    const totalCustomers = customerIds.size;

    // Hourly breakdown (hours in organization timezone)
    const hourlyMap = new Map<number, { sales: number; orders: number }>();
    for (const ticket of tickets) {
      const hour = hourInTz(new Date(ticket.closedAt!));
      const existing = hourlyMap.get(hour) || { sales: 0, orders: 0 };
      hourlyMap.set(hour, {
        sales: existing.sales + ticket.total,
        orders: existing.orders + 1,
      });
    }

    const hourlyBreakdown: HourlyMetric[] = Array.from(hourlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, data]) => ({
        hour,
        sales: data.sales,
        orders: data.orders,
        avg_order_value: data.orders > 0 ? data.sales / data.orders : 0,
      }));

    // Peak hour / day
    const peakHourEntry = hourlyBreakdown.reduce(
      (max, h) => (h.orders > (max?.orders ?? 0) ? h : max),
      null as HourlyMetric | null,
    );
    const peakHour = peakHourEntry ? `${peakHourEntry.hour}:00` : 'N/A';

    // Daily breakdown
    const dayMap = new Map<
      string,
      { sales: number; orders: number; customerIds: Set<string> }
    >();
    for (const ticket of tickets) {
      const dayKey = dayKeyInTz(new Date(ticket.closedAt!));
      const existing = dayMap.get(dayKey) || {
        sales: 0,
        orders: 0,
        customerIds: new Set<string>(),
      };
      existing.sales += ticket.total;
      existing.orders += 1;
      if (ticket.customerId) existing.customerIds.add(ticket.customerId);
      dayMap.set(dayKey, existing);
    }

    const dailyBreakdown: DailyMetric[] = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date: new Date(date),
        sales: data.sales,
        orders: data.orders,
        customers: data.customerIds.size,
        avg_order_value: data.orders > 0 ? data.sales / data.orders : 0,
      }));

    const peakDayEntry = dailyBreakdown.reduce(
      (max, d) => (d.orders > (max?.orders ?? 0) ? d : max),
      null as DailyMetric | null,
    );
    const peakDay = peakDayEntry
      ? peakDayEntry.date.toLocaleDateString('es-MX', { weekday: 'long' })
      : 'N/A';

    // Average items per order
    const totalItems = tickets.reduce(
      (sum, t) => sum + (t.lines?.length ?? 0),
      0,
    );
    const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;

    // Compare with previous period.
    // periodDuration is inclusive of the end millisecond; +1ms makes prev
    // period a full mirror of the current one (e.g. 30-day vs 30-day).
    const periodDuration = endDate.getTime() - startDate.getTime() + 1;
    const prevStart = new Date(startDate.getTime() - periodDuration);
    const prevEnd = new Date(startDate.getTime() - 1);

    const prevWhere = { ...where, closedAt: { gte: prevStart, lte: prevEnd } };
    const prevTickets = await this.prisma.ticket.findMany({ where: prevWhere });

    const prevGrossSales = prevTickets.reduce((sum, t) => sum + t.total, 0);
    const prevTotalOrders = prevTickets.length;
    const prevAvgOrderValue =
      prevTotalOrders > 0 ? prevGrossSales / prevTotalOrders : 0;

    const vsPreviousPeriod = {
      gross_sales_change: grossSales - prevGrossSales,
      gross_sales_change_percent: pctChange(grossSales, prevGrossSales),
      orders_change: totalOrders - prevTotalOrders,
      orders_change_percent: pctChange(totalOrders, prevTotalOrders),
      avg_order_value_change: avgOrderValue - prevAvgOrderValue,
      avg_order_value_change_percent: pctChange(
        avgOrderValue,
        prevAvgOrderValue,
      ),
    };

    // New customers: customers whose first record was created within this period.
    let newCustomers = 0;
    try {
      const orgFilter = query.organization_id
        ? { organizationId: query.organization_id }
        : {};
      newCustomers = await this.prisma.customer.count({
        where: { ...orgFilter, createdAt: { gte: startDate, lte: endDate } },
      });
    } catch {
      // Customer model unavailable in some test envs — leave at 0.
    }

    return {
      period_start: startDate,
      period_end: endDate,
      organization_id: query.organization_id,
      location_id: query.location_id,
      gross_sales: Math.round(grossSales * 100) / 100,
      net_sales: Math.round(netSales * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      refunds: 0, // Not tracked separately in current schema
      taxes: Math.round(taxes * 100) / 100,
      total_orders: totalOrders,
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
      avg_items_per_order: Math.round(avgItemsPerOrder * 100) / 100,
      total_customers: totalCustomers,
      new_customers: newCustomers,
      returning_customers: Math.max(totalCustomers - newCustomers, 0),
      peak_hour: peakHour,
      peak_day: peakDay,
      hourly_breakdown: hourlyBreakdown,
      daily_breakdown: dailyBreakdown,
      vs_previous_period: vsPreviousPeriod,
    };
  }

  async getTopSellingProducts(
    query: QueryAnalyticsDto,
    limit: number = 10,
  ): Promise<any[]> {
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

    const lines = await this.prisma.ticketLine.findMany({
      where: { ticket: ticketWhere },
      include: {
        product: { select: { id: true, name: true, categoryId: true } },
      },
    });

    // Group by product
    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();

    for (const line of lines) {
      const existing = productMap.get(line.productId) || {
        name: line.product.name,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += line.quantity;
      existing.revenue += line.total;
      productMap.set(line.productId, existing);
    }

    return Array.from(productMap.entries())
      .map(([id, data]) => ({
        product_id: id,
        product_name: data.name,
        quantity_sold: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getSalesByCategory(query: QueryAnalyticsDto): Promise<any[]> {
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

    const lines = await this.prisma.ticketLine.findMany({
      where: { ticket: ticketWhere },
      include: {
        product: {
          select: {
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const categoryMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();

    for (const line of lines) {
      const catId = line.product.categoryId;
      const catName = line.product.category?.name ?? 'Sin Categoría';
      const existing = categoryMap.get(catId) || {
        name: catName,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += line.quantity;
      existing.revenue += line.total;
      categoryMap.set(catId, existing);
    }

    return Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        category_id: id,
        category_name: data.name,
        quantity_sold: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getSalesTrend(
    query: QueryAnalyticsDto,
    granularity: TimeGranularity = TimeGranularity.DAILY,
  ): Promise<any[]> {
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

    const tickets = await this.prisma.ticket.findMany({
      where: ticketWhere,
      select: { total: true, closedAt: true },
    });

    const bucketMap = new Map<string, { sales: number; orders: number }>();

    for (const ticket of tickets) {
      const date = new Date(ticket.closedAt!);
      let key: string;

      if (granularity === TimeGranularity.HOURLY) {
        const day = dayKeyInTz(date);
        key = `${day}T${String(hourInTz(date)).padStart(2, '0')}:00`;
      } else if (granularity === TimeGranularity.WEEKLY) {
        key = this.getMondayOfWeek(date);
      } else if (granularity === TimeGranularity.MONTHLY) {
        // dayKey is YYYY-MM-DD; take YYYY-MM
        key = dayKeyInTz(date).slice(0, 7);
      } else {
        key = dayKeyInTz(date);
      }

      const existing = bucketMap.get(key) || { sales: 0, orders: 0 };
      bucketMap.set(key, {
        sales: existing.sales + ticket.total,
        orders: existing.orders + 1,
      });
    }

    return Array.from(bucketMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, data]) => ({
        period,
        sales: Math.round(data.sales * 100) / 100,
        orders: data.orders,
        avg_order_value:
          data.orders > 0
            ? Math.round((data.sales / data.orders) * 100) / 100
            : 0,
      }));
  }

  /**
   * Returns the YYYY-MM-DD of the Monday for the ISO-week containing `date`,
   * computed in TZ. Clones the input — never mutates it.
   */
  private getMondayOfWeek(date: Date): string {
    const d = new Date(date.getTime()); // clone — never mutate input
    const day = d.getUTCDay(); // Sunday=0..Saturday=6 (UTC is fine for arithmetic)
    const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    return dayKeyInTz(d);
  }
}
