// ======================================================================
// BLACK DIAMOND — Service Worker (injectManifest)
// O array __WB_MANIFEST abaixo é substituído pelo Vite com os assets de build
// ======================================================================

const VERSION = 'v18';

// Injected by vite-plugin-pwa at build time — array of {url, revision}
const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];

const STATIC_CACHE = `static-${VERSION}`;
const NAV_CACHE = `nav-${VERSION}`;
const FONT_CACHE = `fonts-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

const MAX_NAV_CACHE_ENTRIES = 10;
const MAX_API_CACHE_ENTRIES = 30;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Install: precache all build assets from the injected manifest ──
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache all entries from the injected manifest
      const urls = PRECACHE_MANIFEST.map((entry) => entry.url);
      return cache.addAll(urls);
    }).then(() => self.skipWaiting())
  );
});

/** Evict oldest entries when cache exceeds limit */
async function evictCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

/** Check if a cached response is still fresh based on stored timestamp */
function isCacheFresh(cached) {
  const dateHeader = cached?.headers?.get('sw-cache-date');
  if (!dateHeader) return false;
  const age = Date.now() - Number(dateHeader);
  return age < CACHE_TTL_MS;
}

/** Add timestamp header to response for freshness checks */
function addTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.append('sw-cache-date', String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Activate: clean old caches ──
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== STATIC_CACHE &&
                key !== NAV_CACHE &&
                key !== FONT_CACHE &&
                key !== IMAGE_CACHE &&
                key !== API_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Message handling ──
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'GET_VERSION') {
    e.source.postMessage({ type: 'SW_VERSION', version: VERSION });
  }
  if (e.data && e.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
});

// ── Fetch: caching strategies ──
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);

  // Navigation requests: network-first with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(NAV_CACHE).then(async (cache) => {
            await cache.put(e.request, clone);
            await evictCache(NAV_CACHE, MAX_NAV_CACHE_ENTRIES);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          return new Response(
            '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:2rem}h1{color:#C5A059}</style></head><body><div><h1>Voc\u00ea est\u00e1 offline</h1><p>Conecte-se \u00e0 internet para acessar o painel.</p><p style="margin-top:1rem;font-size:0.8rem;color:#666">Black Diamond Admin</p></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
          );
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate (inclui JS do build)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css')
  ) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          const fetched = fetch(e.request)
            .then((response) => {
              if (response.ok) cache.put(e.request, addTimestamp(response.clone()));
              return response;
            })
            .catch(() => cached);

          if (cached) {
            e.waitUntil(fetched.catch(() => {}));
            return cached;
          }
          return fetched;
        })
      )
    );
    return;
  }

  // Google Fonts & external fonts: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached && isCacheFresh(cached)) return cached;
          return fetch(e.request)
            .then((response) => {
              if (response.ok) cache.put(e.request, addTimestamp(response.clone()));
              return response;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // External images: cache-first with network fallback
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached && isCacheFresh(cached)) return cached;
          return fetch(e.request)
            .then((response) => {
              if (response.ok) cache.put(e.request, addTimestamp(response.clone()));
              return response;
            })
            .catch(() => cached || new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // Public Supabase API (read-only): stale-while-revalidate
  if (url.hostname.endsWith('.supabase.co') && e.request.method === 'GET') {
    const isPublicEndpoint =
      url.pathname.includes('/services') ||
      url.pathname.includes('/settings') ||
      url.pathname.includes('/gallery_images') ||
      url.pathname.includes('/testimonials') ||
      url.pathname.includes('/mensalista_plans');

    if (isPublicEndpoint) {
      e.respondWith(
        caches.open(API_CACHE).then((cache) =>
          cache.match(e.request).then((cached) => {
            const fetched = fetch(e.request)
              .then((response) => {
                if (response.ok) {
                  cache.put(e.request, addTimestamp(response));
                  evictCache(API_CACHE, MAX_API_CACHE_ENTRIES);
                }
                return response;
              })
              .catch(() => cached);

            if (cached && isCacheFresh(cached)) {
              e.waitUntil(fetched.catch(() => {}));
              return cached;
            }
            return fetched;
          })
        )
      );
      return;
    }
  }

  // Everything else (API, auth, etc.): network-only
  e.respondWith(
    fetch(e.request).catch(
      () =>
        new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
    )
  );
});

// ======================================================================
// Push notifications
// ======================================================================
self.addEventListener('push', async (e) => {
  let data = {
    title: 'Black Diamond',
    body: 'Nova notifica\u00e7\u00e3o',
    icon: '/assets/logo.webp',
  };
  if (e.data) {
    try {
      const text = await e.data.text();
      try {
        data = JSON.parse(text);
      } catch {
        data.body = text;
      }
    } catch {
      // Keep default data
    }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/assets/logo.webp',
      badge: '/assets/logo.webp',
      vibrate: [200, 100, 200],
      tag: data.tag || 'black-diamond-notification',
      renotify: true,
      data: { url: data.url || '/admin' },
      actions: [
        { action: 'open', title: 'Abrir Painel' },
        { action: 'dismiss', title: 'Dispensar' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const targetUrl = e.notification.data?.url || '/admin';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname.startsWith('/admin') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ======================================================================
// Periodic background sync (if supported)
// ======================================================================
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'cleanup-old-caches') {
    e.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.map(async (key) => {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            const now = Date.now();
            await Promise.all(
              requests.map(async (req) => {
                const res = await cache.match(req);
                if (res) {
                  const dateHeader = res.headers.get('sw-cache-date');
                  if (dateHeader && now - Number(dateHeader) > 7 * CACHE_TTL_MS) {
                    await cache.delete(req);
                  }
                }
              })
            );
          })
        )
      )
    );
  }
});
