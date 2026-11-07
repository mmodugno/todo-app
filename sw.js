// Service worker: guarda la app en el dispositivo para que abra sin conexión.
// Estrategia "primero la red": si hay internet se usa (y se actualiza la copia);
// si no, se responde con lo guardado. Al cambiar los archivos, subí la versión.

const CACHE = 'todo-app-v1';

const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'todos.js',
  'theme.js',
  'gestures.js',
  'manifest.webmanifest',
  'fonts/recursive-latin-casl-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      }),
  );
});
