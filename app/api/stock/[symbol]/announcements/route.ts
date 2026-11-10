import { NextRequest, NextResponse }          from 'next/server'
import { csUatGet }                            from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                        from '@/lib/capitalstake/endpoints'
import { withCache, CACHE_KEYS, TTL_SECONDS }  from '@/lib/redis/cache'
import { trackChartAPICall }                   from '@/lib/utils/rateLimit'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

export interface Announcement {
  id:          string
  status:      number
  category:    string
  sector_code: string
  form_type:   string
  symbol:      string
  title:       string
  quarter:     string
  date:        string
  last_action: string
  is_revised:  boolean
  pdf:         string | null
  docs:        string[]
  images:      string[]
  period_ended: string | null
  meeting:     unknown
  results:     unknown
  payouts:     unknown
}

interface UATAnnouncementsResponse {
  status: string
  offset: number
  count:  number
  total:  number
  data:   Announcement[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10)
    const count  = parseInt(req.nextUrl.searchParams.get('count')  ?? '50', 10)

    const result = await withCache<UATAnnouncementsResponse>(
      CACHE_KEYS.announcements(symbol, offset),
      TTL_SECONDS.ANNOUNCEMENTS,
      async () => {
        const url = CS_ENDPOINTS.ANNOUNCEMENTS_UAT(symbol, offset, count)
        await trackChartAPICall(`GET /3.0/announcements/${symbol}`)
        return csUatGet<UATAnnouncementsResponse>(url)
      }
    )

    const announcements = (result.data ?? []).map((a: Announcement) => ({
      ...a,
      announcementType: a.form_type ?? a.category ?? 'Announcement',
      pdf_id: null, // PDF base URL not yet known — enable once Capital Stake confirms the file host URL
    }))

    return NextResponse.json({
      announcements,
      total:  result.total  ?? 0,
      offset: result.offset ?? 0,
      count:  result.count  ?? 0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/announcements]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
