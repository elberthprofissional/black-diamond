const CACHE_VERSION = 'v6';
const API_CACHE = 'api-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);

  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.webp') || url.pathname.endsWith('.woff2')) {
    e.respondWith(
      caches.open(CACHE_VERSION).then((cache) => {
        return cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request).then((response) => {
            if (response.ok) {
              cache.put(e.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  if (url.hostname.endsWith('.supabase.co')) {
    e.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(e.request).then((cached) => {
          const fetched = fetch(e.request).then((response) => {
            if (response.ok) {
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetched;
        });
      })
    );
    return;
  }
});

self.addEventListener('push', async (e) => {
  let data = { title: 'Black Diamond', body: 'Nova notificação', icon: '/assets/logo.webp' };
  if (e.data) {
    try { data = e.data.json(); } catch { data.body = await e.data.text(); }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/assets/logo.webp',
      badge: '/assets/logo.webp',
      vibrate: [200, 100, 200],
      tag: data.tag || 'black-diamond-notification',
      renotify: true,
      data: data.url || '/admin',
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
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).pathname.startsWith('/admin') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(e.notification.data || '/admin');
    })
  );
});
