// Hourly sync — fetches general market news and stores in Supabase.
// 1 CS call per run × 24 runs/day = 24 CS calls/day.
// Called by Vercel Cron every hour.
// Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { csUatGet }                  from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { saveContent }               from '@/lib/supabase/content'
import { trackChartAPICall }         from '@/lib/utils/rateLimit'

type GeneralNewsItem = {
  symbol:      string
  date:        string
  title:       string
  sector_code: string
  description: string
  link:        string
  image:       string
  source:      string
  source_url:  string
}

export async function GET(req: NextRequest) {
  const authHeader  = req.headers.get('authorization') ?? ''
  const querySecret = req.nextUrl.searchParams.get('secret') ?? ''
  const cronSecret  = process.env.CRON_SECRET ?? ''

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await trackChartAPICall('GET /3.0/news/general [sync]')
    const res = await csUatGet<{ status: string; data: GeneralNewsItem[] }>(
      CS_ENDPOINTS.NEWS_GENERAL(0, 50)
    )
    const items = res?.data ?? []
    if (items.length > 0) {
      await saveContent('MARKET', 'general_news', items)
    }

    return NextResponse.json({ ok: true, count: items.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Sync] live-content error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
