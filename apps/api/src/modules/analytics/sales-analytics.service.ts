import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto, TimeGranularity } from './dto';
import { SalesMetrics, HourlyMetric, DailyMetric } from './interfaces';

@Injectable()
export class SalesAnalyticsService {
  // Mock data - in production would query from Transactions/Orders
  private mockOrders: Map<string, any> = new Map();

  async getSalesMetrics(query: QueryAnalyticsDto): Promise<SalesMetrics> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    // In production, query actual transactions
    // For now, generate mock metrics
    const grossSales = 450000;
    const discounts = 22500; // 5%
    const refunds = 9000; // 2%
    const netSales = grossSales - discounts - refunds;
    const taxes = netSales * 0.16; // IVA 16%

    const totalOrders = 1500;
    const avgOrderValue = netSales / totalOrders;

    const totalCustomers = 1200;
    const newCustomers = 300;
    const returningCustomers = totalCustomers - newCustomers;

    // Peak analysis
    const peakHour = '14:00-15:00'; // 2-3 PM
    const peakDay = 'Sábado';

    // Hourly breakdown (7 AM - 10 PM)
    const hourlyBreakdown: HourlyMetric[] = this.generateHourlyBreakdown();

    // Daily breakdown
    const dailyBreakdown: DailyMetric[] = this.generateDailyBreakdown(
      startDate,
      endDate,
    );

    // Comparison with previous period
    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const prevPeriodGrossSales = 420000;
    const prevPeriodOrders = 1400;
    const prevPeriodAvgOrderValue = prevPeriodGrossSales / prevPeriodOrders;

    const vsPreviousPeriod = {
      gross_sales_change: grossSales - prevPeriodGrossSales,
      gross_sales_change_percent:
        ((grossSales - prevPeriodGrossSales) / prevPeriodGrossSales) * 100,
      orders_change: totalOrders - prevPeriodOrders,
      orders_change_percent:
        ((totalOrders - prevPeriodOrders) / prevPeriodOrders) * 100,
      avg_order_value_change: avgOrderValue - prevPeriodAvgOrderValue,
      avg_order_value_change_percent:
        ((avgOrderValue - prevPeriodAvgOrderValue) / prevPeriodAvgOrderValue) *
        100,
    };

    return {
      period_start: startDate,
      period_end: endDate,
      organization_id: query.organization_id,
      location_id: query.location_id,
      gross_sales: grossSales,
      net_sales: netSales,
      discounts: discounts,
      refunds: refunds,
      taxes: taxes,
      total_orders: totalOrders,
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
      avg_items_per_order: 2.3,
      total_customers: totalCustomers,
      new_customers: newCustomers,
      returning_customers: returningCustomers,
      peak_hour: peakHour,
      peak_day: peakDay,
      hourly_breakdown: hourlyBreakdown,
      daily_breakdown: dailyBreakdown,
      vs_previous_period: vsPreviousPeriod,
    };
  }

  private generateHourlyBreakdown(): HourlyMetric[] {
    const breakdown: HourlyMetric[] = [];
    const hourlyPatterns = [
      { hour: 7, factor: 0.3 }, // Morning opening
      { hour: 8, factor: 0.8 },
      { hour: 9, factor: 1.2 },
      { hour: 10, factor: 1.0 },
      { hour: 11, factor: 0.9 },
      { hour: 12, factor: 1.1 }, // Lunch
      { hour: 13, factor: 1.3 },
      { hour: 14, factor: 1.5 }, // Peak
      { hour: 15, factor: 1.4 },
      { hour: 16, factor: 1.0 },
      { hour: 17, factor: 1.2 },
      { hour: 18, factor: 1.1 },
      { hour: 19, factor: 0.8 },
      { hour: 20, factor: 0.6 },
      { hour: 21, factor: 0.4 },
      { hour: 22, factor: 0.2 }, // Closing
    ];

    const baseOrders = 100;
    const baseAvgValue = 300;

    for (const pattern of hourlyPatterns) {
      const orders = Math.round(baseOrders * pattern.factor);
      const sales = orders * baseAvgValue * pattern.factor;
      breakdown.push({
        hour: pattern.hour,
        sales: Math.round(sales),
        orders: orders,
        avg_order_value: Math.round((sales / orders) * 100) / 100,
      });
    }

    return breakdown;
  }

  private generateDailyBreakdown(
    startDate: Date,
    endDate: Date,
  ): DailyMetric[] {
    const breakdown: DailyMetric[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Weekend boost
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
      
      const baseSales = 15000 * weekendFactor;
      const baseOrders = 50 * weekendFactor;
      const baseCustomers = 40 * weekendFactor;

      breakdown.push({
        date: new Date(currentDate),
        sales: Math.round(baseSales),
        orders: Math.round(baseOrders),
        customers: Math.round(baseCustomers),
        avg_order_value: Math.round((baseSales / baseOrders) * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return breakdown;
  }

  async getTopSellingProducts(
    query: QueryAnalyticsDto,
    limit: number = 10,
  ): Promise<any[]> {
    // Mock top products
    return [
      {
        product_id: 'prod_1',
        product_name: 'Café Americano',
        category: 'Café Caliente',
        quantity_sold: 450,
        revenue: 22500,
        rank: 1,
      },
      {
        product_id: 'prod_2',
        product_name: 'Cappuccino',
        category: 'Café Caliente',
        quantity_sold: 380,
        revenue: 24700,
        rank: 2,
      },
      {
        product_id: 'prod_3',
        product_name: 'Latte',
        category: 'Café Caliente',
        quantity_sold: 350,
        revenue: 24500,
        rank: 3,
      },
    ].slice(0, limit);
  }

  async getSalesByCategory(query: QueryAnalyticsDto): Promise<any[]> {
    // Mock category breakdown
    return [
      {
        category: 'Café Caliente',
        total_sold: 1200,
        revenue: 72000,
        percent_of_total: 48,
      },
      {
        category: 'Café Frío',
        total_sold: 800,
        revenue: 56000,
        percent_of_total: 37,
      },
      {
        category: 'Alimentos',
        total_sold: 400,
        revenue: 20000,
        percent_of_total: 13,
      },
      {
        category: 'Otros',
        total_sold: 100,
        revenue: 3000,
        percent_of_total: 2,
      },
    ];
  }

  async getSalesTrend(
    query: QueryAnalyticsDto,
    granularity: TimeGranularity = TimeGranularity.DAILY,
  ): Promise<any[]> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    if (granularity === TimeGranularity.DAILY) {
      return this.generateDailyBreakdown(startDate, endDate);
    }

    // For other granularities, aggregate daily data
    return this.generateDailyBreakdown(startDate, endDate);
  }
}
