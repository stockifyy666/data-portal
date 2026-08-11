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
}

const DEFAULT_FILTERS: Filters = {
  minPrice: '', maxPrice: '', minChange: '', maxChange: '', minVolume: '',
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
      if (filters.minPrice  && q.price     < parseFloat(filters.minPrice))  return false
      if (filters.maxPrice  && q.price     > parseFloat(filters.maxPrice))  return false
      if (filters.minChange && q.changePct < parseFloat(filters.minChange)) return false
      if (filters.maxChange && q.changePct > parseFloat(filters.maxChange)) return false
      if (filters.minVolume && q.volume    < parseFloat(filters.minVolume)) return false
      return true
    })
  }, [quotes, filters])

  function update(key: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-5 animate-data">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Stock Screener</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Filter PSX stocks by price, change, and volume
        </p>
      </div>

      {/* Filter panel */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={14} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-auto text-[10px] text-slate-400 hover:text-slate-900 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Min Price',    key: 'minPrice'  },
            { label: 'Max Price',    key: 'maxPrice'  },
            { label: 'Min Change %', key: 'minChange' },
            { label: 'Max Change %', key: 'maxChange' },
            { label: 'Min Volume',   key: 'minVolume' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                {f.label}
              </label>
              <input
                type="number"
                value={filters[f.key as keyof Filters]}
                onChange={e => update(f.key as keyof Filters, e.target.value)}
                placeholder="Any"
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5
                           text-xs text-slate-900 placeholder-slate-400
                           focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 mt-3">
          {loading ? 'Loading…' : `${results.length} of ${quotes.length} stocks match`}
        </p>
      </div>

      {/* Results table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {['Symbol', 'Name', 'Price', '% Change', 'Volume', 'High', 'Low'].map(col => (
                <th key={col}
                    className="text-left py-2 px-2 text-[10px] font-semibold
                               text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-2.5 px-2">
                      <div className="h-3 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  No stocks match your filters
                </td>
              </tr>
            ) : (
              results.slice(0, 100).map(q => (
                <tr key={q.symbol}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-2">
                    <Link href={`/stocks/${q.symbol}`}
                          className="font-semibold text-blue-600 hover:text-blue-700">
                      {q.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 text-slate-500 max-w-[120px] truncate">{q.name}</td>
                  <td className="py-2.5 px-2 font-number font-semibold text-slate-900">{formatPrice(q.price)}</td>
                  <td className={`py-2.5 px-2 font-number font-semibold ${getChangeColor(q.changePct)}`}>
                    {formatPercent(q.changePct / 100)}
                  </td>
                  <td className="py-2.5 px-2 font-number text-slate-500">{formatVolume(q.volume)}</td>
                  <td className="py-2.5 px-2 font-number text-slate-500">{formatPrice(q.high)}</td>
                  <td className="py-2.5 px-2 font-number text-slate-500">{formatPrice(q.low)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
