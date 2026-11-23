import { NextResponse, type NextRequest } from 'next/server'
import { archiveNews, getArchived } from '@/lib/news/archive'
import { csUatGet }                  from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { dedupeNews } from '@/lib/news/dedupe'
import { trackChartAPICall }         from '@/lib/utils/rateLimit'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? 'all'   // 'today' | 'week' | 'all'
  try {
    const data = await withCache(
      'market:news:generic',
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const url = CS_ENDPOINTS.COMPANY_NEWS('GENERIC')
        await trackChartAPICall(url)
        return csUatGet<{ status: string; data: unknown[] }>(url)
      }
    )

    const raw = data as any
    const list: any[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
      ? raw
      : []

    const news = list.slice(0, 30).map((item: any) => {
      const rawImage =
        item.image ?? item.thumbnail ?? item.image_url ?? item.imageUrl ??
        item.img ?? item.img_url ?? item.featured_image ?? item.banner ??
        item.cover ?? item.photo ?? item.media_url ?? ''

      let image = rawImage
      if (!image && typeof item.description === 'string') {
        const m = item.description.match(/<img[^>]+src="([^"]+)"/i)
        if (m) image = m[1]
      }

      return {
        title:       item.title       ?? item.heading   ?? '',
        date:        item.date        ?? item.created_at ?? '',
        description: (item.description ?? item.summary ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
        link:        item.link        ?? item.url        ?? '',
        image,
        source:      item.source      ?? item.publisher  ?? 'PSX News',
      }
    }).filter((n: any) => n.title)

    // Store the current feed, then serve the requested range
    await archiveNews('market', news)
    if (range === 'today' || range === 'week') {
      const stored = await getArchived('market', range).catch(() => null)
      if (stored) return NextResponse.json({ data: dedupeNews(stored), range })
    }
    return NextResponse.json({ data: dedupeNews(news), range: 'all' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /market/news]', msg)
    return NextResponse.json({ data: [] })
  }
}
