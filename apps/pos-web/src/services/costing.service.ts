/**
 * CoffeeOS POS Web - Costing Service
 * Servicio para cálculo de costos y análisis de rentabilidad
 */

import { api } from '@/lib/api';
import { recipesService } from './recipes.service';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface ProductCOGS {
  product_id: string;
  product_name: string;
  recipe_id?: string;
  recipe_name?: string;
  total_cost: number;
  sale_price: number;
  gross_margin: number;
  margin_percentage: number;
  has_recipe: boolean;
  last_calculated: Date;
}

interface MarginAnalysis {
  product_id: string;
  product_name: string;
  margin_percentage: number;
  margin_status: 'excellent' | 'good' | 'warning' | 'critical';
  recommendation?: string;
}

interface ProfitabilityReport {
  total_products: number;
  with_recipes: number;
  without_recipes: number;
  avg_margin: number;
  top_profitable: ProductCOGS[];
  least_profitable: ProductCOGS[];
  margin_distribution: {
    excellent: number; // >70%
    good: number; // 60-70%
    warning: number; // 40-60%
    critical: number; // <40%
  };
  total_potential_revenue: number;
  total_cost: number;
}

interface CostBreakdown {
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    subtotal: number;
  }>;
  total_ingredients_cost: number;
  overhead_percentage: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cogs: number;
}

// ============================================================================
// COSTING SERVICE
// ============================================================================

class CostingService {
  private readonly baseUrl = '/recipes'; // Usar recipes en lugar de costing

  // ============================================================================
  // PRODUCT COGS CALCULATION
  // ============================================================================

  /**
   * Calculate COGS for a specific product based on its recipe
   */
  async calculateProductCOGS(productId: string): Promise<ProductCOGS> {
    try {
      // First, try to get the recipe for this product
      const recipe = await recipesService.getRecipeByProductId(productId);

      // Get product details for basic info (needed whether or not there's a recipe)
      const productResponse = await api.get<any>(`/products/${productId}`);
      const product = this.unwrapSingle<any>(productResponse);

      if (!recipe) {
        // If no recipe, return product info with zero costs
        // This is normal for simple products (bought as-is, not manufactured)
        return {
          product_id: productId,
          product_name: product.name || 'Unknown Product',
          total_cost: product.cost || 0, // Use direct cost from product
          sale_price: product.price || 0,
          gross_margin: (product.price || 0) - (product.cost || 0),
          margin_percentage:
            product.price > 0
              ? (((product.price || 0) - (product.cost || 0)) / product.price) *
                100
              : 0,
          has_recipe: false,
          last_calculated: new Date(),
        };
      }

      // Calculate recipe cost
      const costData = await recipesService.calculateRecipeCost(recipe.id);

      // Product already loaded above, use it for price calculation
      const totalCost = costData.total_cost;
      const salePrice = product.price || 0;
      const grossMargin = salePrice - totalCost;
      const marginPercentage =
        salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;

      return {
        product_id: productId,
        product_name: product.name,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        total_cost: totalCost,
        sale_price: salePrice,
        gross_margin: grossMargin,
        margin_percentage: marginPercentage,
        has_recipe: true,
        last_calculated: new Date(),
      };
    } catch (error) {
      logger.error('Error calculating product COGS:', error);
      throw error;
    }
  }

  /**
   * Calculate COGS for multiple products
   */
  async calculateBulkCOGS(productIds: string[]): Promise<ProductCOGS[]> {
    const results = await Promise.allSettled(
      productIds.map((id) => this.calculateProductCOGS(id)),
    );

    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<ProductCOGS>).value);
  }

  /**
   * Get cost breakdown for a product
   */
  async getCostBreakdown(productId: string): Promise<CostBreakdown> {
    try {
      const recipe = await recipesService.getRecipeByProductId(productId);

      if (!recipe || !recipe.ingredients) {
        throw new Error('No recipe found for product');
      }

      // Campos reales del wire: inventory_item_name / cost_per_unit / total_cost
      const ingredients = recipe.ingredients.map((ing) => ({
        name: ing.inventory_item_name || 'Ingrediente',
        quantity: ing.quantity,
        unit: ing.unit,
        unit_cost: ing.cost_per_unit || 0,
        subtotal: ing.total_cost || 0,
      }));

      const totalIngredientsCost = ingredients.reduce(
        (sum, ing) => sum + ing.subtotal,
        0,
      );

      // Cost-model defaults — TODO: source these per-org/per-recipe from config
      // instead of hardcoded rates, so the COGS breakdown isn't a fixed estimate.
      const OVERHEAD_RATE = 0.12; // 12% of ingredient cost
      const PACKAGING_COST_PER_ITEM = 2.5; // flat $2.50 per item
      const LABOR_RATE = 0.2; // 20% of ingredient cost

      const overheadPercentage = OVERHEAD_RATE * 100;
      const overheadCost = totalIngredientsCost * OVERHEAD_RATE;
      const packagingCost = PACKAGING_COST_PER_ITEM;
      const laborCost = totalIngredientsCost * LABOR_RATE;

      const totalCOGS =
        totalIngredientsCost + overheadCost + packagingCost + laborCost;

      return {
        ingredients,
        total_ingredients_cost: totalIngredientsCost,
        overhead_percentage: overheadPercentage,
        overhead_cost: overheadCost,
        packaging_cost: packagingCost,
        labor_cost: laborCost,
        total_cogs: totalCOGS,
      };
    } catch (error) {
      logger.error('Error getting cost breakdown:', error);
      throw error;
    }
  }

  // ============================================================================
  // MARGIN ANALYSIS
  // ============================================================================

  /**
   * Analyze margin for a product and provide recommendations
   */
  async getMarginAnalysis(productId: string): Promise<MarginAnalysis> {
    const cogs = await this.calculateProductCOGS(productId);

    let status: 'excellent' | 'good' | 'warning' | 'critical';
    let recommendation: string | undefined;

    if (cogs.margin_percentage >= 70) {
      status = 'excellent';
      recommendation = 'Margen excelente. Mantener precio actual.';
    } else if (cogs.margin_percentage >= 60) {
      status = 'good';
      recommendation = 'Margen saludable. Monitorear costos.';
    } else if (cogs.margin_percentage >= 40) {
      status = 'warning';
      recommendation =
        'Margen bajo. Considerar reducir costos o aumentar precio.';
    } else {
      status = 'critical';
      recommendation =
        'Margen crítico. Revisar receta y ajustar precio inmediatamente.';
    }

    return {
      product_id: productId,
      product_name: cogs.product_name,
      margin_percentage: cogs.margin_percentage,
      margin_status: status,
      recommendation,
    };
  }

  /**
   * Get margin analysis for all products
   */
  async getBulkMarginAnalysis(
    organizationId: string,
  ): Promise<MarginAnalysis[]> {
    try {
      // Get all products
      const productsResponse = await api.get<any>(
        `/products?organization_id=${organizationId}`,
      );
      const products = this.unwrapArray<any>(productsResponse);

      const productIds = products.map((p) => p.id);

      const results = await Promise.allSettled(
        productIds.map((id) => this.getMarginAnalysis(id)),
      );

      return results
        .filter((result) => result.status === 'fulfilled')
        .map(
          (result) => (result as PromiseFulfilledResult<MarginAnalysis>).value,
        );
    } catch (error) {
      logger.error('Error getting bulk margin analysis:', error);
      throw error;
    }
  }

  // ============================================================================
  // PROFITABILITY REPORTS
  // ============================================================================

  /**
   * Generate comprehensive profitability report
   */
  async getProfitabilityReport(
    organizationId: string,
  ): Promise<ProfitabilityReport> {
    try {
      // Get all products
      const productsResponse = await api.get<any>(
        `/products?organization_id=${organizationId}`,
      );
      const products = this.unwrapArray<any>(productsResponse);

      // Calculate COGS for all products
      const productIds = products.map((p) => p.id);
      const cogsData = await this.calculateBulkCOGS(productIds);

      // Separate products with and without recipes
      const withRecipes = cogsData.filter((c) => c.has_recipe);
      const withoutRecipes = cogsData.filter((c) => !c.has_recipe);

      // Calculate average margin
      const avgMargin =
        cogsData.length > 0
          ? cogsData.reduce((sum, c) => sum + c.margin_percentage, 0) /
            cogsData.length
          : 0;

      // Sort by profitability
      const sorted = [...cogsData].sort(
        (a, b) => b.margin_percentage - a.margin_percentage,
      );

      // Get top and least profitable
      const topProfitable = sorted.slice(0, 5);
      const leastProfitable = sorted.slice(-5).reverse();

      // Margin distribution
      const distribution = {
        excellent: cogsData.filter((c) => c.margin_percentage >= 70).length,
        good: cogsData.filter(
          (c) => c.margin_percentage >= 60 && c.margin_percentage < 70,
        ).length,
        warning: cogsData.filter(
          (c) => c.margin_percentage >= 40 && c.margin_percentage < 60,
        ).length,
        critical: cogsData.filter((c) => c.margin_percentage < 40).length,
      };

      // Calculate totals
      const totalPotentialRevenue = cogsData.reduce(
        (sum, c) => sum + c.sale_price,
        0,
      );
      const totalCost = cogsData.reduce((sum, c) => sum + c.total_cost, 0);

      return {
        total_products: cogsData.length,
        with_recipes: withRecipes.length,
        without_recipes: withoutRecipes.length,
        avg_margin: avgMargin,
        top_profitable: topProfitable,
        least_profitable: leastProfitable,
        margin_distribution: distribution,
        total_potential_revenue: totalPotentialRevenue,
        total_cost: totalCost,
      };
    } catch (error) {
      logger.error('Error generating profitability report:', error);
      throw error;
    }
  }

  /**
   * Get recommended price for a product based on target margin
   */
  async getRecommendedPrice(
    productId: string,
    targetMarginPercentage: number = 65,
  ): Promise<{
    current_price: number;
    recommended_price: number;
    adjustment: number;
  }> {
    const cogs = await this.calculateProductCOGS(productId);

    // Formula: Price = Cost / (1 - Target Margin %)
    const recommendedPrice =
      cogs.total_cost / (1 - targetMarginPercentage / 100);
    const adjustment = recommendedPrice - cogs.sale_price;

    return {
      current_price: cogs.sale_price,
      recommended_price: Math.ceil(recommendedPrice), // Round up to nearest peso
      adjustment,
    };
  }

  // ============================================================================
  // RESPONSE HELPERS
  // ============================================================================

  private unwrapSingle<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as T;
    }
    return response as T;
  }

  private unwrapArray<T>(response: any): T[] {
    if (response && typeof response === 'object' && 'data' in response) {
      if (Array.isArray(response.data)) {
        return response.data as T[];
      }
      return [response.data] as T[];
    }

    if (Array.isArray(response)) {
      return response as T[];
    }

    return [response] as T[];
  }
}

export const costingService = new CostingService();

// Export types
export type { ProductCOGS, MarginAnalysis, ProfitabilityReport, CostBreakdown };
