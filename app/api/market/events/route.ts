import { NextResponse }                       from 'next/server'
import { cacheGet, cacheSet,
         CACHE_KEYS, TTL_SECONDS }            from '@/lib/redis/cache'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import { PSX_TTL }                            from '@/lib/utils/marketHours'
import type { RawStock, RawQuote }            from '@/types/capitalstake'

export type CorporateEvent = {
  symbol:    string
  name:      string
  sector:    string
  eventType: 'Dividend' | 'Bonus' | 'Rights'
  dps:       number
  price:     number
  changePct: number
}

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

    const events: CorporateEvent[] = []

    for (const s of stocks) {
      if (s.status !== 1) continue
      const q = qMap.get(s.symbol)
      if (!q || q.close <= 0) continue

      const price     = q.close
      const changePct = +q.change_percent.toFixed(2)

      if (s.xd) events.push({ symbol: s.symbol, name: s.name, sector: s.sector ?? '', eventType: 'Dividend', dps: 0, price, changePct })
      if (s.xb) events.push({ symbol: s.symbol, name: s.name, sector: s.sector ?? '', eventType: 'Bonus',    dps: 0, price, changePct })
      if (s.xr) events.push({ symbol: s.symbol, name: s.name, sector: s.sector ?? '', eventType: 'Rights',   dps: 0, price, changePct })
    }

    // Fall back to top-volume stocks when no corporate actions today
    const result = events.length > 0 ? events : stocks
      .filter(s => s.status === 1 && (qMap.get(s.symbol)?.close ?? 0) > 0)
      .map(s => {
        const q = qMap.get(s.symbol)!
        return { symbol: s.symbol, name: s.name, sector: s.sector ?? '', eventType: 'Dividend' as const, dps: 0, price: q.close, changePct: +q.change_percent.toFixed(2) }
      })
      .sort((a, b) => b.price - a.price)
      .slice(0, 30)

    return NextResponse.json({ events: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/events]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
