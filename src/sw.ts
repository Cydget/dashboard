/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

type PrecacheEntry = string | { url: string; revision?: string | null };

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

self.skipWaiting();
clientsClaim();

const manifest = self.__WB_MANIFEST || [];
precacheAndRoute(manifest);
cleanupOutdatedCaches();

const hasIndex = manifest.some((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  return url === 'index.html' || url === '/index.html';
});

if (hasIndex) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//, /\/version\.json$/],
    }),
  );
}

registerRoute(
  ({ url }) => url.pathname.endsWith('/version.json'),
  new NetworkOnly(),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/status') || url.pathname.startsWith('/api/health'),
  new NetworkOnly(),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/cache-icon'),
  new NetworkFirst({
    cacheName: 'api-icons',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/settings'),
  new NetworkFirst({
    cacheName: 'api-settings',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/'),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
