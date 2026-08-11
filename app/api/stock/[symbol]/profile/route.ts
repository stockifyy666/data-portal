import { NextRequest, NextResponse } from 'next/server'
import { csGet }                     from '@/lib/capitalstake/client'
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

    const [profile, org] = await Promise.all([
      withCache(`stock:profile:${symbol}`, TTL_SECONDS.COMPANY_PROFILE, async () => {
        const url = CS_ENDPOINTS.COMPANY_PROFILE(symbol)
        await trackCSAPICall(url)
        return csGet(url)
      }),
      withCache(`stock:org:${symbol}`, TTL_SECONDS.COMPANY_PROFILE, async () => {
        const url = CS_ENDPOINTS.ORGANIZATION(symbol)
        await trackCSAPICall(url)
        return csGet(url)
      }).catch(() => null),
    ])

    return NextResponse.json({ profile, org })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/profile]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
