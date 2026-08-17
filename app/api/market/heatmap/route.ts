import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

// PSX sector code → display name mapping
const SECTOR_NAMES: Record<string, string> = {
  '0811': 'Cement',
  '0812': 'Chemical',
  '0813': 'Engineering',
  '0814': 'Food & Personal Care',
  '0815': 'Fertilizers',
  '0816': 'Forestry',
  '0817': 'Glass & Ceramics',
  '0818': 'Insurance',
  '0819': 'Oil & Gas Exploration',
  '0820': 'Oil & Gas Marketing',
  '0821': 'Paper & Board',
  '0822': 'Pharmaceuticals',
  '0823': 'Power Generation',
  '0824': 'REIT',
  '0825': 'Real Estate',
  '0826': 'Refinery',
  '0827': 'Sugar & Allied',
  '0828': 'Synthetic & Rayon',
  '0829': 'Tobacco',
  '0830': 'Transport',
  '0831': 'Commercial Banks',
  '0832': 'Investment Banks',
  '0833': 'Technology & Comm.',
  '0834': 'Vanaspati & Allied',
  '0835': 'Woolen',
  '0836': 'Textile Composite',
  '0837': 'Textile Spinning',
  '0838': 'Textile Weaving',
  '0839': 'Leasing Companies',
  '0840': 'Modarbas',
  '0841': 'Mutual Funds',
  '0842': 'Closed-End Mutual Fund',
  '0843': 'ETFs',
  '0844': 'Miscellaneous',
}

export async function GET() {
  try {
    const market = await withCache(
      CACHE_KEYS.allQuotes(),
      TTL_SECONDS.LIVE_QUOTES,
      async () => {
        await trackCSAPICall('POST /api/v3/market?path=/req')
        return csMarketData()
      }
    ) as any

    const eq = market?.eq ?? {}

    // Group stocks by sector
    const sectors: Record<string, {
      name: string
      code: string
      stocks: Array<{
        symbol:    string
        name:      string
        price:     number
        changePct: number
        volume:    number
      }>
    }> = {}

    for (const [symbol, s] of Object.entries(eq) as [string, any][]) {
      if (!s.c || s.c <= 0) continue           // skip stocks with no price
      const rawCode = s.sc != null ? String(s.sc).padStart(4, '0') : ''
      const code    = rawCode || 'OTHER'
      const label  = SECTOR_NAMES[code] ?? `Sector ${code}`

      if (!sectors[code]) {
        sectors[code] = { name: label, code, stocks: [] }
      }
      sectors[code].stocks.push({
        symbol,
        name:      s.nm   ?? symbol,
        price:     s.c    ?? 0,
        changePct: +((s.pch ?? 0) * 100).toFixed(2),
        volume:    s.v    ?? 0,
      })
    }

    // Sort sectors by total volume (largest first)
    const result = Object.values(sectors)
      .filter(s => s.stocks.length > 0)
      .map(s => ({
        ...s,
        stocks: s.stocks.sort((a, b) => b.volume - a.volume),
        totalVolume: s.stocks.reduce((sum, st) => sum + st.volume, 0),
        avgChangePct: +(
          s.stocks.reduce((sum, st) => sum + st.changePct, 0) / s.stocks.length
        ).toFixed(2),
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)

    return NextResponse.json({ sectors: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/heatmap]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
