if (!self.define) {
  let e,
    s = {};
  const n = (n, t) => (
    (n = new URL(n + '.js', t).href),
    s[n] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (t, a) => {
    const i =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href;
    if (s[i]) return;
    let c = {};
    const u = (e) => n(e, i),
      r = { module: { uri: i }, exports: c, require: u };
    s[i] = Promise.all(t.map((e) => r[e] || u(e))).then((e) => (a(...e), c));
  };
}
define(['./workbox-fdcc1164'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/app-build-manifest.json',
          revision: 'bf76b5e291916cb1c3292546fc3c4a89',
        },
        {
          url: '/_next/static/chunks/1dd3208c-4302603e1ad077ae.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/245-ca522209e68e428f.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/340-b9903abdd93dbfed.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/528-77ec7a874993aa69.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-4083c727f012c4fc.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/app/layout-238b88aaad08e6e3.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/app/page-dcd1e87f8593bd6d.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/framework-3664cab31236a9fa.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/main-2140b444aed0c57d.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/main-app-db961af23184051c.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/pages/_app-10a93ab5b7c32eb3.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/pages/_error-2d792b2a41857be4.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-f60560fce93593a2.js',
          revision: 'zUQE-jJ0eMIvOuV8RUmuw',
        },
        {
          url: '/_next/static/css/f0f81a1e9017436b.css',
          revision: 'f0f81a1e9017436b',
        },
        {
          url: '/_next/static/zUQE-jJ0eMIvOuV8RUmuw/_buildManifest.js',
          revision: 'faaa18916828f796d1c86f67e67dae84',
        },
        {
          url: '/_next/static/zUQE-jJ0eMIvOuV8RUmuw/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/manifest.json', revision: 'ccc9da28bcbe6e02f41036f992ac3e96' },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: n,
              state: t,
            }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith('/api/auth/') && !!s.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      'GET',
    ));
});
