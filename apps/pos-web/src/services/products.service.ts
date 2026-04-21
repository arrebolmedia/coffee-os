/**
 * CoffeeOS POS Web - Products Service
 * Servicio para gestión de productos y catálogo
 */

import { api } from '@/lib/api';
import {
  Product,
  Category,
  Modifier,
  ProductFilters,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

class ProductsService {
  private readonly baseUrl = '/products';

  // ============================================================================
  // PRODUCTS
  // ============================================================================

  async getProducts(
    organizationId: string,
    filters?: ProductFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.in_stock !== undefined)
      params.append('in_stock', String(filters.in_stock));

    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));
    if (pagination?.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination?.sort_order)
      params.append('sort_order', pagination.sort_order);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

    const response = await api.get<any>(url);

    const products: Product[] = this.unwrapArray<Product>(response);
    const total = this.resolveNumber(response, 'total', products.length);
    const limitFallback = pagination?.limit ?? (products.length || 1);
    const limit = this.resolveNumber(response, 'limit', limitFallback) || 1;
    const page = this.resolveNumber(response, 'page', pagination?.page ?? 1);
    const totalPages = this.resolveNumber(
      response,
      'totalPages',
      Math.max(1, Math.ceil(total / (limit || 1))),
    );

    return {
      data: products,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<any>(`${this.baseUrl}/${id}`);
    return this.unwrapSingle<Product>(response);
  }

  async getProductBySku(sku: string, organizationId: string): Promise<Product> {
    const response = await api.get<any>(
      `${this.baseUrl}/sku/${sku}?organization_id=${organizationId}`,
    );
    return this.unwrapSingle<Product>(response);
  }

  async getProductByBarcode(
    barcode: string,
    organizationId: string,
  ): Promise<Product> {
    const response = await api.get<any>(
      `${this.baseUrl}/barcode/${barcode}?organization_id=${organizationId}`,
    );
    return this.unwrapSingle<Product>(response);
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await api.post<any>(this.baseUrl, data);
    return this.unwrapSingle<Product>(response);
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await api.put<any>(`${this.baseUrl}/${id}`, data);
    return this.unwrapSingle<Product>(response);
  }

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  async getCategories(organizationId: string): Promise<Category[]> {
    const response = await api.get<any>(`/categories`);
    return this.unwrapArray<Category>(response);
  }

  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get<any>(`/categories/${id}`);
    return this.unwrapSingle<Category>(response);
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response = await api.post<any>('/categories', data);
    return this.unwrapSingle<Category>(response);
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const response = await api.put<any>(`/categories/${id}`, data);
    return this.unwrapSingle<Category>(response);
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  }

  // ============================================================================
  // MODIFIERS
  // ============================================================================

  async getModifiers(organizationId: string): Promise<Modifier[]> {
    const response = await api.get<any>(
      `/modifiers?organization_id=${organizationId}`,
    );
    return this.unwrapArray<Modifier>(response);
  }

  async getModifierById(id: string): Promise<Modifier> {
    const response = await api.get<any>(`/modifiers/${id}`);
    return this.unwrapSingle<Modifier>(response);
  }

  async createModifier(data: Partial<Modifier>): Promise<Modifier> {
    const response = await api.post<any>('/modifiers', data);
    return this.unwrapSingle<Modifier>(response);
  }

  async updateModifier(id: string, data: Partial<Modifier>): Promise<Modifier> {
    const response = await api.put<any>(`/modifiers/${id}`, data);
    return this.unwrapSingle<Modifier>(response);
  }

  async deleteModifier(id: string): Promise<void> {
    await api.delete(`/modifiers/${id}`);
  }

  // ============================================================================
  // STOCK OPERATIONS
  // ============================================================================

  async checkStock(
    productId: string,
  ): Promise<{ in_stock: boolean; quantity: number }> {
    const response = await api.get<any>(`${this.baseUrl}/${productId}/stock`);
    return this.unwrapSingle<{ in_stock: boolean; quantity: number }>(response);
  }

  async updateStock(
    productId: string,
    quantity: number,
    reason?: string,
  ): Promise<void> {
    await api.patch(`${this.baseUrl}/${productId}/stock`, {
      quantity,
      reason,
    });
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
    if (Array.isArray(response)) {
      return response as T[];
    }
    if (
      response &&
      typeof response === 'object' &&
      Array.isArray(response.data)
    ) {
      return response.data as T[];
    }
    return [];
  }

  private resolveNumber(response: any, key: string, fallback: number): number {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const value = response[key];
      if (typeof value === 'number' && !isNaN(value)) {
        return value;
      }
    }
    return fallback;
  }
}

export const productsService = new ProductsService();
export default ProductsService;
