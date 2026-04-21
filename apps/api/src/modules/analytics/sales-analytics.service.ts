import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto, TimeGranularity } from './dto';
import { SalesMetrics, HourlyMetric, DailyMetric } from './interfaces';
import { PrismaService } from '../database/prisma.service';

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
    const customerIds = new Set(tickets.map((t) => t.customerId).filter(Boolean));
    const totalCustomers = customerIds.size;

    // Hourly breakdown
    const hourlyMap = new Map<number, { sales: number; orders: number }>();
    for (const ticket of tickets) {
      const hour = new Date(ticket.closedAt!).getHours();
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
      const dayKey = new Date(ticket.closedAt!).toISOString().split('T')[0];
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
    const totalItems = tickets.reduce((sum, t) => sum + (t.lines?.length ?? 0), 0);
    const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;

    // Compare with previous period
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodDuration);
    const prevEnd = new Date(startDate.getTime() - 1);

    const prevWhere = { ...where, closedAt: { gte: prevStart, lte: prevEnd } };
    const prevTickets = await this.prisma.ticket.findMany({ where: prevWhere });

    const prevGrossSales = prevTickets.reduce((sum, t) => sum + t.total, 0);
    const prevTotalOrders = prevTickets.length;
    const prevAvgOrderValue =
      prevTotalOrders > 0 ? prevGrossSales / prevTotalOrders : 0;

    const pctChange = (current: number, previous: number) =>
      previous === 0 ? 0 : ((current - previous) / previous) * 100;

    const vsPreviousPeriod = {
      gross_sales_change: grossSales - prevGrossSales,
      gross_sales_change_percent: pctChange(grossSales, prevGrossSales),
      orders_change: totalOrders - prevTotalOrders,
      orders_change_percent: pctChange(totalOrders, prevTotalOrders),
      avg_order_value_change: avgOrderValue - prevAvgOrderValue,
      avg_order_value_change_percent: pctChange(avgOrderValue, prevAvgOrderValue),
    };

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
      new_customers: 0, // Would require joining with customer.createdAt
      returning_customers: totalCustomers,
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
        key = `${date.toISOString().split('T')[0]}T${String(date.getHours()).padStart(2, '0')}:00`;
      } else if (granularity === TimeGranularity.WEEKLY) {
        // Get Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        key = monday.toISOString().split('T')[0];
      } else if (granularity === TimeGranularity.MONTHLY) {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0];
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
}
