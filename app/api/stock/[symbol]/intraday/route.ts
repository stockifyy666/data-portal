import { NextRequest, NextResponse } from 'next/server'
import { csGet }                     from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackCSAPICall }            from '@/lib/utils/rateLimit'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    const period  = req.nextUrl.searchParams.get('period') ?? '1D'
    const allowed = ['1D', '2D', '1W', '1M', '3M', '6M', '1Y']
    if (!allowed.includes(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }

    const cacheKey = `stock:intraday:${symbol}:${period}`
    const ttl      = period === '1D' ? TTL_SECONDS.INTRADAY_CHART : TTL_SECONDS.EOD_CHART

    const data = await withCache(cacheKey, ttl, async () => {
      const url = CS_ENDPOINTS.INTRADAY(symbol, period)
      await trackCSAPICall(url)
      return csGet(url)
    })

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/intraday]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
