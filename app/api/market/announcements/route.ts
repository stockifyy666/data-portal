import { NextResponse }                       from 'next/server'
import { csGet }                              from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

const BASE = process.env.CAPITAL_STAKE_BASE_URL!

export type Announcement = {
  symbol:  string
  name:    string
  date:    string
  title:   string
  type:    string
}

export async function GET() {
  try {
    const raw = await withCache(
      'market:announcements',
      TTL_SECONDS.LIVE_QUOTES,
      async () => {
        await trackCSAPICall('GET /api/v1/announcements/financial-result')
        return csGet<any>(`${BASE}/api/v1/announcements/financial-result`)
      }
    )

    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.announcements)
      ? raw.announcements
      : []

    const announcements: Announcement[] = list.map((a: any) => ({
      symbol: a.symbol   ?? a.code ?? '',
      name:   a.name     ?? a.company ?? a.nm ?? '',
      date:   a.date     ?? a.announcement_date ?? a.announcementDate ?? '',
      title:  a.title    ?? a.subject ?? a.description ?? '',
      type:   a.type     ?? a.announcementType ?? a.category ?? 'Announcement',
    })).filter(a => a.symbol)

    return NextResponse.json({ announcements })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/announcements]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
