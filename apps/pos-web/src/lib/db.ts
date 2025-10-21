/**
 * CoffeeOS POS Web - IndexedDB Manager
 * Gestión de base de datos local con idb para soporte offline
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Category, Modifier, Order, SyncQueueItem } from '@/types';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface CoffeeOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: {
      'by-category': string;
      'by-sku': string;
      'by-status': string;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: {
      'by-sort-order': number;
    };
  };
  modifiers: {
    key: string;
    value: Modifier;
  };
  orders: {
    key: string;
    value: Order;
    indexes: {
      'by-status': string;
      'by-date': Date;
      'by-sync-status': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-type': string;
      'by-created': Date;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updated_at: Date;
    };
  };
}

const DB_NAME = 'coffeeos-pos';
const DB_VERSION = 1;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let dbInstance: IDBPDatabase<CoffeeOSDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<CoffeeOSDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<CoffeeOSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productsStore = db.createObjectStore('products', { keyPath: 'id' });
        productsStore.createIndex('by-category', 'category_id');
        productsStore.createIndex('by-sku', 'sku');
        productsStore.createIndex('by-status', 'status');
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoriesStore.createIndex('by-sort-order', 'sort_order');
      }

      // Modifiers store
      if (!db.objectStoreNames.contains('modifiers')) {
        db.createObjectStore('modifiers', { keyPath: 'id' });
      }

      // Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
        ordersStore.createIndex('by-status', 'status');
        ordersStore.createIndex('by-date', 'created_at');
        ordersStore.createIndex('by-sync-status', 'payment_status');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-type', 'type');
        syncStore.createIndex('by-created', 'created_at');
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export async function getDB(): Promise<IDBPDatabase<CoffeeOSDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// ============================================================================
// PRODUCTS OPERATIONS
// ============================================================================

export async function saveProducts(products: Product[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');

  await Promise.all([
    ...products.map((product) => tx.store.put(product)),
    tx.done,
  ]);

  await saveMetadata('products-last-sync', new Date());
}

export async function getProducts(categoryId?: string): Promise<Product[]> {
  const db = await getDB();

  if (categoryId) {
    return await db.getAllFromIndex('products', 'by-category', categoryId);
  }

  return await db.getAll('products');
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const db = await getDB();
  return await db.get('products', id);
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const db = await getDB();
  const products = await db.getAllFromIndex('products', 'by-sku', sku);
  return products[0];
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDB();
  const allProducts = await db.getAll('products');

  const lowerQuery = query.toLowerCase();
  return allProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.sku.toLowerCase().includes(lowerQuery) ||
      product.description?.toLowerCase().includes(lowerQuery) ||
      product.barcode?.toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// CATEGORIES OPERATIONS
// ============================================================================

export async function saveCategories(categories: Category[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('categories', 'readwrite');

  await Promise.all([
    ...categories.map((category) => tx.store.put(category)),
    tx.done,
  ]);

  await saveMetadata('categories-last-sync', new Date());
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  return await db.getAllFromIndex('categories', 'by-sort-order');
}

// ============================================================================
// MODIFIERS OPERATIONS
// ============================================================================

export async function saveModifiers(modifiers: Modifier[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('modifiers', 'readwrite');

  await Promise.all([
    ...modifiers.map((modifier) => tx.store.put(modifier)),
    tx.done,
  ]);

  await saveMetadata('modifiers-last-sync', new Date());
}

export async function getModifiers(): Promise<Modifier[]> {
  const db = await getDB();
  return await db.getAll('modifiers');
}

// ============================================================================
// ORDERS OPERATIONS
// ============================================================================

export async function saveOrder(order: Order): Promise<void> {
  const db = await getDB();
  await db.put('orders', order);
}

export async function getOrders(): Promise<Order[]> {
  const db = await getDB();
  return await db.getAllFromIndex('orders', 'by-date');
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const db = await getDB();
  return await db.get('orders', id);
}

export async function deleteOrder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('orders', id);
}

// ============================================================================
// SYNC QUEUE OPERATIONS
// ============================================================================

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('syncQueue', item);
}

export async function getSyncQueue(status?: SyncQueueItem['status']): Promise<SyncQueueItem[]> {
  const db = await getDB();

  if (status) {
    return await db.getAllFromIndex('syncQueue', 'by-status', status);
  }

  return await db.getAll('syncQueue');
}

export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);

  if (item) {
    await db.put('syncQueue', { ...item, ...updates });
  }
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('syncQueue');
}

// ============================================================================
// METADATA OPERATIONS
// ============================================================================

export async function saveMetadata(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('metadata', {
    key,
    value,
    updated_at: new Date(),
  });
}

export async function getMetadata(key: string): Promise<any> {
  const db = await getDB();
  const record = await db.get('metadata', key);
  return record?.value;
}

export async function getLastSyncTime(entity: string): Promise<Date | null> {
  const value = await getMetadata(`${entity}-last-sync`);
  return value ? new Date(value) : null;
}

// ============================================================================
// DATABASE MANAGEMENT
// ============================================================================

export async function clearAllData(): Promise<void> {
  const db = await getDB();

  await Promise.all([
    db.clear('products'),
    db.clear('categories'),
    db.clear('modifiers'),
    db.clear('orders'),
    db.clear('syncQueue'),
    db.clear('metadata'),
  ]);

  console.log('All IndexedDB data cleared');
}

export async function getDatabaseStats(): Promise<{
  products: number;
  categories: number;
  modifiers: number;
  orders: number;
  syncQueue: number;
}> {
  const db = await getDB();

  const [products, categories, modifiers, orders, syncQueue] = await Promise.all([
    db.count('products'),
    db.count('categories'),
    db.count('modifiers'),
    db.count('orders'),
    db.count('syncQueue'),
  ]);

  return {
    products,
    categories,
    modifiers,
    orders,
    syncQueue,
  };
}

export async function exportDatabase(): Promise<string> {
  const db = await getDB();

  const data = {
    products: await db.getAll('products'),
    categories: await db.getAll('categories'),
    modifiers: await db.getAll('modifiers'),
    orders: await db.getAll('orders'),
    syncQueue: await db.getAll('syncQueue'),
    metadata: await db.getAll('metadata'),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

export async function importDatabase(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await getDB();

  // Clear existing data
  await clearAllData();

  // Import all stores
  const tx = db.transaction(
    ['products', 'categories', 'modifiers', 'orders', 'syncQueue', 'metadata'],
    'readwrite'
  );

  await Promise.all([
    ...data.products.map((item: Product) => tx.objectStore('products').put(item)),
    ...data.categories.map((item: Category) => tx.objectStore('categories').put(item)),
    ...data.modifiers.map((item: Modifier) => tx.objectStore('modifiers').put(item)),
    ...data.orders.map((item: Order) => tx.objectStore('orders').put(item)),
    ...data.syncQueue.map((item: SyncQueueItem) => tx.objectStore('syncQueue').put(item)),
    ...data.metadata.map((item: any) => tx.objectStore('metadata').put(item)),
    tx.done,
  ]);

  console.log('Database imported successfully');
}
