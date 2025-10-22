/**
 * CoffeeOS Admin - Product Service
 * Handles product CRUD operations and image uploads
 */

import { apiClient } from '@/lib/api-client';
import { Product, PaginatedResponse, ListParams } from '@/types';

export interface CreateProductData {
  name: string;
  description?: string;
  type: 'SIMPLE' | 'COMBO' | 'VARIABLE';
  category_id?: string;
  price: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  track_inventory?: boolean;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  tags?: string[];
}

export interface UpdateProductData extends Partial<CreateProductData> {
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export interface BulkDeleteData {
  product_ids: string[];
}

export interface BulkUpdateStatusData {
  product_ids: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export interface BulkUpdateCategoryData {
  product_ids: string[];
  category_id: string;
}

export interface ProductImageUploadResponse {
  product: Product;
  image: {
    url: string;
    thumbnails: {
      small: string;
      medium: string;
      large: string;
    };
  };
}

class ProductService {
  private readonly basePath = '/products';

  /**
   * Get paginated list of products
   */
  async getProducts(params?: ListParams): Promise<PaginatedResponse<Product>> {
    try {
      const queryParams: any = {
        page: params?.page || 1,
        per_page: params?.per_page || 10,
      };

      if (params?.search) {
        queryParams.search = params.search;
      }

      if (params?.sort_by) {
        queryParams.sort_by = params.sort_by;
        queryParams.sort_order = params.sort_order || 'asc';
      }

      if (params?.filters) {
        Object.assign(queryParams, params.filters);
      }

      return await apiClient.get<PaginatedResponse<Product>>(this.basePath, queryParams);
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<Product> {
    try {
      return await apiClient.get<Product>(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Get product error:', error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      return await apiClient.post<Product>(this.basePath, data);
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    try {
      return await apiClient.put<Product>(`${this.basePath}/${id}`, data);
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete products
   */
  async bulkDelete(data: BulkDeleteData): Promise<{ deleted_count: number }> {
    try {
      return await apiClient.post<{ deleted_count: number }>(
        `${this.basePath}/bulk-delete`,
        data
      );
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateStatus(data: BulkUpdateStatusData): Promise<{ updated_count: number }> {
    try {
      return await apiClient.post<{ updated_count: number }>(
        `${this.basePath}/bulk-update-status`,
        data
      );
    } catch (error) {
      console.error('Bulk update status error:', error);
      throw error;
    }
  }

  /**
   * Bulk update product category
   */
  async bulkUpdateCategory(data: BulkUpdateCategoryData): Promise<{ updated_count: number }> {
    try {
      return await apiClient.post<{ updated_count: number }>(
        `${this.basePath}/bulk-update-category`,
        data
      );
    } catch (error) {
      console.error('Bulk update category error:', error);
      throw error;
    }
  }

  /**
   * Upload product image
   */
  async uploadImage(
    productId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ProductImageUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      return await apiClient.uploadFormData<ProductImageUploadResponse>(
        `${this.basePath}/${productId}/upload-image`,
        formData,
        'POST',
        onProgress
      );
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  }

  /**
   * Delete product image
   */
  async deleteImage(productId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/${productId}/image`);
    } catch (error) {
      console.error('Delete image error:', error);
      throw error;
    }
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await this.getProducts({
        search: query,
        per_page: 50,
      });
      return response.data;
    } catch (error) {
      console.error('Search products error:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string, params?: ListParams): Promise<PaginatedResponse<Product>> {
    try {
      return await this.getProducts({
        ...params,
        filters: {
          category_id: categoryId,
        },
      });
    } catch (error) {
      console.error('Get products by category error:', error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const response = await this.getProducts({
        filters: {
          low_stock: true,
        },
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      console.error('Get low stock products error:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();
