/**
 * CoffeeOS POS Web - Offline Store
 * Estado global para manejo de offline y sincronización usando Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { SyncQueueItem, OfflineData, Product, Category, Modifier } from '@/types';

interface OfflineState {
  isOnline: boolean;
  offlineData: OfflineData;
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncAttempt: Date | null;
  syncError: string | null;
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  addToSyncQueue: (type: SyncQueueItem['type'], action: SyncQueueItem['action'], data: any) => void;
  removeFromSyncQueue: (id: string) => void;
  updateSyncQueueItem: (id: string, updates: Partial<SyncQueueItem>) => void;
  clearSyncQueue: () => void;
  setOfflineData: (data: Partial<OfflineData>) => void;
  updateProducts: (products: Product[]) => void;
  updateCategories: (categories: Category[]) => void;
  updateModifiers: (modifiers: Modifier[]) => void;
  setSyncing: (isSyncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  getQueueSize: () => number;
  getPendingItems: () => SyncQueueItem[];
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      offlineData: {
        products: [],
        categories: [],
        modifiers: [],
        last_sync: new Date(),
      },
      syncQueue: [],
      isSyncing: false,
      lastSyncAttempt: null,
      syncError: null,

      // ============================================================================
      // ONLINE STATUS
      // ============================================================================
      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        
        // If going online, trigger sync
        if (isOnline && get().syncQueue.length > 0) {
          // Trigger sync process (will be handled by background sync service)
          console.log('Going online - sync queue:', get().syncQueue.length);
        }
      },

      // ============================================================================
      // SYNC QUEUE MANAGEMENT
      // ============================================================================
      addToSyncQueue: (type, action, data) => {
        const item: SyncQueueItem = {
          id: uuid(),
          type,
          action,
          data,
          created_at: new Date(),
          attempts: 0,
          status: 'PENDING',
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, item],
        }));

        console.log('Added to sync queue:', item);
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        }));
      },

      updateSyncQueueItem: (id, updates) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      clearSyncQueue: () => {
        set({ syncQueue: [] });
      },

      // ============================================================================
      // OFFLINE DATA MANAGEMENT
      // ============================================================================
      setOfflineData: (data) => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            ...data,
            last_sync: new Date(),
          },
        }));
      },

      updateProducts: (products) => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            products,
            last_sync: new Date(),
          },
        }));
      },

      updateCategories: (categories) => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            categories,
            last_sync: new Date(),
          },
        }));
      },

      updateModifiers: (modifiers) => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            modifiers,
            last_sync: new Date(),
          },
        }));
      },

      // ============================================================================
      // SYNC STATUS
      // ============================================================================
      setSyncing: (isSyncing) => {
        set({
          isSyncing,
          lastSyncAttempt: isSyncing ? new Date() : get().lastSyncAttempt,
        });
      },

      setSyncError: (error) => {
        set({ syncError: error });
      },

      // ============================================================================
      // QUEUE HELPERS
      // ============================================================================
      getQueueSize: () => {
        return get().syncQueue.length;
      },

      getPendingItems: () => {
        return get().syncQueue.filter((item) => item.status === 'PENDING');
      },
    }),
    {
      name: 'coffeeos-offline',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        offlineData: state.offlineData,
        syncQueue: state.syncQueue,
        lastSyncAttempt: state.lastSyncAttempt,
      }),
    }
  )
);

// Setup online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
}
