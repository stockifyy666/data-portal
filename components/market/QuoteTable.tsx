'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                             from 'next/link'
import { Search }                       from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume, getChangeColor }
  from '@/lib/utils/format'
import { cachedFetch }                  from '@/lib/utils/clientCache'
import type { StockQuote }              from '@/types/market'

type Tab = 'all' | 'gainers' | 'losers' | 'active'

const TABS: { label: string; value: Tab }[] = [
  { label: 'All Stocks',   value: 'all'     },
  { label: 'Top Gainers',  value: 'gainers' },
  { label: 'Top Losers',   value: 'losers'  },
  { label: 'Most Active',  value: 'active'  },
]

export default function QuoteTable() {
  const [quotes,  setQuotes]  = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState<Tab>('all')

  async function fetchQuotes() {
    try {
      const json = await cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes')
      if (json.quotes) setQuotes(json.quotes)
    } catch {
      // Keep last data on refresh failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
    const interval = setInterval(fetchQuotes, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const filtered = useMemo(() => {
    let list = quotes.filter(q => q.price > 0)

    if (tab === 'gainers') {
      list = [...list].sort((a, b) => b.changePct - a.changePct).slice(0, 50)
    } else if (tab === 'losers') {
      list = [...list].sort((a, b) => a.changePct - b.changePct).slice(0, 50)
    } else if (tab === 'active') {
      list = [...list].sort((a, b) => b.volume - a.volume).slice(0, 50)
    }

    if (search.trim()) {
      const q = search.toUpperCase().trim()
      list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    }

    return list
  }, [quotes, search, tab])

  return (
    <div className="card">
      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setSearch('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              style={tab === t.value
                ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }
              }
              onMouseEnter={e => {
                if (tab !== t.value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (tab !== t.value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto w-full sm:w-52">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name..."
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs
                       focus:outline-none transition-colors border"
            style={{
              backgroundColor: 'var(--bg-hover)',
              borderColor:     'var(--bg-border)',
              color:           'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {!loading && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} {tab === 'all' ? 'of ' + quotes.length : ''} symbols
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
              {['Symbol', 'Name', 'Price', 'Change', '% Change', 'Volume', 'High', 'Low'].map(col => (
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
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="py-2.5 px-2">
                      <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {search ? `No symbols matching "${search}"` : 'No data available'}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 200).map(q => {
                const color = getChangeColor(q.change)
                return (
                  <tr
                    key={q.symbol}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}
                  >
                    <td className="py-2 px-2">
                      <Link
                        href={`/stocks/${q.symbol}`}
                        className="font-semibold hover:underline transition-colors"
                        style={{ color: '#FEA500' }}
                      >
                        {q.symbol}
                      </Link>
                    </td>
                    <td className="py-2 px-2 max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {q.name}
                    </td>
                    <td className="py-2 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatPrice(q.price)}
                    </td>
                    <td className={`py-2 px-2 font-number ${color}`}>{formatChange(q.change)}</td>
                    <td className={`py-2 px-2 font-number font-semibold ${color}`}>
                      {formatPercent(q.changePct / 100)}
                    </td>
                    <td className="py-2 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                      {formatVolume(q.volume)}
                    </td>
                    <td className="py-2 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(q.high)}
                    </td>
                    <td className="py-2 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(q.low)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Refreshes every 5 minutes · Powered by Capital Stake
        </p>
      </div>
    </div>
  )
}
