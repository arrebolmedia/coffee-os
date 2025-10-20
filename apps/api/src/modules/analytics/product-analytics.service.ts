import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto } from './dto';
import { ProductPerformance, CategoryPerformance } from './interfaces';

@Injectable()
export class ProductAnalyticsService {
  async getProductPerformance(
    query: QueryAnalyticsDto,
  ): Promise<ProductPerformance[]> {
    // Mock product data
    const products: ProductPerformance[] = [
      {
        product_id: 'prod_1',
        product_name: 'Café Americano',
        category: 'Café Caliente',
        total_sold: 450,
        revenue: 22500,
        profit: 15750, // 70% margin
        profit_margin_percent: 70,
        rank_by_quantity: 1,
        rank_by_revenue: 3,
        rank_by_profit: 2,
        trend: 'UP',
        vs_previous_period_percent: 12.5,
      },
      {
        product_id: 'prod_2',
        product_name: 'Cappuccino',
        category: 'Café Caliente',
        total_sold: 380,
        revenue: 24700,
        profit: 16190, // 65.5% margin
        profit_margin_percent: 65.5,
        rank_by_quantity: 2,
        rank_by_revenue: 2,
        rank_by_profit: 1,
        trend: 'UP',
        vs_previous_period_percent: 8.3,
      },
      {
        product_id: 'prod_3',
        product_name: 'Latte',
        category: 'Café Caliente',
        total_sold: 350,
        revenue: 24500,
        profit: 15680, // 64% margin
        profit_margin_percent: 64,
        rank_by_quantity: 3,
        rank_by_revenue: 1,
        rank_by_profit: 3,
        trend: 'STABLE',
        vs_previous_period_percent: 2.1,
      },
      {
        product_id: 'prod_4',
        product_name: 'Espresso',
        category: 'Café Caliente',
        total_sold: 220,
        revenue: 11000,
        profit: 8250, // 75% margin
        profit_margin_percent: 75,
        rank_by_quantity: 4,
        rank_by_revenue: 5,
        rank_by_profit: 4,
        trend: 'DOWN',
        vs_previous_period_percent: -5.2,
      },
      {
        product_id: 'prod_5',
        product_name: 'Frappé de Vainilla',
        category: 'Café Frío',
        total_sold: 320,
        revenue: 22400,
        profit: 13440, // 60% margin
        profit_margin_percent: 60,
        rank_by_quantity: 5,
        rank_by_revenue: 4,
        rank_by_profit: 5,
        trend: 'UP',
        vs_previous_period_percent: 18.5,
      },
    ];

    // Filter by location if provided
    if (query.location_id) {
      // In production, filter by location
    }

    return products;
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
      const avgPrice = revenue / totalSold;

      // Top 3 products in category
      const topProducts = categoryProducts
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      categories.push({
        category,
        total_products: categoryProducts.length,
        total_sold: totalSold,
        revenue: revenue,
        avg_price: Math.round(avgPrice * 100) / 100,
        top_products: topProducts,
      });
    }

    // Sort by revenue
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

    return products
      .sort((a, b) => b[sortKey] - a[sortKey])
      .slice(0, limit);
  }

  async getLowPerformers(
    query: QueryAnalyticsDto,
    limit: number = 10,
  ): Promise<ProductPerformance[]> {
    const products = await this.getProductPerformance(query);

    // Find products with declining trend or low sales
    return products
      .filter((p) => p.trend === 'DOWN' || p.vs_previous_period_percent < -10)
      .sort((a, b) => a.vs_previous_period_percent - b.vs_previous_period_percent)
      .slice(0, limit);
  }

  async getProductMix(query: QueryAnalyticsDto): Promise<any> {
    const categories = await this.getCategoryPerformance(query);
    const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

    return categories.map((category) => ({
      category: category.category,
      revenue: category.revenue,
      percent_of_total: Math.round((category.revenue / totalRevenue) * 100 * 10) / 10,
      total_sold: category.total_sold,
    }));
  }
}
