// =============================================================================
// FILE: app/api/sync/payouts/route.ts
// PURPOSE: NIGHTLY sync (2:00 AM PKT) of every company's payouts — dividend,
//          bonus, right issue, split — → Supabase `company_profiles` (kind 'payouts').
//          The stock page's Announcements → Payout tab reads only from there.
//
// 1 call per symbol (/3.0/payouts?symbol=…), ~700–800 calls a night.
// Paced at 4 calls/sec (CS limit 5/sec). One run works ~4 minutes (~960 calls)
// and skips anything refreshed in the last 20h, so the cron repeats it every
// 15 min between 2:00 and 3:00 AM PKT until all symbols are done.
// Symbols with no payouts are remembered for 7 days and skipped meanwhile.
//
// Schedule (vercel.json): "5-59/15 21 * * *"  = 21:05–21:50 UTC = 2:05–2:50 AM PKT
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>
// =============================================================================

import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { saveContent }                from '@/lib/supabase/content'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'
import { cronUnauthorized }           from '@/lib/utils/cronAuth'
import { paced, activeSymbols, freshKeys } from '@/lib/utils/syncRunner'
import { cacheGet, cacheSet }         from '@/lib/redis/cache'

export const dynamic     = 'force-dynamic'
export const maxDuration = 300

const WORK_MS     = 240_000           // stop starting new calls after 4 min
const FRESH_SINCE = 20 * 3600e3       // refreshed within 20h = done for today
const NODATA_KEY  = 'sync:payouts:nodata'   // { SYMBOL: expiresAtMs }
const NODATA_MS   = 7 * 24 * 3600e3

type Result = 'saved' | 'empty' | 'error'
type RawPayout = Record<string, unknown> & { payouts?: Record<string, unknown> | null }

// Keep only results that actually carry a payout (any non-zero amount/ratio)
function hasPayout(p: Record<string, unknown> | null | undefined): boolean {
  if (!p) return false
  return ['dividend', 'bonus', 'right_issue', 'split_num', 'rsplit_num', 'sdiv_num']
    .some(k => Number(p[k]) > 0)
}

async function fetchAndSave(symbol: string): Promise<Result> {
  try {
    const url = CS_ENDPOINTS.PAYOUTS(symbol)
    await trackChartAPICall(url)
    const res  = await csUatGet<{ data?: RawPayout[] }>(url)
    const list = (Array.isArray(res?.data) ? res.data : []).filter(r => hasPayout(r.payouts))
    if (!list.length) return 'empty'

    // Store only what the Payout tab needs
    const items = list.map(r => ({
      id:           String(r.id ?? ''),
      title:        String(r.title ?? ''),
      quarter:      String(r.quarter ?? ''),
      period_ended: String(r.period_ended ?? ''),
      date:         String(r.date ?? ''),
      docs:         Array.isArray(r.docs) ? r.docs : [],
      images:       Array.isArray(r.images) ? r.images : [],
      payouts:      r.payouts,
    })).sort((a, b) => b.date.localeCompare(a.date))

    await saveContent(symbol, 'payouts', items)
    return 'saved'
  } catch (err) {
    // 404 = nothing for this symbol → treat as empty, not an error
    return err instanceof Error && /\b404\b/.test(err.message) ? 'empty' : 'error'
  }
}

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  const start = Date.now()
  try {
    const [symbols, fresh, stored] = await Promise.all([
      activeSymbols(),
      freshKeys('company_profiles', ['symbol', 'kind'], new Date(start - FRESH_SINCE)),
      cacheGet<Record<string, number>>(NODATA_KEY),
    ])
    const nodata: Record<string, number> =
      Object.fromEntries(Object.entries(stored ?? {}).filter(([, exp]) => exp > start))

    const syms = symbols.filter(s => !fresh.has(`${s}|payouts`) && !nodata[s])
    const { results, started, skipped } = await paced(syms.map(s => () => fetchAndSave(s)), { deadlineMs: start + WORK_MS })

    let saved = 0, empty = 0
    results.forEach((r, i) => {
      if (r === 'saved') saved++
      else if (r === 'empty') { empty++; nodata[syms[i]] = start + NODATA_MS }
    })
    await cacheSet(NODATA_KEY, nodata, Math.ceil(NODATA_MS / 1000))

    const out = {
      ok: true, symbols: symbols.length, pending: syms.length,
      started, saved, empty, failed: started - saved - empty, remaining: skipped,
      skippedNoData: Object.keys(nodata).length,
      done: skipped === 0, duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
    }
    console.log('[Sync] payouts', out)
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sync] payouts error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
