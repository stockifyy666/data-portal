import { NextRequest, NextResponse } from 'next/server'
import { csGet }                     from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackCSAPICall }            from '@/lib/utils/rateLimit'

const SYMBOL_RE   = /^[A-Z0-9]{2,10}$/
const VALID_TYPES = ['balance', 'income', 'fundamentals', 'shareholders', 'other'] as const
const VALID_INT   = ['annual', 'quarterly'] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol   = raw.toUpperCase()
    const type     = (req.nextUrl.searchParams.get('type')     ?? 'income') as typeof VALID_TYPES[number]
    const interval = (req.nextUrl.searchParams.get('interval') ?? 'annual') as typeof VALID_INT[number]

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Use: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }
    if (!VALID_INT.includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval. Use: annual | quarterly' }, { status: 400 })
    }

    const data = await withCache(
      `stock:statement:${symbol}:${interval}:${type}`,
      TTL_SECONDS.FINANCIALS,
      async () => {
        const url = CS_ENDPOINTS.COMPANY_STATEMENT(symbol, interval, type)
        await trackCSAPICall(url)
        return csGet(url)
      }
    )

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/statement]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
