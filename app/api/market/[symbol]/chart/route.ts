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
import { csGet }                             from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                      from '@/lib/capitalstake/endpoints'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                    from '@/lib/utils/rateLimit'
import type { CSResponse, OHLCVCandle }      from '@/types/market'

// Valid timeframe values the user can request
const VALID_TIMEFRAMES = ['1min', '5min', '15min', 'eod'] as const
type Timeframe = typeof VALID_TIMEFRAMES[number]

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase()

    // Read timeframe from query string — default to EOD if not provided
    const tf = (request.nextUrl.searchParams.get('tf') ?? 'eod') as Timeframe

    // Validate both symbol and timeframe
    if (!/^[A-Z]{2,6}$/.test(symbol)) {
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
      '15min': CS_ENDPOINTS.CHART_15MIN(symbol),
      'eod':   CS_ENDPOINTS.EOD_ADJUSTED(symbol),
    }

    const ttlMap: Record<Timeframe, number> = {
      '1min':  TTL_SECONDS.INTRADAY_CHART,   // 1 hour
      '5min':  TTL_SECONDS.INTRADAY_CHART,   // 1 hour
      '15min': TTL_SECONDS.INTRADAY_CHART,   // 1 hour
      'eod':   TTL_SECONDS.EOD_CHART,        // 24 hours
    }

    const cacheKeyMap: Record<Timeframe, string> = {
      '1min':  `stock:chart:1min:${symbol}`,
      '5min':  `stock:chart:5min:${symbol}`,
      '15min': `stock:chart:15min:${symbol}`,
      'eod':   CACHE_KEYS.chartEOD(symbol),
    }

    const data = await withCache<CSResponse<OHLCVCandle[]>>(
      cacheKeyMap[tf],
      ttlMap[tf],
      async () => {
        const endpoint = endpointMap[tf]
        await trackCSAPICall(endpoint)
        return csGet<CSResponse<OHLCVCandle[]>>(endpoint)
      }
    )

    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API /market/${params.symbol}/chart]`, message)
    return NextResponse.json(
      { error: 'Failed to fetch chart data', details: message },
      { status: 500 }
    )
  }
}
