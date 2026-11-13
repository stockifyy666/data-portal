import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }     from '@/lib/redis/cache'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

// Map request period to UAT endpoint + cache key
const PERIOD_MAP = {
  '1D':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_1MIN(s),  key: '1min',  ttl: TTL_SECONDS.INTRADAY_CHART },
  '2D':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_5MIN(s),  key: '5min',  ttl: TTL_SECONDS.INTRADAY_CHART },
  '1W':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_30MIN(s), key: '30min', ttl: TTL_SECONDS.INTRADAY_CHART },
  '1M':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_1H(s),    key: '1h',    ttl: TTL_SECONDS.INTRADAY_CHART },
  '3M':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_1H(s),    key: '1h',    ttl: TTL_SECONDS.INTRADAY_CHART },
  '6M':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_1H(s),    key: '1h',    ttl: TTL_SECONDS.EOD_CHART      },
  '1Y':  { endpoint: (s: string) => CS_ENDPOINTS.CHART_1H(s),    key: '1h',    ttl: TTL_SECONDS.EOD_CHART      },
} as const

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

    const period = (req.nextUrl.searchParams.get('period') ?? '1D') as keyof typeof PERIOD_MAP
    const cfg    = PERIOD_MAP[period] ?? PERIOD_MAP['1D']

    const data = await withCache(
      `stock:intraday:${symbol}:${cfg.key}`,
      cfg.ttl,
      async () => {
        const url = cfg.endpoint(symbol)
        await trackChartAPICall(url)
        const res = await csUatGet<{ status: string; data: unknown[] }>(url)
        return { data: Array.isArray(res?.data) ? res.data : [] }
      }
    )

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/intraday]', msg)
    return NextResponse.json({ data: [] })
  }
}
