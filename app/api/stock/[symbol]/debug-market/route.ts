import { NextRequest, NextResponse }              from 'next/server'
import { csMarketData }                           from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS }     from '@/lib/redis/cache'
import { trackCSAPICall }                         from '@/lib/utils/rateLimit'

// Temporary debug route — returns every field Capital Stake sends for a symbol
// in the main market data blob. DELETE after confirming snapshot field names.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  const market = await withCache(
    CACHE_KEYS.allQuotes(),
    TTL_SECONDS.LIVE_QUOTES,
    async () => {
      await trackCSAPICall('POST /api/v3/market?path=/req')
      return csMarketData()
    }
  ) as any

  const raw_data = market?.eq?.[symbol] ?? null

  return NextResponse.json({
    _debug: 'All raw fields Capital Stake sends for this symbol — DELETE after confirming field names',
    symbol,
    raw_data,
    keys: raw_data ? Object.keys(raw_data) : [],
  })
}
