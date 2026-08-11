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

    const to   = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const type = req.nextUrl.searchParams.get('type') ?? 'ALL'

    const data = await withCache(
      `stock:announcements:${symbol}:${from}:${type}`,
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const url = CS_ENDPOINTS.ANNOUNCEMENTS(symbol, from, to, type)
        await trackCSAPICall(url)
        return csGet(url)
      }
    )

    return NextResponse.json({ announcements: Array.isArray(data) ? data : [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/announcements]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
