import { NextRequest, NextResponse } from 'next/server'
import { csPost }                    from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackCSAPICall }            from '@/lib/utils/rateLimit'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

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

    const data = await withCache(
      `stock:news:${symbol}`,
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const url = CS_ENDPOINTS.NEWS(symbol)
        await trackCSAPICall(url)
        return csPost(url, '')
      }
    )

    const rawData = data as any
    const list: any[] = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : []
    const news = list.map((item: any) => {
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
        title:       item.title       ?? item.heading  ?? '',
        date:        item.date        ?? item.created_at ?? '',
        description: (item.description ?? item.summary ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
        link:        item.link        ?? item.url       ?? '',
        image,
        source:      item.source      ?? item.publisher ?? 'PSX News',
      }
    }).filter((n: any) => n.title)
    return NextResponse.json({ data: news })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/news]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
