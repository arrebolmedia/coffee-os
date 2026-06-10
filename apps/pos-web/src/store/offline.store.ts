/**
 * CoffeeOS POS Web - Offline Store
 * Estado global para manejo de offline y sincronización usando Zustand
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import {
  Category,
  Modifier,
  OfflineData,
  Product,
  SyncQueueItem,
} from '@/types';
import { requestBackgroundSync } from '@/lib/sw-registration';

const SYNC_TAG = 'coffeeos-sync';

interface OfflineState {
  isOnline: boolean;
  offlineData: OfflineData;
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncAttempt: Date | null;
  syncError: string | null;
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  addToSyncQueue: (
    type: SyncQueueItem['type'],
    action: SyncQueueItem['action'],
    data: any,
  ) => void;
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

        // Al volver a estar online, disparar background sync si hay items pendientes
        if (isOnline && get().syncQueue.length > 0) {
          requestBackgroundSync(SYNC_TAG);
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

        // Registrar background sync para procesar cuando haya conexión
        requestBackgroundSync(SYNC_TAG);
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        }));
      },

      updateSyncQueueItem: (id, updates) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Rehydrate Date instances that were serialized to strings
        if (state.syncQueue && Array.isArray(state.syncQueue)) {
          state.syncQueue = state.syncQueue.map((item) => ({
            ...item,
            created_at:
              typeof item.created_at === 'string' ||
              typeof item.created_at === 'number'
                ? new Date(item.created_at)
                : (item.created_at as Date),
          }));
        }

        if (state.offlineData?.last_sync) {
          const ls = state.offlineData.last_sync as unknown;
          if (typeof ls === 'string' || typeof ls === 'number') {
            state.offlineData.last_sync = new Date(ls);
          }
        }

        if (state.lastSyncAttempt) {
          const lsa = state.lastSyncAttempt as unknown;
          if (typeof lsa === 'string' || typeof lsa === 'number') {
            state.lastSyncAttempt = new Date(lsa);
          }
        }
      },
    },
  ),
);

/**
 * Initialize online/offline listeners. Returns a cleanup function.
 * Prefer calling this from the `useOffline` hook so the listeners are
 * scoped to React's lifecycle and properly disposed of.
 */
export function initOfflineListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => useOfflineStore.getState().setOnlineStatus(true);
  const handleOffline = () => useOfflineStore.getState().setOnlineStatus(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
