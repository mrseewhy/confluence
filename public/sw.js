/* Confluence service worker — offline app shell.
 *
 * Deliberately conservative:
 *   - Only GET requests to this origin are considered.
 *   - Supabase / API traffic is NEVER cached (always network) so data
 *     can't go stale.
 *   - Navigations use network-first, falling back to the cached shell,
 *     so a fresh deploy is picked up on the next successful load.
 *   - Hashed build assets are cache-first (they are immutable).
 *   - Bump CACHE_VERSION to invalidate everything.
 */

const CACHE_VERSION = 'confluence-v1'
const SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll([SHELL])).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // let the browser handle cross-origin
  if (url.pathname.startsWith('/api/')) return

  // Navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put(SHELL, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(SHELL).then((r) => r || Response.error())),
    )
    return
  }

  // Immutable hashed assets: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {})
            }
            return res
          }),
      ),
    )
  }
})
