import { NextResponse }                                  from 'next/server'
import { cacheGet, cacheSet, CACHE_KEYS, TTL_SECONDS }  from '@/lib/redis/cache'
import { csUatGet }                                      from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                                  from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                             from '@/lib/utils/rateLimit'
import { PSX_TTL }                                       from '@/lib/utils/marketHours'
import { createServiceClient }                           from '@/lib/supabase/service'
import type { RawStock, RawQuote }                       from '@/types/capitalstake'
import type { StockQuote }                               from '@/types/market'
import type { StatementData }                            from '@/components/stock/stock-detail-types'

const SCREENER_CACHE_KEY = 'screener:enriched'
const SCREENER_TTL       = 60 * 60 // 1 hour — fundamentals change daily at most

async function getStocks(): Promise<RawStock[]> {
  const cached = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
  if (cached) return cached
  await trackChartAPICall('GET /3.0/market/stocks')
  const res  = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allStocks(), data, TTL_SECONDS.STOCKS_LIST)
  return data
}

async function getQuotes(): Promise<RawQuote[]> {
  const cached = await cacheGet<RawQuote[]>(CACHE_KEYS.allQuotesUAT())
  if (cached) return cached
  await trackChartAPICall('GET /3.0/market/quotes')
  const res  = await csUatGet<{ status: string; data: RawQuote[] }>(CS_ENDPOINTS.QUOTES_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allQuotesUAT(), data, PSX_TTL.QUOTES())
  return data
}

type FundRow = {
  symbol: string
  data:   StatementData
}

async function getAllFundamentals(): Promise<Map<string, { eps: number; dps: number }>> {
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('financial_statements')
      .select('symbol, data')
      .eq('stmt_type', 'fundamentals')
      .eq('interval', 'annual')

    if (error || !data) return new Map()

    const map = new Map<string, { eps: number; dps: number }>()

    for (const row of (data as FundRow[])) {
      const stmt = row.data
      if (!stmt?.fields || !stmt.fields.length) continue

      let eps = 0
      let dps = 0

      for (const field of stmt.fields) {
        const label = field.label ?? ''
        const val   = field.values?.find(v => v !== null && v !== undefined) ?? null
        if (val === null) continue
        if (/\beps\b|earnings per share|latest eps/i.test(label) && eps === 0) eps = val
        if (/dividend per share|\bdps\b/i.test(label) && dps === 0) dps = val
      }

      if (eps !== 0 || dps !== 0) {
        map.set(row.symbol.toUpperCase(), { eps, dps })
      }
    }

    return map
  } catch {
    return new Map()
  }
}

export async function GET() {
  try {
    // Short-lived cache for the full enriched screener result
    const cached = await cacheGet<StockQuote[]>(SCREENER_CACHE_KEY)
    if (cached) {
      return NextResponse.json({ quotes: cached, total: cached.length }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Parallel fetch: quotes + stocks + fundamentals
    const [stocks, quotes, fundMap] = await Promise.all([
      getStocks(),
      getQuotes(),
      getAllFundamentals(),
    ])

    const qMap = new Map<string, RawQuote>()
    for (const q of quotes) qMap.set(q.symbol, q)

    const result: StockQuote[] = stocks.map(s => {
      const q    = qMap.get(s.symbol)
      const fund = fundMap.get(s.symbol.toUpperCase())
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
        eps:       fund?.eps    ?? 0,
        dps:       fund?.dps    ?? 0,
        sector:    s.sector     ?? '',
        indexKeys: s.listed_in  ?? [],
        xd:        false,
        xb:        false,
        xr:        false,
        mc:        q?.close && s.shares ? q.close * s.shares : s.market_cap ?? 0,
        sharesOut: s.shares     ?? 0,
        bvps:      0,
        roe:       0,
        pat:       0,
      }
    })

    await cacheSet(SCREENER_CACHE_KEY, result, SCREENER_TTL)

    return NextResponse.json({ quotes: result, total: result.length }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/screener]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
