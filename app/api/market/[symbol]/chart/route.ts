// =============================================================================
// FILE: app/api/market/[symbol]/chart/route.ts
// PURPOSE: Returns OHLCV candlestick chart data for a stock symbol.
//          Supports multiple timeframes via query parameter:
//            ?tf=1min   → 1-minute intraday candles (cached 1hr)
//            ?tf=5min   → 5-minute intraday candles (cached 1hr)
//            ?tf=15min  → 15-minute intraday candles (cached 1hr)
//            ?tf=eod    → End-of-day historical candles (cached 24hr)
//
//          This data feeds directly into the Lightweight Charts component.
//
//          URL example: GET /api/market/DGKC/chart?tf=eod
// =============================================================================

import { NextRequest, NextResponse }         from 'next/server'
import { createClient }                      from '@/lib/supabase/server'
import { csUatGet }                          from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                      from '@/lib/capitalstake/endpoints'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackChartAPICall }                 from '@/lib/utils/rateLimit'
import type { CSResponse, OHLCVCandle }      from '@/types/market'

// Valid timeframe values the user can request
const VALID_TIMEFRAMES = ['1min', '5min', '10min', '15min', '30min', '1h', 'eod'] as const

// Normalize whatever the chart API returns into OHLCVCandle[]
// The new uat.csapis.com API may return { data: [...] }, [...], or { status, data: [...] }
function normalizeChartResponse(raw: unknown): OHLCVCandle[] {
  if (!raw) return []

  // Already an array
  if (Array.isArray(raw)) return raw as OHLCVCandle[]

  const obj = raw as Record<string, unknown>

  // { status: 'ok', data: [...] }  ← old CS shape
  if (Array.isArray(obj.data)) return obj.data as OHLCVCandle[]

  // { candles: [...] } or { ohlcv: [...] } or { result: [...] }
  for (const key of ['candles', 'ohlcv', 'result', 'bars', 'history']) {
    if (Array.isArray(obj[key])) return obj[key] as OHLCVCandle[]
  }

  // Log the actual shape in dev so we can adapt
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[chart route] Unknown chart API response shape:', JSON.stringify(raw).slice(0, 300))
  }
  return []
}
type Timeframe = typeof VALID_TIMEFRAMES[number]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params
    const symbol = rawSymbol.toUpperCase()

    // Read timeframe from query string — default to EOD if not provided
    const tf = (request.nextUrl.searchParams.get('tf') ?? 'eod') as Timeframe

    // Validate both symbol and timeframe
    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) {
      return NextResponse.json({ error: `Invalid symbol: ${symbol}` }, { status: 400 })
    }

    if (!VALID_TIMEFRAMES.includes(tf)) {
      return NextResponse.json(
        { error: `Invalid timeframe. Use: ${VALID_TIMEFRAMES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pick the right endpoint and cache TTL based on timeframe
    const endpointMap: Record<Timeframe, string> = {
      '1min':  CS_ENDPOINTS.CHART_1MIN(symbol),
      '5min':  CS_ENDPOINTS.CHART_5MIN(symbol),
      '10min': CS_ENDPOINTS.CHART_10MIN(symbol),
      '15min': CS_ENDPOINTS.CHART_15MIN(symbol),
      '30min': CS_ENDPOINTS.CHART_30MIN(symbol),
      '1h':    CS_ENDPOINTS.CHART_1H(symbol),
      'eod':   CS_ENDPOINTS.CHART_1H(symbol),
    }

    const ttlMap: Record<Timeframe, number> = {
      '1min':  TTL_SECONDS.INTRADAY_CHART,
      '5min':  TTL_SECONDS.INTRADAY_CHART,
      '10min': TTL_SECONDS.INTRADAY_CHART,
      '15min': TTL_SECONDS.INTRADAY_CHART,
      '30min': TTL_SECONDS.INTRADAY_CHART,
      '1h':    TTL_SECONDS.INTRADAY_CHART,
      'eod':   TTL_SECONDS.EOD_CHART,
    }

    const cacheKeyMap: Record<Timeframe, string> = {
      '1min':  `stock:chart:1min:${symbol}`,
      '5min':  `stock:chart:5min:${symbol}`,
      '10min': `stock:chart:10min:${symbol}`,
      '15min': `stock:chart:15min:${symbol}`,
      '30min': `stock:chart:30min:${symbol}`,
      '1h':    `stock:chart:1h:${symbol}`,
      'eod':   CACHE_KEYS.chartEOD(symbol),
    }

    const raw = await withCache<unknown>(
      cacheKeyMap[tf],
      ttlMap[tf],
      async () => {
        const endpoint = endpointMap[tf]
        await trackChartAPICall(endpoint)
        return csUatGet<unknown>(endpoint)
      }
    )

    // Normalize whatever shape the chart API returns into { status, data: OHLCVCandle[] }
    const candles = normalizeChartResponse(raw)
    return NextResponse.json({ status: 'ok', message: '', data: candles }, { status: 200 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API /market/chart]`, message)
    return NextResponse.json(
      { error: 'Failed to fetch chart data', details: message },
      { status: 500 }
    )
  }
}
