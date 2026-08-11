// =============================================================================
// FILE: lib/utils/rateLimit.ts
// PURPOSE: Tracks how many Capital Stake API calls we have made and warns
//          us if we are getting close to the 20 requests/hour limit.
//          We store the call count in Redis so it works across all server
//          instances and resets automatically every hour.
//          This is a safety net — our caching strategy should keep us well
//          under the limit, but this catches any unexpected bursts.
// =============================================================================

import { redis } from '@/lib/redis/client'

const MAX_REQUESTS_PER_HOUR = 20
const RATE_LIMIT_KEY = 'cs:api:call-count'

// =============================================================================
// trackCSAPICall — Call this every time we make a Capital Stake API request
// Increments the counter in Redis and logs a warning if we are getting close.
// Returns the current count so callers can decide whether to proceed.
// =============================================================================
export async function trackCSAPICall(endpoint: string): Promise<number> {
  try {
    // Increment the counter — if key doesn't exist, Redis creates it at 1
    const count = await redis.incr(RATE_LIMIT_KEY)

    // Set expiry to 1 hour on first call (subsequent incr calls keep existing TTL)
    if (count === 1) {
      await redis.expire(RATE_LIMIT_KEY, 3600)
    }

    // Log which endpoint was called and current usage
    console.log(`[CS API] Call #${count}/${MAX_REQUESTS_PER_HOUR} → ${endpoint}`)

    // Warn at 15 calls (75% of limit)
    if (count >= 15) {
      console.warn(
        `[CS API] WARNING: ${count}/${MAX_REQUESTS_PER_HOUR} requests used this hour. ` +
        `Consider extending cache TTLs.`
      )
    }

    // At the limit — log an error (the call still happens, this is just a warning)
    if (count > MAX_REQUESTS_PER_HOUR) {
      console.error(
        `[CS API] LIMIT EXCEEDED: ${count} calls made. ` +
        `Capital Stake may start rejecting requests. ` +
        `Endpoint attempted: ${endpoint}`
      )
    }

    return count
  } catch {
    // If Redis fails, allow the API call to proceed — don't block the user
    return 0
  }
}

// =============================================================================
// getCSAPIUsage — Check how many calls we have made in the current hour
// Useful for an admin dashboard showing current API usage
// =============================================================================
export async function getCSAPIUsage(): Promise<{ used: number; remaining: number; resetIn: number }> {
  try {
    const [count, ttl] = await Promise.all([
      redis.get<number>(RATE_LIMIT_KEY),
      redis.ttl(RATE_LIMIT_KEY),
    ])

    const used = count ?? 0
    return {
      used,
      remaining: Math.max(0, MAX_REQUESTS_PER_HOUR - used),
      resetIn: ttl > 0 ? ttl : 3600,  // seconds until the hour resets
    }
  } catch {
    return { used: 0, remaining: MAX_REQUESTS_PER_HOUR, resetIn: 3600 }
  }
}
