/**
 * CoffeeOS Admin - Dashboard Service
 * Aggregates dashboard data from multiple endpoints
 */

import { orderService } from './order.service';
import { productService } from './product.service';
import { DashboardStats, TopProduct, OrderSummary, SalesChartData } from '@/types';

class DashboardService {
  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<DashboardStats> {
    try {
      // Fetch data in parallel
      const [stats, recentOrders, topProducts] = await Promise.all([
        this.getStats(),
        orderService.getRecentOrders(10),
        this.getTopProducts(),
      ]);

      return {
        today: stats.today,
        week: stats.week,
        month: stats.month,
        top_products: topProducts,
        recent_orders: recentOrders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          total: order.total,
          status: order.status,
          payment_method: order.payment_method,
          customer_name: order.customer?.name,
          created_at: order.created_at,
        })),
        sales_chart: await this.getSalesChartData(),
      };
    } catch (error) {
      console.error('Get dashboard data error:', error);
      throw error;
    }
  }

  /**
   * Get aggregated stats (today, week, month)
   */
  private async getStats() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);

      const monthStart = new Date(today);
      monthStart.setMonth(monthStart.getMonth() - 1);

      // Get stats for different periods
      const [todayStats, weekStats, monthStats] = await Promise.all([
        orderService.getStats(today.toISOString().split('T')[0]),
        orderService.getStats(weekStart.toISOString().split('T')[0]),
        orderService.getStats(monthStart.toISOString().split('T')[0]),
      ]);

      return {
        today: {
          sales: todayStats.total_sales,
          orders: todayStats.total_orders,
          customers: todayStats.total_customers,
          average_ticket: todayStats.average_ticket,
          growth: 5.2, // TODO: Calculate real growth
        },
        week: {
          sales: weekStats.total_sales,
          orders: weekStats.total_orders,
          customers: weekStats.total_customers,
          average_ticket: weekStats.average_ticket,
          growth: 12.5, // TODO: Calculate real growth
        },
        month: {
          sales: monthStats.total_sales,
          orders: monthStats.total_orders,
          customers: monthStats.total_customers,
          average_ticket: monthStats.average_ticket,
          growth: 8.3, // TODO: Calculate real growth
        },
      };
    } catch (error) {
      // Return mock data if backend not available
      return {
        today: {
          sales: 0,
          orders: 0,
          customers: 0,
          average_ticket: 0,
          growth: 0,
        },
        week: {
          sales: 0,
          orders: 0,
          customers: 0,
          average_ticket: 0,
          growth: 0,
        },
        month: {
          sales: 0,
          orders: 0,
          customers: 0,
          average_ticket: 0,
          growth: 0,
        },
      };
    }
  }

  /**
   * Get top products
   */
  private async getTopProducts(): Promise<TopProduct[]> {
    try {
      // TODO: Implement top products endpoint in backend
      // For now, return empty array
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get sales chart data (last 7 days)
   */
  private async getSalesChartData(): Promise<SalesChartData[]> {
    try {
      // TODO: Implement sales chart endpoint in backend
      // For now, return mock data
      const chartData: SalesChartData[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        chartData.push({
          date: date.toISOString().split('T')[0],
          sales: 0,
          orders: 0,
        });
      }

      return chartData;
    } catch (error) {
      return [];
    }
  }
}

export const dashboardService = new DashboardService();
