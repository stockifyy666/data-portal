// =============================================================================
// FILE: app/api/sync/content/route.ts
// PURPOSE: Nightly sync — fetches announcements, news, and company profiles
//          for all active symbols and stores in Supabase stock_content table.
//          Called by Vercel Cron at 2:30 AM PKT (21:30 UTC).
//
// Security: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>
//
// Cost: ~700 symbols × 4 types = ~2,800 CS UAT calls/night
//       Without this: 1,000 users × 4 = 4,000 calls/hour → 96,000/day
// =============================================================================

import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { cacheGet, cacheSet,
         CACHE_KEYS, TTL_SECONDS }    from '@/lib/redis/cache'
import { saveContent }                from '@/lib/supabase/content'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'
import type { RawStock }              from '@/types/capitalstake'

const BATCH_SIZE  = 10
const BATCH_DELAY = 500

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function syncAnnouncements(symbol: string): Promise<'saved' | 'failed'> {
  try {
    const url = CS_ENDPOINTS.ANNOUNCEMENTS_UAT(symbol, 0, 50)
    await trackChartAPICall(`GET /3.0/announcements/${symbol}`)
    const res = await csUatGet<{ status: string; data: unknown[] }>(url)
    const items = res.data ?? []
    if (items.length > 0) await saveContent(symbol, 'announcements', items)
    return 'saved'
  } catch { return 'failed' }
}

async function syncNews(symbol: string): Promise<'saved' | 'failed'> {
  try {
    const url = CS_ENDPOINTS.COMPANY_NEWS(symbol, 0, 50)
    await trackChartAPICall(`GET /3.0/news/${symbol}`)
    const res = await csUatGet<{ status: string; data: unknown[] }>(url)
    const items = (res.data ?? []).filter((i: any) => i.title)
    if (items.length > 0) await saveContent(symbol, 'news', items)
    return 'saved'
  } catch { return 'failed' }
}

async function syncProfile(symbol: string): Promise<'saved' | 'failed'> {
  try {
    const [overviewRes, detailRes] = await Promise.all([
      (async () => {
        const url = CS_ENDPOINTS.COMPANY_PROFILE_OVERVIEW(symbol)
        await trackChartAPICall(`GET /3.0/company/profile/overview/${symbol}`)
        return csUatGet<{ status: string; data: Record<string, unknown> }>(url)
      })(),
      (async () => {
        const url = CS_ENDPOINTS.COMPANY_PROFILE_DETAIL(symbol)
        await trackChartAPICall(`GET /3.0/company/profile/detail/${symbol}`)
        return csUatGet<{ status: string; data: Record<string, unknown> }>(url)
      })(),
    ])
    const overview = overviewRes?.data
    const detail   = detailRes?.data
    if (overview) await saveContent(symbol, 'profile_overview', [overview])
    if (detail)   await saveContent(symbol, 'profile_detail',   [detail])
    return 'saved'
  } catch { return 'failed' }
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader  = req.headers.get('authorization') ?? ''
  const querySecret = req.nextUrl.searchParams.get('secret') ?? ''
  const cronSecret  = process.env.CRON_SECRET ?? ''

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startMs = Date.now()
  let saved = 0, failed = 0

  try {
    // ── Get all active symbols ─────────────────────────────────────────────────
    let stocks = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
    if (!stocks || stocks.length === 0) {
      await trackChartAPICall('GET /3.0/market/stocks')
      const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
      stocks = res.data ?? []
      if (stocks.length > 0) await cacheSet(CACHE_KEYS.allStocks(), stocks, TTL_SECONDS.STOCKS_LIST)
    }

    const symbols = stocks
      .filter(s =>
        s.status === 1 &&
        !/\(R\d*\)|\bRight\b/i.test(s.name) &&
        !/R\d*$/.test(s.symbol)
      )
      .map(s => s.symbol)

    // ── Process in batches ─────────────────────────────────────────────────────
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE)

      const results = await Promise.all(
        batch.flatMap(sym => [
          syncAnnouncements(sym),
          syncNews(sym),
          syncProfile(sym),
        ])
      )

      for (const r of results) {
        if (r === 'saved') saved++
        else failed++
      }

      if (i + BATCH_SIZE < symbols.length) await sleep(BATCH_DELAY)
    }

    const duration = ((Date.now() - startMs) / 1000).toFixed(1)
    console.log(`[Sync] content complete: ${saved} saved, ${failed} failed in ${duration}s`)

    return NextResponse.json({ ok: true, symbols: symbols.length, saved, failed, duration: `${duration}s` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sync] content error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
