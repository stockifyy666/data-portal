import { NextResponse }                       from 'next/server'
import { csGet }                              from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

const BASE = process.env.CAPITAL_STAKE_BASE_URL!

export type BoardMeeting = {
  symbol:    string
  name:      string
  date:      string
  agenda:    string
  status:    string
}

export async function GET() {
  try {
    const raw = await withCache(
      'market:board-meetings',
      TTL_SECONDS.LIVE_QUOTES,
      async () => {
        await trackCSAPICall('GET /api/v1/announcements/board-meeting')
        return csGet<any>(`${BASE}/api/v1/announcements/board-meeting`)
      }
    )

    // Normalise whatever shape CS returns
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.meetings)
      ? raw.meetings
      : []

    const meetings: BoardMeeting[] = list.map((m: any) => ({
      symbol: m.symbol ?? m.code ?? '',
      name:   m.name   ?? m.company ?? m.nm ?? '',
      date:   m.date   ?? m.meeting_date ?? m.meetingDate ?? '',
      agenda: m.agenda ?? m.purpose ?? m.description ?? '',
      status: m.status ?? '',
    })).filter(m => m.symbol)

    return NextResponse.json({ meetings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/board-meetings]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
