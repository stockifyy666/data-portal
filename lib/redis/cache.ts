// =============================================================================
// FILE: lib/redis/cache.ts
// PURPOSE: Helper functions for reading and writing to our Redis cache.
//          This is the most important file for managing our 20 req/hour limit.
//
//          HOW IT WORKS:
//          1. API route receives request from user
//          2. We check Redis first: "do we already have fresh data for this?"
//          3. If YES → return cached data immediately (0 Capital Stake API calls)
//          4. If NO (cache expired or empty) → call Capital Stake API once,
//             store response in Redis with a TTL, return data to user
//
//          TTL (Time To Live) = how long data stays in cache before expiring
//          See the TTL_SECONDS constants below — they are designed to keep us
//          within our 20 requests/hour limit from Capital Stake.
// =============================================================================

import { redis } from './client'

// =============================================================================
// TTL CONSTANTS — How long each type of data is cached
// These values are carefully chosen to stay within 20 requests/hour limit.
//
// Math check (worst case, all endpoints called at their max frequency):
//   Live market data (quotes + indices + movers) = 3 endpoints × 12/hr = 36... BUT
//   We batch these into as few calls as possible to stay under 20/hr.
//   Static data (profiles, financials) barely counts — cached 24 hours.
// =============================================================================
export const TTL_SECONDS = {
  // Live market data — refreshes every 5 minutes (market hours only)
  LIVE_QUOTES:      5  * 60,   // 300 seconds = 5 minutes
  INDICES:          5  * 60,   // 300 seconds = 5 minutes
  GAINERS_LOSERS:   5  * 60,   // 300 seconds = 5 minutes
  VOLUME_LEADERS:   5  * 60,   // 300 seconds = 5 minutes

  // Market state — changes rarely, check every 10 minutes
  MARKET_STATUS:    10 * 60,   // 600 seconds = 10 minutes

  // Company data — updates 1-4 times per day at most
  COMPANY_OVERVIEW: 60 * 60,   // 3600 seconds = 1 hour
  ANNOUNCEMENTS:    60 * 60,   // 3600 seconds = 1 hour
  INTRADAY_CHART:   60 * 60,   // 3600 seconds = 1 hour

  // Mutual funds NAV — updates once per day by 10 PM PKT
  MUTUAL_FUNDS:     60 * 60,   // 3600 seconds = 1 hour

  // Fundamentals — only change when company files quarterly/annual results
  FINANCIALS:       24 * 60 * 60,  // 86400 seconds = 24 hours
  RATIOS:           24 * 60 * 60,
  COMPANY_PROFILE:  24 * 60 * 60,
  EOD_CHART:        24 * 60 * 60,

  // Truly static data — sectors, holidays, almost never change
  STATIC:           24 * 60 * 60,  // 24 hours

  // Forex — updates once per day from SBP
  FOREX:            60 * 60,   // 1 hour

  // Commodities — updates weekly from PBS
  COMMODITIES:      24 * 60 * 60,  // 24 hours
} as const

// =============================================================================
// cacheGet — Read a value from Redis cache
// Returns the cached data if it exists and has not expired, otherwise null.
// =============================================================================
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get<T>(key)
    return cached
  } catch (error) {
    // If Redis is down, we log the error but do NOT crash the app
    // The API route will fall back to calling Capital Stake directly
    console.error(`[Redis] cacheGet failed for key "${key}":`, error)
    return null
  }
}

// =============================================================================
// cacheSet — Write a value to Redis cache with an expiry time
// ttl = number of seconds before this cache entry expires automatically
// =============================================================================
export async function cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    // 'ex' option sets expiry in seconds — Redis deletes it automatically
    await redis.set(key, value, { ex: ttl })
  } catch (error) {
    // If Redis is down, we log but do not crash — data still served fresh
    console.error(`[Redis] cacheSet failed for key "${key}":`, error)
  }
}

// =============================================================================
// withCache — The main helper used in every API route
// Usage:
//   const data = await withCache('quotes:all', TTL_SECONDS.LIVE_QUOTES, () => {
//     return csGet(CS_ENDPOINTS.ALL_QUOTES)
//   })
//
// This pattern means:
//   - If Redis has fresh data → return it (no Capital Stake call)
//   - If Redis is empty/expired → call the fetcher function, cache the result
// =============================================================================
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {

  // Step 1: Check cache first
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached  // Return cached data — Capital Stake API NOT called
  }

  // Step 2: Cache miss — call Capital Stake API
  const fresh = await fetcher()

  // Step 3: Store in Redis so the next request gets cached data
  await cacheSet(key, fresh, ttl)

  return fresh
}

// =============================================================================
// CACHE KEY BUILDERS — Consistent key names across the entire app
// All keys follow the pattern: category:identifier
// Using a consistent naming scheme prevents key collisions.
// =============================================================================
export const CACHE_KEYS = {
  allQuotes:           () => 'market:quotes:all',
  allIndices:          () => 'market:indices:all',
  gainersLosers:       () => 'market:movers:gainers-losers',
  volumeLeaders:       () => 'market:movers:volume-leaders',
  marketStatus:        () => 'market:status',
  singleOverview: (symbol: string) => `stock:overview:${symbol.toUpperCase()}`,
  companyProfile: (symbol: string) => `stock:profile:${symbol.toUpperCase()}`,
  chart1min:      (symbol: string) => `stock:chart:1min:${symbol.toUpperCase()}`,
  chart5min:      (symbol: string) => `stock:chart:5min:${symbol.toUpperCase()}`,
  chartEOD:       (symbol: string) => `stock:chart:eod:${symbol.toUpperCase()}`,
  financials:     (symbol: string) => `stock:financials:${symbol.toUpperCase()}`,
  ratios:         (symbol: string) => `stock:ratios:${symbol.toUpperCase()}`,
  announcements:  (symbol: string) => `stock:announcements:${symbol.toUpperCase()}`,
  mutualFunds:         () => 'mutual-funds:all',
  fundProfile:    (id: string)     => `mutual-fund:profile:${id}`,
  forex:               () => 'forex:all',
  sectors:             () => 'market:sectors',
  holidays:            () => 'market:holidays',
} as const
