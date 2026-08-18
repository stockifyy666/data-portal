'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { cachedFetch }                   from '@/lib/utils/clientCache'
import type { StockQuote }               from '@/types/market'

const SECTOR_NAMES: Record<string, string> = {
  '0801': 'Automobiles',          '0802': 'Auto Parts & Accessories',
  '0803': 'Cable & Electrical',   '0804': 'Cement',
  '0805': 'Chemical',             '0806': 'Closed-End Mutual Fund',
  '0807': 'Commercial Banks',     '0808': 'Engineering',
  '0809': 'Fertilizers',          '0810': 'Food & Personal Care',
  '0811': 'Glass & Ceramics',     '0812': 'Insurance',
  '0813': 'Investment Companies', '0814': 'Jute',
  '0815': 'Leasing Companies',    '0816': 'Leather & Tanneries',
  '0818': 'Miscellaneous',        '0819': 'Modarbas',
  '0820': 'Oil & Gas Exploration','0821': 'Oil & Gas Marketing',
  '0822': 'Paper & Board',        '0823': 'Pharmaceuticals',
  '0824': 'Power Generation',     '0825': 'Refinery',
  '0826': 'Sugar & Allied',       '0827': 'Synthetic & Rayon',
  '0828': 'Technology & Comm.',   '0829': 'Textile Composite',
  '0830': 'Textile Spinning',     '0831': 'Textile Weaving',
  '0832': 'Tobacco',              '0833': 'Transport',
  '0834': 'Vanaspati & Allied',   '0835': 'Woolen',
  '0836': 'REIT',                 '0837': 'ETFs',
  '0838': 'Real Estate',          '0839': 'Textile (Other)',
}

const INDICES = [
  { value: 'KSE100',    label: 'KSE-100'   },
  { value: 'KSE30',     label: 'KSE-30'    },
  { value: 'KMI30',     label: 'KMI-30'    },
  { value: 'KMIALLSHR', label: 'KMI All'   },
  { value: 'ALLSHR',    label: 'All Share' },
]

function heatColorCls(pct: number): string {
  if (pct >= 5)    return 'bg-green-700'
  if (pct >= 2.5)  return 'bg-green-600'
  if (pct >= 1)    return 'bg-green-500'
  if (pct >= 0)    return 'bg-green-400'
  if (pct >= -1)   return 'bg-red-400'
  if (pct >= -2.5) return 'bg-red-500'
  if (pct >= -5)   return 'bg-red-600'
  return 'bg-red-700'
}

// Filter out rights / preference shares (empty name or contains "(R)")
function isRegularShare(name: string): boolean {
  if (!name || !name.trim()) return false
  if (/\(R\d*\)|\bRight\b/i.test(name)) return false
  return true
}

type StockItem = Pick<StockQuote, 'symbol' | 'name' | 'price' | 'changePct' | 'volume'>
type SectorGroup = { code: string; name: string; stocks: StockItem[]; totalVolume: number; avgChangePct: number }

function StockBox({ stock, compact }: { stock: StockItem; compact?: boolean }) {
  return (
    <Link
      href={`/stocks/${stock.symbol}`}
      title={`${stock.symbol} — ${stock.name}\nPrice: ${stock.price.toFixed(2)}\nChange: ${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%`}
      className={`${heatColorCls(stock.changePct)} text-white rounded flex flex-col items-center justify-center
                  hover:opacity-80 transition-opacity overflow-hidden cursor-pointer
                  ${compact ? 'p-0.5' : 'p-1'}`}
    >
      <span className={`font-bold leading-none ${compact ? 'text-[9px]' : 'text-xs'}`}>
        {stock.symbol}
      </span>
      {!compact && (
        <span className="text-[10px] font-semibold mt-0.5 leading-none opacity-90">
          {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
        </span>
      )}
    </Link>
  )
}

export default function SectorHeatmap() {
  const [quotes,  setQuotes]  = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [index,   setIndex]   = useState('KSE100')

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(json => { if (json.quotes) setQuotes(json.quotes) })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const sectors = useMemo<SectorGroup[]>(() => {
    let list = quotes.filter(q => q.price > 0 && q.volume > 0 && isRegularShare(q.name))
    if (index) list = list.filter(q => q.indexKeys?.includes(index))

    const map: Record<string, { stocks: StockItem[]; totalVolume: number }> = {}
    for (const q of list) {
      const code = q.sector || '0000'
      if (!map[code]) map[code] = { stocks: [], totalVolume: 0 }
      map[code].stocks.push({ symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct, volume: q.volume })
      map[code].totalVolume += q.volume
    }

    return Object.entries(map)
      .map(([code, data]) => {
        const stocks = data.stocks.sort((a, b) => b.volume - a.volume)
        const avgChangePct = +(stocks.reduce((s, st) => s + st.changePct, 0) / stocks.length).toFixed(2)
        return { code, name: SECTOR_NAMES[code] ?? `Sector ${code}`, stocks, totalVolume: data.totalVolume, avgChangePct }
      })
      .filter(s => s.stocks.length > 0)
      .sort((a, b) => b.totalVolume - a.totalVolume)
  }, [quotes, index])

  const totalVol = sectors.reduce((s, sec) => s + sec.totalVolume, 0) || 1

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
      ))}
    </div>
  )

  if (error) return <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>{error}</p>

  return (
    <div className="space-y-3">
      {/* Index tabs */}
      <div className="flex gap-1 flex-wrap">
        {INDICES.map(idx => (
          <button key={idx.value} onClick={() => setIndex(idx.value)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={index === idx.value
              ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
              : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {idx.label}
          </button>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        <span>Change %:</span>
        {[
          { label: '≥+5%',  cls: 'bg-green-700' }, { label: '+2.5%', cls: 'bg-green-600' },
          { label: '+1%',   cls: 'bg-green-500' }, { label: '0%',    cls: 'bg-green-400' },
          { label: '-1%',   cls: 'bg-red-400'   }, { label: '-2.5%', cls: 'bg-red-500'   },
          { label: '-5%',   cls: 'bg-red-600'   }, { label: '≤-5%',  cls: 'bg-red-700'   },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${l.cls}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Sector cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sectors.map(sector => {
          const volPct = ((sector.totalVolume / totalVol) * 100).toFixed(1)
          const topStocks = sector.stocks.slice(0, 12)
          const big   = topStocks.slice(0, 2)
          const small = topStocks.slice(2)

          return (
            <div key={sector.code} className="card p-2 flex flex-col gap-1.5 min-h-[130px]">
              {/* Sector header */}
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wide leading-none truncate block"
                        style={{ color: 'var(--text-primary)' }}>
                    {sector.name}
                  </span>
                  <span className="text-[9px] leading-none" style={{ color: 'var(--text-muted)' }}>
                    {volPct}% vol · {sector.stocks.length} stocks
                  </span>
                </div>
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded leading-none shrink-0
                  ${sector.avgChangePct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {sector.avgChangePct >= 0 ? '+' : ''}{sector.avgChangePct.toFixed(2)}%
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1">
                {big.length > 0 && (
                  <div className={`grid gap-1 ${big.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                       style={{ minHeight: 48 }}>
                    {big.map(s => <StockBox key={s.symbol} stock={s} />)}
                  </div>
                )}
                {small.length > 0 && (
                  <div className="grid grid-cols-4 gap-0.5" style={{ minHeight: 32 }}>
                    {small.map(s => <StockBox key={s.symbol} stock={s} compact />)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] pt-1" style={{ color: 'var(--text-muted)' }}>
        Click any stock to open detail · Refreshes every 5 min
      </p>
    </div>
  )
}
