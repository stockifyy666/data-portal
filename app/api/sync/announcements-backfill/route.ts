// =============================================================================
// FILE: app/api/sync/announcements-backfill/route.ts
// PURPOSE: ONE-TIME (manual) backfill of older announcements for every company.
//          The hourly sync only collects new announcements; this pulls each
//          company's history once and MERGES it with what is stored (no deletes).
//
// ~500 symbols × 1–2 calls (50 announcements each) ≈ 500–1,000 calls in total.
// Paced at 4 calls/sec; one run works ~4 minutes, then call it again until
// "done": true. Symbols already back-filled are remembered in Redis (30 days),
// so re-runs never fetch the same company twice.
//
// Not on a cron. Run manually:
//   /api/sync/announcements-backfill?secret=<CRON_SECRET>
// =============================================================================

import { NextRequest, NextResponse }  from 'next/server'
import { cronUnauthorized }           from '@/lib/utils/cronAuth'
import { paced, activeSymbols }       from '@/lib/utils/syncRunner'
import { cacheGet, cacheSet }         from '@/lib/redis/cache'
import { fetchCompanyAnnouncements, mergeAnnouncements } from '@/lib/announcements/sync'

export const dynamic     = 'force-dynamic'
export const maxDuration = 300

const WORK_MS  = 240_000                          // stop starting new symbols after 4 min
const DONE_KEY = 'sync:announcements:backfilled'  // { SYMBOL: doneAtMs }
const DONE_TTL = 30 * 24 * 3600                    // seconds

type Result = 'saved' | 'empty' | 'error'

async function backfill(symbol: string): Promise<Result> {
  try {
    const items = await fetchCompanyAnnouncements(symbol, 2)
    if (!items.length) return 'empty'
    await mergeAnnouncements(symbol, items)
    return 'saved'
  } catch (err) {
    return err instanceof Error && /\b404\b/.test(err.message) ? 'empty' : 'error'
  }
}

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  const start = Date.now()
  try {
    const [symbols, stored] = await Promise.all([
      activeSymbols(),
      cacheGet<Record<string, number>>(DONE_KEY),
    ])
    const done: Record<string, number> = { ...(stored ?? {}) }

    // Each job is one symbol (1–2 calls); pace at 2 symbols/sec so calls stay ≤ 4/sec
    const todo = symbols.filter(s => !done[s])
    const { results, started, skipped } = await paced(
      todo.map(s => () => backfill(s)),
      { rps: 2, deadlineMs: start + WORK_MS },
    )

    let saved = 0, empty = 0
    results.forEach((r, i) => {
      if (r === 'saved') { saved++; done[todo[i]] = start }
      else if (r === 'empty') { empty++; done[todo[i]] = start }
    })
    await cacheSet(DONE_KEY, done, DONE_TTL)

    const out = {
      ok: true, symbols: symbols.length, pending: todo.length,
      started, saved, empty, failed: started - saved - empty, remaining: skipped,
      done: skipped === 0, duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
    }
    console.log('[Sync] announcements-backfill', out)
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sync] announcements-backfill error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
