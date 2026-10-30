// Copyright (c) 2026 Lucas Van De Weerd. MIT.
addEventListener('load', () => {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker
      .register(new URL('./sw.js', location.href), { updateViaCache: 'none' })
      .catch(() => {
        // Offline caching is optional; the editor remains available online.
      });
});
