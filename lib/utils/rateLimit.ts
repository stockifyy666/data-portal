// Tracks Capital Stake UAT API (uat.csapis.com) usage against the 10,000 req/day plan limit.
// Counts are stored in Redis with a 24-hour rolling window.
// Overage charge: PKR 10 per extra request.

import { redis } from '@/lib/redis/client'

const UAT_KEY            = 'cs:uat:call-count'
const UAT_MAX_PER_DAY    = 10_000
const UAT_WARN_THRESHOLD = 8_000
const DAY_SECONDS        = 86_400

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
        `[CS UAT] LIMIT EXCEEDED: ${count} calls today — overage charges apply. Endpoint: ${endpoint}`
      )
    }

    return count
  } catch {
    return 0
  }
}

export async function getCSAPIUsage(): Promise<{ used: number; remaining: number; resetIn: number }> {
  try {
    const [count, ttl] = await Promise.all([
      redis.get<number>(UAT_KEY),
      redis.ttl(UAT_KEY),
    ])
    const used = count ?? 0
    return { used, remaining: Math.max(0, UAT_MAX_PER_DAY - used), resetIn: ttl > 0 ? ttl : DAY_SECONDS }
  } catch {
    return { used: 0, remaining: UAT_MAX_PER_DAY, resetIn: DAY_SECONDS }
  }
}
