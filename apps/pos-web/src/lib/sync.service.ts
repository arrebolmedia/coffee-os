/**
 * CoffeeOS POS Web - Sync Service
 * Servicio de sincronización en background con manejo de conflictos
 */

import { useOfflineStore } from '@/store/offline.store';
import { ordersService } from '@/services/orders.service';
import { POSService } from '@/services/pos.service';
import { productsService } from '@/services/products.service';
import { customersService } from '@/services/customers.service';
import {
  getSyncQueue,
  removeSyncQueueItem,
  saveCategories,
  saveModifiers,
  saveOrder,
  saveProducts,
  updateSyncQueueItem,
} from '@/lib/db';
import { Category, Modifier, Product, SyncQueueItem } from '@/types';
import { logger } from '@/lib/logger';

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL = 60000; // 1 minute
const SYNC_BATCH_SIZE = 10;

let syncIntervalId: NodeJS.Timeout | null = null;
let isSyncing = false;

// ============================================================================
// SYNC ORCHESTRATOR
// ============================================================================

export class SyncService {
  private static instance: SyncService;

  private constructor() {
    this.setupSyncListeners();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // ============================================================================
  // SETUP & INITIALIZATION
  // ============================================================================

  private setupSyncListeners(): void {
    if (typeof window === 'undefined') return;

    // Sync when going online
    window.addEventListener('online', () => {
      logger.debug('Connection restored - triggering sync');
      this.syncAll();
    });

    // Start periodic sync
    this.startPeriodicSync();
  }

  startPeriodicSync(): void {
    if (syncIntervalId) return;

    syncIntervalId = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, SYNC_INTERVAL);

    logger.debug('Periodic sync started');
  }

  stopPeriodicSync(): void {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      logger.debug('Periodic sync stopped');
    }
  }

  // ============================================================================
  // SYNC ALL
  // ============================================================================

  async syncAll(): Promise<void> {
    if (isSyncing) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    if (!navigator.onLine) {
      logger.debug('Offline, skipping sync');
      return;
    }

    isSyncing = true;
    useOfflineStore.getState().setSyncing(true);

    try {
      // 0. Rescatar lo que quedo colgado en SYNCING.
      //
      // `syncItem` marca SYNCING antes de enviar y `uploadPendingChanges` solo
      // lee PENDING, asi que si la app se cerro, el navegador mato la pestania
      // o el dispositivo se apago a mitad del envio, ese item no volvia a
      // intentarse NUNCA: la venta offline se perdia en silencio, visible solo
      // en getQueueStatus().syncing.
      //
      // Aqui es seguro reclamarlos: el guard `isSyncing` de arriba garantiza
      // que no hay ninguna sincronizacion en curso, de modo que todo lo que
      // este en SYNCING es de una sesion que murio.
      await this.reclaimStuckItems();

      // 1. Download latest data from server
      await this.downloadData();

      // 2. Upload pending changes
      await this.uploadPendingChanges();

      useOfflineStore.getState().setSyncError(null);
      logger.debug('Sync completed successfully');
    } catch (error: any) {
      logger.error('Sync failed:', error);
      useOfflineStore.getState().setSyncError(error.message);
    } finally {
      isSyncing = false;
      useOfflineStore.getState().setSyncing(false);
    }
  }

  // ============================================================================
  // DOWNLOAD DATA FROM SERVER
  // ============================================================================

  private async downloadData(): Promise<void> {
    const organizationId =
      useOfflineStore.getState().offlineData.products[0]?.organization_id;
    if (!organizationId) {
      logger.debug('No organization context, skipping download');
      return;
    }

    try {
      // Download products
      const productsResponse = await productsService.getProducts(
        organizationId,
        {},
        { limit: 1000 },
      );
      if (productsResponse.data.length > 0) {
        await saveProducts(productsResponse.data as Product[]);
        useOfflineStore
          .getState()
          .updateProducts(productsResponse.data as Product[]);
        logger.debug(`Downloaded ${productsResponse.data.length} products`);
      }

      // Download categories
      const categories = await productsService.getCategories(organizationId);
      if (categories.length > 0) {
        await saveCategories(categories as Category[]);
        useOfflineStore.getState().updateCategories(categories as Category[]);
        logger.debug(`Downloaded ${categories.length} categories`);
      }

      // Download modifiers
      const modifiers = await productsService.getModifiers(organizationId);
      if (modifiers.length > 0) {
        await saveModifiers(modifiers as Modifier[]);
        useOfflineStore.getState().updateModifiers(modifiers as Modifier[]);
        logger.debug(`Downloaded ${modifiers.length} modifiers`);
      }
    } catch (error) {
      logger.error('Error downloading data:', error);
      throw error;
    }
  }

  // ============================================================================
  // UPLOAD PENDING CHANGES
  // ============================================================================

  /**
   * Devuelve a PENDING los items que quedaron en SYNCING de una sesion
   * anterior. Ver la llamada en `syncAll` para el porque.
   */
  private async reclaimStuckItems(): Promise<void> {
    const stuck = await getSyncQueue('SYNCING');
    if (stuck.length === 0) return;

    for (const item of stuck) {
      await updateSyncQueueItem(item.id, { status: 'PENDING' });
    }

    // A nivel warn, no debug: que un envio se quedara a medias es un aviso de
    // que algo corto la sesion, y esas ventas estuvieron sin subir.
    logger.warn(
      `Recuperados ${stuck.length} elemento(s) que quedaron a medio sincronizar`,
    );
  }

  private async uploadPendingChanges(): Promise<void> {
    const pendingItems = await getSyncQueue('PENDING');

    if (pendingItems.length === 0) {
      logger.debug('No pending changes to sync');
      return;
    }

    logger.debug(`Syncing ${pendingItems.length} pending items`);

    // Process in batches
    for (let i = 0; i < pendingItems.length; i += SYNC_BATCH_SIZE) {
      const batch = pendingItems.slice(i, i + SYNC_BATCH_SIZE);
      await Promise.all(batch.map((item) => this.syncItem(item)));
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    try {
      // Mark as syncing
      await updateSyncQueueItem(item.id, { status: 'SYNCING' });

      // Process based on type
      switch (item.type) {
        case 'ORDER':
          await this.syncOrder(item);
          break;
        case 'PRODUCT':
          await this.syncProduct(item);
          break;
        case 'CUSTOMER':
          await this.syncCustomer(item);
          break;
        default:
          logger.warn(`Unknown sync type: ${item.type}`);
      }

      // Mark as success and remove from queue
      await updateSyncQueueItem(item.id, { status: 'SUCCESS' });
      await removeSyncQueueItem(item.id);

      logger.debug(`Successfully synced ${item.type} ${item.id}`);
    } catch (error: any) {
      logger.error(`Error syncing ${item.type} ${item.id}:`, error);

      // Increment attempts
      const attempts = item.attempts + 1;

      if (attempts >= MAX_RETRY_ATTEMPTS) {
        // Max attempts reached, mark as error
        await updateSyncQueueItem(item.id, {
          status: 'ERROR',
          attempts,
          last_error: error.message,
        });
        logger.error(`Max retry attempts reached for ${item.type} ${item.id}`);
      } else {
        // Retry later
        await updateSyncQueueItem(item.id, {
          status: 'PENDING',
          attempts,
          last_error: error.message,
        });
      }
    }
  }

  // ============================================================================
  // SYNC SPECIFIC ENTITIES
  // ============================================================================

  private async syncOrder(item: SyncQueueItem): Promise<void> {
    if (item.action === 'CREATE') {
      // El queue item guarda el CreateOrderDTO completo (incluye
      // organization_id, location_id y user_id de la sesión que lo encoló),
      // así el replay usa el mismo flujo de tickets que la venta online.
      const order = await POSService.createOrder(item.data);

      // Persist server copy locally (replaces the optimistic offline order)
      await saveOrder(order as any);

      logger.debug(`Order synced: ${order.order_number}`);
    } else if (item.action === 'UPDATE') {
      await ordersService.updateOrder(item.data.id, item.data);
    }
  }

  private async syncProduct(item: SyncQueueItem): Promise<void> {
    if (item.action === 'CREATE') {
      await productsService.createProduct(item.data);
    } else if (item.action === 'UPDATE') {
      await productsService.updateProduct(item.data.id, item.data);
    } else if (item.action === 'DELETE') {
      await productsService.deleteProduct(item.data.id);
    }
  }

  private async syncCustomer(item: SyncQueueItem): Promise<void> {
    if (item.action === 'CREATE') {
      await customersService.createCustomer(item.data);
    } else if (item.action === 'UPDATE') {
      await customersService.updateCustomer(item.data.id, item.data);
    } else if (item.action === 'DELETE') {
      await customersService.deleteCustomer(item.data.id);
    }
  }

  // ============================================================================
  // MANUAL SYNC TRIGGERS
  // ============================================================================

  async syncNow(): Promise<void> {
    logger.debug('Manual sync triggered');
    await this.syncAll();
  }

  async syncOrders(): Promise<void> {
    const pendingOrders = await getSyncQueue('PENDING');
    const orderItems = pendingOrders.filter((item) => item.type === 'ORDER');

    logger.debug(`Syncing ${orderItems.length} pending orders`);

    for (const item of orderItems) {
      await this.syncItem(item);
    }
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  async resolveConflict(
    item: SyncQueueItem,
    strategy: 'server-wins' | 'local-wins' | 'merge',
  ): Promise<void> {
    logger.debug(
      `Resolving conflict for ${item.type} ${item.id} using ${strategy}`,
    );

    switch (strategy) {
      case 'server-wins':
        // Discard local changes
        await removeSyncQueueItem(item.id);
        break;

      case 'local-wins':
        // Force sync local changes
        await updateSyncQueueItem(item.id, { status: 'PENDING', attempts: 0 });
        await this.syncItem(item);
        break;

      case 'merge':
        // Merge logic (complex, depends on entity type)
        logger.warn('Merge strategy not implemented yet');
        break;
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  async getQueueStatus(): Promise<{
    pending: number;
    syncing: number;
    error: number;
    success: number;
  }> {
    const allItems = await getSyncQueue();

    return {
      pending: allItems.filter((item) => item.status === 'PENDING').length,
      syncing: allItems.filter((item) => item.status === 'SYNCING').length,
      error: allItems.filter((item) => item.status === 'ERROR').length,
      success: allItems.filter((item) => item.status === 'SUCCESS').length,
    };
  }

  async clearErroredItems(): Promise<void> {
    const errorItems = await getSyncQueue('ERROR');

    for (const item of errorItems) {
      await removeSyncQueueItem(item.id);
    }

    logger.debug(`Cleared ${errorItems.length} errored items`);
  }

  async retryErroredItems(): Promise<void> {
    const errorItems = await getSyncQueue('ERROR');

    for (const item of errorItems) {
      await updateSyncQueueItem(item.id, {
        status: 'PENDING',
        attempts: 0,
        last_error: undefined,
      });
    }

    logger.debug(`Reset ${errorItems.length} errored items for retry`);
    await this.syncAll();
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
export default syncService;
