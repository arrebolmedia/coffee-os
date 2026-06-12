/**
 * CoffeeOS POS Web - Inventory Service
 * Servicio para gestión de inventario
 */

import { api } from '@/lib/api';

// Shape real del GET /inventory (backend mapea Prisma InventoryItem a snake_case)
export interface InventoryItem {
  id: string;
  organization_id: string;
  category_id: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  unit_of_measure: string;
  units_per_package: number;
  cost_per_unit: number;
  average_cost: number;
  track_inventory: boolean;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  par_level: number;
  is_perishable: boolean;
  is_taxable: boolean;
  requires_refrigeration: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface InventoryStats {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
  items_by_category: Array<{
    category: string;
    count: number;
    value: number;
  }>;
  lowStockItems?: Array<{
    id: string;
    name: string;
    product_name: string;
    current_stock: number;
    min_stock: number;
  }>;
}

export interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reason?: string;
  reference_id?: string;
  created_by: string;
  created_at: Date;
}

class InventoryService {
  private readonly baseUrl = '/inventory';

  /**
   * Obtener todos los items de inventario
   */
  async getInventoryItems(organizationId?: string): Promise<InventoryItem[]> {
    const params = new URLSearchParams();
    if (organizationId) {
      params.append('organization_id', organizationId);
    }
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    return await api.get<InventoryItem[]>(url);
  }

  /**
   * Obtener un item de inventario por ID
   */
  async getInventoryItem(id: string): Promise<InventoryItem> {
    return await api.get<InventoryItem>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtener estadísticas de inventario
   */
  async getInventoryStats(organizationId: string): Promise<InventoryStats> {
    return await api.get<InventoryStats>(
      `${this.baseUrl}/organization/${organizationId}/stats`,
    );
  }

  /**
   * Obtener valoración del inventario
   */
  async getInventoryValuation(organizationId: string): Promise<any> {
    return await api.get<any>(
      `${this.baseUrl}/organization/${organizationId}/valuation`,
    );
  }

  /**
   * Ajustar stock de un item
   */
  async adjustStock(
    id: string,
    quantity: number,
    operation: 'add' | 'subtract' | 'set',
    notes?: string,
  ): Promise<InventoryItem> {
    return await api.patch<InventoryItem>(`${this.baseUrl}/${id}/stock`, {
      quantity,
      operation,
      notes,
    });
  }

  /**
   * Obtener movimientos de inventario
   */
  async getMovements(itemId: string): Promise<InventoryMovement[]> {
    return await api.get<InventoryMovement[]>(
      `${this.baseUrl}/${itemId}/movements`,
    );
  }

  /**
   * Crear nuevo item de inventario
   */
  async createInventoryItem(
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> {
    return await api.post<InventoryItem>(this.baseUrl, data);
  }

  /**
   * Actualizar item de inventario
   */
  async updateInventoryItem(
    id: string,
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> {
    return await api.patch<InventoryItem>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Eliminar item de inventario
   */
  async deleteInventoryItem(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

export const inventoryService = new InventoryService();
export default InventoryService;
