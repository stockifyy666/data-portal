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

export type CorporateEvent = {
  symbol:     string
  name:       string
  sector:     string
  eventType:  'Dividend' | 'Bonus' | 'Rights'
  dps:        number
  price:      number
  changePct:  number
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
    const events: CorporateEvent[] = []

    for (const [symbol, s] of Object.entries(eq) as [string, any][]) {
      if (!s.c || s.c <= 0) continue

      const sectorName = SECTOR_NAMES[s.sc != null ? String(s.sc).padStart(4, '0') : ''] ?? ''

      if (s.xd) {
        events.push({
          symbol,
          name:      s.nm ?? symbol,
          sector:    sectorName,
          eventType: 'Dividend',
          dps:       s.dps ?? 0,
          price:     s.c   ?? 0,
          changePct: +((s.pch ?? 0) * 100).toFixed(2),
        })
      }
      if (s.xb) {
        events.push({
          symbol,
          name:      s.nm ?? symbol,
          sector:    sectorName,
          eventType: 'Bonus',
          dps:       0,
          price:     s.c  ?? 0,
          changePct: +((s.pch ?? 0) * 100).toFixed(2),
        })
      }
      if (s.xr) {
        events.push({
          symbol,
          name:      s.nm ?? symbol,
          sector:    sectorName,
          eventType: 'Rights',
          dps:       0,
          price:     s.c  ?? 0,
          changePct: +((s.pch ?? 0) * 100).toFixed(2),
        })
      }
    }

    // If no ex-dividend/bonus/rights stocks, fall back to top dividend payers
    const dividendPayers = events.length > 0 ? events : Object.entries(eq)
      .filter(([, s]: [string, any]) => (s.dps ?? 0) > 0 && s.c > 0)
      .map(([symbol, s]: [string, any]) => ({
        symbol,
        name:      s.nm ?? symbol,
        sector:    SECTOR_NAMES[s.sc != null ? String(s.sc).padStart(4, '0') : ''] ?? '',
        eventType: 'Dividend' as const,
        dps:       s.dps ?? 0,
        price:     s.c   ?? 0,
        changePct: +((s.pch ?? 0) * 100).toFixed(2),
      }))
      .sort((a, b) => b.dps - a.dps)
      .slice(0, 30)

    return NextResponse.json({ events: dividendPayers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/events]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
