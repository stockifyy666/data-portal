import { NextResponse }                       from 'next/server'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import { PSX_TTL }                            from '@/lib/utils/marketHours'

interface RawTicker {
  m:   string   // 'REG' | 'IDX'
  s:   string   // symbol
  c:   number   // current
  ch:  number   // change
  pch: number   // percent change
  h?:  number
  l?:  number
  o?:  number
  v?:  number
}

const INDEX_LABELS: Record<string, string> = {
  KSE100:    'KSE-100',
  KSE30:     'KSE-30',
  KMI30:     'KMI-30',
  ALLSHR:    'All Share',
  KMIALLSHR: 'KMI All Share',
}

export async function GET() {
  try {
    const tickers = await withCache<RawTicker[]>(
      CACHE_KEYS.tickers(),
      PSX_TTL.TICKERS(),
      async () => {
        await trackChartAPICall('GET /3.0/market/tickers')
        const res = await csUatGet<{ status: string; data: RawTicker[] }>(CS_ENDPOINTS.TICKERS)
        return res.data ?? []
      }
    )

    const indices = tickers
      .filter(t => t.m === 'IDX' && INDEX_LABELS[t.s])
      .map(t => ({
        key:       t.s,
        label:     INDEX_LABELS[t.s],
        current:   t.c   ?? 0,
        change:    t.ch  ?? 0,
        changePct: t.pch ?? 0,
        high:      t.h   ?? 0,
        low:       t.l   ?? 0,
        open:      t.o   ?? 0,
        volume:    t.v   ?? 0,
      }))

    return NextResponse.json({ indices })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/indices]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
