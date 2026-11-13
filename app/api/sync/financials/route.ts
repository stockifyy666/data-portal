// =============================================================================
// FILE: app/api/sync/financials/route.ts
// PURPOSE: Nightly sync — fetches all companies' financial data from Capital
//          Stake and stores in Supabase. Called by Vercel Cron at 2 AM PKT.
//
// Security: protected by CRON_SECRET env variable.
//   Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
//   Manual trigger:    GET /api/sync/financials?secret=<CRON_SECRET>
//
// What it fetches per symbol:
//   income/annual, income/quarterly, balance/annual, balance/quarterly,
//   cashflow/annual, cashflow/quarterly, fundamentals/annual
//
// Rate limiting: batches of 10 symbols, 500ms delay between batches
//   → ~600 symbols × 7 types = 4,200 Capital Stake calls over ~30 seconds
// =============================================================================

import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { cacheGet, CACHE_KEYS,
         TTL_SECONDS, cacheSet }      from '@/lib/redis/cache'
import { saveStatement }              from '@/lib/supabase/financials'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'
import type { RawStock }              from '@/types/capitalstake'
import type { StatementData }         from '@/components/stock/stock-detail-types'

const BATCH_SIZE  = 10    // symbols per batch
const BATCH_DELAY = 600   // ms between batches (avoids burst rate limiting)

const STMT_JOBS = [
  { type: 'income'       as const, interval: 'annual'    as const },
  { type: 'income'       as const, interval: 'quarterly' as const },
  { type: 'balance'      as const, interval: 'annual'    as const },
  { type: 'balance'      as const, interval: 'quarterly' as const },
  { type: 'cashflow'     as const, interval: 'annual'    as const },
  { type: 'cashflow'     as const, interval: 'quarterly' as const },
  { type: 'fundamentals' as const, interval: 'annual'    as const },
  { type: 'shareholders' as const, interval: 'annual'    as const },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchAndSave(
  symbol:   string,
  type:     'income' | 'balance' | 'cashflow' | 'fundamentals' | 'shareholders',
  interval: 'annual' | 'quarterly'
): Promise<'saved' | 'failed'> {
  try {
    if (type === 'fundamentals') {
      const url = CS_ENDPOINTS.COMPANY_FUNDAMENTALS(symbol)
      await trackChartAPICall(url)
      const res = await csUatGet<{
        status: string
        data:   { periods: string[]; fundamentals: Array<{ name: string; values: (number | null)[] }> }
      }>(url)
      const raw = res.data
      if (!raw) return 'failed'
      const periods = (raw.periods ?? []).map((p: string) => ({
        year:       p,
        period_end: p === 'TTM' ? new Date().toISOString().slice(0, 10) : `${p}-12-31`,
      }))
      const fields = (raw.fundamentals ?? []).map(f => ({
        label: f.name, values: f.values, is_heading: false,
      }))
      const transformed: StatementData = { periods, fields }
      await saveStatement(symbol, 'fundamentals', 'annual', transformed, raw)
      return 'saved'
    }

    if (type === 'shareholders') {
      const url = CS_ENDPOINTS.COMPANY_SHAREHOLDERS(symbol)
      await trackChartAPICall(url)
      const res = await csUatGet<{ status: string; data: StatementData }>(url)
      if (!res.data) return 'failed'
      await saveStatement(symbol, 'shareholders', 'annual', res.data, res.data)
      return 'saved'
    }

    // income / balance / cashflow
    const url = CS_ENDPOINTS.COMPANY_FINANCIALS(symbol, type, interval)
    await trackChartAPICall(url)
    const res = await csUatGet<{ status: string; data: StatementData }>(url)
    if (!res.data) return 'failed'
    await saveStatement(symbol, type, interval, res.data, res.data)
    return 'saved'
  } catch {
    return 'failed'
  }
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const querySecret = req.nextUrl.searchParams.get('secret') ?? ''
  const cronSecret  = process.env.CRON_SECRET ?? ''

  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}` &&
    querySecret !== cronSecret
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startMs = Date.now()
  let saved = 0, failed = 0

  try {
    // ── Get all symbols ────────────────────────────────────────────────────────
    let stocks = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
    if (!stocks || stocks.length === 0) {
      await trackChartAPICall('GET /3.0/market/stocks')
      const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
      stocks = res.data ?? []
      if (stocks.length > 0) await cacheSet(CACHE_KEYS.allStocks(), stocks, TTL_SECONDS.STOCKS_LIST)
    }

    // Filter active stocks only (no rights issues)
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

      // All 7 statement types for all symbols in this batch — in parallel
      const results = await Promise.all(
        batch.flatMap(sym =>
          STMT_JOBS.map(({ type, interval }) => fetchAndSave(sym, type, interval))
        )
      )

      for (const r of results) {
        if (r === 'saved') saved++
        else failed++
      }

      // Brief pause between batches
      if (i + BATCH_SIZE < symbols.length) await sleep(BATCH_DELAY)
    }

    const duration = ((Date.now() - startMs) / 1000).toFixed(1)
    console.log(`[Sync] financials complete: ${saved} saved, ${failed} failed in ${duration}s`)

    return NextResponse.json({
      ok:       true,
      symbols:  symbols.length,
      saved,
      failed,
      duration: `${duration}s`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sync] financials error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
