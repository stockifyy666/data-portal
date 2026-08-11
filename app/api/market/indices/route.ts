import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

const INDEX_LABELS: Record<string, string> = {
  KSE100:    'KSE-100',
  KSE30:     'KSE-30',
  KMI30:     'KMI-30',
  ALLSHR:    'All Share',
  KMIALLSHR: 'KMI All Share',
}

export async function GET() {
  try {
    const market = await withCache(
      CACHE_KEYS.allQuotes(),
      TTL_SECONDS.INDICES,
      async () => {
        await trackCSAPICall('POST /api/v3/market?path=/req')
        return csMarketData()
      }
    ) as any

    const inData = market?.in ?? {}

    const indices = Object.entries(inData)
      .filter(([key]) => INDEX_LABELS[key])
      .map(([key, s]: [string, any]) => ({
        key,
        label:     INDEX_LABELS[key] ?? key,
        current:   s.c    ?? 0,
        change:    s.ch   ?? 0,
        changePct: +((s.pch ?? 0) * 100).toFixed(2),
        high:      s.h    ?? 0,
        low:       s.l    ?? 0,
        open:      s.o    ?? 0,
        volume:    s.v    ?? 0,
      }))

    return NextResponse.json({ indices })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/indices]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
