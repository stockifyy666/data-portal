// =============================================================================
// FILE: lib/utils/rateLimit.ts
// PURPOSE: Tracks Capital Stake API usage against the agreed plan limits.
//          Counts are stored in Redis with a 24-hour rolling window so they
//          work across all server instances and reset automatically each day.
//
//          Plan limits (Capital Stake agreement):
//            UAT API (uat.csapis.com) — 10,000 requests / day
//            Overage charge: PKR 10 per extra request
// =============================================================================

import { redis } from '@/lib/redis/client'

// UAT API (uat.csapis.com) — stocks, quotes, charts, all new endpoints
const UAT_KEY             = 'cs:uat:call-count'
const UAT_MAX_PER_DAY     = 10_000
const UAT_WARN_THRESHOLD  = 8_000   // warn at 80%
const DAY_SECONDS         = 86_400

// Legacy main API (stockifyy.capitalstake.com) — kept for old endpoints still in use
const LEGACY_KEY          = 'cs:api:call-count'
const LEGACY_MAX_PER_HOUR = 20
const HOUR_SECONDS        = 3_600

// =============================================================================
// trackUATCall — call every time we hit uat.csapis.com
// =============================================================================
export async function trackChartAPICall(endpoint: string): Promise<number> {
  try {
    const count = await redis.incr(UAT_KEY)
    if (count === 1) await redis.expire(UAT_KEY, DAY_SECONDS)

    console.log(`[CS UAT] Call #${count}/${UAT_MAX_PER_DAY} today → ${endpoint}`)

    if (count >= UAT_WARN_THRESHOLD) {
      console.warn(
        `[CS UAT] WARNING: ${count}/${UAT_MAX_PER_DAY} requests used today. ` +
        `Overage is PKR 10/request. Consider raising cache TTLs.`
      )
    }
    if (count > UAT_MAX_PER_DAY) {
      console.error(
        `[CS UAT] LIMIT EXCEEDED: ${count} calls today — overage charges apply. ` +
        `Endpoint: ${endpoint}`
      )
    }

    return count
  } catch {
    return 0
  }
}

// =============================================================================
// trackCSAPICall — call every time we hit the legacy main API
// =============================================================================
export async function trackCSAPICall(endpoint: string): Promise<number> {
  try {
    const count = await redis.incr(LEGACY_KEY)
    if (count === 1) await redis.expire(LEGACY_KEY, HOUR_SECONDS)

    console.log(`[CS Legacy] Call #${count}/${LEGACY_MAX_PER_HOUR} this hour → ${endpoint}`)

    if (count >= LEGACY_MAX_PER_HOUR * 0.75) {
      console.warn(`[CS Legacy] WARNING: ${count}/${LEGACY_MAX_PER_HOUR} requests this hour.`)
    }
    if (count > LEGACY_MAX_PER_HOUR) {
      console.error(`[CS Legacy] LIMIT EXCEEDED: ${count} calls this hour. Endpoint: ${endpoint}`)
    }

    return count
  } catch {
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
