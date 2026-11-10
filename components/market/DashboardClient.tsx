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

type Candle  = { date: string; close: number; open: number; high: number; low: number; volume: number }
type Tab     = 'gainers' | 'losers' | 'active' | 'all'
type SortCol = 'symbol' | 'name' | 'price' | 'change' | 'changePct' | 'volume' | 'high' | 'low'
type SortDir = 'asc' | 'desc'

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

  useEffect(() => {
    cachedFetch<{ indices: IndexItem[] }>('/api/market/indices', 15 * 60_000)
      .then(j => { if (j.indices) setIndices(j.indices) })
      .catch(() => {})
      .finally(() => setIndLoading(false))
  }, [])

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(j => { if (j.quotes) setQuotes(j.quotes) })
      .catch(() => {})
      .finally(() => setQtLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [tab, search, selectedIdx, sortCol, sortDir])

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const indexStocks = useMemo(() => quotes.filter(q =>
    q.price > 0 &&
    q.indexKeys?.includes(activeIndex.key) &&
    !/\(R\d*\)|\bRight\b/i.test(q.name) &&
    !/R\d*$/.test(q.symbol)
  ), [quotes, activeIndex.key])

  const filtered = useMemo(() => {
    let list = [...indexStocks]
    if (tab === 'gainers') list = list.filter(s => s.changePct > 0).sort((a, b) => b.changePct - a.changePct)
    else if (tab === 'losers') list = list.filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct)
    else if (tab === 'active') list = list.filter(s => s.volume > 0).sort((a, b) => b.volume - a.volume)

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
  const indexData  = (key: string) => indices.find(i => i.key === key)

  const TABLE_COLS: { label: string; col: SortCol; mobileHide?: boolean }[] = [
    { label: 'Symbol', col: 'symbol'    },
    { label: 'Name',   col: 'name',      mobileHide: true },
    { label: 'Price',  col: 'price'     },
    { label: 'Change', col: 'change',    mobileHide: true },
    { label: '% Chg',  col: 'changePct' },
    { label: 'Volume', col: 'volume',    mobileHide: true },
    { label: 'High',   col: 'high',      mobileHide: true },
    { label: 'Low',    col: 'low',       mobileHide: true },
  ]

  return (
    <div className="space-y-4">

      {/* ── Index selector cards ──
           Mobile : single full-width card + arrow navigation
           Desktop: 5-column grid                             */}

      {/* Mobile single card */}
      <div className="sm:hidden">
        {(() => {
          const idx  = INDICES[selectedIdx]
          const data = indexData(idx.key)
          const isUp = data ? data.change > 0 : null
          const bgColor  = isUp === true ? '#dcfce7' : isUp === false ? '#fee2e2' : 'var(--bg-card)'
          const bdrColor = isUp === true ? 'rgba(22,163,74,0.35)' : isUp === false ? 'rgba(220,38,38,0.35)' : 'var(--bg-border)'
          return (
            <div className="rounded-xl overflow-hidden"
              style={{ backgroundColor: bgColor, border: `2px solid #FEA500`, boxShadow: '0 0 0 3px rgba(254,165,0,0.12)', position: 'relative' }}>
              {isUp !== null && (
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%',
                  backgroundColor: isUp ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.12)', pointerEvents: 'none' }} />
              )}
              <div className="flex items-center justify-between px-4 py-3">
                {/* Prev arrow */}
                <button onClick={() => setSelectedIdx(i => (i - 1 + INDICES.length) % INDICES.length)}
                  className="flex items-center justify-center w-8 h-8 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                  <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>

                {/* Card content */}
                <div className="flex-1 text-center px-2">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#FEA500' }}>
                      {idx.label}
                    </span>
                    {!indLoading && (isUp
                      ? <TrendingUp  size={12} className="text-green-600" />
                      : <TrendingDown size={12} className="text-red-500" />
                    )}
                  </div>
                  {indLoading ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-6 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
                      <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
                    </div>
                  ) : data ? (
                    <>
                      <p className="text-xl font-bold font-number" style={{ color: isUp ? '#15803d' : '#b91c1c' }}>
                        {formatPrice(data.current, 2)}
                      </p>
                      <p className={`text-xs font-number font-semibold mt-0.5 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                        {formatChange(data.change)} ({formatPercent(data.changePct / 100)})
                      </p>
                    </>
                  ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>}
                </div>

                {/* Next arrow */}
                <button onClick={() => setSelectedIdx(i => (i + 1) % INDICES.length)}
                  className="flex items-center justify-center w-8 h-8 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                  <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-1.5 pb-2.5">
                {INDICES.map((_, i) => (
                  <button key={i} onClick={() => setSelectedIdx(i)}
                    style={{ width: i === selectedIdx ? 16 : 6, height: 6, borderRadius: 999,
                      backgroundColor: i === selectedIdx ? '#FEA500' : 'rgba(0,0,0,0.18)',
                      transition: 'width 0.2s, background-color 0.2s', border: 'none', padding: 0, cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {INDICES.map((idx, i) => {
          const data   = indexData(idx.key)
          const active = selectedIdx === i
          const isUp   = data ? data.change > 0 : null
          const bgColor  = isUp === true ? '#dcfce7' : isUp === false ? '#fee2e2' : 'var(--bg-card)'
          const bdrColor = isUp === true ? 'rgba(22,163,74,0.35)' : isUp === false ? 'rgba(220,38,38,0.35)' : 'var(--bg-border)'

          return (
            <button key={idx.key} onClick={() => setSelectedIdx(i)}
              className="card text-left transition-all cursor-pointer"
              style={active ? {
                backgroundColor: bgColor, border: '2px solid #FEA500',
                boxShadow: '0 0 0 3px rgba(254,165,0,0.15)', position: 'relative', overflow: 'hidden',
              } : {
                backgroundColor: bgColor, border: `1px solid ${bdrColor}`,
                position: 'relative', overflow: 'hidden',
              }}>
              {isUp !== null && (
                <div style={{ position: 'absolute', top: -16, right: -16, width: 72, height: 72,
                  borderRadius: '50%', backgroundColor: isUp ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.12)',
                  pointerEvents: 'none' }} />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: active ? '#FEA500' : 'var(--text-muted)' }}>{idx.label}</span>
                {indLoading
                  ? <div className="w-3 h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
                  : isUp ? <TrendingUp size={13} className="text-green-600 shrink-0" />
                         : <TrendingDown size={13} className="text-red-500 shrink-0" />}
              </div>
              {indLoading ? (
                <>
                  <div className="h-5 w-20 rounded animate-pulse mb-1" style={{ backgroundColor: 'var(--bg-border)' }} />
                  <div className="h-3 w-14 rounded animate-pulse"       style={{ backgroundColor: 'var(--bg-border)' }} />
                </>
              ) : data ? (
                <>
                  <p className="text-lg font-bold font-number leading-tight" style={{ color: isUp ? '#15803d' : '#b91c1c' }}>
                    {formatPrice(data.current, 2)}
                  </p>
                  <p className={`text-xs font-number font-semibold mt-0.5 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                    {formatChange(data.change)} <span className="font-normal opacity-80">({formatPercent(data.changePct / 100)})</span>
                  </p>
                </>
              ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>}
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
                <p className="text-sm sm:text-base font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                  {formatPrice(d.current, 2)}
                </p>
                <p className={`text-xs font-number font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
                  {formatChange(d.change)} ({formatPercent(d.changePct / 100)})
                </p>
              </div>
            )
          })()}
        </div>
        <div style={{ height: 200 }} className="sm:h-[260px]">
          <IndexChart symbol={activeIndex.chartSymbol} />
        </div>
      </div>

      {/* ── Stocks table ── */}
      <div className="card !p-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4"
             style={{ borderBottom: '1px solid var(--bg-border)' }}>
          {/* Tab pills */}
          <div className="flex gap-0.5 overflow-x-auto hide-scrollbar p-0.5 rounded-lg w-full sm:w-fit"
               style={{ backgroundColor: 'var(--bg-hover)' }}>
            {([
              { label: 'Gainers', value: 'gainers' },
              { label: 'Losers',  value: 'losers'  },
              { label: 'Active',  value: 'active'  },
              { label: 'All',     value: 'all'     },
            ] as { label: string; value: Tab }[]).map(t => (
              <button key={t.value} onClick={() => { setTab(t.value); setSearch('') }}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
                style={tab === t.value
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                  : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto w-full sm:w-52">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeIndex.label}…`}
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {!qtLoading && (
          <p className="text-[10px] px-3 sm:px-4 pt-2" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} symbols · {activeIndex.label}
            {totalPages > 1 && ` · p${page}/${totalPages}`}
          </p>
        )}

        {/* Table — scrollable on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 360 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {TABLE_COLS.map(({ label, col, mobileHide }) => {
                  const active = sortCol === col
                  const Icon   = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
                  return (
                    <th key={col} onClick={() => handleSort(col)}
                        className={`text-left py-2 px-2 sm:px-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity${mobileHide ? ' hidden sm:table-cell' : ''}`}
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
                    {TABLE_COLS.map(({ col, mobileHide }) => (
                      <td key={col} className={`py-2.5 px-2 sm:px-3${mobileHide ? ' hidden sm:table-cell' : ''}`}>
                        <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS.length} className="text-center py-10 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {search ? `No results for "${search}"` : `No ${tab === 'gainers' ? 'gaining' : tab === 'losers' ? 'losing' : ''} stocks today`}
                  </td>
                </tr>
              ) : pageData.map(q => {
                const color = getChangeColor(q.change)
                return (
                  <tr key={q.symbol}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    {/* Symbol */}
                    <td className="py-2.5 px-2 sm:px-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/stocks/${q.symbol}`} prefetch={false}
                          className="font-bold hover:underline text-[11px] sm:text-xs" style={{ color: '#FEA500' }}>
                          {q.symbol}
                        </Link>
                        {isKMI(q.indexKeys, q.symbol) && <KMIBadge />}
                      </div>
                      {/* Name shown below symbol on mobile */}
                      <p className="sm:hidden text-[10px] truncate max-w-[90px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {q.name}
                      </p>
                    </td>
                    {/* Name — desktop only */}
                    <td className="hidden sm:table-cell py-2.5 px-3 max-w-[140px] truncate">
                      <Link href={`/stocks/${q.symbol}`} prefetch={false} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
                        {q.name}
                      </Link>
                    </td>
                    {/* Price */}
                    <td className="py-2.5 px-2 sm:px-3 font-number font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                      {formatPrice(q.price)}
                    </td>
                    {/* Change — desktop only */}
                    <td className={`hidden sm:table-cell py-2.5 px-3 font-number whitespace-nowrap ${color}`}>
                      {formatChange(q.change)}
                    </td>
                    {/* % Change */}
                    <td className={`py-2.5 px-2 sm:px-3 font-number font-semibold whitespace-nowrap ${color}`}>
                      {formatPercent(q.changePct / 100)}
                    </td>
                    {/* Volume — desktop only */}
                    <td className="hidden sm:table-cell py-2.5 px-3 font-number whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatVolume(q.volume)}
                    </td>
                    {/* High — desktop only */}
                    <td className="hidden sm:table-cell py-2.5 px-3 font-number whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(q.high)}
                    </td>
                    {/* Low — desktop only */}
                    <td className="hidden sm:table-cell py-2.5 px-3 font-number whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(q.low)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-3"
               style={{ borderTop: '1px solid var(--bg-border)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              <ChevronLeft size={13} /> <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pg: number | null = null
                if (totalPages <= 5) pg = i + 1
                else if (i === 0) pg = 1
                else if (i === 4) pg = totalPages
                else { const mid = Math.min(Math.max(page, 2), totalPages - 1); pg = mid - 1 + i; if (pg <= 1 || pg >= totalPages) pg = null }
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              <span className="hidden sm:inline">Next</span> <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
