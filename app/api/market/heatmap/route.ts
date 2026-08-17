import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

const SECTOR_NAMES: Record<string, string> = {
  '0801': 'Automobiles',           '0802': 'Auto Parts & Accessories',
  '0803': 'Cable & Electrical',    '0804': 'Cement',
  '0805': 'Chemical',              '0806': 'Closed-End Mutual Fund',
  '0807': 'Commercial Banks',      '0808': 'Engineering',
  '0809': 'Fertilizers',           '0810': 'Food & Personal Care',
  '0811': 'Glass & Ceramics',      '0812': 'Insurance',
  '0813': 'Investment Companies',  '0814': 'Jute',
  '0815': 'Leasing Companies',     '0816': 'Leather & Tanneries',
  '0818': 'Miscellaneous',         '0819': 'Modarbas',
  '0820': 'Oil & Gas Exploration', '0821': 'Oil & Gas Marketing',
  '0822': 'Paper & Board',         '0823': 'Pharmaceuticals',
  '0824': 'Power Generation',      '0825': 'Refinery',
  '0826': 'Sugar & Allied',        '0827': 'Synthetic & Rayon',
  '0828': 'Technology & Comm.',    '0829': 'Textile Composite',
  '0830': 'Textile Spinning',      '0831': 'Textile Weaving',
  '0832': 'Tobacco',               '0833': 'Transport',
  '0834': 'Vanaspati & Allied',    '0835': 'Woolen',
  '0836': 'REIT',                  '0837': 'ETFs',
  '0838': 'Real Estate',           '0839': 'Textile (Other)',
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
