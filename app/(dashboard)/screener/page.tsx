'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link                             from 'next/link'
import { SlidersHorizontal, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { formatPrice, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote }              from '@/types/market'
import KMIBadge, { isKMI }             from '@/components/ui/KMIBadge'
import SymbolLogo                        from '@/components/ui/SymbolLogo'
import { isRightSymbol } from '@/lib/utils/rights'

type Filters = {
  minPrice:   string
  maxPrice:   string
  minChange:  string
  maxChange:  string
  minVolume:  string
  minEps:     string
  maxPE:      string
  minDps:     string
  onlyXDiv:   boolean
}

const DEFAULT_FILTERS: Filters = {
  minPrice: '', maxPrice: '', minChange: '', maxChange: '', minVolume: '',
  minEps: '', maxPE: '', minDps: '', onlyXDiv: false,
}

function FilterInput({
  label, value, onChange, placeholder = 'Any',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1"
             style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded px-2.5 py-1.5 text-xs border focus:outline-none transition-colors"
        style={{
          backgroundColor: 'var(--bg-hover)',
          borderColor: 'var(--bg-border)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}

type SortKey = 'price' | 'changePct' | 'volume' | 'eps' | 'pe' | 'dps'
type SortDir = 'asc' | 'desc'

export default function ScreenerPage() {
  const [quotes,      setQuotes]      = useState<StockQuote[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filters,     setFilters]     = useState<Filters>(DEFAULT_FILTERS)
  const [search,      setSearch]      = useState('')
  const [sortKey,     setSortKey]     = useState<SortKey | null>(null)
  const [sortDir,     setSortDir]     = useState<SortDir>('desc')
  const [searchFocus, setSearchFocus] = useState(false)
  const [page,        setPage]        = useState(1)
  const [pageSize,    setPageSize]    = useState(50)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setSearchFocus(true)
  }, [])

  const handleSearchBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setSearchFocus(false), 150)
  }, [])

  const dropResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toUpperCase()
    return quotes
      .filter(s => s.price > 0 && (s.symbol.includes(q) || s.name.toUpperCase().includes(q)))
      .slice(0, 8)
  }, [search, quotes])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/screener', 60 * 60_000)
      .then(json => { if (json.quotes) setQuotes(json.quotes) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const results = useMemo(() => {
    const q = search.trim().toUpperCase()
    const filtered = quotes.filter(s => {
      if (s.price <= 0) return false
      if (/\(R\d*\)|\bRight\b/i.test(s.name) || isRightSymbol(s.symbol)) return false
      if (q && !s.symbol.includes(q) && !s.name.toUpperCase().includes(q)) return false
      if (filters.minPrice  && s.price     < parseFloat(filters.minPrice))  return false
      if (filters.maxPrice  && s.price     > parseFloat(filters.maxPrice))  return false
      if (filters.minChange && s.changePct < parseFloat(filters.minChange)) return false
      if (filters.maxChange && s.changePct > parseFloat(filters.maxChange)) return false
      if (filters.minVolume && s.volume    < parseFloat(filters.minVolume)) return false
      if (filters.minEps    && s.eps       < parseFloat(filters.minEps))    return false
      if (filters.minDps    && s.dps       < parseFloat(filters.minDps))    return false
      if (filters.maxPE) {
        const pe = s.eps > 0 ? s.price / s.eps : null
        if (pe === null || pe > parseFloat(filters.maxPE)) return false
      }
      if (filters.onlyXDiv && !s.xd) return false
      return true
    })
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let av: number, bv: number
      if (sortKey === 'price')     { av = a.price;    bv = b.price }
      else if (sortKey === 'changePct') { av = a.changePct; bv = b.changePct }
      else if (sortKey === 'volume')    { av = a.volume;    bv = b.volume }
      else if (sortKey === 'eps')       { av = a.eps;       bv = b.eps }
      else if (sortKey === 'pe')        { av = a.eps > 0 ? a.price / a.eps : -Infinity; bv = b.eps > 0 ? b.price / b.eps : -Infinity }
      else                              { av = a.dps;       bv = b.dps }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [quotes, filters, search, sortKey, sortDir])

  // Pagination: reset to page 1 when filters, search, sort or page size change
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize))
  useEffect(() => { setPage(1) }, [filters, search, sortKey, sortDir, pageSize])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const PRICE_FILTERS = [
    { label: 'Min Price', key: 'minPrice' as const },
    { label: 'Max Price', key: 'maxPrice' as const },
  ]

  const FUND_FILTERS = [
    { label: 'Min EPS',      key: 'minEps' as const },
    { label: 'Max P/E Ratio', key: 'maxPE' as const },
    { label: 'Min DPS (Rs)', key: 'minDps' as const },
  ]

  return (
    <div className="space-y-5 animate-data">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Stock Screener</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Filter PSX stocks by price, technicals, and fundamentals
        </p>
      </div>

      {/* Search by symbol / company name */}
      <div className="relative" style={{ zIndex: 50 }}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-secondary)', zIndex: 1 }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          placeholder="Search by symbol or company name…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--bg-border)',
            color: 'var(--text-primary)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        )}

        {/* Search dropdown */}
        {searchFocus && dropResults.length > 0 && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-xl shadow-2xl"
            style={{
              top: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--bg-border)',
              zIndex: 60,
              overflow: 'hidden',
            }}
          >
            {dropResults.map(q => {
              const up = q.changePct >= 0
              return (
                <Link
                  key={q.symbol}
                  href={`/stocks/${q.symbol}`}
                  prefetch={false}
                  className="flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onMouseDown={e => e.preventDefault()}
                >
                  <div className="flex items-center gap-3">
                    <SymbolLogo symbol={q.symbol} size={32} />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{q.symbol}</span>
                        {isKMI(q.indexKeys, q.symbol) && <KMIBadge />}
                      </div>
                      <Link href={`/stocks/${q.symbol}`} prefetch={false} className="text-[11px] truncate max-w-[260px] hover:underline block" style={{ color: 'var(--text-secondary)' }}>{q.name}</Link>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                      {q.price.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-semibold font-number" style={{ color: up ? '#16a34a' : '#dc2626' }}>
                      {up ? '+' : ''}{(q.changePct * 100).toFixed(2)}%
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Price / Technical filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={14} style={{ color: '#FEA500' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Price &amp; Volume</h2>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-auto text-xs font-semibold transition-colors hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            Reset All
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRICE_FILTERS.map(f => (
            <FilterInput
              key={f.key}
              label={f.label}
              value={filters[f.key]}
              onChange={v => update(f.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Fundamental filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={14} style={{ color: '#FEA500' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Fundamentals</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
          {FUND_FILTERS.map(f => (
            <FilterInput
              key={f.key}
              label={f.label}
              value={filters[f.key]}
              onChange={v => update(f.key, v)}
            />
          ))}
          {/* Ex-Dividend checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input
              type="checkbox"
              checked={filters.onlyXDiv}
              onChange={e => update('onlyXDiv', e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Ex-Dividend Only
            </span>
          </label>
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-secondary)' }}>
          P/E = Price ÷ EPS · EPS and DPS sourced from annual fundamentals (Capital Stake)
        </p>
      </div>

      {/* Match count */}
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {loading ? 'Loading…' : `${results.length} of ${quotes.length} stocks match`}
      </p>

      {/* Results table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
              {(['Symbol', 'Name'] as const).map(col => (
                <th key={col}
                    className="text-left py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-primary)' }}>
                  {col}
                </th>
              ))}
              {([
                { label: 'Price',   key: 'price'     as SortKey },
                { label: '% Chg',  key: 'changePct' as SortKey },
                { label: 'Volume', key: 'volume'    as SortKey },
                { label: 'EPS',    key: 'eps'       as SortKey },
                { label: 'P/E',    key: 'pe'        as SortKey },
                { label: 'DPS',    key: 'dps'       as SortKey },
              ]).map(col => (
                <th key={col.key}
                    className="text-left py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  <button
                    onClick={() => handleSort(col.key)}
                    aria-label={`Sort by ${col.label}`}
                    className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity uppercase"
                    style={{ color: sortKey === col.key ? '#FEA500' : 'var(--text-primary)' }}>
                    {col.label}
                    {sortKey === col.key
                      ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                      : <ArrowUpDown size={12} style={{ opacity: 0.5 }} />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="py-2.5 px-2">
                      <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10"
                    style={{ color: 'var(--text-secondary)' }}>
                  No stocks match your filters
                </td>
              </tr>
            ) : (
              results.slice((page - 1) * pageSize, page * pageSize).map(q => {
                const pe = q.eps > 0 ? (q.price / q.eps).toFixed(1) : '—'
                return (
                  <tr key={q.symbol}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <SymbolLogo symbol={q.symbol} size={24} />
                        <Link href={`/stocks/${q.symbol}`}
                              prefetch={false}
                              className="font-bold hover:underline"
                              style={{ color: '#FEA500' }}>
                          {q.symbol}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 max-w-[120px] truncate">
                      <Link href={`/stocks/${q.symbol}`} prefetch={false} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{q.name}</Link>
                    </td>
                    <td className="py-2.5 px-2 font-number font-semibold"
                        style={{ color: 'var(--text-primary)' }}>{formatPrice(q.price)}</td>
                    <td className={`py-2.5 px-2 font-number font-semibold ${getChangeColor(q.changePct)}`}>
                      {formatPercent(q.changePct)}
                    </td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>{formatVolume(q.volume)}</td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: q.eps > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {q.eps > 0 ? q.eps.toFixed(2) : '—'}
                    </td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>{pe}</td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: q.dps > 0 ? '#16a34a' : 'var(--text-secondary)' }}>
                      {q.dps > 0 ? q.dps.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && results.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span>
              Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, results.length).toLocaleString()} of {results.length.toLocaleString()}
            </span>
            <label className="inline-flex items-center gap-1.5">
              Rows
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                className="rounded-md px-1.5 py-1 text-xs font-semibold outline-none cursor-pointer"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
                {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-30"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              <ChevronLeft size={14} /> Prev
            </button>
            {(() => {
              // 1 … (page-1) page (page+1) … last
              const set = new Set([1, totalPages, page - 1, page, page + 1].filter(n => n >= 1 && n <= totalPages))
              const nums = Array.from(set).sort((a, b) => a - b)
              const out: (number | 'gap')[] = []
              nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push('gap'); out.push(n) })
              return out.map((n, i) => n === 'gap'
                ? <span key={`g${i}`} className="px-1 inline-flex items-center" style={{ color: 'var(--text-secondary)' }} aria-hidden="true"><MoreHorizontal size={14} /></span>
                : (
                  <button key={n} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}
                    className="min-w-[30px] px-2 py-1 rounded text-xs font-semibold transition-colors"
                    style={n === page
                      ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: '#fff' }
                      : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                    {n}
                  </button>
                ))
            })()}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-30"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
