/**
 * CoffeeOS POS Web - Service Worker Registration
 * Registro y gestión del Service Worker
 */

import { logger } from '@/lib/logger';

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerSW();
    });
  } else {
    logger.warn('Service Workers are not supported in this browser');
  }
}

async function registerSW(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.debug('[SW] Registration successful:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available
          showUpdateNotification();
        }
      });
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.debug('[SW] Controller changed, reloading page');
      window.location.reload();
    });

    // Escuchar mensajes del SW (ej: PROCESS_SYNC_QUEUE desde background sync)
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type === 'PROCESS_SYNC_QUEUE') {
        // Importación dinámica para evitar dependencia circular en el módulo
        const { syncService } = await import('@/lib/sync.service');
        syncService.syncAll();
      }
    });

    if ('sync' in registration) {
      logger.debug('[SW] Background Sync is supported');
    }
  } catch (error) {
    logger.error('[SW] Registration failed:', error);
  }
}

function showUpdateNotification(): void {
  const shouldUpdate = confirm(
    'Hay una nueva versión disponible. ¿Deseas actualizar ahora?',
  );

  if (shouldUpdate) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }
}

export function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        return registration.unregister();
      }
      return false;
    });
  }
  return Promise.resolve(false);
}

export function requestBackgroundSync(tag: string): void {
  if (
    'serviceWorker' in navigator &&
    'sync' in ServiceWorkerRegistration.prototype
  ) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return (registration as any).sync.register(tag);
      })
      .then(() => {
        logger.debug('[SW] Background sync registered:', tag);
      })
      .catch((error: Error) => {
        logger.error('[SW] Background sync registration failed:', error);
      });
  } else {
    logger.warn('[SW] Background sync not supported');
  }
}

export function sendMessageToSW(message: any): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

export function clearCache(): void {
  sendMessageToSW({ type: 'CLEAR_CACHE' });
}

export function triggerSync(): void {
  sendMessageToSW({ type: 'SYNC_NOW' });
}
