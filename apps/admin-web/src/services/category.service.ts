/**
 * CoffeeOS Admin - Category Service
 * Handles category CRUD operations
 */

import { apiClient } from '@/lib/api-client';
import { Category, PaginatedResponse, ListParams } from '@/types';

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  is_active?: boolean;
}

export interface ReorderCategoriesData {
  categories: Array<{
    id: string;
    sort_order: number;
  }>;
}

class CategoryService {
  private readonly basePath = '/categories';

  /**
   * Get all categories (no pagination for categories)
   */
  async getCategories(params?: ListParams): Promise<Category[]> {
    try {
      const queryParams: any = {};

      if (params?.search) {
        queryParams.search = params.search;
      }

      if (params?.filters) {
        Object.assign(queryParams, params.filters);
      }

      return await apiClient.get<Category[]>(this.basePath, queryParams);
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }

  /**
   * Get single category by ID
   */
  async getCategory(id: string): Promise<Category> {
    try {
      return await apiClient.get<Category>(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Get category error:', error);
      throw error;
    }
  }

  /**
   * Create new category
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      return await apiClient.post<Category>(this.basePath, data);
    } catch (error) {
      console.error('Create category error:', error);
      throw error;
    }
  }

  /**
   * Update existing category
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    try {
      return await apiClient.put<Category>(`${this.basePath}/${id}`, data);
    } catch (error) {
      console.error('Update category error:', error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Delete category error:', error);
      throw error;
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(data: ReorderCategoriesData): Promise<void> {
    try {
      await apiClient.post(`${this.basePath}/reorder`, data);
    } catch (error) {
      console.error('Reorder categories error:', error);
      throw error;
    }
  }

  /**
   * Get active categories only
   */
  async getActiveCategories(): Promise<Category[]> {
    try {
      return await this.getCategories({
        filters: {
          is_active: true,
        },
      });
    } catch (error) {
      console.error('Get active categories error:', error);
      throw error;
    }
  }
}

export const categoryService = new CategoryService();
