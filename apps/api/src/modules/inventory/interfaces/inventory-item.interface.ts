/**
 * Inventory Item Interface
 * Items de inventario (ingredientes, insumos, materiales)
 */

export enum ItemType {
  INGREDIENT = 'ingredient',     // Ingrediente para recetas
  SUPPLY = 'supply',             // Insumo (vasos, servilletas)
  MATERIAL = 'material',         // Material (bolsas, cajas)
  EQUIPMENT = 'equipment',       // Equipo (máquinas, herramientas)
}

export enum ItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

export enum UnitOfMeasure {
  // Peso
  KILOGRAM = 'kg',
  GRAM = 'g',
  POUND = 'lb',
  OUNCE = 'oz',
  
  // Volumen
  LITER = 'l',
  MILLILITER = 'ml',
  GALLON = 'gal',
  FLUID_OUNCE = 'fl_oz',
  
  // Unidades
  UNIT = 'unit',
  PIECE = 'piece',
  BOX = 'box',
  BAG = 'bag',
  BOTTLE = 'bottle',
  CAN = 'can',
}

export interface InventoryItem {
  // Identificación
  id: string;
  organization_id: string;
  category_id?: string;         // Link a Categories
  supplier_id?: string;         // Link a Suppliers
  
  // Información básica
  sku: string;                  // Único por organización
  name: string;
  description?: string;
  brand?: string;
  
  // Tipo y estado
  type: ItemType;
  status: ItemStatus;
  
  // Unidades de medida
  unit_of_measure: UnitOfMeasure;
  units_per_package?: number;   // Unidades por paquete
  package_size?: number;        // Tamaño del paquete
  
  // Costos
  cost_per_unit: number;        // Costo unitario
  average_cost?: number;        // Costo promedio (FIFO/LIFO)
  last_purchase_cost?: number;
  last_purchase_date?: Date;
  
  // Inventario
  track_inventory: boolean;
  current_stock: number;        // Stock actual total
  minimum_stock: number;        // Stock mínimo (reorder point)
  maximum_stock?: number;       // Stock máximo
  par_level?: number;           // Par level ideal
  
  // Conversiones
  conversion_factor?: number;   // Factor de conversión (ej: 1kg = 1000g)
  conversion_unit?: UnitOfMeasure;
  
  // Proveedores
  lead_time_days?: number;      // Tiempo de entrega del proveedor
  order_frequency_days?: number; // Frecuencia de pedido
  
  // Flags
  is_perishable: boolean;
  is_taxable: boolean;
  requires_refrigeration: boolean;
  
  // Storage
  storage_location?: string;
  storage_temperature_min?: number;
  storage_temperature_max?: number;
  
  // Metadata
  tags: string[];
  barcode?: string;
  image_url?: string;
  notes?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemStock {
  item_id: string;
  location_id?: string;
  quantity: number;
  reserved_quantity?: number;   // Stock reservado en órdenes
  available_quantity: number;   // quantity - reserved_quantity
  last_count_date?: Date;
  last_count_quantity?: number;
}

export interface InventoryItemStats {
  total_items: number;
  by_type: Record<ItemType, number>;
  by_status: Record<ItemStatus, number>;
  total_value: number;          // sum(current_stock × cost_per_unit)
  low_stock_count: number;      // current_stock <= minimum_stock
  out_of_stock_count: number;   // current_stock = 0
  perishable_count: number;
}

export interface InventoryItemValuation {
  item_id: string;
  name: string;
  sku: string;
  current_stock: number;
  cost_per_unit: number;
  total_value: number;          // current_stock × cost_per_unit
  percentage_of_total: number;
}

export interface StockMovement {
  id: string;
  item_id: string;
  location_id?: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'waste' | 'return';
  quantity: number;             // Positivo = ingreso, Negativo = salida
  cost_per_unit?: number;
  reference_id?: string;        // ID de la orden/transacción que generó el movimiento
  notes?: string;
  created_at: Date;
  created_by?: string;
}
