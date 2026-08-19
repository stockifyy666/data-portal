import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'
import type { StockQuote }                    from '@/types/market'

function parseEquities(eq: Record<string, any>): StockQuote[] {
  return Object.entries(eq).map(([symbol, s]) => ({
    symbol,
    name:      s.nm   ?? symbol,
    price:     s.c    ?? 0,
    open:      s.o    ?? 0,
    high:      s.h    ?? 0,
    low:       s.l    ?? 0,
    change:    s.ch   ?? 0,
    changePct: +((s.pch ?? 0) * 100).toFixed(2),
    volume:    s.v    ?? 0,
    high52:    s.h52  ?? 0,
    low52:     s.l52  ?? 0,
    lastClose: s.ldcp ?? 0,
    eps:       s.eps  ?? 0,
    sector:    s.sc != null ? String(s.sc).padStart(4, '0') : '',
    indexKeys: Array.isArray(s.li) ? s.li : [],
    dps:       s.dps  ?? 0,
    xd:        s.xd   ?? false,
    xb:        s.xb   ?? false,
    xr:        s.xr   ?? false,
    mc:        s.c && s.sh ? s.c * s.sh : 0,
    sharesOut: s.sh  ?? 0,
    bvps:      s.as  ?? 0,
    roe:       s.pm  ?? 0,
    pat:       s.pat ?? 0,
  }))
}

export async function GET() {
  try {
    const market = await withCache(
      CACHE_KEYS.allQuotes(),
      TTL_SECONDS.LIVE_QUOTES,
      async () => {
        await trackCSAPICall('POST /api/v3/market?path=/req')
        return csMarketData()
      }
    ) as any

    const quotes = parseEquities(market?.eq ?? {})
    return NextResponse.json({ quotes, total: quotes.length }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/quotes]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
