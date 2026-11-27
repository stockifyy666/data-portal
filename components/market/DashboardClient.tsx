'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { TrendingUp, TrendingDown, Minus, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'
import SymbolLogo from '@/components/ui/SymbolLogo'

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

// Glide the crosshair, dot and tooltip between points instead of jumping
const SMOOTH = 'left 140ms ease-out, top 140ms ease-out, transform 220ms ease-out'

function IndexChart({ symbol }: { symbol: string }) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [hover, setHover]     = useState<number | null>(null)   // index of hovered candle
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
  if (!candles.length) return <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>No chart data</p>

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

  // Hover: map pointer x to the nearest candle
  const pick = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    setHover(Math.round(f * (candles.length - 1)))
  }
  const hc    = hover != null ? candles[hover] : null
  const hx    = hover != null ? (hover / (candles.length - 1)) * 100 : 0                  // % across
  const hy    = hc ? ((H - ((hc.close - min) / range) * (H - 8) - 4) / H) * 100 : 0      // % down
  const open  = prices[0]
  const diff  = hc ? hc.close - open : 0
  const pct   = hc && open ? (diff / open) * 100 : 0
  // Capital Stake intraday candles carry `time` (Unix seconds); older shapes used `t` or `date`
  const rawT  = (() => {
    if (!hc) return NaN
    const c = hc as unknown as { time?: number; t?: number; date?: string }
    if (c.time) return c.time * 1000
    if (c.t)    return c.t * 1000
    return c.date ? Date.parse(c.date) : NaN
  })()
  const time  = Number.isFinite(rawT)
    ? new Date(rawT).toLocaleString('en-PK', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi',
      })
    : ''

  return (
    <div className="relative w-full h-full select-none" style={{ cursor: 'crosshair' }}
      onMouseMove={e => pick(e.clientX, e.currentTarget)}
      onMouseLeave={() => setHover(null)}
      onTouchStart={e => pick(e.touches[0].clientX, e.currentTarget)}
      onTouchMove={e => pick(e.touches[0].clientX, e.currentTarget)}
      onTouchEnd={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
        <path d={areaPath} fill={fill} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
      </svg>

      {hc && (
        <>
          {/* crosshair + dot (HTML so they don't stretch with the SVG) */}
          <span className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{ left: `${hx}%`, background: 'var(--text-secondary)', opacity: 0.45, transition: SMOOTH }} />
          <span className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${hx}%`, top: `${hy}%`, transition: SMOOTH, background: color, border: '2px solid var(--bg-card)', boxShadow: `0 0 0 3px ${color}33` }} />
          {/* tooltip, flips side near the right edge */}
          <div className="absolute top-1 pointer-events-none rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
            style={{
              left: `${hx}%`, transform: hx > 70 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)', transition: SMOOTH, willChange: 'left, transform',
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
            }}>
            {time && <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{time} PKT</p>}
            <p className="text-sm tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
              {hc.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] tabular-nums" style={{ color: diff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%) vs open
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Index stat card ──────────────────────────────────────────────────────────
// "Gradient glass": card filled with a green/red gradient matching the day's
// direction, with white text.

function IndexStatCard({ label, data, loading, active, onClick }: {
  label: string; code: string; data?: IndexItem; loading: boolean; active: boolean; onClick: () => void
}) {
  // Option B · arrow badge: trend-icon tile on the left, label / value / % on the right.
  const up   = data ? data.change > 0 : false
  const flat = !data || data.change === 0
  const fg   = flat ? 'var(--text-secondary)' : up ? '#16a34a' : '#dc2626'
  const bg   = flat ? 'var(--bg-hover)' : up ? 'rgba(22,163,74,0.13)' : 'rgba(220,38,38,0.13)'
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown

  return (
    <button onClick={onClick} aria-pressed={active}
      className="text-left w-full rounded-xl px-4 py-3.5 flex items-center gap-3 transition-colors"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${active ? '#FEA500' : 'var(--bg-border)'}`,
        boxShadow: active ? '0 0 0 3px rgba(254,165,0,0.16)' : 'none',
      }}>
      <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>
        {loading ? null : <Icon size={24} strokeWidth={2.2} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] truncate" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{label}</p>
        {loading ? (
          <>
            <div className="h-5 w-28 rounded animate-pulse mt-1" style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="h-3 w-14 rounded animate-pulse mt-1.5" style={{ backgroundColor: 'var(--bg-hover)' }} />
          </>
        ) : data ? (
          <>
            <p className="text-[24px] leading-tight font-number tabular-nums truncate" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
              {data.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[13px] font-number tabular-nums mt-0.5" style={{ color: fg, fontWeight: 700 }}>
              {formatChange(data.change)} · {formatPercent(data.changePct)}
            </p>
          </>
        ) : <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Unavailable</p>}
      </div>
    </button>
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
    { label: 'Company', col: 'name'     },
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

      {/* Mobile: one card with prev/next + dots */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedIdx(i => (i - 1 + INDICES.length) % INDICES.length)}
            className="idx-nav" aria-label="Previous index"><ChevronLeft size={16} /></button>
          <div className="flex-1 min-w-0">
            <IndexStatCard label={INDICES[selectedIdx].label} code={INDICES[selectedIdx].key}
              data={indexData(INDICES[selectedIdx].key)} loading={indLoading} active onClick={() => {}} />
          </div>
          <button onClick={() => setSelectedIdx(i => (i + 1) % INDICES.length)}
            className="idx-nav" aria-label="Next index"><ChevronRight size={16} /></button>
        </div>
        <div className="flex justify-center gap-1.5 mt-2.5">
          {INDICES.map((ix, i) => (
            <button key={ix.key} onClick={() => setSelectedIdx(i)} aria-label={ix.label}
              style={{ width: i === selectedIdx ? 18 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0,
                background: i === selectedIdx ? 'linear-gradient(90deg,#FEA500,#986300)' : 'var(--bg-border)',
                transition: 'width .2s' }} />
          ))}
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {INDICES.map((idx, i) => (
          <IndexStatCard key={idx.key} label={idx.label} code={idx.key}
            data={indexData(idx.key)} loading={indLoading}
            active={selectedIdx === i} onClick={() => setSelectedIdx(i)} />
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              {activeIndex.label}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Intraday · Today</p>
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
                  {formatChange(d.change)} ({formatPercent(d.changePct)})
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
              style={{ color: 'var(--text-secondary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeIndex.label}…`}
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {!qtLoading && (
          <p className="text-xs font-medium px-3 sm:px-4 pt-2" style={{ color: 'var(--text-secondary)' }}>
            {filtered.length} symbols · {activeIndex.label}
            {totalPages > 1 && ` · p${page}/${totalPages}`}
          </p>
        )}

        {/* Table — scrollable on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 420 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {TABLE_COLS.map(({ label, col, mobileHide }) => {
                  const active = sortCol === col
                  const Icon   = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
                  return (
                    <th key={col} onClick={() => handleSort(col)}
                        className={`text-left py-2 px-2 sm:px-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity${mobileHide ? ' hidden sm:table-cell' : ''}`}
                        style={{ color: active ? '#FEA500' : 'var(--text-secondary)' }}>
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
                  <td colSpan={TABLE_COLS.length} className="text-center py-10 text-xs" style={{ color: 'var(--text-secondary)' }}>
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
                    <td className="py-2.5 px-2 sm:px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <SymbolLogo symbol={q.symbol} size={26} />
                        <Link href={`/stocks/${q.symbol}`} prefetch={false}
                          className="font-bold hover:underline text-[11px] sm:text-xs" style={{ color: '#FEA500' }}>
                          {q.symbol}
                        </Link>
                        {isKMI(q.indexKeys, q.symbol) && <KMIBadge />}
                      </div>
                    </td>
                    {/* Company */}
                    <td className="py-2.5 px-2 sm:px-3 min-w-[150px] sm:min-w-[180px] leading-snug">
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
                      {formatPercent(q.changePct)}
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
                if (!pg) return <span key={i} className="px-1 text-xs self-center" style={{ color: 'var(--text-secondary)' }}>…</span>
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
