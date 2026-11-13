import { NextResponse }        from 'next/server'
import { csUatGet }             from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }         from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }    from '@/lib/utils/rateLimit'
import { getContent, saveContent } from '@/lib/supabase/content'

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

export async function GET() {
  try {
    // 1. Supabase first — served from hourly sync, zero CS calls per user
    const cached = await getContent<GeneralNewsItem>('MARKET', 'general_news')
    if (cached && cached.length > 0) {
      return NextResponse.json({ data: cached })
    }

    // 2. DB miss — fetch from CS UAT and save for next requests
    const url = CS_ENDPOINTS.NEWS_GENERAL(0, 50)
    await trackChartAPICall('GET /3.0/news/general')
    const res = await csUatGet<{ status: string; data: GeneralNewsItem[] }>(url)
    const items = res?.data ?? []

    if (items.length > 0) {
      saveContent('MARKET', 'general_news', items).catch(() => {})
    }

    return NextResponse.json({ data: items })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /market/news-general]', msg)
    return NextResponse.json({ error: msg, data: [] }, { status: 500 })
  }
}
