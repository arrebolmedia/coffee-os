/**
 * Category Interface
 * Sistema jerárquico de categorías para organización del menú
 */

export enum CategoryType {
  PRODUCT = 'product',         // Categoría de productos
  INVENTORY = 'inventory',     // Categoría de inventario
  RECIPE = 'recipe',           // Categoría de recetas
  EXPENSE = 'expense',         // Categoría de gastos
}

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export interface Category {
  // Identificación
  id: string;
  organization_id: string;
  
  // Información básica
  name: string;
  slug: string;                // URL-friendly name
  description?: string;
  
  // Tipo y clasificación
  type: CategoryType;
  status: CategoryStatus;
  
  // Jerarquía
  parent_id?: string;          // Categoría padre (null = raíz)
  level: number;               // 0 = raíz, 1 = hijo, 2 = nieto, etc.
  path: string;                // /beverages/coffee/hot
  
  // Display
  display_order: number;
  icon?: string;               // Nombre del icono (coffee, food, etc.)
  color?: string;              // Color hex para UI
  image_url?: string;
  
  // Flags
  is_featured: boolean;
  show_in_menu: boolean;
  allow_products: boolean;     // Permite productos en esta categoría
  
  // Metadata
  tags: string[];
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
  product_count?: number;      // Productos en esta categoría
  total_product_count?: number; // Productos incluyendo subcategorías
}

export interface CategoryStats {
  total_categories: number;
  by_type: Record<CategoryType, number>;
  by_status: Record<CategoryStatus, number>;
  by_level: Record<number, number>;
  total_products: number;
  average_products_per_category: number;
  categories_without_products: number;
}

export interface CategoryMove {
  category_id: string;
  new_parent_id?: string;      // null = mover a raíz
  new_display_order?: number;
}

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
  level: number;
}
