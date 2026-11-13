import { NextResponse }                       from 'next/server'
import { cacheGet, cacheSet, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import type { RawStock, RawQuote }            from '@/types/capitalstake'

// Fetch and cache the full stocks list from UAT API
async function fetchAndCacheStocks(): Promise<RawStock[]> {
  await trackChartAPICall('GET /3.0/market/stocks')
  const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allStocks(), data, TTL_SECONDS.STOCKS_LIST)
  return data
}

// Fetch and cache the full quotes list from UAT API
async function fetchAndCacheQuotes(): Promise<RawQuote[]> {
  await trackChartAPICall('GET /3.0/market/quotes')
  const res = await csUatGet<{ status: string; data: RawQuote[] }>(CS_ENDPOINTS.QUOTES_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allQuotesUAT(), data, TTL_SECONDS.QUOTES_UAT)
  return data
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!/^[A-Z0-9]{2,8}$/.test(symbol)) {
      return NextResponse.json({ error: `Invalid symbol: ${symbol}` }, { status: 400 })
    }

    // Try cache first; on miss, fetch from UAT API and populate cache for future requests
    let [stocks, quotes] = await Promise.all([
      cacheGet<RawStock[]>(CACHE_KEYS.allStocks()),
      cacheGet<RawQuote[]>(CACHE_KEYS.allQuotesUAT()),
    ])

    if (!stocks) stocks = await fetchAndCacheStocks().catch(() => [])
    if (!quotes) quotes = await fetchAndCacheQuotes().catch(() => [])

    const stock = stocks.find(s => s.symbol === symbol) ?? null
    const quote = quotes.find(q => q.symbol === symbol) ?? null

    if (!stock && !quote) {
      return NextResponse.json({ error: `Symbol not found: ${symbol}` }, { status: 404 })
    }

    const sharesOut   = stock?.shares       ?? 0
    const freeFloat   = stock?.free_float   ?? 0
    const marketCap   = stock?.market_cap   ?? (quote?.close && sharesOut ? quote.close * sharesOut : 0)
    const freeFloatPct = sharesOut > 0 ? (freeFloat / sharesOut) * 100 : 0

    const overview = {
      symbol,
      name:         stock?.name             ?? symbol,
      price:        quote?.close            ?? 0,
      open:         quote?.open             ?? 0,
      high:         quote?.high             ?? 0,
      low:          quote?.low              ?? 0,
      change:       quote?.change           ?? 0,
      changePct:    +(quote?.change_percent ?? 0).toFixed(2),
      volume:       quote?.volume           ?? 0,
      high52:       stock?.high52           ?? 0,
      low52:        stock?.low52            ?? 0,
      lastClose:    stock?.ldcp             ?? 0,
      lastDayVol:   stock?.ldcv             ?? 0,
      sector:       stock?.sector           ?? '',
      bidPrice:     quote?.bid_price        ?? 0,
      askPrice:     quote?.ask_price        ?? 0,
      lastTrade:    quote?.date             ?? null,
      sharesOut,
      freeFloat,
      marketCap,
      freeFloatPct: +freeFloatPct.toFixed(2),
      listedIn:     stock?.listed_in        ?? [],
      xd:           stock?.xd               ?? false,
      xb:           stock?.xb               ?? false,
      xr:           stock?.xr               ?? false,
    }

    return NextResponse.json({ data: overview })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API /market/overview]`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
