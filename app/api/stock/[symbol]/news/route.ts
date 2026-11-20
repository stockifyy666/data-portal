// Company news = this company's items filtered out of its sector's news.
// No per-company CS call: sector news is fetched once per sector (hourly sync / 2h cache).

import { NextRequest, NextResponse }  from 'next/server'
import { getSectorNews, getAllStocks } from '@/lib/news/sectorNews'
import { dedupeNews }                 from '@/lib/news/dedupe'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

function normalize(item: any) {
  return {
    title:       item.title ?? '',
    date:        item.date  ?? '',
    description: (item.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
    link:        item.link  ?? '',
    image:       item.image ?? '',
    source:      item.source     ?? 'PSX News',
    source_url:  item.source_url ?? '',
  }
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

    const stocks = await getAllStocks()
    const code   = stocks.find(s => s.symbol === symbol)?.sector
    if (!code) return NextResponse.json({ data: [], source: 'sector' })

    const mine = dedupeNews((await getSectorNews(code))
      .filter(i => i.symbol?.toUpperCase() === symbol)
      .map(normalize))

    return NextResponse.json({ data: mine, source: 'sector', sector_code: code })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/news]', msg)
    return NextResponse.json({ data: [] })
  }
}
