import { openDB } from 'idb';
import {
  addToSyncQueue,
  clearAllData,
  getCategories,
  getDatabaseStats,
  getLastSyncTime,
  getProductBySku,
  getProducts,
  getSyncQueue,
  initDB,
  removeSyncQueueItem,
  saveCategories,
  saveMetadata,
  saveProducts,
  searchProducts,
  updateSyncQueueItem,
} from '../db';
import type { Category, Product, SyncQueueItem } from '@/types';
import { ProductStatus } from '@/types';

// Mock idb
jest.mock('idb');

describe('IndexedDB Manager', () => {
  const mockDB = {
    transaction: jest.fn(),
    close: jest.fn(),
    // Direct IDB methods that db.ts uses
    getAll: jest.fn(),
    getAllFromIndex: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    clear: jest.fn(),
    objectStoreNames: {
      contains: jest.fn().mockReturnValue(false),
    },
    createObjectStore: jest.fn().mockReturnValue({
      createIndex: jest.fn(),
    }),
  };

  const mockTransaction = {
    objectStore: jest.fn(),
    store: {
      put: jest.fn(),
    },
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

    // Setup default mock returns
    mockDB.getAll.mockResolvedValue([]);
    mockDB.getAllFromIndex.mockResolvedValue([]);
    mockDB.put.mockResolvedValue(undefined);
    mockDB.get.mockResolvedValue(undefined);
    mockDB.count.mockResolvedValue(0);
    mockDB.clear.mockResolvedValue(undefined);
  });

  describe('initDB', () => {
    it('should initialize database with correct schema', async () => {
      // Mock the upgrade callback to receive a proper db object
      (openDB as jest.Mock).mockImplementation((name, version, { upgrade }) => {
        if (upgrade) {
          // Call upgrade with a mock db that has objectStoreNames
          const mockUpgradeDB = {
            objectStoreNames: {
              contains: jest.fn().mockReturnValue(false),
            },
            createObjectStore: jest.fn().mockReturnValue({
              createIndex: jest.fn(),
            }),
          };
          upgrade(mockUpgradeDB, 0, 1, null as any);
        }
        return Promise.resolve(mockDB);
      });

      await initDB();

      expect(openDB).toHaveBeenCalledWith(
        'coffeeos-pos',
        2,
        expect.any(Object),
      );
    });
  });

  describe('Products', () => {
    const mockProducts: Partial<Product>[] = [
      {
        id: '1',
        name: 'Espresso',
        sku: 'ESP001',
        price: 45,
        categoryId: 'cat1',
        status: ProductStatus.ACTIVE,
        image: '/espresso.jpg',
      },
      {
        id: '2',
        name: 'Cappuccino',
        sku: 'CAP001',
        price: 55,
        categoryId: 'cat1',
        status: ProductStatus.ACTIVE,
        image: '/cappuccino.jpg',
      },
    ] as Product[];

    it('should save products to database', async () => {
      mockTransaction.store.put.mockResolvedValue(undefined);

      await saveProducts(mockProducts as Product[]);

      expect(mockDB.transaction).toHaveBeenCalledWith('products', 'readwrite');
      expect(mockTransaction.store.put).toHaveBeenCalledTimes(2);
    });

    it('should retrieve all products', async () => {
      mockDB.getAll.mockResolvedValue(mockProducts);

      const products = await getProducts();

      expect(products).toEqual(mockProducts);
      expect(mockDB.getAll).toHaveBeenCalledWith('products');
    });

    it('should search products by name', async () => {
      mockDB.getAll.mockResolvedValue(mockProducts);

      const results = await searchProducts('espr');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Espresso');
    });

    it('filtra por categoria usando el indice', async () => {
      // Estaba apagado apuntando a searchProducts, que solo recibe la query.
      // Quien filtra por categoria es getProducts, y lo hace por indice: en un
      // catalogo offline de cientos de productos, hacerlo en memoria se nota.
      mockDB.getAllFromIndex.mockResolvedValue([mockProducts[0]]);

      const results = await getProducts('cat1');

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith(
        'products',
        'by-category',
        'cat1',
      );
      expect(results).toEqual([mockProducts[0]]);
    });

    it('should get product by SKU', async () => {
      mockDB.getAllFromIndex.mockResolvedValue([mockProducts[0]]);

      const product = await getProductBySku('ESP001');

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith(
        'products',
        'by-sku',
        'ESP001',
      );
      expect(product).toEqual(mockProducts[0]);
    });

    it('should return undefined for non-existent SKU', async () => {
      mockDB.getAllFromIndex.mockResolvedValue([]);

      const product = await getProductBySku('INVALID');

      expect(product).toBeUndefined();
    });
  });

  describe('Categories', () => {
    // Apagado porque el fixture no tenia organization_id ni location_id, que
    // el tipo Category exige desde la unificacion de tipos de abril.
    const mockCategories: Category[] = [
      {
        id: 'cat1',
        organization_id: 'org1',
        location_id: 'loc1',
        name: 'Bebidas Calientes',
        description: 'Cafe y te',
        sortOrder: 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Category,
    ];

    it('guarda el catalogo de categorias', async () => {
      mockTransaction.store.put.mockResolvedValue(undefined);

      await saveCategories(mockCategories);

      expect(mockDB.transaction).toHaveBeenCalledWith(
        'categories',
        'readwrite',
      );
      expect(mockTransaction.store.put).toHaveBeenCalledWith(mockCategories[0]);
    });

    it('las devuelve ordenadas por el indice de orden', async () => {
      // El POS las pinta en ese orden; leerlas sin indice las devolveria por
      // clave y el menu saldria desordenado.
      mockDB.getAllFromIndex.mockResolvedValue(mockCategories);

      const result = await getCategories();

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith(
        'categories',
        'by-sort-order',
      );
      expect(result).toEqual(mockCategories);
    });
  });

  describe('Sync Queue', () => {
    // La cola es el corazon del modo offline: aqui viven las ventas cobradas
    // sin red hasta que vuelve. Estos tests estuvieron apagados porque el
    // fixture se quedo con la forma vieja de SyncQueueItem (`retries`,
    // `createdAt`, estados en minuscula). La forma real es la de @/types.
    const enCola: SyncQueueItem = {
      id: 'sync1',
      type: 'ORDER',
      action: 'CREATE',
      data: { location_id: 'loc1', client_request_id: 'req-1' },
      created_at: new Date(),
      attempts: 0,
      status: 'PENDING',
    };

    it('encola un elemento', async () => {
      mockDB.put.mockResolvedValue(undefined);

      await addToSyncQueue(enCola);

      expect(mockDB.put).toHaveBeenCalledWith('syncQueue', enCola);
    });

    it('lee la cola completa cuando no se filtra por estado', async () => {
      mockDB.getAll.mockResolvedValue([enCola]);

      await expect(getSyncQueue()).resolves.toEqual([enCola]);
      expect(mockDB.getAll).toHaveBeenCalledWith('syncQueue');
    });

    it('filtra por estado usando el indice, no en memoria', async () => {
      // Importa: `syncAll` reclama los SYNCING y sube los PENDING, y ambas
      // cosas dependen de que este filtro consulte el indice correcto.
      mockDB.getAllFromIndex.mockResolvedValue([]);

      await getSyncQueue('SYNCING');

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith(
        'syncQueue',
        'by-status',
        'SYNCING',
      );
    });

    it('actualiza fusionando sobre lo que ya habia', async () => {
      mockDB.get.mockResolvedValue(enCola);
      mockDB.put.mockResolvedValue(undefined);

      await updateSyncQueueItem('sync1', { status: 'ERROR', attempts: 3 });

      expect(mockDB.put).toHaveBeenCalledWith('syncQueue', {
        ...enCola,
        status: 'ERROR',
        attempts: 3,
      });
    });

    it('no crea nada al actualizar un id que no existe', async () => {
      // Un `put` a ciegas resucitaria como PENDING una venta ya sincronizada y
      // borrada de la cola, y se cobraria otra vez.
      mockDB.get.mockResolvedValue(undefined);

      await updateSyncQueueItem('fantasma', { status: 'PENDING' });

      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('saca un elemento de la cola', async () => {
      mockDB.delete.mockResolvedValue(undefined);

      await removeSyncQueueItem('sync1');

      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 'sync1');
    });
  });

  describe('Metadata', () => {
    it('guarda y recupera un valor', async () => {
      mockDB.put.mockResolvedValue(undefined);
      await saveMetadata('lastSync:products', '2026-08-26T00:00:00.000Z');

      expect(mockDB.put).toHaveBeenCalledWith(
        'metadata',
        expect.objectContaining({ key: 'lastSync:products' }),
      );
    });

    it('devuelve null si nunca se sincronizo esa entidad', async () => {
      mockDB.get.mockResolvedValue(undefined);

      await expect(getLastSyncTime('products')).resolves.toBeNull();
    });
  });

  describe('Database Stats', () => {
    it('should return database statistics', async () => {
      mockDB.count
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
      mockDB.clear.mockResolvedValue(undefined);

      await clearAllData();

      expect(mockDB.clear).toHaveBeenCalledTimes(6); // 6 stores
    });
  });
});
