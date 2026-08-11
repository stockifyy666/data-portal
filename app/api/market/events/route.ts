import { NextResponse }                       from 'next/server'
import { csMarketData }                       from '@/lib/capitalstake/client'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

const SECTOR_NAMES: Record<string, string> = {
  '0811': 'Cement',           '0812': 'Chemical',
  '0813': 'Engineering',      '0814': 'Food & Personal Care',
  '0815': 'Fertilizers',      '0816': 'Forestry',
  '0817': 'Glass & Ceramics', '0818': 'Insurance',
  '0819': 'Oil & Gas Expl.',  '0820': 'Oil & Gas Mktg.',
  '0821': 'Paper & Board',    '0822': 'Pharmaceuticals',
  '0823': 'Power Generation', '0824': 'REIT',
  '0825': 'Real Estate',      '0826': 'Refinery',
  '0827': 'Sugar & Allied',   '0828': 'Synthetic & Rayon',
  '0829': 'Tobacco',          '0830': 'Transport',
  '0831': 'Commercial Banks', '0832': 'Investment Banks',
  '0833': 'Technology',       '0834': 'Vanaspati',
  '0835': 'Woolen',           '0836': 'Textile Composite',
  '0837': 'Textile Spinning', '0838': 'Textile Weaving',
  '0839': 'Leasing',          '0840': 'Modarbas',
  '0841': 'Mutual Funds',     '0842': 'Closed-End MF',
  '0843': 'ETFs',             '0844': 'Miscellaneous',
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

      const sectorName = SECTOR_NAMES[String(s.sc ?? '')] ?? ''

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
        sector:    SECTOR_NAMES[String(s.sc ?? '')] ?? '',
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
