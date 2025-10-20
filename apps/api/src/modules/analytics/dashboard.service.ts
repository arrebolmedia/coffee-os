import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto } from './dto';
import {
  DashboardSummary,
  DashboardAlert,
  EmployeePerformance,
  TrendData,
} from './interfaces';
import { SalesAnalyticsService } from './sales-analytics.service';
import { ProductAnalyticsService } from './product-analytics.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly salesAnalyticsService: SalesAnalyticsService,
    private readonly productAnalyticsService: ProductAnalyticsService,
  ) {}

  async getDashboard(query: QueryAnalyticsDto): Promise<DashboardSummary> {
    const now = new Date();

    // Today's metrics
    const todayQuery: QueryAnalyticsDto = {
      ...query,
      start_date: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      end_date: now.toISOString(),
    };

    const salesMetrics = await this.salesAnalyticsService.getSalesMetrics(todayQuery);
    const topProducts = await this.productAnalyticsService.getTopProducts(query, 'revenue', 5);

    // Generate alerts
    const alerts = await this.generateAlerts(query);

    // Top employees (mock data)
    const topEmployees = this.getTopEmployees();

    // Sales trend (last 7 days)
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const trendQuery: QueryAnalyticsDto = {
      ...query,
      start_date: last7Days.toISOString(),
      end_date: now.toISOString(),
    };

    const salesTrend = await this.salesAnalyticsService.getSalesTrend(trendQuery);
    const salesTrendData: TrendData[] = salesTrend.map((day: any) => ({
      date: day.date,
      value: day.sales,
      label: day.date.toLocaleDateString('es-MX', { weekday: 'short' }),
    }));

    // Customer trend
    const customerTrendData: TrendData[] = salesTrend.map((day: any) => ({
      date: day.date,
      value: day.customers,
      label: day.date.toLocaleDateString('es-MX', { weekday: 'short' }),
    }));

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

  private async generateAlerts(query: QueryAnalyticsDto): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    // Inventory alerts
    alerts.push({
      type: 'WARNING',
      category: 'INVENTORY',
      message: 'Bajo stock en 3 productos',
      value: 3,
      action_required: 'Revisar inventario y hacer pedido',
    });

    // Sales alerts
    alerts.push({
      type: 'INFO',
      category: 'SALES',
      message: 'Ventas 12% arriba vs período anterior',
      value: 12,
    });

    // Labor alerts
    alerts.push({
      type: 'CRITICAL',
      category: 'LABOR',
      message: 'Labor % excede objetivo',
      value: 27.5,
      threshold: 25,
      action_required: 'Optimizar horarios de personal',
    });

    // Quality alerts
    alerts.push({
      type: 'WARNING',
      category: 'QUALITY',
      message: '2 checklists pendientes de completar',
      value: 2,
      action_required: 'Completar checklists NOM-251',
    });

    // Compliance alerts
    alerts.push({
      type: 'CRITICAL',
      category: 'COMPLIANCE',
      message: 'Permiso de funcionamiento vence en 15 días',
      value: 15,
      action_required: 'Iniciar proceso de renovación',
    });

    return alerts;
  }

  private getTopEmployees(): EmployeePerformance[] {
    return [
      {
        employee_id: 'emp_1',
        employee_name: 'María González',
        position: 'Barista Senior',
        sales_generated: 45000,
        orders_served: 150,
        avg_order_value: 300,
        customer_rating: 4.8,
      },
      {
        employee_id: 'emp_2',
        employee_name: 'Carlos Ramírez',
        position: 'Barista',
        sales_generated: 38000,
        orders_served: 130,
        avg_order_value: 292,
        customer_rating: 4.6,
      },
      {
        employee_id: 'emp_3',
        employee_name: 'Ana Martínez',
        position: 'Líder de Barra',
        sales_generated: 42000,
        orders_served: 125,
        avg_order_value: 336,
        customer_rating: 4.9,
      },
    ];
  }

  async getKPIDashboard(query: QueryAnalyticsDto): Promise<any> {
    // Financial KPIs dashboard
    return {
      period_start: new Date(query.start_date),
      period_end: new Date(query.end_date),
      organization_id: query.organization_id,
      location_id: query.location_id,
      
      // Profitability
      gross_margin_percent: 68.5,
      net_margin_percent: 18.2,
      ebitda_margin_percent: 24.5,
      
      // Efficiency
      prime_cost_percent: 52.3,
      labor_percent: 22.8,
      cogs_percent: 29.5,
      
      // Operations
      avg_order_value: 280,
      orders_per_day: 50,
      revenue_per_hour: 1875,
      
      // Customer
      customer_retention_rate: 68,
      avg_customer_visits: 2.3,
      nps_score: 72,
      
      // Inventory
      inventory_turnover: 8.5,
      days_of_inventory: 43,
      waste_percent: 2.1,
      
      // Status indicators
      status: {
        gross_margin: 'GOOD', // > 65%
        labor_percent: 'WARNING', // > 25%
        prime_cost: 'GOOD', // < 60%
        waste: 'GOOD', // < 3%
        inventory_turnover: 'GOOD', // > 6
      },
    };
  }
}
