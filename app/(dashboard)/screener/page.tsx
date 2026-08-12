'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                             from 'next/link'
import { SlidersHorizontal }            from 'lucide-react'
import { formatPrice, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote }              from '@/types/market'

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
      <label className="text-[10px] uppercase tracking-wider block mb-1"
             style={{ color: 'var(--text-muted)' }}>
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

export default function ScreenerPage() {
  const [quotes,  setQuotes]  = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes')
      .then(json => { if (json.quotes) setQuotes(json.quotes) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const results = useMemo(() => {
    return quotes.filter(q => {
      if (q.price <= 0) return false
      if (filters.minPrice  && q.price     < parseFloat(filters.minPrice))  return false
      if (filters.maxPrice  && q.price     > parseFloat(filters.maxPrice))  return false
      if (filters.minChange && q.changePct < parseFloat(filters.minChange)) return false
      if (filters.maxChange && q.changePct > parseFloat(filters.maxChange)) return false
      if (filters.minVolume && q.volume    < parseFloat(filters.minVolume)) return false
      if (filters.minEps    && q.eps       < parseFloat(filters.minEps))    return false
      if (filters.minDps    && q.dps       < parseFloat(filters.minDps))    return false
      if (filters.maxPE) {
        const pe = q.eps > 0 ? q.price / q.eps : null
        if (pe === null || pe > parseFloat(filters.maxPE)) return false
      }
      if (filters.onlyXDiv && !q.xd) return false
      return true
    })
  }, [quotes, filters])

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const PRICE_FILTERS = [
    { label: 'Min Price',    key: 'minPrice'  as const },
    { label: 'Max Price',    key: 'maxPrice'  as const },
    { label: 'Min Change %', key: 'minChange' as const },
    { label: 'Max Change %', key: 'maxChange' as const },
    { label: 'Min Volume',   key: 'minVolume' as const },
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

      {/* Price / Technical filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={14} style={{ color: '#FEA500' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Price &amp; Volume</h2>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-auto text-[10px] transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
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
        <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
          P/E = Price ÷ EPS · EPS and DPS sourced from Capital Stake market data
        </p>
      </div>

      {/* Match count */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {loading ? 'Loading…' : `${results.length} of ${quotes.length} stocks match`}
      </p>

      {/* Results table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
              {['Symbol', 'Name', 'Price', '% Chg', 'Volume', 'EPS', 'P/E', 'DPS'].map(col => (
                <th key={col}
                    className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}>
                  {col}
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
                    style={{ color: 'var(--text-muted)' }}>
                  No stocks match your filters
                </td>
              </tr>
            ) : (
              results.slice(0, 200).map(q => {
                const pe = q.eps > 0 ? (q.price / q.eps).toFixed(1) : '—'
                return (
                  <tr key={q.symbol}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2.5 px-2">
                      <Link href={`/stocks/${q.symbol}`}
                            className="font-bold hover:underline"
                            style={{ color: '#FEA500' }}>
                        {q.symbol}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 max-w-[120px] truncate"
                        style={{ color: 'var(--text-secondary)' }}>{q.name}</td>
                    <td className="py-2.5 px-2 font-number font-semibold"
                        style={{ color: 'var(--text-primary)' }}>{formatPrice(q.price)}</td>
                    <td className={`py-2.5 px-2 font-number font-semibold ${getChangeColor(q.changePct)}`}>
                      {formatPercent(q.changePct / 100)}
                    </td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>{formatVolume(q.volume)}</td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: q.eps > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {q.eps > 0 ? q.eps.toFixed(2) : '—'}
                    </td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>{pe}</td>
                    <td className="py-2.5 px-2 font-number"
                        style={{ color: q.dps > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                      {q.dps > 0 ? q.dps.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
