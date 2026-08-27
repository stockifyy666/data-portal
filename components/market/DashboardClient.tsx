'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

type IndexItem = {
  key: string; label: string
  current: number; change: number; changePct: number
  high: number; low: number; volume: number
}

type Candle = { date: string; close: number; open: number; high: number; low: number; volume: number }
type Tab     = 'gainers' | 'losers' | 'active' | 'all'
type SortCol = 'symbol' | 'name' | 'price' | 'change' | 'changePct' | 'volume' | 'high' | 'low'
type SortDir = 'asc' | 'desc'

// ─── Index definitions ────────────────────────────────────────────────────────

const INDICES = [
  { key: 'KSE100',    label: 'KSE-100',       chartSymbol: 'KSE100'    },
  { key: 'KSE30',     label: 'KSE-30',        chartSymbol: 'KSE30'     },
  { key: 'KMI30',     label: 'KMI-30',        chartSymbol: 'KMI30'     },
  { key: 'KMIALLSHR', label: 'KMI All Share', chartSymbol: 'KMIALLSHR' },
  { key: 'ALLSHR',    label: 'All Share',     chartSymbol: 'ALLSHR'    },
]

const PAGE_SIZE = 10

// ─── Mini chart ───────────────────────────────────────────────────────────────

function IndexChart({ symbol }: { symbol: string }) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setCandles([])
    cachedFetch<{ data: Candle[] }>(`/api/stock/${symbol}/intraday?period=1D`, 15 * 60_000)
      .then(j => { if (j.data) setCandles([...j.data].reverse()) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return <div className="h-full w-full rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
  if (!candles.length) return <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No chart data</p>

  const prices = candles.map(c => c.close)
  const min    = Math.min(...prices)
  const max    = Math.max(...prices)
  const range  = max - min || 1
  const W = 600; const H = 120
  const isUp   = prices[prices.length - 1] >= prices[0]
  const color  = isUp ? '#16a34a' : '#dc2626'
  const fill   = isUp ? '#16a34a22' : '#dc262622'

  const pts      = candles.map((c, i) => `${(i / (candles.length - 1)) * W},${H - ((c.close - min) / range) * (H - 8) - 4}`)
  const areaPath = `M ${pts[0]} L ${pts.join(' L ')} L ${W},${H} L 0,${H} Z`
  const linePath = `M ${pts.join(' L ')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [indices,     setIndices]     = useState<IndexItem[]>([])
  const [quotes,      setQuotes]      = useState<StockQuote[]>([])
  const [indLoading,  setIndLoading]  = useState(true)
  const [qtLoading,   setQtLoading]   = useState(true)
  const [tab,         setTab]         = useState<Tab>('gainers')
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [sortCol,     setSortCol]     = useState<SortCol>('changePct')
  const [sortDir,     setSortDir]     = useState<SortDir>('desc')

  const activeIndex = INDICES[selectedIdx]

  // Load indices
  useEffect(() => {
    cachedFetch<{ indices: IndexItem[] }>('/api/market/indices', 15 * 60_000)
      .then(j => { if (j.indices) setIndices(j.indices) })
      .catch(() => {})
      .finally(() => setIndLoading(false))
  }, [])

  // Load quotes
  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 15 * 60_000)
      .then(j => { if (j.quotes) setQuotes(j.quotes) })
      .catch(() => {})
      .finally(() => setQtLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [tab, search, selectedIdx, sortCol, sortDir])

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // Stocks filtered to selected index, excluding stale (volume=0) and rights issues
  const indexStocks = useMemo(() => {
    return quotes.filter(q =>
      q.price > 0 &&
      q.volume > 0 &&                            // must have traded today
      q.indexKeys?.includes(activeIndex.key) &&
      !/\(R\d*\)|\bRight\b/i.test(q.name) &&
      !/R\d*$/.test(q.symbol)
    )
  }, [quotes, activeIndex.key])

  const filtered = useMemo(() => {
    let list = [...indexStocks]

    if (tab === 'gainers') list = list.filter(s => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 100)
    else if (tab === 'losers') list = list.filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 100)
    else if (tab === 'active') list = list.sort((a, b) => b.volume - a.volume).slice(0, 100)

    if (search.trim()) {
      const q = search.toUpperCase().trim()
      list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    }

    list = [...list].sort((a, b) => {
      const av = a[sortCol as keyof typeof a]
      const bv = b[sortCol as keyof typeof b]
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    return list
  }, [indexStocks, tab, search, sortCol, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Index card data (match by key)
  const indexData = (key: string) => indices.find(i => i.key === key)

  return (
    <div className="space-y-5">

      {/* ── Index selector cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {INDICES.map((idx, i) => {
          const data   = indexData(idx.key)
          const active = selectedIdx === i
          const isUp   = (data?.change ?? 0) >= 0

          return (
            <button key={idx.key} onClick={() => setSelectedIdx(i)}
              className="card text-left transition-all cursor-pointer"
              style={active ? {
                border: '2px solid #FEA500',
                boxShadow: '0 0 0 3px rgba(254,165,0,0.15)',
              } : { border: '1px solid var(--bg-border)' }}>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: active ? '#FEA500' : 'var(--text-muted)' }}>
                  {idx.label}
                </span>
                {indLoading
                  ? <div className="w-3 h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
                  : isUp
                    ? <TrendingUp  size={13} className="text-green-600 shrink-0" />
                    : <TrendingDown size={13} className="text-red-500  shrink-0" />
                }
              </div>

              {indLoading ? (
                <>
                  <div className="h-5 w-20 rounded animate-pulse mb-1" style={{ backgroundColor: 'var(--bg-border)' }} />
                  <div className="h-3 w-14 rounded animate-pulse"       style={{ backgroundColor: 'var(--bg-border)' }} />
                </>
              ) : data ? (
                <>
                  <p className="text-lg font-bold font-number leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {formatPrice(data.current, 0)}
                  </p>
                  <p className={`text-xs font-number font-semibold mt-0.5 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                    {formatChange(data.change)}
                    <span className="font-normal ml-1 opacity-80">({formatPercent(data.changePct / 100)})</span>
                  </p>
                </>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Chart ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {activeIndex.label}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Intraday · Today</p>
          </div>
          {(() => {
            const d = indexData(activeIndex.key)
            if (!d) return null
            const up = d.change >= 0
            return (
              <div className="text-right">
                <p className="text-base font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                  {formatPrice(d.current, 0)}
                </p>
                <p className={`text-xs font-number font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
                  {formatChange(d.change)} ({formatPercent(d.changePct / 100)})
                </p>
              </div>
            )
          })()}
        </div>
        <div style={{ height: 260 }}>
          <IndexChart symbol={activeIndex.chartSymbol} />
        </div>
      </div>

      {/* ── Stocks table ── */}
      <div className="card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex gap-0.5 overflow-x-auto hide-scrollbar p-0.5 rounded-lg w-fit"
               style={{ backgroundColor: 'var(--bg-hover)' }}>
            {([
              { label: 'Top Gainers', value: 'gainers' },
              { label: 'Top Losers',  value: 'losers'  },
              { label: 'Most Active', value: 'active'  },
              { label: 'All Stocks',  value: 'all'     },
            ] as { label: string; value: Tab }[]).map(t => (
              <button key={t.value} onClick={() => { setTab(t.value); setSearch('') }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
                style={tab === t.value
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                  : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative sm:ml-auto w-full sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search in ${activeIndex.label}…`}
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {!qtLoading && (
          <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} symbols in {activeIndex.label}
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </p>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {([
                  { label: 'Symbol', col: 'symbol'    },
                  { label: 'Name',   col: 'name'      },
                  { label: 'Price',  col: 'price'     },
                  { label: 'Change', col: 'change'    },
                  { label: '% Chg',  col: 'changePct' },
                  { label: 'Volume', col: 'volume'    },
                  { label: 'High',   col: 'high'      },
                  { label: 'Low',    col: 'low'       },
                ] as { label: string; col: SortCol }[]).map(({ label, col }) => {
                  const active = sortCol === col
                  const Icon   = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
                  return (
                    <th key={col} onClick={() => handleSort(col)}
                        className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity"
                        style={{ color: active ? '#FEA500' : 'var(--text-muted)' }}>
                      <span className="flex items-center gap-0.5">{label} <Icon size={9} /></span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {qtLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-2.5 px-2">
                        <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {search ? `No results for "${search}"` : `No ${tab === 'gainers' ? 'gaining' : tab === 'losers' ? 'losing' : ''} stocks today in ${activeIndex.label}`}
                  </td>
                </tr>
              ) : pageData.map(q => {
                const color = getChangeColor(q.change)
                return (
                  <tr key={q.symbol}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <Link href={`/stocks/${q.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>
                          {q.symbol}
                        </Link>
                        {isKMI(q.indexKeys) && <KMIBadge />}
                      </div>
                    </td>
                    <td className="py-2 px-2 max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>{q.name}</td>
                    <td className="py-2 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPrice(q.price)}</td>
                    <td className={`py-2 px-2 font-number ${color}`}>{formatChange(q.change)}</td>
                    <td className={`py-2 px-2 font-number font-semibold ${color}`}>{formatPercent(q.changePct / 100)}</td>
                    <td className="py-2 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>{formatVolume(q.volume)}</td>
                    <td className="py-2 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>{formatPrice(q.high)}</td>
                    <td className="py-2 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>{formatPrice(q.low)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              <ChevronLeft size={13} /> Prev
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pg: number | null = null
                if (totalPages <= 7) pg = i + 1
                else if (i === 0) pg = 1
                else if (i === 6) pg = totalPages
                else { const mid = Math.min(Math.max(page, 3), totalPages - 2); pg = mid - 2 + i; if (pg <= 1 || pg >= totalPages) pg = null }
                if (!pg) return <span key={i} className="px-1 text-xs self-center" style={{ color: 'var(--text-muted)' }}>…</span>
                return (
                  <button key={pg} onClick={() => setPage(pg!)}
                    className="w-7 h-7 rounded-md text-xs font-semibold transition-colors"
                    style={page === pg
                      ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                      : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                    {pg}
                  </button>
                )
              })}
            </div>

            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
