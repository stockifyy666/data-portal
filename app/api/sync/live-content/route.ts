// HOURLY sync:
//   1. General market news            → news (scope 'general')       1 call
//   2. Market-wide announcements feed → announcements, per company   1–4 calls
// ≈ 2–5 CS calls per run × 24 = ~50–120 calls/day.
// Sector news has its own every-2-hours sync (/api/sync/sector-news).
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { csUatGet }                  from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { saveContent }               from '@/lib/supabase/content'
import { trackChartAPICall }         from '@/lib/utils/rateLimit'
import { cronUnauthorized }          from '@/lib/utils/cronAuth'
import { syncAllAnnouncements }      from '@/lib/announcements/sync'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export const maxDuration = 120

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req)
  if (denied) return denied

  const out: Record<string, unknown> = { ok: true }

  try {
    await trackChartAPICall('GET /3.0/news/general [sync]')
    const res   = await csUatGet<{ data: unknown[] }>(CS_ENDPOINTS.NEWS_GENERAL(0, 50))
    const items = res?.data ?? []
    if (items.length > 0) await saveContent('MARKET', 'general_news', items)
    out.generalNews = items.length
  } catch (err) {
    out.ok = false
    out.generalNewsError = err instanceof Error ? err.message : String(err)
  }

  try {
    out.announcements = await syncAllAnnouncements()
  } catch (err) {
    out.ok = false
    out.announcementsError = err instanceof Error ? err.message : String(err)
  }

  console.log('[Sync] live-content', out)
  return NextResponse.json(out, { status: out.ok ? 200 : 500 })
}
