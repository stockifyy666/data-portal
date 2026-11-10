// =============================================================================
// FILE: lib/utils/clientCache.ts
// PURPOSE: Browser-side in-memory cache for API responses.
//          This is the FIRST layer of our two-layer cache system:
//          Layer 1 (this file) → browser memory, per-tab, cleared on page close
//          Layer 2 (lib/redis/cache.ts) → Upstash Redis, shared across all users
//
//          HOW IT WORKS:
//          - cachedFetch(url, ttlMs) checks an in-memory Map first
//          - If fresh data exists → returns it immediately (0 network calls)
//          - If multiple components call the same URL at the same time →
//            only ONE real fetch fires, others wait for it (deduplication)
//          - After ttlMs milliseconds the entry expires and next call fetches fresh
//
//          WHY THIS EXISTS:
//          The dashboard has 10+ components that all need /api/market/quotes.
//          Without this, each component fires its own request on every render.
//          With this, they all share one fetch result.
// =============================================================================

type Entry<T> = { data: T; expiresAt: number }

const cache   = new Map<string, Entry<unknown>>()
const pending = new Map<string, Promise<unknown>>()

export async function cachedFetch<T>(url: string, ttlMs = 5 * 60 * 1000): Promise<T> {
  // Serve from cache if still fresh
  const hit = cache.get(url)
  if (hit && Date.now() < hit.expiresAt) return hit.data as T

  // Deduplicate: if a request for this URL is already in-flight, wait for it
  if (pending.has(url)) return pending.get(url) as Promise<T>

  const promise = fetch(url)
    .then(r => r.json())
    .then(data => {
      cache.set(url, { data, expiresAt: Date.now() + ttlMs })
      pending.delete(url)
      return data as T
    })
    .catch(err => {
      pending.delete(url)
      throw err
    })

  pending.set(url, promise)
  return promise
}

// Force-refresh a specific URL on next call (e.g. after a write)
export function invalidate(url: string) {
  cache.delete(url)
}
