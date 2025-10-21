/**
 * CoffeeOS POS Web - Offline Hook
 * Custom hook para gestión de estado offline y sincronización
 */

import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/store/offline.store';
import { syncService } from '@/lib/sync.service';
import { initDB, getDatabaseStats } from '@/lib/db';
import { registerServiceWorker, requestBackgroundSync } from '@/lib/sw-registration';

export function useOffline() {
  const [dbStats, setDbStats] = useState<{
    products: number;
    categories: number;
    modifiers: number;
    orders: number;
    syncQueue: number;
  } | null>(null);

  const isOnline = useOfflineStore((state) => state.isOnline);
  const syncQueue = useOfflineStore((state) => state.syncQueue);
  const isSyncing = useOfflineStore((state) => state.isSyncing);
  const syncError = useOfflineStore((state) => state.syncError);
  const setOnlineStatus = useOfflineStore((state) => state.setOnlineStatus);

  // Initialize IndexedDB and Service Worker
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        console.log('IndexedDB initialized');

        // Register service worker
        registerServiceWorker();

        // Start sync service
        syncService.startPeriodicSync();

        // Load DB stats
        const stats = await getDatabaseStats();
        setDbStats(stats);
      } catch (error) {
        console.error('Error initializing offline support:', error);
      }
    };

    init();

    return () => {
      syncService.stopPeriodicSync();
    };
  }, []);

  // Update DB stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await getDatabaseStats();
      setDbStats(stats);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Manual sync trigger
  const triggerSync = async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }

    try {
      await syncService.syncNow();
      const stats = await getDatabaseStats();
      setDbStats(stats);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  // Request background sync
  const requestSync = (tag: string) => {
    requestBackgroundSync(tag);
  };

  return {
    isOnline,
    isSyncing,
    syncError,
    syncQueueSize: syncQueue.length,
    syncQueue,
    dbStats,
    triggerSync,
    requestSync,
    setOnlineStatus,
  };
}
