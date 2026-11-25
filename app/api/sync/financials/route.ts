// =============================================================================
// FILE: app/api/sync/financials/route.ts
// PURPOSE: Daily sync of every company's financials + fundamentals → Supabase.
//
// Per symbol (7 calls): income / balance / cashflow × annual + quarterly,
//                       fundamentals (annual).   ~700 symbols ≈ 4,900 calls/day.
// Shareholders moved to the weekly sync (/api/sync/content).
//
// Paced at 4 calls/sec (CS limit 5/sec). One run works ~4 minutes (~1,000 calls)
// and skips anything refreshed in the last 20h, so the cron repeats it every
// 15 min overnight until all symbols are done.
//
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>
// =============================================================================

import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { saveStatement }              from '@/lib/supabase/financials'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'
import { cronUnauthorized }           from '@/lib/utils/cronAuth'
import { paced, activeSymbols, freshKeys } from '@/lib/utils/syncRunner'
import type { StatementData }         from '@/components/stock/stock-detail-types'
import { cacheGet, cacheSet }         from '@/lib/redis/cache'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export const maxDuration = 300
const WORK_MS    = 240_000          // stop starting new calls after 4 min
const FRESH_SINCE = 20 * 3600e3     // treat rows newer than 20h as done for today

// Statements that came back EMPTY (funds, ETFs, bonds, …) are remembered for
// 7 days so the nightly sync doesn't spend ~7 calls on each of them every night.
// Real errors (timeouts, 429, 5xx) are NOT remembered and are retried next run.
const NODATA_KEY = 'sync:financials:nodata'      // { 'SYM|type|interval': expiresAtMs }
const NODATA_MS  = 7 * 24 * 3600e3
type Result = 'saved' | 'empty' | 'error'

type Job = { type: 'income' | 'balance' | 'cashflow' | 'fundamentals'; interval: 'annual' | 'quarterly' }
const JOBS: Job[] = [
  { type: 'income',       interval: 'annual'    },
  { type: 'income',       interval: 'quarterly' },
  { type: 'balance',      interval: 'annual'    },
  { type: 'balance',      interval: 'quarterly' },
  { type: 'cashflow',     interval: 'annual'    },
  { type: 'cashflow',     interval: 'quarterly' },
  { type: 'fundamentals', interval: 'annual'    },
]

async function fetchAndSave(symbol: string, { type, interval }: Job): Promise<Result> {
  try {
    if (type === 'fundamentals') {
      const url = CS_ENDPOINTS.COMPANY_FUNDAMENTALS(symbol)
      await trackChartAPICall(url)
      const res = await csUatGet<{
        data: { periods: string[]; fundamentals: Array<{ name: string; values: (number | null)[] }> }
      }>(url)
      const raw = res.data
      if (!raw || !(raw.fundamentals ?? []).length) return 'empty'
      const transformed: StatementData = {
        periods: (raw.periods ?? []).map(p => ({
          year: p, period_end: p === 'TTM' ? new Date().toISOString().slice(0, 10) : `${p}-12-31`,
        })),
        fields: (raw.fundamentals ?? []).map(f => ({ label: f.name, values: f.values, is_heading: false })),
      } as StatementData
      await saveStatement(symbol, 'fundamentals', 'annual', transformed, raw)
      return 'saved'
    }

    const url = CS_ENDPOINTS.COMPANY_FINANCIALS(symbol, type, interval)
    await trackChartAPICall(url)
    const res = await csUatGet<{ data: StatementData }>(url)
    if (!res.data || !(res.data.periods ?? []).length) return 'empty'
    await saveStatement(symbol, type, interval, res.data, res.data)
    return 'saved'
  } catch (err) {
    // 404 = Capital Stake has nothing for this symbol → treat as empty, not an error
    return err instanceof Error && /\b404\b/.test(err.message) ? 'empty' : 'error'
  }
}

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  const start = Date.now()
  try {
    const since = new Date(start - FRESH_SINCE)
    const [symbols, freshStmts, freshFund] = await Promise.all([
      activeSymbols(),
      freshKeys('financial_statements', ['symbol', 'stmt_type', 'interval'], since),
      freshKeys('fundamentals',         ['symbol', 'interval'],              since),
    ])

    const isFresh = (sym: string, j: Job) => j.type === 'fundamentals'
      ? freshFund.has(`${sym}|annual`)
      : freshStmts.has(`${sym}|${j.type}|${j.interval}`)

    // Drop expired "no data" marks, then skip the ones still valid
    const now    = Date.now()
    const stored = (await cacheGet<Record<string, number>>(NODATA_KEY)) ?? {}
    const nodata: Record<string, number> = Object.fromEntries(Object.entries(stored).filter(([, exp]) => exp > now))
    const keyOf  = (sym: string, j: Job) => `${sym}|${j.type}|${j.interval}`

    const jobs = symbols.flatMap(sym =>
      JOBS.filter(j => !isFresh(sym, j) && !nodata[keyOf(sym, j)]).map(j => ({ sym, j })))
    const todo = jobs.map(({ sym, j }) => () => fetchAndSave(sym, j))
    const { results, started, skipped } = await paced(todo, { deadlineMs: start + WORK_MS })

    let saved = 0, empty = 0
    results.forEach((r, i) => {
      if (r === 'saved') saved++
      else if (r === 'empty') { empty++; nodata[keyOf(jobs[i].sym, jobs[i].j)] = now + NODATA_MS }
    })
    await cacheSet(NODATA_KEY, nodata, Math.ceil(NODATA_MS / 1000))

    const out = {
      ok: true, symbols: symbols.length, pending: todo.length,
      started, saved, empty, failed: started - saved - empty, remaining: skipped,
      skippedNoData: Object.keys(nodata).length,
      done: skipped === 0, duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
    }
    console.log('[Sync] financials', out)
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sync] financials error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
