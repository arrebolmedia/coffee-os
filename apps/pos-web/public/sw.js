// CoffeeOS POS - Service Worker
// Maneja caché offline y Background Sync API

const CACHE_NAME = 'coffeeos-pos-v1';
const API_CACHE_NAME = 'coffeeos-api-v1';
const SYNC_TAG = 'coffeeos-sync';

// Rutas de la app a cachear en install
const APP_SHELL = ['/', '/offline.html', '/manifest.json'];

// ============================================================================
// INSTALL — cachear app shell
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE — limpiar caches viejos
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// ============================================================================
// FETCH — network first para API, cache first para app shell
// ============================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network only (no cachear datos sensibles de POS)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // App shell: cache first, network fallback, offline.html como último recurso
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    }),
  );
});

// ============================================================================
// BACKGROUND SYNC — procesar cola offline al reconectar
// ============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // Notificar a todos los clientes activos que procesen su cola
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  if (clients.length === 0) return;

  // Postmessage a los clientes para que el SyncService procese la cola
  clients.forEach((client) => {
    client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
  });
}

// ============================================================================
// MESSAGES — comandos desde la app
// ============================================================================
self.addEventListener('message', (event) => {
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'SYNC_NOW':
      processSyncQueue();
      break;

    case 'CLEAR_CACHE':
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      break;
  }
});
