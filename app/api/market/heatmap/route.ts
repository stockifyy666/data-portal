import { NextResponse }                       from 'next/server'
import { cacheGet, cacheSet,
         CACHE_KEYS, TTL_SECONDS }            from '@/lib/redis/cache'
import { csUatGet }                           from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                       from '@/lib/capitalstake/endpoints'
import { trackChartAPICall }                  from '@/lib/utils/rateLimit'
import { PSX_TTL }                            from '@/lib/utils/marketHours'
import type { RawStock, RawQuote }            from '@/types/capitalstake'

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

async function getStocks(): Promise<RawStock[]> {
  const cached = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
  if (cached) return cached
  await trackChartAPICall('GET /3.0/market/stocks')
  const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allStocks(), data, TTL_SECONDS.STOCKS_LIST)
  return data
}

async function getQuotes(): Promise<RawQuote[]> {
  const cached = await cacheGet<RawQuote[]>(CACHE_KEYS.allQuotesUAT())
  if (cached) return cached
  await trackChartAPICall('GET /3.0/market/quotes')
  const res = await csUatGet<{ status: string; data: RawQuote[] }>(CS_ENDPOINTS.QUOTES_LIST)
  const data = res.data ?? []
  if (data.length > 0) await cacheSet(CACHE_KEYS.allQuotesUAT(), data, PSX_TTL.QUOTES())
  return data
}

export async function GET() {
  try {
    const [stocks, quotes] = await Promise.all([getStocks(), getQuotes()])

    const qMap = new Map<string, RawQuote>()
    for (const q of quotes) qMap.set(q.symbol, q)

    const sectors: Record<string, {
      name: string; code: string
      stocks: Array<{ symbol: string; name: string; price: number; changePct: number; volume: number }>
    }> = {}

    for (const s of stocks) {
      if (s.status !== 1) continue
      if (/\(R\d*\)|\bRight\b/i.test(s.name) || /R\d*$/.test(s.symbol)) continue
      const q = qMap.get(s.symbol)
      if (!q || q.close <= 0) continue

      const code  = s.sector || 'OTHER'
      const label = SECTOR_NAMES[code] ?? s.sector ?? `Sector ${code}`

      if (!sectors[code]) sectors[code] = { name: label, code, stocks: [] }
      sectors[code].stocks.push({
        symbol:    s.symbol,
        name:      s.name,
        price:     q.close,
        changePct: +q.change_percent.toFixed(2),
        volume:    q.volume,
      })
    }

    const result = Object.values(sectors)
      .filter(s => s.stocks.length > 0)
      .map(s => ({
        ...s,
        stocks:       s.stocks.sort((a, b) => b.volume - a.volume),
        totalVolume:  s.stocks.reduce((sum, st) => sum + st.volume, 0),
        avgChangePct: +(s.stocks.reduce((sum, st) => sum + st.changePct, 0) / s.stocks.length).toFixed(2),
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)

    return NextResponse.json({ sectors: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/heatmap]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
