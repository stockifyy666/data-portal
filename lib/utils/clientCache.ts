// Client-side in-memory cache for API responses.
// Prevents duplicate requests on navigation and deduplicates concurrent calls.

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
