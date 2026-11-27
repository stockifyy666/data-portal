// Tracks Capital Stake API usage against the 10,000 req/day plan limit.
// The day matches Capital Stake's reset: 12:00 AM to 11:59 PM Pakistan time (PKT).
// Counts live in Redis under a per-day key (cs:calls:YYYY-MM-DD) that expires
// shortly after that PKT midnight. Overage charge: PKR 10 per extra request.

import { redis } from '@/lib/redis/client'

const LEGACY_KEY         = 'cs:uat:call-count'  // old rolling-24h counter (migrated once)
const LEGACY_ENDPOINTS   = 'cs:uat:endpoints'
const UAT_MAX_PER_DAY    = 10_000
const UAT_WARN_THRESHOLD = 8_000
const DAY_SECONDS        = 86_400
const PKT_OFFSET_MS      = 5 * 3600e3          // Pakistan = UTC+5, no daylight saving

/** Today's date in PKT (YYYY-MM-DD) and seconds left until the next PKT midnight. */
function pktDay(now = Date.now()) {
  const pkt  = now + PKT_OFFSET_MS
  const date = new Date(pkt).toISOString().slice(0, 10)
  const nextMidnightUtc = Math.floor(pkt / 86_400e3 + 1) * 86_400e3 - PKT_OFFSET_MS
  return { date, secondsLeft: Math.max(1, Math.ceil((nextMidnightUtc - now) / 1000)) }
}
const countKey     = (date: string) => `cs:calls:${date}`
const endpointsKey = (date: string) => `cs:calls:${date}:endpoints`

// First time the new counter is used today, carry over the old rolling counter
// so calls already made today are not lost (it may include a few from before midnight).
async function migrateLegacy(date: string, ttl: number) {
  const done = await redis.set(`${countKey(date)}:migrated`, 1, { nx: true, ex: ttl + 3600 })
  if (!done) return
  const [old, oldEp] = await Promise.all([redis.get<number>(LEGACY_KEY), redis.hgetall(LEGACY_ENDPOINTS)])
  if (old && old > 0) {
    await redis.incrby(countKey(date), old)
    if (oldEp && Object.keys(oldEp).length) {
      for (const [k, v] of Object.entries(oldEp)) await redis.hincrby(endpointsKey(date), k, Number(v) || 0)
    }
  }
  await redis.del(LEGACY_KEY, LEGACY_ENDPOINTS)
  await redis.expire(countKey(date), ttl + 3600)
  await redis.expire(endpointsKey(date), ttl + 3600)
}

// Shorten a full URL to a readable label like "GET /3.0/market/quotes"
function labelFor(endpoint: string): string {
  try {
    const path = new URL(endpoint).pathname + new URL(endpoint).search
    // Trim query params to keep label short
    const base = path.split('?')[0]
    return base
  } catch {
    return endpoint.length > 60 ? endpoint.slice(0, 60) + '…' : endpoint
  }
}

export async function trackChartAPICall(endpoint: string): Promise<number> {
  try {
    const label = labelFor(endpoint)
    const { date, secondsLeft } = pktDay()
    await migrateLegacy(date, secondsLeft)
    const count = await redis.incr(countKey(date))
    await redis.hincrby(endpointsKey(date), label, 1)
    if (count === 1 || count % 50 === 0) {
      // keep yesterday's keys around for an hour after midnight, then drop them
      await redis.expire(countKey(date), secondsLeft + 3600)
      await redis.expire(endpointsKey(date), secondsLeft + 3600)
    }

    console.log(`[CS UAT] Call #${count}/${UAT_MAX_PER_DAY} today → ${endpoint}`)

    if (count >= UAT_WARN_THRESHOLD) {
      console.warn(`[CS UAT] WARNING: ${count}/${UAT_MAX_PER_DAY} requests used today. Overage is PKR 10/request.`)
    }
    if (count > UAT_MAX_PER_DAY) {
      console.error(`[CS UAT] LIMIT EXCEEDED: ${count} calls today — overage charges apply. Endpoint: ${endpoint}`)
    }

    return count
  } catch {
    return 0
  }
}

export type EndpointStat = { endpoint: string; count: number }

export async function getCSAPIUsage(): Promise<{
  used:      number
  remaining: number
  resetIn:   number
  endpoints: EndpointStat[]
}> {
  try {
    const { date, secondsLeft } = pktDay()
    await migrateLegacy(date, secondsLeft)
    const [count, endpointHash] = await Promise.all([
      redis.get<number>(countKey(date)),
      redis.hgetall(endpointsKey(date)),
    ])
    const used = count ?? 0

    const endpoints: EndpointStat[] = Object.entries(endpointHash ?? {})
      .map(([endpoint, c]) => ({ endpoint, count: Number(c) }))
      .sort((a, b) => b.count - a.count)

    return {
      used,
      remaining: Math.max(0, UAT_MAX_PER_DAY - used),
      resetIn:   secondsLeft,                  // until 12:00 AM PKT
      endpoints,
    }
  } catch {
    return { used: 0, remaining: UAT_MAX_PER_DAY, resetIn: DAY_SECONDS, endpoints: [] }
  }
}
