const CACHE_VERSION = 'v13';
const STATIC_CACHE = 'static-v13';
const API_CACHE = 'api-v13';
const NAV_CACHE = 'nav-v13';

// Cache size limits (entries)
const MAX_API_CACHE_ENTRIES = 50;
const MAX_NAV_CACHE_ENTRIES = 10;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assets/logo.webp',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// Evict oldest entries when cache exceeds limit
async function evictCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== NAV_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => {
      // Notify all clients that a new version is available
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
      return self.clients.claim();
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (e.data && e.data.type === 'GET_VERSION') {
    e.source.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION });
  }
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);

  // Navigations: network-first with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(NAV_CACHE).then(async (cache) => {
          await cache.put(e.request, clone);
          await evictCache(NAV_CACHE, MAX_NAV_CACHE_ENTRIES);
        });
        return response;
      }).catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        return new Response(
          '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:2rem}h1{color:#C5A059}</style></head><body><div><h1>Voc&#234; est&#225; offline</h1><p>Conecte-se &#224; internet para acessar o painel.</p><p style="margin-top:1rem;font-size:0.8rem;color:#666">Black Diamond Admin</p></div></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
        );
      })
    );
    return;
  }

  // Static assets: cache-first with background update
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          // Return cached version immediately, update in background
          const fetched = fetch(e.request).then(async (response) => {
            if (response.ok) {
              await cache.put(e.request, response.clone());
              await evictCache(STATIC_CACHE, 100);
            }
            return response;
          }).catch(() => cached);

          if (cached) {
            // Return cached, but wait for background update
            e.waitUntil(fetched.catch(() => {}));
            return cached;
          }

          return fetched;
        })
      )
    );
    return;
  }

  // Supabase API: network-first (never cache personal data)
  if (url.hostname.endsWith('.supabase.co')) {
    // Only cache GET requests for read-only public data (services, settings)
    // Never cache POST/PUT/DELETE or responses with personal data
    if (e.request.method !== 'GET') {
      e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } })));
      return;
    }

    // Check if this is a safe public endpoint to cache
    const path = url.pathname;
    const isPublicEndpoint = path.includes('/services') || path.includes('/settings') || path.includes('/mensalista_plans');
    const isSupabaseRest = url.searchParams.has('apikey') && url.pathname.includes('/rest/v1/');

    // Only cache public read-only Supabase REST queries; everything else is network-only
    if (!isPublicEndpoint || !isSupabaseRest) {
      // Network-only for sensitive data (bookings, clients, etc)
      e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } })));
      return;
    }

    // Stale-while-revalidate only for safe public data
    e.respondWith(
      caches.open(API_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          const fetched = fetch(e.request).then(async (response) => {
            if (response.ok) {
              await cache.put(e.request, response.clone());
              await evictCache(API_CACHE, MAX_API_CACHE_ENTRIES);
            }
            return response;
          }).catch(() => cached || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } }));

          if (cached) {
            e.waitUntil(fetched.then((response) => {
              if (response.ok) cache.put(e.request, response.clone());
            }).catch(() => {}));
            return cached;
          }

          return fetched;
        })
      )
    );
    return;
  }
});

// Push notifications
self.addEventListener('push', async (e) => {
  let data = { title: 'Black Diamond', body: 'Nova notificação', icon: '/assets/logo.webp' };
  if (e.data) {
    try {
      const text = await e.data.text();
      try { data = JSON.parse(text); } catch { data.body = text; }
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
        { action: 'dismiss', title: 'Dispensar' }
      ]
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
