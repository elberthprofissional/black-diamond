const CACHE_NAME = 'black-diamond-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Falha ao cachear ativos iniciais no Service Worker:', err);
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Ignora requisições de outras origens ou esquemas que não sejam HTTP/HTTPS (como chrome-extension)
  if (!e.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Se for uma requisição de navegação de página (SPA), tenta a rede e em caso de falha retorna index.html do cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Se a requisição for válida, atualiza o cache para uso offline
        if (response.status === 200 && e.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar a rede (offline), tenta recuperar do cache
        return caches.match(e.request);
      })
  );
});
