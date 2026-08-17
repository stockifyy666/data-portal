import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'

export async function GET() {
  try {
    const market = await csMarketData() as any
    const eq = market?.eq ?? {}

    // Group stocks by sector code
    const map: Record<string, { code: string; stocks: string[] }> = {}
    for (const [symbol, s] of Object.entries(eq) as [string, any][]) {
      const raw  = s.sc != null ? String(s.sc) : 'null'
      const padded = s.sc != null ? String(s.sc).padStart(4, '0') : 'null'
      const key  = padded
      if (!map[key]) map[key] = { code: raw, stocks: [] }
      if (map[key].stocks.length < 5) map[key].stocks.push(`${symbol} (${s.nm ?? ''})`)
    }

    const sorted = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([padded, v]) => ({ padded, raw: v.code, samples: v.stocks }))

    return NextResponse.json({ sectors: sorted })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
