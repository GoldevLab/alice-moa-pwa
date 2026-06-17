import { setupServiceWorker } from '@builder.io/qwik-city/service-worker';
import { setupPwa } from '@qwikdev/pwa/sw';

declare const self: ServiceWorkerGlobalScope;

/**
 * Media must bypass Workbox precache — iOS Safari needs byte-range responses.
 * Register first so this handler wins before Workbox intercepts MP3/WebM.
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (/\.(?:mp3|mp4|webm|m4a|aac|wav|ogg)(?:\?|$)/i.test(url.pathname)) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
  }
});

setupServiceWorker();
setupPwa();
