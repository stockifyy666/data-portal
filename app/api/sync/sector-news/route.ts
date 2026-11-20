// EVERY-2-HOURS sync: news for every sector → Supabase `news` (scope 'sector').
// One call per sector (~35) × 12 runs/day ≈ 420 calls/day.
// Company news pages filter these by symbol — no per-company news calls.
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { cronUnauthorized }          from '@/lib/utils/cronAuth'
import { paced }                     from '@/lib/utils/syncRunner'
import { fetchAndSaveSectorNews, getAllStocks, sectorCodes } from '@/lib/news/sectorNews'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export const maxDuration = 120

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  const start = Date.now()
  try {
    const codes = sectorCodes(await getAllStocks())
    const { results, started } = await paced(
      codes.map(code => () => fetchAndSaveSectorNews(code).then(() => true).catch(() => false)),
      { deadlineMs: start + 100_000 }
    )
    const ok  = results.filter(Boolean).length
    const out = { ok: true, sectors: codes.length, started, saved: ok, failed: started - ok,
                  duration: `${((Date.now() - start) / 1000).toFixed(1)}s` }
    console.log('[Sync] sector-news', out)
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Sync] sector-news error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
