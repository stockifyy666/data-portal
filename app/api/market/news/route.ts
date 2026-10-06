import { NextResponse }             from 'next/server'
import { csPost }                    from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }    from '@/lib/redis/cache'
import { trackCSAPICall }            from '@/lib/utils/rateLimit'

export async function GET() {
  try {
    const data = await withCache(
      'market:news:generic',
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        await trackCSAPICall(CS_ENDPOINTS.NEWS_GENERIC)
        return csPost(CS_ENDPOINTS.NEWS_GENERIC, '')
      }
    )

    const raw = data as any
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : []

    const news = list.slice(0, 30).map((item: any) => {
      // Try every field name CS might use for the image
      const rawImage =
        item.image ?? item.thumbnail ?? item.image_url ?? item.imageUrl ??
        item.img ?? item.img_url ?? item.featured_image ?? item.banner ??
        item.cover ?? item.photo ?? item.media_url ?? ''

      // Fallback: extract first <img src="..."> from description HTML
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
    console.error('[API /market/news]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
