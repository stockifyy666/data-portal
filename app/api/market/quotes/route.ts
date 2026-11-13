import { NextResponse }                                  from 'next/server'
import { cacheGet, cacheSet, CACHE_KEYS, TTL_SECONDS }  from '@/lib/redis/cache'
import { csUatGet }                                      from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                                  from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                             from '@/lib/utils/rateLimit'
import { PSX_TTL }                                       from '@/lib/utils/marketHours'
import type { RawStock, RawQuote }                       from '@/types/capitalstake'
import type { StockQuote }                               from '@/types/market'

async function getStocks(): Promise<RawStock[]> {
  const cached = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
  if (cached) return cached
  await trackChartAPICall('GET /3.0/market/stocks')
  const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allStocks(), data, TTL_SECONDS.STOCKS_LIST)
  return data
}

async function getQuotes(): Promise<RawQuote[]> {
  const cached = await cacheGet<RawQuote[]>(CACHE_KEYS.allQuotesUAT())
  if (cached) return cached
  await trackChartAPICall('GET /3.0/market/quotes')
  const res = await csUatGet<{ status: string; data: RawQuote[] }>(CS_ENDPOINTS.QUOTES_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allQuotesUAT(), data, PSX_TTL.QUOTES())
  return data
}

export async function GET() {
  try {
    const [stocks, quotes] = await Promise.all([getStocks(), getQuotes()])

    const qMap = new Map<string, RawQuote>()
    for (const q of quotes) qMap.set(q.symbol, q)

    const result: StockQuote[] = stocks.map(s => {
      const q = qMap.get(s.symbol)
      return {
        symbol:    s.symbol,
        name:      s.name       ?? s.symbol,
        price:     q?.close     ?? 0,
        open:      q?.open      ?? 0,
        high:      q?.high      ?? 0,
        low:       q?.low       ?? 0,
        change:    q?.change    ?? 0,
        changePct: +(q?.change_percent ?? 0),
        volume:    q?.volume    ?? 0,
        high52:    s.high52     ?? 0,
        low52:     s.low52      ?? 0,
        lastClose: s.ldcp       ?? 0,
        eps:       0,
        sector:    s.sector     ?? '',
        indexKeys: s.listed_in ?? [],
        dps:       0,
        xd:        false,
        xb:        false,
        xr:        false,
        mc:        q?.close && s.shares ? q.close * s.shares : s.market_cap ?? 0,
        sharesOut: s.shares ?? 0,
        bvps:      0,
        roe:       0,
        pat:       0,
      }
    })

    return NextResponse.json({ quotes: result, total: result.length }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/quotes]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
