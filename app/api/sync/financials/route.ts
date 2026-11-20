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

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export const maxDuration = 300
const WORK_MS    = 240_000          // stop starting new calls after 4 min
const FRESH_SINCE = 20 * 3600e3     // treat rows newer than 20h as done for today

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

async function fetchAndSave(symbol: string, { type, interval }: Job): Promise<boolean> {
  try {
    if (type === 'fundamentals') {
      const url = CS_ENDPOINTS.COMPANY_FUNDAMENTALS(symbol)
      await trackChartAPICall(url)
      const res = await csUatGet<{
        data: { periods: string[]; fundamentals: Array<{ name: string; values: (number | null)[] }> }
      }>(url)
      const raw = res.data
      if (!raw) return false
      const transformed: StatementData = {
        periods: (raw.periods ?? []).map(p => ({
          year: p, period_end: p === 'TTM' ? new Date().toISOString().slice(0, 10) : `${p}-12-31`,
        })),
        fields: (raw.fundamentals ?? []).map(f => ({ label: f.name, values: f.values, is_heading: false })),
      } as StatementData
      await saveStatement(symbol, 'fundamentals', 'annual', transformed, raw)
      return true
    }

    const url = CS_ENDPOINTS.COMPANY_FINANCIALS(symbol, type, interval)
    await trackChartAPICall(url)
    const res = await csUatGet<{ data: StatementData }>(url)
    if (!res.data) return false
    await saveStatement(symbol, type, interval, res.data, res.data)
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
    const since = new Date(start - FRESH_SINCE)
    const [symbols, freshStmts, freshFund] = await Promise.all([
      activeSymbols(),
      freshKeys('financial_statements', ['symbol', 'stmt_type', 'interval'], since),
      freshKeys('fundamentals',         ['symbol', 'interval'],              since),
    ])

    const isFresh = (sym: string, j: Job) => j.type === 'fundamentals'
      ? freshFund.has(`${sym}|annual`)
      : freshStmts.has(`${sym}|${j.type}|${j.interval}`)

    const todo = symbols.flatMap(sym => JOBS.filter(j => !isFresh(sym, j)).map(j => () => fetchAndSave(sym, j)))
    const { results, started, skipped } = await paced(todo, { deadlineMs: start + WORK_MS })

    const saved = results.filter(Boolean).length
    const out = {
      ok: true, symbols: symbols.length, pending: todo.length,
      started, saved, failed: started - saved, remaining: skipped,
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
