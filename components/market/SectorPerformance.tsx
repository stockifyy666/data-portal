'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { TrendingUp, TrendingDown, X, ArrowUpDown } from 'lucide-react'
import { cachedFetch }                   from '@/lib/utils/clientCache'
import SymbolLogo                        from '@/components/ui/SymbolLogo'
import type { StockQuote }               from '@/types/market'

type SectorStock  = { symbol: string; name: string; price: number; changePct: number; volume: number }
type ActiveSector = { name: string; avg: number; stocks: SectorStock[] }
/* ── helpers ───────────────────────────────────────────────────────── */
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
function bgColor(pct: number, alpha = '18') {
  if (pct >= 3)    return `#16a34a${alpha}`
  if (pct >= 1.5)  return `#22c55e${alpha}`
  if (pct >= 0.5)  return `#4ade80${alpha}`
  if (pct >= 0)    return `#86efac${alpha}`
  if (pct >= -0.5) return `#fca5a5${alpha}`
  if (pct >= -1.5) return `#f87171${alpha}`
  if (pct >= -3)   return `#ef4444${alpha}`
  return `#dc2626${alpha}`
}
function fmt(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%' }

/* ── Sector stocks modal ───────────────────────────────────────────── */
function SectorStocksModal({ sector, onClose }: { sector: ActiveSector; onClose: () => void }) {
  const [sortBy,  setSortBy]  = useState<'change'|'volume'|'price'>('change')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')

  const sorted = useMemo(() => [...sector.stocks].sort((a, b) => {
    const v = sortBy === 'change' ? a.changePct - b.changePct
            : sortBy === 'volume' ? a.volume - b.volume
            : a.price - b.price
    return sortDir === 'desc' ? -v : v
  }), [sector.stocks, sortBy, sortDir])

  const advancers = sector.stocks.filter(s => s.changePct > 0).length
  const decliners = sector.stocks.filter(s => s.changePct < 0).length

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        <div className="flex items-start justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sector.name}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: bgColor(sector.avg), color: heatColor(sector.avg) }}>
                Avg {fmt(sector.avg)}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{sector.stocks.length} stocks</span>
              <span className="text-[11px] font-semibold text-green-600">▲ {advancers}</span>
              <span className="text-[11px] font-semibold text-red-500">▼ {decliners}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70"
            style={{ backgroundColor: 'var(--bg-hover)' }}>
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--bg-card)' }}>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {(['Symbol','Company'] as const).map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
                {(['price','change','volume'] as const).map(col => (
                  <th key={col} onClick={() => toggleSort(col)}
                    className="text-right py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: sortBy === col ? '#FEA500' : 'var(--text-muted)' }}>
                    <span className="flex items-center justify-end gap-1">
                      {col === 'change' ? 'Chg %' : col.charAt(0).toUpperCase() + col.slice(1)}
                      <ArrowUpDown size={9} />
                    </span>
                  </th>
                ))}
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
                      <div className="flex items-center gap-2">
                        <SymbolLogo symbol={s.symbol} size={24} />
                        <Link href={`/stocks/${s.symbol}`} onClick={onClose}
                          className="font-bold hover:underline" style={{ color: '#FEA500' }}>{s.symbol}</Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.name}</td>
                    <td className="py-2.5 px-4 text-right font-number font-semibold" style={{ color: 'var(--text-primary)' }}>{s.price.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center justify-end gap-1 font-number font-bold"
                        style={{ color: up ? '#16a34a' : '#dc2626' }}>
                        {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                        {fmt(s.changePct)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-number" style={{ color: 'var(--text-secondary)' }}>
                      {s.volume >= 1_000_000 ? (s.volume/1_000_000).toFixed(1)+'M'
                       : s.volume >= 1_000    ? (s.volume/1_000).toFixed(0)+'K'
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

/* ── Sector data ───────────────────────────────────────────────────── */
const SECTOR_NAMES: Record<string, string> = {
  '0801':'Automobiles',         '0802':'Auto Parts & Accessories',
  '0803':'Cable & Electrical',  '0804':'Cement',
  '0805':'Chemical',            '0806':'Closed-End Mutual Fund',
  '0807':'Commercial Banks',    '0808':'Engineering',
  '0809':'Fertilizers',         '0810':'Food & Personal Care',
  '0811':'Glass & Ceramics',    '0812':'Insurance',
  '0813':'Investment Companies','0814':'Jute',
  '0815':'Leasing Companies',   '0816':'Leather & Tanneries',
  '0818':'Miscellaneous',       '0819':'Modarbas',
  '0820':'Oil & Gas Exploration','0821':'Oil & Gas Marketing',
  '0822':'Paper & Board',       '0823':'Pharmaceuticals',
  '0824':'Power Generation',    '0825':'Refinery',
  '0826':'Sugar & Allied',      '0827':'Synthetic & Rayon',
  '0828':'Technology & Comm.',  '0829':'Textile Composite',
  '0830':'Textile Spinning',    '0831':'Textile Weaving',
  '0832':'Tobacco',             '0833':'Transport',
  '0834':'Vanaspati & Allied',  '0835':'Woolen',
  '0836':'REIT',                '0837':'ETFs',
  '0838':'Real Estate',         '0839':'Textile (Other)',
}

const INDEX_FILTER = [
  { value: '',          label: 'All Stocks'    },
  { value: 'KSE100',    label: 'KSE-100'       },
  { value: 'KSE30',     label: 'KSE-30'        },
  { value: 'KMI30',     label: 'KMI-30'        },
  { value: 'KMIALLSHR', label: 'KMI All Share' },
  { value: 'ALLSHR',    label: 'All Share'     },
]

/* ── View 1: Horizontal bar chart ──────────────────────────────────── */
function BarView({ sectors, onSelect }: { sectors: SectorRow[]; onSelect: (s: SectorRow) => void }) {
  const maxAbs = Math.max(...sectors.map(s => Math.abs(s.avg)), 0.01)
  const gainers = [...sectors].filter(s => s.avg > 0).sort((a,b) => b.avg - a.avg).slice(0, 8)
  const losers  = [...sectors].filter(s => s.avg < 0).sort((a,b) => a.avg - b.avg).slice(0, 8)

  function BarRow({ s }: { s: SectorRow }) {
    const w = Math.min((Math.abs(s.avg) / maxAbs) * 100, 100)
    const color = heatColor(s.avg)
    return (
      <div className="flex items-center gap-2 cursor-pointer py-1.5"
        onClick={() => onSelect(s)}>
        <div className="w-36 text-right shrink-0">
          <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{s.stockCount} stocks</p>
        </div>
        <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${w}%`, backgroundColor: color, opacity: 0.85 }} />
        </div>
        <span className="w-14 text-right text-[10px] font-black font-number shrink-0" style={{ color }}>
          {fmt(s.avg)}
        </span>
        <div className="w-14 text-right shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="text-green-500">{s.advancers}▲</span>
          {' '}
          <span className="text-red-400">{s.decliners}▼</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1 p-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] font-bold text-green-600 uppercase tracking-wide">Sector Leaders</span>
        </div>
        {gainers.map(s => <BarRow key={s.code} s={s} />)}
      </div>
      <div className="mt-6 lg:mt-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wide">Sector Decliners</span>
        </div>
        {losers.length > 0
          ? losers.map(s => <BarRow key={s.code} s={s} />)
          : <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>No declining sectors today</p>}
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────── */
type SectorRow = {
  code: string; name: string; avg: number
  stockCount: number; advancers: number; decliners: number
  stocks: SectorStock[]
}

export default function SectorPerformance({ indexFilter }: { indexFilter?: string }) {
  const [quotes,       setQuotes]       = useState<StockQuote[]>([])
  const [loading,      setLoading]      = useState(true)
  const [idxFilt,      setIdxFilt]      = useState(indexFilter ?? 'KSE100')
  const [activeSector, setActiveSector] = useState<ActiveSector | null>(null)

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(j => { if (j.quotes) setQuotes(j.quotes) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (indexFilter !== undefined) setIdxFilt(indexFilter) }, [indexFilter])

  const sectors = useMemo((): SectorRow[] => {
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
        const changes  = d.stocks.map(s => s.changePct)
        const avg      = changes.reduce((s, c) => s + c, 0) / changes.length
        const advancers = changes.filter(c => c > 0).length
        const decliners = changes.filter(c => c < 0).length
        return { code, name: d.name, avg: +avg.toFixed(2), stockCount: d.stocks.length, advancers, decliners, stocks: d.stocks }
      })
      .filter(s => s.stockCount >= 2)
      .sort((a, b) => b.avg - a.avg)
  }, [quotes, idxFilt])

  function openSector(s: SectorRow) { setActiveSector({ name: s.name, avg: s.avg, stocks: s.stocks }) }

  if (loading) return (
    <div className="rounded-2xl p-5" style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--bg-border)' }}>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Sector Performance</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {sectors.length} sectors · {quotes.filter(q => q.price > 0).length} stocks
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Index filter */}
          {indexFilter === undefined && (
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {INDEX_FILTER.map(f => (
                <button key={f.value} onClick={() => setIdxFilt(f.value)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all shrink-0"
                  style={idxFilt === f.value
                    ? { background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }
                    : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      <BarView sectors={sectors} onSelect={openSector} />

      {/* ── Footer ── */}
      <div className="px-5 py-2.5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--bg-border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Click any sector to see individual stocks
        </p>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="text-green-500 font-semibold">{sectors.filter(s => s.avg > 0).length} gaining</span>
          <span className="text-red-400 font-semibold">{sectors.filter(s => s.avg < 0).length} losing</span>
        </div>
      </div>

      {activeSector && (
        <SectorStocksModal sector={activeSector} onClose={() => setActiveSector(null)} />
      )}
    </div>
  )
}
