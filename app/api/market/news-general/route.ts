import { NextResponse } from 'next/server'
import { withCache, TTL_SECONDS } from '@/lib/redis/cache'

// Fetch general Pakistani news from Dawn + Geo RSS feeds
async function fetchRSS(url: string): Promise<Array<{ title: string; date: string; description: string; link: string; image: string; source: string }>> {
  const res  = await fetch(url, { next: { revalidate: 300 }, headers: { 'User-Agent': 'Mozilla/5.0' } })
  const xml  = await res.text()
  const items: Array<{ title: string; date: string; description: string; link: string; image: string; source: string }> = []

  const sourceName = url.includes('dawn') ? 'Dawn' : url.includes('geo') ? 'Geo News' : url.includes('arynews') ? 'ARY News' : 'Pakistan News'

  // Simple regex-based RSS parser (no DOM dependency)
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i').exec(block)
      return m ? m[1].trim() : ''
    }
    const imgMatch = /<enclosure[^>]+url="([^"]+)"[^>]*type="image/i.exec(block)
      || /<media:content[^>]+url="([^"]+)"/i.exec(block)
      || /<media:thumbnail[^>]+url="([^"]+)"/i.exec(block)
    const title = get('title')
    if (!title) continue
    items.push({
      title,
      date:        get('pubDate') || get('dc:date') || '',
      description: get('description').replace(/<[^>]*>/g, '').slice(0, 280),
      link:        get('link') || get('guid'),
      image:       imgMatch ? imgMatch[1] : '',
      source:      sourceName,
    })
  }
  return items
}

export async function GET() {
  try {
    const data = await withCache(
      'market:news:general-pakistan',
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const feeds = [
          'https://www.dawn.com/feeds/home',
          'https://www.dawn.com/feeds/pakistan',
          'https://arynews.tv/feed/',
        ]
        const results = await Promise.allSettled(feeds.map(fetchRSS))
        const all: Array<{ title: string; date: string; description: string; link: string; image: string; source: string }> = []
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...r.value)
        }
        // Deduplicate by title
        const seen = new Set<string>()
        return all.filter(item => {
          const key = item.title.slice(0, 60)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).slice(0, 40)
      }
    )
    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /market/news-general]', msg)
    return NextResponse.json({ error: msg, data: [] }, { status: 500 })
  }
}
