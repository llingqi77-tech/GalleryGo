'use strict';
const CACHE = 'gallerygo-static-v5-search-discovery';
const BASE_FILES = ['./', './index.html', './style.css', './script.js', './data.json', './images/placeholder.svg'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(BASE_FILES);
    const response = await fetch(new URL('data.json', self.registration.scope), { cache: 'reload' });
    if (!response.ok) throw new Error('Cannot cache GalleryGo data');
    const data = await response.json();
    const assets = [...new Set(data.photos.flatMap(photo => [photo.thumb, photo.full]))];
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('gallerygo-static-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    const isImage = request.destination === 'image' || /\.(svg|png|jpe?g|webp|avif)$/i.test(url.pathname);
    if (isImage && cached) return cached;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cached ? 1800 : 10000);
    try {
      const response = await fetch(request, { signal: controller.signal });
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (_) {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const home = await cache.match(new URL('index.html', self.registration.scope));
        if (home) return home;
      }
      return new Response('GalleryGo: this resource is not cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } finally { clearTimeout(timeout); }
  })());
});
