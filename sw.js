const CACHE = 'chronicle-offline-v19';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(OFFLINE_PAGE, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error'
    });

    if (
      !response.ok ||
      response.redirected ||
      !/^text\/html\b/i.test(response.headers.get('content-type') || '')
    ) {
      throw new Error('Offline fallback unavailable');
    }

    const cache = await caches.open(CACHE);
    await cache.put(OFFLINE_PAGE, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(
      names
        .filter(name => name.startsWith('chronicle-') && name !== CACHE)
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET' || request.mode !== 'navigate') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      const fallback = await cache.match(OFFLINE_PAGE);

      return fallback || new Response(
        '<!doctype html><html lang="pl"><meta charset="utf-8"><title>Brak połączenia</title><p>Brak połączenia z internetem.</p></html>',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      );
    })
  );
});
