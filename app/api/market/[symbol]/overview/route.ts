import { NextResponse }                      from 'next/server'
import { csMarketData }                      from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                    from '@/lib/utils/rateLimit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    // PSX symbols: 2-8 alphanumeric characters
    if (!/^[A-Z0-9]{2,8}$/.test(symbol)) {
      return NextResponse.json({ error: `Invalid symbol: ${symbol}` }, { status: 400 })
    }

    // Get full market data (cached — shared with dashboard)
    const market = await withCache(
      CACHE_KEYS.allQuotes(),
      TTL_SECONDS.LIVE_QUOTES,
      async () => {
        await trackCSAPICall('POST /api/v3/market?path=/req')
        return csMarketData()
      }
    ) as any

    const eq  = market?.eq ?? {}
    const raw_data = eq[symbol]

    if (!raw_data) {
      return NextResponse.json({ error: `Symbol not found: ${symbol}` }, { status: 404 })
    }

    const overview = {
      symbol,
      name:      raw_data.nm   ?? symbol,
      price:     raw_data.c    ?? 0,
      open:      raw_data.o    ?? 0,
      high:      raw_data.h    ?? 0,
      low:       raw_data.l    ?? 0,
      change:    raw_data.ch   ?? 0,
      changePct: +((raw_data.pch ?? 0) * 100).toFixed(2),
      volume:    raw_data.v    ?? 0,
      high52:    raw_data.h52  ?? 0,
      low52:     raw_data.l52  ?? 0,
      lastClose: raw_data.ldcp ?? 0,
      eps:       raw_data.eps  ?? 0,
      sector:    raw_data.sc   ?? '',
    }

    return NextResponse.json({ data: overview })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API /market/overview]`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
