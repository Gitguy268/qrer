// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// BEGIN GENERATED CACHE MANIFEST
const VERSION = 'qrer-static-v2.7.0';
const files = [
  './',
  '404.html',
  'INTEGRATIONS.md',
  'LICENSE',
  'THIRD-PARTY-NOTICES.md',
  'assets/appearance.js',
  'assets/apple-touch-icon.png',
  'assets/art.js',
  'assets/content.js',
  'assets/dom.js',
  'assets/editor-content.js',
  'assets/editor-style.js',
  'assets/export-controls.js',
  'assets/export-settings.js',
  'assets/export.js',
  'assets/favicon.svg',
  'assets/fonts/figtree.woff2',
  'assets/gif.js',
  'assets/glass-components.js',
  'assets/glass.js',
  'assets/history.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/main.js',
  'assets/matrix.js',
  'assets/model.js',
  'assets/photo.js',
  'assets/preview.js',
  'assets/qr.js',
  'assets/retro-icons.svg',
  'assets/retro.css',
  'assets/retro.js',
  'assets/scanner.js',
  'assets/share-dialog.js',
  'assets/shell.js',
  'assets/short-link.js',
  'assets/tasks.js',
  'assets/ui.css',
  'assets/vendor/ha-mr/alphabets.js',
  'assets/vendor/ha-mr/compress.js',
  'assets/vendor/liquid-glass-effect/rim.css',
  'assets/vendor/liquid-glass-studio/renderer.js',
  'assets/vendor/liquid-glass-studio/shaders.js',
  'assets/vendor/liquid-glass-web/geometry.js',
  'assets/vendor/liquid-glass-web/liquid-glass.css',
  'assets/vendor/liquid-glass-web/liquid-glass.js',
  'assets/vendor/nayuki/qrcodegen.js',
  'assets/vendor/omggif/omggif.js',
  'assets/vendor/portable-glass/liquid-glass.js',
  'assets/vendor/qr-code-styling.js',
  'assets/vendor/qr-scanner/qr-scanner-worker.min.js',
  'assets/vendor/qr-scanner/qr-scanner.min.js',
  'assets/vendor/win98-web/controls.css',
  'index.html',
  'register-sw.js',
  'site.webmanifest',
  'assets/appearance.js?v=2.7.0',
  'assets/art.js?v=2.7.0',
  'assets/content.js?v=2.7.0',
  'assets/dom.js?v=2.7.0',
  'assets/editor-content.js?v=2.7.0',
  'assets/editor-style.js?v=2.7.0',
  'assets/export-controls.js?v=2.7.0',
  'assets/export-settings.js?v=2.7.0',
  'assets/export.js?v=2.7.0',
  'assets/gif.js?v=2.7.0',
  'assets/glass-components.js?v=2.7.0',
  'assets/glass.js?v=2.7.0',
  'assets/history.js?v=2.7.0',
  'assets/main.js?v=2.7.0',
  'assets/matrix.js?v=2.7.0',
  'assets/model.js?v=2.7.0',
  'assets/photo.js?v=2.7.0',
  'assets/preview.js?v=2.7.0',
  'assets/qr.js?v=2.7.0',
  'assets/retro.css?v=2.7.0',
  'assets/retro.js?v=2.7.0',
  'assets/scanner.js?v=2.7.0',
  'assets/share-dialog.js?v=2.7.0',
  'assets/shell.js?v=2.7.0',
  'assets/short-link.js?v=2.7.0',
  'assets/tasks.js?v=2.7.0',
  'assets/ui.css?v=2.7.0',
  'assets/vendor/ha-mr/alphabets.js?v=2.7.0',
  'assets/vendor/ha-mr/compress.js?v=2.7.0',
  'assets/vendor/liquid-glass-effect/rim.css?v=2.7.0',
  'assets/vendor/liquid-glass-studio/renderer.js?v=2.7.0',
  'assets/vendor/liquid-glass-studio/shaders.js?v=2.7.0',
  'assets/vendor/liquid-glass-web/geometry.js?v=2.7.0',
  'assets/vendor/liquid-glass-web/liquid-glass.css?v=2.7.0',
  'assets/vendor/liquid-glass-web/liquid-glass.js?v=2.7.0',
  'assets/vendor/nayuki/qrcodegen.js?v=2.7.0',
  'assets/vendor/omggif/omggif.js?v=2.7.0',
  'assets/vendor/portable-glass/liquid-glass.js?v=2.7.0',
  'assets/vendor/qr-code-styling.js?v=2.7.0',
  'assets/vendor/qr-scanner/qr-scanner-worker.min.js?v=2.7.0',
  'assets/vendor/qr-scanner/qr-scanner.min.js?v=2.7.0',
  'assets/vendor/win98-web/controls.css?v=2.7.0',
  'register-sw.js?v=2.7.0',
];
// END GENERATED CACHE MANIFEST
const urls = new Set(files.map((file) => new URL(file, self.registration.scope).href));
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([...urls]))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('qrer-static-') && name !== VERSION)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!urls.has(request.url)) {
    if (request.mode === 'navigate' && request.url.startsWith(self.registration.scope)) {
      event.respondWith(
        fetch(request, { cache: 'no-cache' }).catch(async () => {
          const cached = await caches.match(new URL('404.html', self.registration.scope).href);
          if (!cached) return Response.error();
          const page = (await cached.text()).replace(
            'href="./" id="homeLink"',
            `href="${self.registration.scope}" id="homeLink"`,
          );
          return new Response(page, {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }),
      );
    }
    return;
  }
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(VERSION).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() =>
        caches
          .open(VERSION)
          .then((cache) => cache.match(request))
          .then((response) => response || Response.error()),
      ),
  );
});
