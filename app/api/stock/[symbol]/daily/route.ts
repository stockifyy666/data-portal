import { NextRequest, NextResponse }  from 'next/server'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }     from '@/lib/redis/cache'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

interface RawCandle {
  t: number   // Unix timestamp (seconds), PKT = UTC+5
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface DayCandle {
  date:  string   // YYYY-MM-DD in PKT
  open:  number
  high:  number
  low:   number
  close: number
  volume: number
}

// Aggregate hourly 1h candles (from CHART_1H) into one candle per calendar day (PKT).
// t is a Unix timestamp in seconds; PKT = UTC+5.
function aggregateToDailyPKT(candles: RawCandle[]): DayCandle[] {
  const PKT_OFFSET_S = 5 * 3600
  const days = new Map<string, DayCandle>()

  for (const c of candles) {
    if (!c.t || !c.c) continue
    const pktDate = new Date((c.t + PKT_OFFSET_S) * 1000).toISOString().slice(0, 10)

    if (!days.has(pktDate)) {
      days.set(pktDate, { date: pktDate, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v })
    } else {
      const d = days.get(pktDate)!
      d.high   = Math.max(d.high, c.h)
      d.low    = Math.min(d.low,  c.l)
      d.close  = c.c   // last candle of the day wins
      d.volume += c.v
    }
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date))
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

    const data = await withCache(
      `stock:daily:${symbol}`,
      TTL_SECONDS.EOD_CHART,
      async () => {
        const url = CS_ENDPOINTS.CHART_1H(symbol)
        await trackChartAPICall(url)
        const res = await csUatGet<{ status: string; data: RawCandle[] }>(url)
        const daily = aggregateToDailyPKT(res?.data ?? [])
        return { data: daily }
      }
    )

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/daily]', msg)
    return NextResponse.json({ data: [] })
  }
}
