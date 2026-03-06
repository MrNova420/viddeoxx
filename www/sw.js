// Innerflect service worker v2
// 1. Permanent model cache — WebLLM WASM + model shards cached forever
// 2. Static asset cache — fonts, CSS, JS cached with stale-while-revalidate
// IMPORTANT: MODEL_CACHE_VERSION is intentionally separate from STATIC_CACHE_VERSION
//   so app updates NEVER evict downloaded models. Only change MODEL_CACHE_VERSION
//   if you need to force a full model re-download (costs users GBs of data!).

const MODEL_CACHE_VERSION  = 'v2';   // ← NEVER change (forces re-download of all models)
const STATIC_CACHE_VERSION = 'v4';   // ← Bump freely for app/asset updates
const MODEL_CACHE  = 'vx-models-'  + MODEL_CACHE_VERSION;
const STATIC_CACHE = 'vx-static-' + STATIC_CACHE_VERSION;

// CDN origins that serve WebLLM model files — cached permanently
const MODEL_ORIGINS = [
  'raw.githubusercontent.com',
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cdn-lfs-us-1.huggingface.co',
  'cdn.jsdelivr.net',
  'objects.githubusercontent.com',
];

// Static asset file extensions — stale-while-revalidate
const STATIC_EXTS = ['.woff2', '.woff', '.ttf', '.css', '.js', '.png', '.svg', '.ico'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  // Remove old STATIC caches only — never touch model caches (preserve user downloads)
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('vx-static-') && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  if (req.method !== 'GET') return;
  if (!url.startsWith('http')) return;

  let parsed;
  try { parsed = new URL(url); } catch { return; }
  const hostname = parsed.hostname;

  // ── Model files: cache-first, permanent ─────────────────────────────────
  if (MODEL_ORIGINS.some(o => hostname.includes(o))) {
    event.respondWith(modelCacheFirst(req, MODEL_CACHE));
    return;
  }

  // ── Same-origin static assets: stale-while-revalidate ───────────────────
  const ext = parsed.pathname.match(/\.([^./?#]+)(\?.*)?$/)?.[1];
  if (parsed.origin === self.location.origin && ext && STATIC_EXTS.includes('.' + ext)) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // ── ngrok backend requests: inject skip-warning header ──────────────────
  if (hostname.includes('ngrok')) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ detail: 'Backend unreachable' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // All other requests: pass through untouched
});

/**
 * Model files cache strategy:
 *  - If in cache: serve cached copy immediately (even for range requests)
 *  - If not cached: fetch with clean request (no custom headers that trigger CORS preflight)
 *  - Range requests get special handling: strip ONLY problematic headers, keep Range
 *  - All errors fall back to a clean direct fetch rather than crashing
 */
async function modelCacheFirst(req, cacheName) {
  const rangeHeader = req.headers.get('Range');

  // Try cache first (cache stores full responses; we can serve them for range requests too)
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(new Request(req.url));
    if (cached) {
      // If the page asked for a range but we have the full file cached,
      // return the full cached response — browsers handle this gracefully
      return cached;
    }
  } catch { /* storage unavailable — fall through to fetch */ }

  // Not cached: fetch with a clean request (strips custom headers → no CORS preflight)
  // Keep the Range header if present (it's a CORS-safelisted header, won't trigger preflight)
  try {
    const headers = rangeHeader ? { 'Range': rangeHeader } : {};
    const cleanReq = new Request(req.url, {
      method: 'GET',
      headers,
      mode: 'cors',
      credentials: 'omit',
    });
    const response = await fetch(cleanReq);

    // Only cache complete (non-range) successful responses
    if (response.ok && !rangeHeader) {
      try {
        const cache = await caches.open(cacheName);
        cache.put(new Request(req.url), response.clone()).catch(() => {});
      } catch { /* quota exceeded — don't cache but still serve */ }
    }
    return response;
  } catch (err) {
    // Final fallback: completely bare fetch (handles edge-case network configs)
    try {
      return await fetch(req.url);
    } catch {
      return new Response('Model file unavailable', { status: 503 });
    }
  }
}

async function staleWhileRevalidate(req, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    const revalidate = fetch(req)
      .then(r => { if (r.ok) cache.put(req, r.clone()).catch(() => {}); return r; })
      .catch(() => cached);
    return cached || revalidate;
  } catch {
    return fetch(req);
  }
}
