/**
 * CoffeeOS POS Web - Service Worker Registration
 * Registro y gestión del Service Worker
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerSW();
    });
  } else {
    console.warn('Service Workers are not supported in this browser');
  }
}

async function registerSW(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Registration successful:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          showUpdateNotification();
        }
      });
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading page');
      window.location.reload();
    });

    // Request background sync permission
    if ('sync' in registration) {
      console.log('[SW] Background Sync is supported');
    }

  } catch (error) {
    console.error('[SW] Registration failed:', error);
  }
}

function showUpdateNotification(): void {
  const shouldUpdate = confirm(
    'Hay una nueva versión disponible. ¿Deseas actualizar ahora?'
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
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return (registration as any).sync.register(tag);
    }).then(() => {
      console.log('[SW] Background sync registered:', tag);
    }).catch((error: Error) => {
      console.error('[SW] Background sync registration failed:', error);
    });
  } else {
    console.warn('[SW] Background sync not supported');
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
