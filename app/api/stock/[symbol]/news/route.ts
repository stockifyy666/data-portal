import { NextRequest, NextResponse } from 'next/server'
import { csUatGet }                  from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackChartAPICall }         from '@/lib/utils/rateLimit'
import { getContent, saveContent }   from '@/lib/supabase/content'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

type NewsItem = {
  title:       string
  date:        string
  description: string
  link:        string
  image:       string
  source:      string
  source_url:  string
}

function normalize(item: any): NewsItem {
  return {
    title:       item.title ?? '',
    date:        item.date  ?? '',
    description: (item.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
    link:        item.link  ?? '',
    image:       item.image ?? '',
    source:      item.source     ?? 'PSX News',
    source_url:  item.source_url ?? '',
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    // 1. Supabase DB first (nightly synced, free for all users)
    const cached = await getContent<NewsItem>(symbol, 'news')
    if (cached) return NextResponse.json({ data: cached })

    // 2. DB miss — fetch from CS UAT, persist to DB
    const raw2 = await withCache(
      `stock:news:uat:${symbol}`,
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const url = CS_ENDPOINTS.COMPANY_NEWS(symbol)
        await trackChartAPICall(url)
        return csUatGet<{ status: string; data: any[] }>(url)
      }
    )

    const news = ((raw2 as any)?.data ?? [])
      .filter((item: any) => item.title)
      .map(normalize)

    if (news.length > 0) saveContent(symbol, 'news', news).catch(() => {})

    return NextResponse.json({ data: news })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/news]', msg)
    return NextResponse.json({ data: [] })
  }
}
