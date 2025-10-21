/**
 * CoffeeOS POS Web - Products Service
 * Servicio para gestión de productos y catálogo
 */

import { apiClient } from '@/lib/api-client';
import {
  Product,
  Category,
  Modifier,
  ProductFilters,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

class ProductsService {
  private readonly baseUrl = '/products';

  // ============================================================================
  // PRODUCTS
  // ============================================================================

  async getProducts(
    organizationId: string,
    filters?: ProductFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    params.append('organization_id', organizationId);

    if (filters?.search) params.append('search', filters.search);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.in_stock !== undefined) params.append('in_stock', String(filters.in_stock));

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order) params.append('sort_order', pagination.sort_order);

    const response = await apiClient.get<PaginatedResponse<Product>>(
      `${this.baseUrl}?${params.toString()}`
    );
    return response.data;
  }

  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getProductBySku(sku: string, organizationId: string): Promise<Product> {
    const response = await apiClient.get<Product>(
      `${this.baseUrl}/sku/${sku}?organization_id=${organizationId}`
    );
    return response.data;
  }

  async getProductByBarcode(barcode: string, organizationId: string): Promise<Product> {
    const response = await apiClient.get<Product>(
      `${this.baseUrl}/barcode/${barcode}?organization_id=${organizationId}`
    );
    return response.data;
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post<Product>(this.baseUrl, data);
    return response.data;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.put<Product>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  async getCategories(organizationId: string): Promise<Category[]> {
    const response = await apiClient.get<Category[]>(
      `/categories?organization_id=${organizationId}`
    );
    return response.data;
  }

  async getCategoryById(id: string): Promise<Category> {
    const response = await apiClient.get<Category>(`/categories/${id}`);
    return response.data;
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response = await apiClient.post<Category>('/categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const response = await apiClient.put<Category>(`/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  }

  // ============================================================================
  // MODIFIERS
  // ============================================================================

  async getModifiers(organizationId: string): Promise<Modifier[]> {
    const response = await apiClient.get<Modifier[]>(
      `/modifiers?organization_id=${organizationId}`
    );
    return response.data;
  }

  async getModifierById(id: string): Promise<Modifier> {
    const response = await apiClient.get<Modifier>(`/modifiers/${id}`);
    return response.data;
  }

  async createModifier(data: Partial<Modifier>): Promise<Modifier> {
    const response = await apiClient.post<Modifier>('/modifiers', data);
    return response.data;
  }

  async updateModifier(id: string, data: Partial<Modifier>): Promise<Modifier> {
    const response = await apiClient.put<Modifier>(`/modifiers/${id}`, data);
    return response.data;
  }

  async deleteModifier(id: string): Promise<void> {
    await apiClient.delete(`/modifiers/${id}`);
  }

  // ============================================================================
  // STOCK OPERATIONS
  // ============================================================================

  async checkStock(productId: string): Promise<{ in_stock: boolean; quantity: number }> {
    const response = await apiClient.get<{ in_stock: boolean; quantity: number }>(
      `${this.baseUrl}/${productId}/stock`
    );
    return response.data;
  }

  async updateStock(productId: string, quantity: number, reason?: string): Promise<void> {
    await apiClient.patch(`${this.baseUrl}/${productId}/stock`, { quantity, reason });
  }
}

export const productsService = new ProductsService();
export default ProductsService;
