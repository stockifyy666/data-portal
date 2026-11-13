import { NextResponse }                               from 'next/server'
import { cacheGet, cacheSet, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { csUatGet }                                     from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                                 from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                            from '@/lib/utils/rateLimit'
import type { RawStock }                                from '@/types/capitalstake'

// Shape returned per peer
export type PeerData = {
  symbol:    string
  name:      string
  sector:    string
  price:     number
  change:    number
  changePct: number
  volume:    number
  high52:    number
  low52:     number
  marketCap: number
  eps:       number | null
  divYield:  number | null
  roe:       number | null
  de:        number | null
  pb:        number | null
}

// /3.0/market/quote response shape
type RawSingleQuote = {
  symbol:         string
  date:           string
  open:           number
  high:           number
  low:            number
  close:          number
  volume:         number
  change:         number
  change_percent: number
  bid_price:      number
  ask_price:      number
}

// Extract a value from fundamentals fields by regex
function pickFund(
  fields: Array<{ name: string; values: (number | null)[] }>,
  pattern: RegExp
): number | null {
  return fields.find(f => pattern.test(f.name.toLowerCase()))?.values[0] ?? null
}

async function fetchSingleQuote(symbol: string): Promise<RawSingleQuote | null> {
  const cacheKey = `market:quote:uat:${symbol}`
  const cached = await cacheGet<RawSingleQuote>(cacheKey)
  if (cached) return cached
  try {
    const url = CS_ENDPOINTS.MARKET_QUOTE(symbol)
    await trackChartAPICall(url)
    const res = await csUatGet<{ status: string; data: RawSingleQuote }>(url)
    const data = res.data
    if (data?.symbol) await cacheSet(cacheKey, data, TTL_SECONDS.QUOTES_UAT)
    return data ?? null
  } catch { return null }
}

async function fetchFundamentals(symbol: string): Promise<{
  eps: number | null; divYield: number | null
  roe: number | null; de: number | null; pb: number | null
}> {
  const cacheKey = `stock:statement:uat:${symbol}:fundamentals`
  type FundRaw = { periods: string[]; fundamentals: Array<{ name: string; values: (number | null)[] }> }

  const cached = await cacheGet<{ periods: unknown[]; fields: unknown[] }>(cacheKey)
  let fields: Array<{ name: string; values: (number | null)[] }> = []

  if (cached) {
    // Already stored in transformed shape — re-extract from raw cache if available
    const rawKey = `stock:fundamentals:raw:uat:${symbol}`
    const raw = await cacheGet<FundRaw>(rawKey)
    if (raw) fields = raw.fundamentals ?? []
  }

  if (!fields.length) {
    try {
      const url = CS_ENDPOINTS.COMPANY_FUNDAMENTALS(symbol)
      await trackChartAPICall(url)
      const res = await csUatGet<{ status: string; data: FundRaw }>(url)
      fields = res.data?.fundamentals ?? []
      // Cache the raw response so peers can re-read without re-fetching
      if (fields.length) {
        await cacheSet(`stock:fundamentals:raw:uat:${symbol}`, res.data, TTL_SECONDS.FINANCIALS)
        // Also warm the transformed cache used by the statement route
        const periods = (res.data.periods ?? []).map((p: string) => ({
          year: p, period_end: p === 'TTM' ? new Date().toISOString().slice(0, 10) : `${p}-12-31`,
        }))
        const transformedFields = fields.map(f => ({ label: f.name, values: f.values, is_heading: false }))
        await cacheSet(cacheKey, { periods, fields: transformedFields }, TTL_SECONDS.FINANCIALS)
      }
    } catch { /* return nulls below */ }
  }

  return {
    eps:      pickFund(fields, /\beps\b|earnings per share/i),
    divYield: pickFund(fields, /dividend yield/i),
    roe:      pickFund(fields, /return on equity|roe\b/i),
    de:       pickFund(fields, /debt.?to.?equity|debt.?equity|de ratio/i),
    pb:       pickFund(fields, /price.?book|p\/b\b/i),
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    // Get stocks list + bulk quotes from cache (both already populated by /api/market/stocks)
    // This avoids re-fetching per-symbol quotes — bulk quotes are always cached at market:quotes:uat
    let stocks = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
    if (!stocks) {
      await trackChartAPICall('GET /3.0/market/stocks')
      const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
      stocks = res.data ?? []
      if (stocks.length > 0) await cacheSet(CACHE_KEYS.allStocks(), stocks, TTL_SECONDS.STOCKS_LIST)
    }

    // Load bulk quotes from cache (populated by /api/market/stocks or /api/market/quotes)
    type RawQuoteEntry = { symbol: string; close: number; change: number; change_percent: number; volume: number }
    const cachedQuotes = await cacheGet<RawQuoteEntry[]>(CACHE_KEYS.allQuotesUAT())
    const quotesMap = new Map<string, RawQuoteEntry>()
    if (cachedQuotes) {
      for (const q of cachedQuotes) quotesMap.set(q.symbol, q)
    }

    const self = stocks.find(s => s.symbol === symbol)
    if (!self) return NextResponse.json({ error: `Symbol not found: ${symbol}` }, { status: 404 })

    const sectorCode = self.sector
    const peerStocks = stocks
      .filter(s =>
        s.sector === sectorCode &&
        s.symbol !== symbol &&
        s.status === 1 &&
        !/\(R\d*\)|\bRight\b/i.test(s.name) &&
        !/R\d*$/.test(s.symbol)
      )
      .slice(0, 15)

    // Only fetch fundamentals per peer — quotes come from already-cached bulk data
    const peerResults = await Promise.all(
      peerStocks.map(async (s): Promise<PeerData> => {
        const funds = await fetchFundamentals(s.symbol)
        // Use bulk quote cache; fall back to individual quote only if missing
        let quote = quotesMap.get(s.symbol) ?? null
        if (!quote) quote = await fetchSingleQuote(s.symbol) as RawQuoteEntry | null
        const price = quote?.close ?? 0
        const marketCap = price > 0 && s.shares > 0 ? price * s.shares : s.market_cap ?? 0
        return {
          symbol:    s.symbol,
          name:      s.name,
          sector:    s.sector,
          price,
          change:    quote?.change         ?? 0,
          changePct: quote?.change_percent ?? 0,
          volume:    quote?.volume         ?? 0,
          high52:    s.high52,
          low52:     s.low52,
          marketCap,
          ...funds,
        }
      })
    )

    // Filter out peers with no price data (market closed / delisted)
    const peers = peerResults.filter(p => p.price > 0 || p.marketCap > 0)

    return NextResponse.json({ peers, sector: sectorCode, total: peers.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /stock/peers]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
