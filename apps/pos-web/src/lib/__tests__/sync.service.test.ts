import type { SyncQueueItem } from '@/types';

/**
 * La cola de sincronización offline: lo que pasa con una venta cobrada sin red
 * cuando la red vuelve.
 *
 * Es el camino menos probado del sistema y el que más caro sale equivocarse:
 * los dos modos de fallo son perder una venta y cobrarla dos veces.
 */

jest.mock('@/lib/db');
jest.mock('@/services/pos.service');
jest.mock('@/services/orders.service', () => ({ ordersService: {} }));
jest.mock('@/services/products.service', () => ({ productsService: {} }));
jest.mock('@/services/customers.service', () => ({ customersService: {} }));
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/store/offline.store', () => ({
  useOfflineStore: {
    getState: () => ({
      setSyncing: jest.fn(),
      setSyncError: jest.fn(),
      setLastSyncAt: jest.fn(),
      // `downloadData` saca la organización de aquí y se sale si no hay
      // ninguna. Dejarlo vacío es lo que se quiere: la descarga no es lo que
      // se prueba, y si reventara, el catch de `syncAll` se tragaría el fallo
      // y la subida ni siquiera correría.
      offlineData: { products: [], categories: [], modifiers: [], orders: [] },
    }),
  },
}));

import {
  getSyncQueue,
  removeSyncQueueItem,
  saveCategories,
  saveModifiers,
  saveOrder,
  saveProducts,
  updateSyncQueueItem,
} from '@/lib/db';
import { POSService } from '@/services/pos.service';
import { syncService } from '../sync.service';

const db = {
  getSyncQueue: getSyncQueue as jest.Mock,
  updateSyncQueueItem: updateSyncQueueItem as jest.Mock,
  removeSyncQueueItem: removeSyncQueueItem as jest.Mock,
  saveOrder: saveOrder as jest.Mock,
  saveProducts: saveProducts as jest.Mock,
  saveCategories: saveCategories as jest.Mock,
  saveModifiers: saveModifiers as jest.Mock,
};
const createOrder = POSService.createOrder as jest.Mock;

function item(over: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'q1',
    type: 'ORDER',
    action: 'CREATE',
    data: { location_id: 'loc1', client_request_id: 'req-1' },
    status: 'PENDING',
    attempts: 0,
    created_at: new Date().toISOString(),
    ...over,
  } as SyncQueueItem;
}

/** Encola por estado: `getSyncQueue(status)` devuelve lo que le corresponda. */
function conCola(porEstado: Record<string, SyncQueueItem[]>) {
  db.getSyncQueue.mockImplementation(async (status?: string) =>
    status ? (porEstado[status] ?? []) : Object.values(porEstado).flat(),
  );
}

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    // downloadData no es lo que se prueba aquí: se deja inerte.
    createOrder.mockResolvedValue({ id: 'srv1', order_number: 'ORD-1' });
    db.saveProducts.mockResolvedValue(undefined);
    db.saveCategories.mockResolvedValue(undefined);
    db.saveModifiers.mockResolvedValue(undefined);
    db.saveOrder.mockResolvedValue(undefined);
    db.updateSyncQueueItem.mockResolvedValue(undefined);
    db.removeSyncQueueItem.mockResolvedValue(undefined);
    conCola({});
  });

  describe('items colgados en SYNCING', () => {
    it('los devuelve a PENDING antes de subir nada', async () => {
      // `syncItem` marca SYNCING antes de enviar y uploadPendingChanges sólo
      // lee PENDING. Si la app murió a mitad del envío, ese item no volvía a
      // intentarse nunca: la venta se perdía en silencio.
      conCola({ SYNCING: [item({ id: 'colgado' })], PENDING: [] });

      await syncService.syncAll();

      expect(db.updateSyncQueueItem).toHaveBeenCalledWith('colgado', {
        status: 'PENDING',
      });
    });

    it('no toca nada si no hay ninguno colgado', async () => {
      conCola({ SYNCING: [], PENDING: [] });

      await syncService.syncAll();

      expect(db.updateSyncQueueItem).not.toHaveBeenCalled();
    });
  });

  describe('reenvío de una venta', () => {
    it('la sube y la saca de la cola al lograrlo', async () => {
      conCola({ SYNCING: [], PENDING: [item()] });

      await syncService.syncAll();

      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ client_request_id: 'req-1' }),
      );
      expect(db.updateSyncQueueItem).toHaveBeenCalledWith('q1', {
        status: 'SUCCESS',
      });
      expect(db.removeSyncQueueItem).toHaveBeenCalledWith('q1');
    });

    it('reenvía SIEMPRE la misma clave de idempotencia', async () => {
      // Es lo único que impide cobrar dos veces cuando el servidor creó la
      // venta y la respuesta se perdió: el backend devuelve el ticket que ya
      // existe en lugar de crear otro.
      const encolado = item({ data: { client_request_id: 'req-estable' } });
      conCola({ SYNCING: [], PENDING: [encolado] });

      await syncService.syncAll();
      createOrder.mockClear();

      // Segundo intento del MISMO item encolado.
      conCola({ SYNCING: [], PENDING: [encolado] });
      await syncService.syncAll();

      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ client_request_id: 'req-estable' }),
      );
    });

    it('la deja PENDING con un intento más cuando falla', async () => {
      createOrder.mockRejectedValue(new Error('sin red'));
      conCola({ SYNCING: [], PENDING: [item({ attempts: 0 })] });

      await syncService.syncAll();

      expect(db.updateSyncQueueItem).toHaveBeenCalledWith('q1', {
        status: 'PENDING',
        attempts: 1,
        last_error: 'sin red',
      });
      // No se saca de la cola: la venta sigue viva.
      expect(db.removeSyncQueueItem).not.toHaveBeenCalled();
    });

    it('la marca ERROR al tercer intento, pero NO la borra', async () => {
      // Que deje de reintentarse no puede significar que desaparezca: es una
      // venta cobrada al cliente que el servidor todavía no tiene.
      createOrder.mockRejectedValue(new Error('rechazada'));
      conCola({ SYNCING: [], PENDING: [item({ attempts: 2 })] });

      await syncService.syncAll();

      expect(db.updateSyncQueueItem).toHaveBeenCalledWith('q1', {
        status: 'ERROR',
        attempts: 3,
        last_error: 'rechazada',
      });
      expect(db.removeSyncQueueItem).not.toHaveBeenCalled();
    });
  });

  describe('cuándo NO sincroniza', () => {
    it('no hace nada sin conexión', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      conCola({ SYNCING: [], PENDING: [item()] });

      await syncService.syncAll();

      expect(createOrder).not.toHaveBeenCalled();
      expect(db.updateSyncQueueItem).not.toHaveBeenCalled();
    });

    it('no arranca una segunda sincronización mientras corre la primera', async () => {
      // Dos sincronizaciones a la vez reenviarían los mismos items en paralelo.
      // El cerrojo se crea ANTES de arrancar nada: si se asignara dentro del
      // ejecutor de la promesa, no existiría hasta que la primera
      // sincronización llegase a createOrder, y el test se colgaría.
      let liberar!: () => void;
      const cerrojo = new Promise<void>((res) => {
        liberar = () => res();
      });
      createOrder.mockImplementation(async () => {
        await cerrojo;
        return { id: 'srv1', order_number: 'ORD-1' };
      });
      conCola({ SYNCING: [], PENDING: [item()] });

      const primera = syncService.syncAll();
      await syncService.syncAll(); // debe salirse de inmediato
      liberar();
      await primera;

      expect(createOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('recuperación manual', () => {
    it('retryErroredItems reinicia los intentos y vuelve a subir', async () => {
      conCola({ ERROR: [item({ status: 'ERROR', attempts: 3 })] });

      await syncService.retryErroredItems();

      expect(db.updateSyncQueueItem).toHaveBeenCalledWith('q1', {
        status: 'PENDING',
        attempts: 0,
        last_error: undefined,
      });
    });
  });
});
