// =============================================================================
// FILE: app/api/sync/content/route.ts
// PURPOSE: WEEKLY sync (Sunday 3–5 AM PKT, after the 2 AM payouts sync) — company profile overview, profile detail and
//          shareholders for every company → Supabase `company_profiles`.
//          Served from Supabase for 7 days, until the next Sunday.
//
// ~700 symbols × 3 calls ≈ 2,100 calls, once a week.
// Paced at 4 calls/sec; one run works ~4 minutes and skips anything refreshed in
// the last 6 days, so the Sunday cron repeats it every 15 min until done.
// (Announcements moved to the hourly sync; company news comes from sector news.)
//
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>
// =============================================================================

import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { saveContent }                from '@/lib/supabase/content'
import { saveStatement }              from '@/lib/supabase/financials'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'
import { cronUnauthorized }           from '@/lib/utils/cronAuth'
import { paced, activeSymbols, freshKeys } from '@/lib/utils/syncRunner'
import type { StatementData }         from '@/components/stock/stock-detail-types'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export const maxDuration = 300
const WORK_MS     = 240_000
const FRESH_SINCE = 6 * 86_400e3   // refreshed within 6 days = done this week

type Kind = 'overview' | 'detail' | 'shareholders'
const KINDS: Kind[] = ['overview', 'detail', 'shareholders']

async function fetchAndSave(symbol: string, kind: Kind): Promise<boolean> {
  try {
    if (kind === 'shareholders') {
      const url = CS_ENDPOINTS.COMPANY_SHAREHOLDERS(symbol)
      await trackChartAPICall(url)
      const res = await csUatGet<{ data: StatementData }>(url)
      if (!res.data) return false
      await saveStatement(symbol, 'shareholders', 'annual', res.data, res.data)
      return true
    }
    const url = kind === 'overview'
      ? CS_ENDPOINTS.COMPANY_PROFILE_OVERVIEW(symbol)
      : CS_ENDPOINTS.COMPANY_PROFILE_DETAIL(symbol)
    await trackChartAPICall(`GET /3.0/company/profile/${kind}/${symbol}`)
    const res = await csUatGet<{ data: Record<string, unknown> }>(url)
    if (!res.data) return false
    await saveContent(symbol, kind === 'overview' ? 'profile_overview' : 'profile_detail', [res.data])
    return true
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  const start = Date.now()
  try {
    const [symbols, fresh] = await Promise.all([
      activeSymbols(),
      freshKeys('company_profiles', ['symbol', 'kind'], new Date(start - FRESH_SINCE)),
    ])

    const todo = symbols.flatMap(sym =>
      KINDS.filter(k => !fresh.has(`${sym}|${k}`)).map(k => () => fetchAndSave(sym, k)))
    const { results, started, skipped } = await paced(todo, { deadlineMs: start + WORK_MS })

    const saved = results.filter(Boolean).length
    const out = {
      ok: true, symbols: symbols.length, pending: todo.length,
      started, saved, failed: started - saved, remaining: skipped,
      done: skipped === 0, duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
    }
    console.log('[Sync] weekly profiles', out)
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sync] weekly profiles error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
