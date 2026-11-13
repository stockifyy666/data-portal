import { NextRequest, NextResponse } from 'next/server'
import { csUatGet }                  from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackChartAPICall }         from '@/lib/utils/rateLimit'
import { getContent, saveContent }   from '@/lib/supabase/content'

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

    // 1. Supabase DB first (nightly synced, free for all users)
    const [cachedOverview, cachedDetail] = await Promise.all([
      getContent<Record<string, unknown>>(symbol, 'profile_overview'),
      getContent<Record<string, unknown>>(symbol, 'profile_detail'),
    ])

    if (cachedOverview && cachedDetail) {
      return NextResponse.json({
        profile:  cachedOverview[0] ?? null,
        org:      null,
        overview: cachedDetail[0]   ?? null,
      })
    }

    // 2. DB miss — fetch from CS UAT, persist to Supabase
    const [overviewRes, detailRes] = await Promise.all([
      withCache(`stock:profile:overview:${symbol}`, TTL_SECONDS.COMPANY_PROFILE, async () => {
        const url = CS_ENDPOINTS.COMPANY_PROFILE_OVERVIEW(symbol)
        await trackChartAPICall(url)
        return csUatGet<{ status: string; data: Record<string, unknown> }>(url)
      }).catch(() => null),
      withCache(`stock:profile:detail:${symbol}`, TTL_SECONDS.COMPANY_PROFILE, async () => {
        const url = CS_ENDPOINTS.COMPANY_PROFILE_DETAIL(symbol)
        await trackChartAPICall(url)
        return csUatGet<{ status: string; data: Record<string, unknown> }>(url)
      }).catch(() => null),
    ])

    const profileOverview = (overviewRes as { data?: Record<string, unknown> } | null)?.data ?? null
    const overview        = (detailRes  as { data?: Record<string, unknown> } | null)?.data ?? null

    // Persist to Supabase for future requests
    if (profileOverview) saveContent(symbol, 'profile_overview', [profileOverview]).catch(() => {})
    if (overview)        saveContent(symbol, 'profile_detail',   [overview]).catch(() => {})

    return NextResponse.json({ profile: profileOverview, org: null, overview })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/profile]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
