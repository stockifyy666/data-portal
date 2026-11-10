import { NextResponse }                       from 'next/server'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import type { RawStock, RawQuote, MergedStock } from '@/types/capitalstake'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchStocks(): Promise<RawStock[]> {
  const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
  return res.data ?? []
}

async function fetchQuotes(): Promise<Map<string, RawQuote>> {
  const res = await csUatGet<{ status: string; data: RawQuote[] }>(CS_ENDPOINTS.QUOTES_LIST)
  const map = new Map<string, RawQuote>()
  for (const q of res.data ?? []) map.set(q.symbol, q)
  return map
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Fetch and cache each dataset independently so their TTLs are respected
    const [stocks, quotesMap] = await Promise.all([
      withCache<RawStock[]>(
        CACHE_KEYS.allStocks(),
        TTL_SECONDS.STOCKS_LIST,
        async () => {
          await trackChartAPICall('GET /3.0/market/stocks')
          return fetchStocks()
        }
      ),
      withCache<RawQuote[]>(
        CACHE_KEYS.allQuotesUAT(),
        TTL_SECONDS.QUOTES_UAT,
        async () => {
          await trackChartAPICall('GET /3.0/market/quotes')
          const map = await fetchQuotes()
          return Array.from(map.values())
        }
      ),
    ])

    // Build quotes lookup from cached array
    const qMap = new Map<string, RawQuote>()
    for (const q of quotesMap) qMap.set(q.symbol, q)

    // Merge: every stock gets live quote fields (or null if no quote)
    const merged: MergedStock[] = stocks.map(s => {
      const q = qMap.get(s.symbol)
      return {
        ...s,
        price:          q?.close          ?? null,
        open:           q?.open           ?? null,
        high:           q?.high           ?? null,
        low:            q?.low            ?? null,
        volume:         q?.volume         ?? null,
        change:         q?.change         ?? null,
        change_percent: q?.change_percent ?? null,
        bid_price:      q?.bid_price      ?? null,
        ask_price:      q?.ask_price      ?? null,
        last_trade:     q?.date           ?? null,
      }
    })

    return NextResponse.json(
      { stocks: merged, total: merged.length },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/stocks]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
