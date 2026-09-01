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

    const list: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : []

    const news = list.slice(0, 30).map((item: any) => ({
      title:       item.title       ?? item.heading  ?? '',
      date:        item.date        ?? item.created_at ?? '',
      description: item.description ?? item.summary  ?? '',
      link:        item.link        ?? item.url       ?? '',
      image:       item.image       ?? item.thumbnail ?? '',
      source:      item.source      ?? item.publisher ?? 'PSX News',
    })).filter((n: any) => n.title)

    return NextResponse.json({ data: news })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /market/news]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
