/**
 * CoffeeOS POS Web - Inventory Automation Service
 * Servicio para automatización de inventario basado en recetas
 */

import { api } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface RecipeIngredientLink {
  id: string;
  recipe_id: string;
  recipe_ingredient_id: string;
  inventory_item_id: string;
  conversion_factor: number; // Factor de conversión (ej: 1 recipe unit = 0.03 kg inventory)
  unit_mapping: {
    recipe_unit: string;
    inventory_unit: string;
  };
  auto_deduct: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TheoreticalStock {
  inventory_item_id: string;
  inventory_item_name: string;
  physical_stock: number;
  theoretical_stock: number;
  discrepancy: number;
  discrepancy_percentage: number;
  last_reconciliation: Date | null;
  linked_recipes: Array<{
    recipe_id: string;
    recipe_name: string;
    times_sold: number;
    quantity_used: number;
  }>;
  organization_id?: string;
}

interface StockReconciliation {
  id: string;
  inventory_item_id: string;
  physical_count: number;
  theoretical_count: number;
  adjustment: number;
  reason: string;
  notes?: string;
  performed_by: string;
  performed_at: Date;
}

interface StockDeductionLog {
  id: string;
  order_id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity_deducted: number;
  unit: string;
  deducted_at: Date;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
}

interface AutoDeductConfig {
  organization_id: string;
  enabled: boolean;
  deduct_on_order_complete: boolean;
  deduct_on_order_paid: boolean;
  allow_negative_stock: boolean;
  send_low_stock_alerts: boolean;
  reconciliation_frequency: 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// INVENTORY AUTOMATION SERVICE
// ============================================================================

class InventoryAutomationService {
  private readonly baseUrl = '/inventory/automation';

  // ============================================================================
  // RECIPE-INVENTORY LINKING
  // ============================================================================

  /**
   * Get all ingredient links for a recipe
   */
  async getRecipeIngredientLinks(
    recipeId: string,
  ): Promise<RecipeIngredientLink[]> {
    try {
      const response = await api.get<any>(
        `${this.baseUrl}/recipes/${recipeId}/links`,
      );
      return this.unwrapArray<RecipeIngredientLink>(response);
    } catch (error) {
      console.error('Error fetching recipe ingredient links:', error);
      throw error;
    }
  }

  /**
   * Link a recipe ingredient to an inventory item
   */
  async linkRecipeIngredient(data: {
    recipe_id: string;
    recipe_ingredient_id: string;
    inventory_item_id: string;
    conversion_factor: number;
    unit_mapping: {
      recipe_unit: string;
      inventory_unit: string;
    };
    auto_deduct?: boolean;
  }): Promise<RecipeIngredientLink> {
    const response = await api.post<any>(`${this.baseUrl}/links`, data);
    return this.unwrapSingle<RecipeIngredientLink>(response);
  }

  /**
   * Update a recipe-inventory link
   */
  async updateRecipeIngredientLink(
    linkId: string,
    data: Partial<RecipeIngredientLink>,
  ): Promise<RecipeIngredientLink> {
    const response = await api.put<any>(`${this.baseUrl}/links/${linkId}`, {
      conversion_factor: data.conversion_factor,
      unit_mapping: data.unit_mapping,
      auto_deduct: data.auto_deduct,
    });
    return this.unwrapSingle<RecipeIngredientLink>(response);
  }

  /**
   * Delete a recipe-inventory link
   */
  async deleteRecipeIngredientLink(linkId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/links/${linkId}`);
  }

  /**
   * Auto-link recipe ingredients to inventory (AI matching)
   */
  async autoLinkRecipeIngredients(recipeId: string): Promise<{
    linked: number;
    failed: number;
    suggestions: Array<{
      recipe_ingredient_id: string;
      suggested_inventory_item_id: string;
      confidence: number;
    }>;
  }> {
    try {
      const response = await api.post<any>(
        `${this.baseUrl}/recipes/${recipeId}/auto-link`,
        {},
      );
      return this.unwrapSingle(response);
    } catch (error) {
      console.error('Error auto-linking ingredients:', error);
      throw error;
    }
  }

  // ============================================================================
  // THEORETICAL STOCK CALCULATION
  // ============================================================================

  /**
   * Calculate theoretical stock for an inventory item
   */
  async calculateTheoreticalStock(
    inventoryItemId: string,
    startDate?: Date,
  ): Promise<TheoreticalStock> {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }

    const response = await api.get<any>(
      `${this.baseUrl}/theoretical-stock/${inventoryItemId}?${params.toString()}`,
    );
    return this.unwrapSingle<TheoreticalStock>(response);
  }

  /**
   * Get theoretical stock for all items in organization
   */
  async getOrganizationTheoreticalStock(
    organizationId: string,
    filters?: {
      show_discrepancies_only?: boolean;
      min_discrepancy_percentage?: number;
    },
  ): Promise<TheoreticalStock[]> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.show_discrepancies_only) {
      params.append('show_discrepancies_only', 'true');
    }
    if (filters?.min_discrepancy_percentage !== undefined) {
      params.append(
        'min_discrepancy_percentage',
        filters.min_discrepancy_percentage.toString(),
      );
    }

    const response = await api.get<any>(
      `${this.baseUrl}/theoretical-stock?${params.toString()}`,
    );
    return this.unwrapArray<TheoreticalStock>(response);
  }

  // ============================================================================
  // AUTOMATIC STOCK DEDUCTION
  // ============================================================================

  /**
   * Deduct stock for an order (called when order is completed)
   */
  async deductStockForOrder(orderId: string): Promise<{
    deductions: StockDeductionLog[];
    total_items_deducted: number;
    failed_deductions: Array<{
      recipe_id: string;
      inventory_item_id: string;
      reason: string;
    }>;
  }> {
    try {
      const response = await api.post<any>(
        `${this.baseUrl}/deduct/order/${orderId}`,
        {},
      );
      return this.unwrapSingle(response);
    } catch (error) {
      console.error('Error deducting stock for order:', error);
      throw error;
    }
  }

  /**
   * Preview stock deduction for an order (without actually deducting)
   */
  async previewStockDeduction(orderId: string): Promise<{
    items: Array<{
      inventory_item_id: string;
      inventory_item_name: string;
      current_stock: number;
      quantity_to_deduct: number;
      stock_after_deduction: number;
      will_go_negative: boolean;
    }>;
    warnings: string[];
  }> {
    const response = await api.get<any>(
      `${this.baseUrl}/deduct/order/${orderId}/preview`,
    );
    return this.unwrapSingle(response);
  }

  /**
   * Reverse stock deduction (for order cancellation/refund)
   */
  async reverseStockDeduction(orderId: string): Promise<{
    reversed: number;
    failed: number;
  }> {
    const response = await api.post<any>(
      `${this.baseUrl}/deduct/order/${orderId}/reverse`,
      {},
    );
    return this.unwrapSingle(response);
  }

  /**
   * Get stock deduction logs
   */
  async getStockDeductionLogs(filters: {
    organization_id: string;
    start_date?: Date;
    end_date?: Date;
    inventory_item_id?: string;
    status?: StockDeductionLog['status'];
  }): Promise<StockDeductionLog[]> {
    const params = new URLSearchParams();
    params.append('organization_id', filters.organization_id);

    if (filters.start_date) {
      params.append('start_date', filters.start_date.toISOString());
    }
    if (filters.end_date) {
      params.append('end_date', filters.end_date.toISOString());
    }
    if (filters.inventory_item_id) {
      params.append('inventory_item_id', filters.inventory_item_id);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }

    const response = await api.get<any>(
      `${this.baseUrl}/deduction-logs?${params.toString()}`,
    );
    return this.unwrapArray<StockDeductionLog>(response);
  }

  // ============================================================================
  // STOCK RECONCILIATION
  // ============================================================================

  /**
   * Create a stock reconciliation (manual count vs theoretical)
   */
  async createReconciliation(data: {
    inventory_item_id: string;
    physical_count: number;
    reason: string;
    notes?: string;
    performed_by: string;
  }): Promise<StockReconciliation> {
    const response = await api.post<any>(`${this.baseUrl}/reconciliation`, {
      ...data,
      performed_at: new Date(),
    });
    return this.unwrapSingle<StockReconciliation>(response);
  }

  /**
   * Get reconciliation history
   */
  async getReconciliationHistory(
    inventoryItemId: string,
    limit = 10,
  ): Promise<StockReconciliation[]> {
    const response = await api.get<any>(
      `${this.baseUrl}/reconciliation/${inventoryItemId}?limit=${limit}`,
    );
    return this.unwrapArray<StockReconciliation>(response);
  }

  /**
   * Bulk reconciliation for multiple items
   */
  async bulkReconciliation(
    items: Array<{
      inventory_item_id: string;
      physical_count: number;
      notes?: string;
    }>,
    performedBy: string,
  ): Promise<{
    reconciled: number;
    failed: number;
    results: StockReconciliation[];
  }> {
    const response = await api.post<any>(
      `${this.baseUrl}/reconciliation/bulk`,
      {
        items,
        performed_by: performedBy,
      },
    );
    return this.unwrapSingle(response);
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get auto-deduction configuration
   */
  async getAutoDeductConfig(organizationId: string): Promise<AutoDeductConfig> {
    const response = await api.get<any>(
      `${this.baseUrl}/config/${organizationId}`,
    );
    return this.unwrapSingle<AutoDeductConfig>(response);
  }

  /**
   * Update auto-deduction configuration
   */
  async updateAutoDeductConfig(
    organizationId: string,
    config: Partial<AutoDeductConfig>,
  ): Promise<AutoDeductConfig> {
    const response = await api.put<any>(
      `${this.baseUrl}/config/${organizationId}`,
      config,
    );
    return this.unwrapSingle<AutoDeductConfig>(response);
  }

  // ============================================================================
  // ANALYTICS & REPORTS
  // ============================================================================

  /**
   * Get inventory accuracy report
   */
  async getInventoryAccuracyReport(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<{
    overall_accuracy: number;
    total_items_tracked: number;
    items_with_discrepancies: number;
    total_value_discrepancy: number;
    top_discrepancies: Array<{
      item_name: string;
      discrepancy_percentage: number;
      value_lost: number;
    }>;
  }> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);
    params.append('start_date', dateRange.start.toISOString());
    params.append('end_date', dateRange.end.toISOString());

    const response = await api.get<any>(
      `${this.baseUrl}/reports/accuracy?${params.toString()}`,
    );
    return this.unwrapSingle(response);
  }

  /**
   * Get ingredient usage report
   */
  async getIngredientUsageReport(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<
    Array<{
      inventory_item_id: string;
      inventory_item_name: string;
      total_quantity_used: number;
      unit: string;
      used_in_recipes: Array<{
        recipe_name: string;
        times_sold: number;
        quantity_used: number;
      }>;
      cost_of_goods_used: number;
    }>
  > {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);
    params.append('start_date', dateRange.start.toISOString());
    params.append('end_date', dateRange.end.toISOString());

    const response = await api.get<any>(
      `${this.baseUrl}/reports/usage?${params.toString()}`,
    );
    return this.unwrapArray(response);
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

export const inventoryAutomationService = new InventoryAutomationService();

// Export types
export type {
  RecipeIngredientLink,
  TheoreticalStock,
  StockReconciliation,
  StockDeductionLog,
  AutoDeductConfig,
};
