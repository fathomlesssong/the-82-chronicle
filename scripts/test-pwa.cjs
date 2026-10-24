'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const source = read('sw.js');

const match = source.match(/const CACHE\s*=\s*['"]([^'"]+)['"]/);
assert.ok(match, 'Service Worker musi definiować nazwę cache');
const activeCache = match[1];

function createWorker() {
  const listeners = new Map();
  const buckets = new Map([
    ['chronicle-shell-v18', new Map([
      ['/a/prywatny-artykul', new Response('PRIVATE ARTICLE')]
    ])],
    ['unrelated-app-cache', new Map()]
  ]);

  let online = true;
  let skipped = 0;
  let claimed = 0;
  const requests = [];

  const caches = {
    async keys() {
      return [...buckets.keys()];
    },
    async delete(name) {
      return buckets.delete(name);
    },
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const bucket = buckets.get(name);
      return {
        async put(key, response) {
          bucket.set(key, response.clone());
        },
        async match(key) {
          return bucket.get(key)?.clone();
        }
      };
    }
  };

  const self = {
    location: { origin: 'https://kronika82.vercel.app' },
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    async skipWaiting() {
      skipped++;
    },
    clients: {
      async claim() {
        claimed++;
      }
    }
  };

  async function fetchMock(request, options) {
    requests.push({ request, options });

    if (!online) throw new TypeError('Network unavailable');

    if (request === '/offline.html') {
      return new Response('<h1>Brak połączenia</h1>', {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('LIVE PRIVATE ARTICLE', {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
  }

  vm.runInNewContext(source, {
    self, caches, fetch: fetchMock, URL, Response
  });

  function dispatch(name, request) {
    let pending = null;
    const handler = listeners.get(name);
    assert.ok(handler, `Brak zdarzenia ${name}`);

    handler({
      request,
      waitUntil(promise) { pending = promise; },
      respondWith(promise) { pending = promise; }
    });

    return pending;
  }

  return {
    dispatch,
    requests,
    buckets,
    setOnline(value) { online = value; },
    skipped() { return skipped; },
    claimed() { return claimed; }
  };
}

async function main() {
  const worker = createWorker();

  await worker.dispatch('install');

  assert.equal(worker.skipped(), 1);
  assert.equal(worker.requests[0].request, '/offline.html');
  assert.equal(worker.requests[0].options.credentials, 'omit');
  assert.equal(worker.requests[0].options.cache, 'no-store');
  assert.equal(worker.requests[0].options.redirect, 'error');

  assert.deepEqual(
    [...worker.buckets.get(activeCache).keys()],
    ['/offline.html'],
    'Instalacja może zapisywać tylko neutralny ekran offline'
  );

  console.log('OK: instalacja zapisuje wyłącznie offline.html');

  await worker.dispatch('activate');

  assert.equal(worker.claimed(), 1);
  assert.equal(worker.buckets.has('chronicle-shell-v18'), false);
  assert.equal(worker.buckets.has('unrelated-app-cache'), true);

  console.log('OK: stary cache prywatnych stron został usunięty');

  const paths = [
    '/a/prywatny-artykul',
    '/archive.html',
    '/admin.html',
    '/api/article?slug=test',
    '/wejscie.html'
  ];

  for (const pathname of paths) {
    const request = {
      url: `https://kronika82.vercel.app${pathname}`,
      method: 'GET',
      mode: 'navigate'
    };

    worker.setOnline(true);
    const live = await worker.dispatch('fetch', request);
    assert.equal(await live.text(), 'LIVE PRIVATE ARTICLE');

    worker.setOnline(false);
    const offline = await worker.dispatch('fetch', request);
    assert.match(await offline.text(), /Brak połączenia/);
  }

  assert.deepEqual(
    [...worker.buckets.get(activeCache).keys()],
    ['/offline.html'],
    'Prywatne strony nie mogą trafić do cache'
  );

  console.log('OK: artykuły, administracja i API nie są buforowane');

  for (const request of [
    {
      url: 'https://kronika82.vercel.app/styles.css',
      method: 'GET',
      mode: 'cors'
    },
    {
      url: 'https://example.com/',
      method: 'GET',
      mode: 'navigate'
    },
    {
      url: 'https://kronika82.vercel.app/a/test',
      method: 'POST',
      mode: 'navigate'
    }
  ]) {
    assert.equal(worker.dispatch('fetch', request), null);
  }

  console.log('OK: zasoby, obce domeny i POST nie są przechwytywane');

  const broken = createWorker();
  broken.setOnline(false);

  await assert.rejects(
    broken.dispatch('install'),
    /Network unavailable/
  );
  assert.equal(broken.skipped(), 0);

  console.log('OK: brak offline.html blokuje instalację SW');

  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');

  const icons = [
    ['assets/pwa-icon-192.png', 192],
    ['assets/pwa-icon-512.png', 512],
    ['assets/pwa-maskable-512.png', 512],
    ['assets/apple-touch-icon.png', 180]
  ];

  for (const [filename, expected] of icons) {
    const png = fs.readFileSync(path.join(root, filename));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), expected);
    assert.equal(png.readUInt32BE(20), expected);
  }

  console.log('OK: manifest i rozdzielczości ikon');

  function registrationsFor(hostname, enabled = true) {
    const registrations = [];
    let onLoad;

    const navigator = enabled ? {
      serviceWorker: {
        register(url) {
          registrations.push(url);
          return Promise.resolve();
        }
      }
    } : {};

    vm.runInNewContext(read('pwa.js'), {
      navigator,
      location: { hostname },
      window: {
        addEventListener(event, callback) {
          if (event === 'load') onLoad = callback;
        }
      }
    });

    if (onLoad) onLoad();
    return registrations;
  }

  for (const hostname of [
    'kronika82.vercel.app',
    'localhost',
    '127.0.0.1'
  ]) {
    assert.deepEqual(registrationsFor(hostname), ['/sw.js']);
  }

  for (const hostname of [
    'preview.vercel.app',
    'test-kronika82.vercel.app',
    'example.com'
  ]) {
    assert.deepEqual(registrationsFor(hostname), []);
  }

  assert.deepEqual(registrationsFor('localhost', false), []);
  console.log('OK: rejestracja SW tylko w produkcji i lokalnie');


  for (const filename of [
    'index.html',
    'archive.html',
    'section.html',
    'article.html',
    'search.html',
    'api/article.js'
  ]) {
    const html = read(filename);
    assert.match(html, /manifest\.webmanifest/);
    assert.match(html, /pwa\.js\?v=2/);
    assert.match(html, /apple-touch-icon\.png/);
  }

  assert.match(read('middleware.ts'), /pathname==='\/offline\.html'/);

  console.log('OK: integracja stron i publiczny ekran offline');

  const articleApi = read('api/article.js');

  assert.match(
    articleApi,
    /module\.exports=async\(req,res\)=>\{\s*res\.setHeader\('cache-control','private, no-store, max-age=0'\)/,
    'Handler artykułów musi wyłączać cache od początku odpowiedzi'
  );

  assert.doesNotMatch(
    articleApi,
    /cache-control.*(?:public|s-maxage|stale-while-revalidate)/i,
    'Artykuły nie mogą korzystać ze współdzielonego cache'
  );

  console.log('OK: odpowiedzi artykułów wyłączają cache HTTP');

  console.log('PWA: wszystkie testy zaliczone.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
