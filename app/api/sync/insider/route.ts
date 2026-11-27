// WEEKDAY sync: insider transactions → Supabase `insider_transactions`.
// Schedule (vercel.json): "0 12 * * 1-5" = Mon–Fri 12:00 UTC = 5:00 PM PKT.
//   • first run (empty table): back-fills all records, ~5 CS calls
//   • every run after that:    1 CS call (newest 5,000 rows, upserted)
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { cronUnauthorized }          from '@/lib/utils/cronAuth'
import { syncInsider }               from '@/lib/capitalstake/insider'

export const dynamic     = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  try {
    // ?full=1 → fetch the complete history for all symbols (manual use only)
    const result = await syncInsider({ full: req.nextUrl.searchParams.get('full') === '1' })
    console.log('[Sync] insider', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Sync] insider failed:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
