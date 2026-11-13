import { NextResponse }                       from 'next/server'
import { cacheGet, cacheSet,
         CACHE_KEYS, TTL_SECONDS }            from '@/lib/redis/cache'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import { PSX_TTL }                            from '@/lib/utils/marketHours'
import type { RawStock, RawQuote }            from '@/types/capitalstake'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'gainers'

  try {
    const [stocks, quotes] = await Promise.all([getStocks(), getQuotes()])

    const qMap = new Map<string, RawQuote>()
    for (const q of quotes) qMap.set(q.symbol, q)

    const movers = stocks
      .filter(s => {
        if (s.status !== 1) return false
        // skip rights issues
        if (/\(R\d*\)|\bRight\b/i.test(s.name) || /R\d*$/.test(s.symbol)) return false
        const q = qMap.get(s.symbol)
        if (!q || q.close <= 0 || q.volume <= 0) return false
        return type === 'gainers' ? q.change_percent > 0 : q.change_percent < 0
      })
      .map(s => {
        const q = qMap.get(s.symbol)!
        return {
          symbol:    s.symbol,
          name:      s.name,
          price:     q.close,
          change:    q.change,
          changePct: +q.change_percent.toFixed(2),
          volume:    q.volume,
        }
      })
      .sort((a, b) => type === 'gainers' ? b.changePct - a.changePct : a.changePct - b.changePct)
      .slice(0, 10)

    return NextResponse.json({ type, movers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/movers]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
