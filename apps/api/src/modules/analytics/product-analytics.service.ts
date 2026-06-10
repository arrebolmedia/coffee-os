import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto } from './dto';
import { CategoryPerformance, ProductPerformance } from './interfaces';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProductAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductPerformance(
    query: QueryAnalyticsDto,
  ): Promise<ProductPerformance[]> {
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

    // Current period lines
    const lines = await this.prisma.ticketLine.findMany({
      where: { ticket: ticketWhere },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            cost: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    // Previous period for trend calculation
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodDuration);
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevTicketWhere = {
      ...ticketWhere,
      closedAt: { gte: prevStart, lte: prevEnd },
    };

    const prevLines = await this.prisma.ticketLine.findMany({
      where: { ticket: prevTicketWhere },
      select: { productId: true, quantity: true, total: true },
    });

    // Build previous period map
    const prevMap = new Map<string, { quantity: number; revenue: number }>();
    for (const line of prevLines) {
      const existing = prevMap.get(line.productId) || {
        quantity: 0,
        revenue: 0,
      };
      prevMap.set(line.productId, {
        quantity: existing.quantity + line.quantity,
        revenue: existing.revenue + line.total,
      });
    }

    // Aggregate current period by product
    const productMap = new Map<
      string,
      {
        name: string;
        category: string;
        quantity: number;
        revenue: number;
        cost: number;
        cost_unknown: boolean;
      }
    >();

    for (const line of lines) {
      const productCost = line.product?.cost;
      const existing = productMap.get(line.productId) || {
        name: line.product.name,
        category: line.product.category?.name ?? 'Sin Categoría',
        quantity: 0,
        revenue: 0,
        cost: productCost ?? 0,
        // null/undefined cost means we cannot compute true profit
        cost_unknown: productCost == null,
      };
      existing.quantity += line.quantity;
      existing.revenue += line.total;
      productMap.set(line.productId, existing);
    }

    // Build performance array
    const performances = Array.from(productMap.entries()).map(([id, data]) => {
      const totalCost = data.cost * data.quantity;
      const profit = data.revenue - totalCost;
      const profitMarginPercent =
        data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

      const prev = prevMap.get(id);
      const prevRevenue = prev?.revenue ?? 0;
      const vsPrevPeriodPercent =
        prevRevenue === 0
          ? 0
          : ((data.revenue - prevRevenue) / prevRevenue) * 100;

      const trend: 'UP' | 'DOWN' | 'STABLE' =
        vsPrevPeriodPercent > 5
          ? 'UP'
          : vsPrevPeriodPercent < -5
            ? 'DOWN'
            : 'STABLE';

      return {
        product_id: id,
        product_name: data.name,
        category: data.category,
        total_sold: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profit_margin_percent: Math.round(profitMarginPercent * 100) / 100,
        rank_by_quantity: 0, // assigned below
        rank_by_revenue: 0,
        rank_by_profit: 0,
        trend,
        vs_previous_period_percent: Math.round(vsPrevPeriodPercent * 100) / 100,
        cost_unknown: data.cost_unknown,
      };
    });

    // Assign ranks via index-Maps — O(n log n) instead of O(n²) findIndex.
    const rankByQuantity = new Map(
      [...performances]
        .sort((a, b) => b.total_sold - a.total_sold)
        .map((p, i) => [p.product_id, i + 1]),
    );
    const rankByRevenue = new Map(
      [...performances]
        .sort((a, b) => b.revenue - a.revenue)
        .map((p, i) => [p.product_id, i + 1]),
    );
    const rankByProfit = new Map(
      [...performances]
        .sort((a, b) => b.profit - a.profit)
        .map((p, i) => [p.product_id, i + 1]),
    );

    for (const p of performances) {
      p.rank_by_quantity = rankByQuantity.get(p.product_id) ?? 0;
      p.rank_by_revenue = rankByRevenue.get(p.product_id) ?? 0;
      p.rank_by_profit = rankByProfit.get(p.product_id) ?? 0;
    }

    return performances.sort((a, b) => a.rank_by_revenue - b.rank_by_revenue);
  }

  async getCategoryPerformance(
    query: QueryAnalyticsDto,
  ): Promise<CategoryPerformance[]> {
    const products = await this.getProductPerformance(query);

    // Group by category
    const categoryMap = new Map<string, ProductPerformance[]>();

    for (const product of products) {
      const category = product.category || 'Sin Categoría';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(product);
    }

    // Build category performance
    const categories: CategoryPerformance[] = [];

    for (const [category, categoryProducts] of categoryMap.entries()) {
      const totalSold = categoryProducts.reduce(
        (sum, p) => sum + p.total_sold,
        0,
      );
      const revenue = categoryProducts.reduce((sum, p) => sum + p.revenue, 0);
      const avgPrice = totalSold > 0 ? revenue / totalSold : 0;

      // Top 3 products in category
      const topProducts = categoryProducts
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      categories.push({
        category,
        total_products: categoryProducts.length,
        total_sold: totalSold,
        revenue: Math.round(revenue * 100) / 100,
        avg_price: Math.round(avgPrice * 100) / 100,
        top_products: topProducts,
      });
    }

    return categories.sort((a, b) => b.revenue - a.revenue);
  }

  async getTopProducts(
    query: QueryAnalyticsDto,
    by: 'quantity' | 'revenue' | 'profit' = 'revenue',
    limit: number = 10,
  ): Promise<ProductPerformance[]> {
    const products = await this.getProductPerformance(query);

    const sortKey =
      by === 'quantity'
        ? 'total_sold'
        : by === 'revenue'
          ? 'revenue'
          : 'profit';

    return products.sort((a, b) => b[sortKey] - a[sortKey]).slice(0, limit);
  }

  async getLowPerformers(
    query: QueryAnalyticsDto,
    limit: number = 10,
  ): Promise<ProductPerformance[]> {
    const products = await this.getProductPerformance(query);

    return products
      .filter((p) => p.trend === 'DOWN' || p.vs_previous_period_percent < -10)
      .sort(
        (a, b) => a.vs_previous_period_percent - b.vs_previous_period_percent,
      )
      .slice(0, limit);
  }

  async getProductMix(query: QueryAnalyticsDto): Promise<any> {
    const categories = await this.getCategoryPerformance(query);
    const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

    return categories.map((category) => ({
      category: category.category,
      revenue: category.revenue,
      percent_of_total:
        totalRevenue > 0
          ? Math.round((category.revenue / totalRevenue) * 100 * 10) / 10
          : 0,
      total_sold: category.total_sold,
    }));
  }
}
