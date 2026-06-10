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
      console.log('Connection restored - triggering sync');
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

    console.log('Periodic sync started');
  }

  stopPeriodicSync(): void {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      console.log('Periodic sync stopped');
    }
  }

  // ============================================================================
  // SYNC ALL
  // ============================================================================

  async syncAll(): Promise<void> {
    if (isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    isSyncing = true;
    useOfflineStore.getState().setSyncing(true);

    try {
      // 1. Download latest data from server
      await this.downloadData();

      // 2. Upload pending changes
      await this.uploadPendingChanges();

      useOfflineStore.getState().setSyncError(null);
      console.log('Sync completed successfully');
    } catch (error: any) {
      console.error('Sync failed:', error);
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
      console.log('No organization context, skipping download');
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
        console.log(`Downloaded ${productsResponse.data.length} products`);
      }

      // Download categories
      const categories = await productsService.getCategories(organizationId);
      if (categories.length > 0) {
        await saveCategories(categories as Category[]);
        useOfflineStore.getState().updateCategories(categories as Category[]);
        console.log(`Downloaded ${categories.length} categories`);
      }

      // Download modifiers
      const modifiers = await productsService.getModifiers(organizationId);
      if (modifiers.length > 0) {
        await saveModifiers(modifiers as Modifier[]);
        useOfflineStore.getState().updateModifiers(modifiers as Modifier[]);
        console.log(`Downloaded ${modifiers.length} modifiers`);
      }
    } catch (error) {
      console.error('Error downloading data:', error);
      throw error;
    }
  }

  // ============================================================================
  // UPLOAD PENDING CHANGES
  // ============================================================================

  private async uploadPendingChanges(): Promise<void> {
    const pendingItems = await getSyncQueue('PENDING');

    if (pendingItems.length === 0) {
      console.log('No pending changes to sync');
      return;
    }

    console.log(`Syncing ${pendingItems.length} pending items`);

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
          console.warn(`Unknown sync type: ${item.type}`);
      }

      // Mark as success and remove from queue
      await updateSyncQueueItem(item.id, { status: 'SUCCESS' });
      await removeSyncQueueItem(item.id);

      console.log(`Successfully synced ${item.type} ${item.id}`);
    } catch (error: any) {
      console.error(`Error syncing ${item.type} ${item.id}:`, error);

      // Increment attempts
      const attempts = item.attempts + 1;

      if (attempts >= MAX_RETRY_ATTEMPTS) {
        // Max attempts reached, mark as error
        await updateSyncQueueItem(item.id, {
          status: 'ERROR',
          attempts,
          last_error: error.message,
        });
        console.error(`Max retry attempts reached for ${item.type} ${item.id}`);
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

      console.log(`Order synced: ${order.order_number}`);
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
    console.log('Manual sync triggered');
    await this.syncAll();
  }

  async syncOrders(): Promise<void> {
    const pendingOrders = await getSyncQueue('PENDING');
    const orderItems = pendingOrders.filter((item) => item.type === 'ORDER');

    console.log(`Syncing ${orderItems.length} pending orders`);

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
    console.log(
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
        console.warn('Merge strategy not implemented yet');
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

    console.log(`Cleared ${errorItems.length} errored items`);
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

    console.log(`Reset ${errorItems.length} errored items for retry`);
    await this.syncAll();
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
export default syncService;
