/**
 * Categories Service - API calls for category management
 */

import { api } from '@/lib/api';

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  type: 'product' | 'inventory' | 'recipe' | 'expense';
  status: 'active' | 'inactive' | 'archived';
  parent_id?: string;
  display_order: number;
  icon?: string;
  color?: string;
  image_url?: string;
  is_featured: boolean;
  show_in_menu: boolean;
  allow_products: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface QueryCategoriesParams {
  organization_id?: string;
  type?: 'product' | 'inventory' | 'recipe' | 'expense';
  status?: 'active' | 'inactive' | 'archived';
  parent_id?: string | 'null';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCategoryDto {
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  type?: 'product' | 'inventory' | 'recipe' | 'expense';
  status?: 'active' | 'inactive' | 'archived';
  parent_id?: string;
  display_order?: number;
  icon?: string;
  color?: string;
  image_url?: string;
  is_featured?: boolean;
  show_in_menu?: boolean;
  allow_products?: boolean;
  tags?: string[];
}

class CategoriesService {
  private baseUrl = '/api/v1/categories';

  /**
   * Obtener lista de categorías
   */
  async getCategories(params?: QueryCategoriesParams): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryString = params
      ? new URLSearchParams(
          Object.entries(params).reduce(
            (acc, [key, value]) => {
              if (value !== undefined && value !== null) {
                acc[key] = String(value);
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
        ).toString()
      : '';

    return await api.get(
      queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl,
    );
  }

  /**
   * Obtener categoría por ID
   */
  async getCategoryById(id: string): Promise<Category> {
    return await api.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Crear categoría
   */
  async createCategory(data: CreateCategoryDto): Promise<Category> {
    return await api.post(this.baseUrl, data);
  }

  /**
   * Actualizar categoría
   */
  async updateCategory(
    id: string,
    data: Partial<CreateCategoryDto>,
  ): Promise<Category> {
    return await api.patch(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Eliminar categoría
   */
  async deleteCategory(id: string): Promise<void> {
    return await api.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtener árbol de categorías
   */
  async getCategoryTree(organizationId: string): Promise<Category[]> {
    return await api.get(`${this.baseUrl}/organization/${organizationId}/tree`);
  }

  /**
   * Obtener estadísticas
   */
  async getStats(organizationId: string): Promise<any> {
    return await api.get(
      `${this.baseUrl}/organization/${organizationId}/stats`,
    );
  }
}

export const categoriesService = new CategoriesService();
export default CategoriesService;
