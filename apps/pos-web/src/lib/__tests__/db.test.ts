import { openDB } from 'idb';
import {
  initDB,
  saveProducts,
  getProducts,
  searchProducts,
  getProductBySku,
  saveCategories,
  getCategories,
  saveOrder,
  getOrders,
  addToSyncQueue,
  getSyncQueue,
  updateSyncQueueItem,
  removeSyncQueueItem,
  saveMetadata,
  getLastSyncTime,
  getDatabaseStats,
  clearAllData,
} from '../db';
import type { Product, Category, Order } from '@/types';

// Mock idb
jest.mock('idb');

describe('IndexedDB Manager', () => {
  const mockDB = {
    transaction: jest.fn(),
    close: jest.fn(),
  };

  const mockTransaction = {
    objectStore: jest.fn(),
    done: Promise.resolve(),
  };

  const mockStore = {
    put: jest.fn(),
    add: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    count: jest.fn(),
    index: jest.fn(),
  };

  const mockIndex = {
    getAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (openDB as jest.Mock).mockResolvedValue(mockDB);
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockStore);
    mockStore.index.mockReturnValue(mockIndex);
  });

  describe('initDB', () => {
    it('should initialize database with correct schema', async () => {
      const mockUpgrade = jest.fn();
      (openDB as jest.Mock).mockImplementation(
        (name, version, { upgrade }) => {
          upgrade(mockUpgrade);
          return Promise.resolve(mockDB);
        }
      );

      await initDB();

      expect(openDB).toHaveBeenCalledWith(
        'coffeeos-pos',
        1,
        expect.any(Object)
      );
    });
  });

  describe('Products', () => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Espresso',
        sku: 'ESP001',
        price: 45,
        categoryId: 'cat1',
        status: 'active',
        image: '/espresso.jpg',
        taxRate: 0.16,
        modifiers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Cappuccino',
        sku: 'CAP001',
        price: 55,
        categoryId: 'cat1',
        status: 'active',
        image: '/cappuccino.jpg',
        taxRate: 0.16,
        modifiers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should save products to database', async () => {
      mockStore.put.mockResolvedValue(undefined);

      await saveProducts(mockProducts);

      expect(mockDB.transaction).toHaveBeenCalledWith('products', 'readwrite');
      expect(mockStore.put).toHaveBeenCalledTimes(2);
    });

    it('should retrieve all products', async () => {
      mockStore.getAll.mockResolvedValue(mockProducts);

      const products = await getProducts();

      expect(products).toEqual(mockProducts);
      expect(mockDB.transaction).toHaveBeenCalledWith('products', 'readonly');
    });

    it('should search products by name', async () => {
      mockStore.getAll.mockResolvedValue(mockProducts);

      const results = await searchProducts('espr');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Espresso');
    });

    it('should filter products by category', async () => {
      mockIndex.getAll.mockResolvedValue([mockProducts[0]]);

      const results = await searchProducts('', 'cat1');

      expect(mockStore.index).toHaveBeenCalledWith('by-category');
      expect(mockIndex.getAll).toHaveBeenCalledWith('cat1');
    });

    it('should get product by SKU', async () => {
      mockIndex.getAll.mockResolvedValue([mockProducts[0]]);

      const product = await getProductBySku('ESP001');

      expect(mockStore.index).toHaveBeenCalledWith('by-sku');
      expect(product).toEqual(mockProducts[0]);
    });

    it('should return null for non-existent SKU', async () => {
      mockIndex.getAll.mockResolvedValue([]);

      const product = await getProductBySku('INVALID');

      expect(product).toBeNull();
    });
  });

  describe('Categories', () => {
    const mockCategories: Category[] = [
      {
        id: 'cat1',
        name: 'Bebidas Calientes',
        description: 'Café y té',
        sortOrder: 1,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cat2',
        name: 'Alimentos',
        description: 'Pasteles y snacks',
        sortOrder: 2,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should save categories', async () => {
      mockStore.put.mockResolvedValue(undefined);

      await saveCategories(mockCategories);

      expect(mockStore.put).toHaveBeenCalledTimes(2);
    });

    it('should retrieve all categories', async () => {
      mockStore.getAll.mockResolvedValue(mockCategories);

      const categories = await getCategories();

      expect(categories).toEqual(mockCategories);
    });
  });

  describe('Orders', () => {
    const mockOrder: Order = {
      id: 'order1',
      orderNumber: 'ORD-001',
      items: [
        {
          productId: '1',
          name: 'Espresso',
          quantity: 2,
          unitPrice: 45,
          total: 90,
          modifiers: [],
        },
      ],
      subtotal: 90,
      tax: 14.4,
      total: 104.4,
      status: 'pending',
      paymentMethod: 'cash',
      customerId: 'cust1',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    it('should save order', async () => {
      mockStore.put.mockResolvedValue(undefined);

      await saveOrder(mockOrder);

      expect(mockDB.transaction).toHaveBeenCalledWith('orders', 'readwrite');
      expect(mockStore.put).toHaveBeenCalledWith(mockOrder);
    });

    it('should retrieve orders with filters', async () => {
      const mockOrders = [mockOrder];
      mockStore.getAll.mockResolvedValue(mockOrders);

      const orders = await getOrders('pending');

      expect(orders).toEqual(mockOrders);
    });
  });

  describe('Sync Queue', () => {
    const mockQueueItem = {
      id: 'sync1',
      type: 'order' as const,
      action: 'create' as const,
      data: { id: 'order1', total: 100 },
      status: 'pending' as const,
      retries: 0,
      createdAt: new Date(),
    };

    it('should add item to sync queue', async () => {
      mockStore.add.mockResolvedValue('sync1');

      const id = await addToSyncQueue(mockQueueItem);

      expect(id).toBe('sync1');
      expect(mockStore.add).toHaveBeenCalledWith(mockQueueItem);
    });

    it('should get sync queue', async () => {
      mockStore.getAll.mockResolvedValue([mockQueueItem]);

      const queue = await getSyncQueue();

      expect(queue).toEqual([mockQueueItem]);
    });

    it('should update sync queue item', async () => {
      mockStore.put.mockResolvedValue(undefined);

      await updateSyncQueueItem('sync1', { status: 'syncing' });

      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should remove sync queue item', async () => {
      mockStore.delete.mockResolvedValue(undefined);

      await removeSyncQueueItem('sync1');

      expect(mockStore.delete).toHaveBeenCalledWith('sync1');
    });
  });

  describe('Metadata', () => {
    it('should save metadata', async () => {
      mockStore.put.mockResolvedValue(undefined);

      await saveMetadata('lastSync', Date.now());

      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should get last sync time', async () => {
      const timestamp = Date.now();
      mockStore.get.mockResolvedValue({ key: 'lastSync', value: timestamp });

      const result = await getLastSyncTime();

      expect(result).toBe(timestamp);
    });

    it('should return null if no sync time exists', async () => {
      mockStore.get.mockResolvedValue(undefined);

      const result = await getLastSyncTime();

      expect(result).toBeNull();
    });
  });

  describe('Database Stats', () => {
    it('should return database statistics', async () => {
      mockStore.count
        .mockResolvedValueOnce(50) // products
        .mockResolvedValueOnce(10) // categories
        .mockResolvedValueOnce(5) // modifiers
        .mockResolvedValueOnce(25) // orders
        .mockResolvedValueOnce(3); // syncQueue

      const stats = await getDatabaseStats();

      expect(stats).toEqual({
        products: 50,
        categories: 10,
        modifiers: 5,
        orders: 25,
        syncQueue: 3,
      });
    });
  });

  describe('clearAllData', () => {
    it('should clear all object stores', async () => {
      mockStore.clear.mockResolvedValue(undefined);

      await clearAllData();

      expect(mockStore.clear).toHaveBeenCalledTimes(6); // 6 stores
    });
  });
});
