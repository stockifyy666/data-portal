import { NextResponse }                       from 'next/server'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import { PSX_TTL }                            from '@/lib/utils/marketHours'
import type { RawStock }                      from '@/types/capitalstake'

interface RawTicker {
  m:   string   // market type: "REG" = regular stock, "IDX" = index
  s:   string   // symbol
  c:   number   // current price/close
  ch:  number   // change
  pch: number   // percent change
}

export interface TickerItem {
  symbol:    string
  price:     number
  change:    number
  changePct: number
}

export async function GET() {
  try {
    // Both datasets are independently cached — reuses existing cache if still fresh
    const [tickers, stocks] = await Promise.all([
      withCache<RawTicker[]>(
        CACHE_KEYS.tickers(),
        PSX_TTL.TICKERS(),
        async () => {
          await trackChartAPICall('GET /3.0/market/tickers')
          const res = await csUatGet<{ status: string; data: RawTicker[] }>(CS_ENDPOINTS.TICKERS)
          return res.data ?? []
        }
      ),
      withCache<RawStock[]>(
        CACHE_KEYS.allStocks(),
        TTL_SECONDS.STOCKS_LIST,
        async () => {
          await trackChartAPICall('GET /3.0/market/stocks')
          const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
          return res.data ?? []
        }
      ),
    ])

    // Build a Set of KMI symbols from the stocks reference data
    const kmiSymbols = new Set<string>()
    for (const s of stocks) {
      if (s.listed_in?.includes('KMI30') || s.listed_in?.includes('KMIALLSHR')) {
        kmiSymbols.add(s.symbol)
      }
    }

    // Filter tickers: REG market only + must be a KMI symbol
    const filtered: TickerItem[] = tickers
      .filter(t => t.m === 'REG' && kmiSymbols.has(t.s))
      .map(t => ({
        symbol:    t.s,
        price:     t.c,
        change:    t.ch,
        changePct: t.pch,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))

    return NextResponse.json(
      { tickers: filtered, total: filtered.length },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/tickers]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
