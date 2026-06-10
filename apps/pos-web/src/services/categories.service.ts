/**
 * Categories Service - API calls for category management
 */

import { api } from '@/lib/api';

/**
 * Modelo real del backend (Prisma Category).
 * El schema NO tiene slug, type, parent_id, is_featured, show_in_menu,
 * allow_products, image_url ni tags — eran campos fantasma.
 */
export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  products?: Array<{ id: string; name: string }>;
}

/**
 * Filtros que el backend (QueryCategoriesDto + CategoriesService.findAll)
 * realmente aplica. organization_id se infiere del usuario autenticado.
 */
export interface QueryCategoriesParams {
  status?: 'active' | 'inactive';
  search?: string;
  sort_by?: 'name' | 'display_order' | 'created_at';
  order?: 'asc' | 'desc';
}

/**
 * Campos del CreateCategoryDto del backend que el servicio Prisma usa.
 * (El DTO backend es snake_case; display_order → sortOrder,
 * status 'active' → active: true.)
 */
export interface CreateCategoryDto {
  organization_id: string;
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
  display_order?: number;
  icon?: string;
  color?: string;
}

class CategoriesService {
  private baseUrl = '/categories';

  /**
   * Obtener lista de categorías.
   * El backend devuelve un array plano (sin paginación).
   */
  async getCategories(params?: QueryCategoriesParams): Promise<Category[]> {
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
