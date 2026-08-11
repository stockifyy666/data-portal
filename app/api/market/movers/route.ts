import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'gainers'

  try {
    const market = await withCache(
      CACHE_KEYS.allQuotes(),
      TTL_SECONDS.LIVE_QUOTES,
      async () => {
        await trackCSAPICall('POST /api/v3/market?path=/req')
        return csMarketData()
      }
    ) as any

    const eq     = market?.eq ?? {}
    const stocks = Object.entries(eq).map(([symbol, s]: [string, any]) => ({
      symbol,
      name:      s.nm ?? symbol,
      price:     s.c  ?? 0,
      change:    s.ch ?? 0,
      changePct: +((s.pch ?? 0) * 100).toFixed(2),
      volume:    s.v  ?? 0,
    }))

    const movers = stocks
      .filter(s => s.price > 0)
      .sort((a, b) => type === 'gainers' ? b.changePct - a.changePct : a.changePct - b.changePct)
      .slice(0, 10)

    return NextResponse.json({ type, movers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/movers]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
