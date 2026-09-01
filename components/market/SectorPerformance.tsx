'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { TrendingUp, TrendingDown, X, ArrowUpDown } from 'lucide-react'
import { cachedFetch }                   from '@/lib/utils/clientCache'
import type { StockQuote }               from '@/types/market'

type SectorStock = { symbol: string; name: string; price: number; changePct: number; volume: number }
type ActiveSector = { name: string; avg: number; stocks: SectorStock[] }

function SectorStocksModal({ sector, onClose }: { sector: ActiveSector; onClose: () => void }) {
  const [sortBy,  setSortBy]  = useState<'change' | 'volume' | 'price'>('change')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const sorted = useMemo(() => [...sector.stocks].sort((a, b) => {
    const v = sortBy === 'change' ? a.changePct - b.changePct
             : sortBy === 'volume' ? a.volume - b.volume
             : a.price - b.price
    return sortDir === 'desc' ? -v : v
  }), [sector.stocks, sortBy, sortDir])

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const advancers = sector.stocks.filter(s => s.changePct > 0).length
  const decliners = sector.stocks.filter(s => s.changePct < 0).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
           style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 shrink-0"
             style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sector.name}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                ${sector.avg >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                Avg {sector.avg >= 0 ? '+' : ''}{sector.avg.toFixed(2)}%
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{sector.stocks.length} stocks</span>
              <span className="text-[11px] text-green-600">▲ {advancers}</span>
              <span className="text-[11px] text-red-500">▼ {decliners}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 shrink-0"
                  style={{ backgroundColor: 'var(--bg-hover)' }}>
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--bg-card)' }}>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>Symbol</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>Company</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: sortBy === 'price' ? '#FEA500' : 'var(--text-muted)' }}
                    onClick={() => toggleSort('price')}>
                  <span className="flex items-center justify-end gap-1">Price <ArrowUpDown size={9}/></span>
                </th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: sortBy === 'change' ? '#FEA500' : 'var(--text-muted)' }}
                    onClick={() => toggleSort('change')}>
                  <span className="flex items-center justify-end gap-1">Change % <ArrowUpDown size={9}/></span>
                </th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: sortBy === 'volume' ? '#FEA500' : 'var(--text-muted)' }}
                    onClick={() => toggleSort('volume')}>
                  <span className="flex items-center justify-end gap-1">Volume <ArrowUpDown size={9}/></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const up = s.changePct >= 0
                return (
                  <tr key={s.symbol} style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2.5 px-4">
                      <Link href={`/stocks/${s.symbol}`} onClick={onClose}
                            className="font-bold hover:underline" style={{ color: '#FEA500' }}>
                        {s.symbol}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.name}</td>
                    <td className="py-2.5 px-4 text-right font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {s.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center justify-end gap-1 font-number font-bold"
                            style={{ color: up ? '#16a34a' : '#dc2626' }}>
                        {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                        {up ? '+' : ''}{s.changePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-number" style={{ color: 'var(--text-secondary)' }}>
                      {s.volume >= 1_000_000 ? (s.volume/1_000_000).toFixed(1)+'M'
                       : s.volume >= 1_000 ? (s.volume/1_000).toFixed(0)+'K'
                       : s.volume.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

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

type Period = 'today' | 'week' | 'month'

const PERIODS: { id: Period; label: string; available: boolean }[] = [
  { id: 'today', label: 'Today',      available: true  },
  { id: 'week',  label: 'This Week',  available: false },
  { id: 'month', label: 'This Month', available: false },
]

const INDEX_FILTER: { value: string; label: string }[] = [
  { value: '',         label: 'All Stocks'   },
  { value: 'KSE100',   label: 'KSE-100'      },
  { value: 'KSE30',    label: 'KSE-30'       },
  { value: 'KMI30',    label: 'KMI-30'       },
  { value: 'KMIALLSHR',label: 'KMI All Share' },
  { value: 'ALLSHR',   label: 'All Share'    },
]

function heatColor(pct: number) {
  if (pct >= 3)    return '#16a34a'
  if (pct >= 1.5)  return '#22c55e'
  if (pct >= 0.5)  return '#4ade80'
  if (pct >= 0)    return '#86efac'
  if (pct >= -0.5) return '#fca5a5'
  if (pct >= -1.5) return '#f87171'
  if (pct >= -3)   return '#ef4444'
  return '#dc2626'
}

function bgColor(pct: number) {
  if (pct >= 3)    return '#16a34a18'
  if (pct >= 1.5)  return '#22c55e18'
  if (pct >= 0.5)  return '#4ade8018'
  if (pct >= 0)    return '#86efac18'
  if (pct >= -0.5) return '#fca5a518'
  if (pct >= -1.5) return '#f8717118'
  if (pct >= -3)   return '#ef444418'
  return '#dc262618'
}

export default function SectorPerformance({ indexFilter }: { indexFilter?: string }) {
  const [quotes,       setQuotes]       = useState<StockQuote[]>([])
  const [loading,      setLoading]      = useState(true)
  const [period,       setPeriod]       = useState<Period>('today')
  const [idxFilt,      setIdxFilt]      = useState(indexFilter ?? '')
  const [activeSector, setActiveSector] = useState<ActiveSector | null>(null)

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(j => { if (j.quotes) setQuotes(j.quotes) })
      .finally(() => setLoading(false))
  }, [])

  // Keep indexFilter prop in sync if passed from parent
  useEffect(() => { if (indexFilter !== undefined) setIdxFilt(indexFilter) }, [indexFilter])

  const sectors = useMemo(() => {
    let list = quotes.filter(q => q.price > 0 && q.volume > 0)
    if (idxFilt) list = list.filter(q => q.indexKeys?.includes(idxFilt))

    const map: Record<string, { name: string; stocks: SectorStock[] }> = {}
    for (const q of list) {
      const code = (q as any).sector || '0000'
      if (!map[code]) map[code] = { name: SECTOR_NAMES[code] ?? `Sector ${code}`, stocks: [] }
      map[code].stocks.push({ symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct, volume: q.volume })
    }

    return Object.entries(map)
      .map(([code, d]) => {
        const changes = d.stocks.map(s => s.changePct)
        const avg = changes.reduce((s, c) => s + c, 0) / changes.length
        const advancers = changes.filter(c => c > 0).length
        const decliners = changes.filter(c => c < 0).length
        return { code, name: d.name, avg: +avg.toFixed(2), stockCount: d.stocks.length, advancers, decliners, stocks: d.stocks }
      })
      .filter(s => s.stockCount >= 2)
      .sort((a, b) => b.avg - a.avg)
  }, [quotes, idxFilt])

  const topGainers  = sectors.slice(0, 5)
  const topLosers   = [...sectors].sort((a, b) => a.avg - b.avg).slice(0, 5)

  if (loading) return (
    <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
      ))}
    </div>
  )

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3"
           style={{ borderBottom: '1px solid var(--bg-border)' }}>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Sector Performance</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Best & worst performing sectors
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Index filter — only show when not driven by parent */}
          {indexFilter === undefined && (
            <div className="flex gap-1">
              {INDEX_FILTER.map(f => (
                <button key={f.value} onClick={() => setIdxFilt(f.value)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={idxFilt === f.value
                    ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                    : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {/* Period */}
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
            {PERIODS.map(p => (
              <button key={p.id}
                onClick={() => p.available && setPeriod(p.id)}
                disabled={!p.available}
                title={!p.available ? 'Historical data coming soon' : undefined}
                className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all relative"
                style={period === p.id && p.available
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                  : !p.available
                    ? { color: 'var(--text-muted)', opacity: 0.5, cursor: 'not-allowed' }
                    : { color: 'var(--text-secondary)' }}>
                {p.label}
                {!p.available && (
                  <span className="absolute -top-2 -right-1 text-[8px] px-1 rounded font-bold"
                        style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-muted)' }}>
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={13} className="text-green-500" />
            <span className="text-xs font-bold text-green-600">Top Gainers</span>
          </div>
          <div className="space-y-2">
            {topGainers.map((s, idx) => (
              <div key={s.code} onClick={() => setActiveSector({ name: s.name, avg: s.avg, stocks: s.stocks })}
                   className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
                   style={{ backgroundColor: bgColor(s.avg), border: `1px solid ${heatColor(s.avg)}30` }}>
                <span className="text-[10px] font-bold w-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {s.stockCount} stocks · {s.advancers} ▲ {s.decliners} ▼
                  </p>
                </div>
                <span className="text-sm font-black font-number shrink-0"
                      style={{ color: heatColor(s.avg) }}>
                  +{s.avg.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingDown size={13} className="text-red-500" />
            <span className="text-xs font-bold text-red-500">Top Losers</span>
          </div>
          <div className="space-y-2">
            {topLosers.map((s, idx) => (
              <div key={s.code} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                   style={{ backgroundColor: bgColor(s.avg), border: `1px solid ${heatColor(s.avg)}30` }}>
                <span className="text-[10px] font-bold w-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {s.stockCount} stocks · {s.advancers} ▲ {s.decliners} ▼
                  </p>
                </div>
                <span className="text-sm font-black font-number shrink-0"
                      style={{ color: heatColor(s.avg) }}>
                  {s.avg.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeSector && (
        <SectorStocksModal sector={activeSector} onClose={() => setActiveSector(null)} />
      )}
    </div>
  )
}
