import { NextResponse, type NextRequest } from 'next/server'
import { archiveNews, getArchived } from '@/lib/news/archive'
import { csUatGet }             from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }         from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }    from '@/lib/utils/rateLimit'
import { getContent, saveContent } from '@/lib/supabase/content'
import { dedupeNews }              from '@/lib/news/dedupe'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

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
  const range = req.nextUrl.searchParams.get('range') ?? 'all'   // 'today' | 'week' | 'all'

  // Today / This Week come from the stored archive (filled by the hourly sync and by this route)
  const fromArchive = async (feed: GeneralNewsItem[]) => {
    await archiveNews('general', feed)
    if (range !== 'today' && range !== 'week') return null
    return getArchived('general', range).catch(() => null)
  }

  try {
    // 1. Supabase first — served from hourly sync, zero CS calls per user
    const cached = await getContent<GeneralNewsItem>('MARKET', 'general_news')
    if (cached && cached.length > 0) {
      const stored = await fromArchive(cached)
      if (stored) return NextResponse.json({ data: dedupeNews(stored), range })
      return NextResponse.json({ data: dedupeNews(cached), range: 'all' })
    }

    // 2. DB miss — fetch from CS UAT and save for next requests
    const url = CS_ENDPOINTS.NEWS_GENERAL(0, 50)
    await trackChartAPICall('GET /3.0/news/general')
    const res = await csUatGet<{ status: string; data: GeneralNewsItem[] }>(url)
    const items = res?.data ?? []

    if (items.length > 0) {
      saveContent('MARKET', 'general_news', items).catch(() => {})
    }

    const stored = await fromArchive(items)
    if (stored) return NextResponse.json({ data: dedupeNews(stored), range })
    return NextResponse.json({ data: dedupeNews(items), range: 'all' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /market/news-general]', msg)
    return NextResponse.json({ error: msg, data: [] }, { status: 500 })
  }
}
