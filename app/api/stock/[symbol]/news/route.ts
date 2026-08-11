import { NextRequest, NextResponse } from 'next/server'
import { csPost }                    from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackCSAPICall }            from '@/lib/utils/rateLimit'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    const data = await withCache(
      `stock:news:${symbol}`,
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const url = CS_ENDPOINTS.NEWS(symbol)
        await trackCSAPICall(url)
        return csPost(url, '')
      }
    )

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/news]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
