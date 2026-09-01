'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                             from 'next/link'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

type SortCol = 'symbol' | 'name' | 'price' | 'change' | 'changePct' | 'volume' | 'high' | 'low'
type SortDir = 'asc' | 'desc'
import { formatPrice, formatChange, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'

type Tab = 'all' | 'gainers' | 'losers' | 'active'
const TABS: { label: string; value: Tab }[] = [
  { label: 'All Stocks',  value: 'all'     },
  { label: 'Top Gainers', value: 'gainers' },
  { label: 'Top Losers',  value: 'losers'  },
  { label: 'Most Active', value: 'active'  },
]
const PAGE_SIZE = 10

export default function DashboardQuoteTable() {
  const [quotes,  setQuotes]  = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState<Tab>('all')
  const [page,    setPage]    = useState(1)
  const [sortCol, setSortCol] = useState<SortCol>('changePct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const json = await cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
        if (!cancelled && json.quotes) setQuotes(json.quotes)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    const iv = setInterval(load, 5 * 60_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  useEffect(() => { setPage(1) }, [tab, search, sortCol, sortDir])

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = quotes.filter(q =>
      q.price > 0 &&
      !/\(R\d*\)|\bRight\b/i.test(q.name) &&
      !/R\d*$/.test(q.symbol)
    )

    if (tab === 'gainers') list = [...list].filter(s => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 100)
    else if (tab === 'losers')  list = [...list].filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 100)
    else if (tab === 'active')  list = [...list].sort((a, b) => b.volume - a.volume).slice(0, 100)

    if (search.trim()) {
      const q = search.toUpperCase().trim()
      list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    }

    // Apply column sort
    list = [...list].sort((a, b) => {
      const av = a[sortCol as keyof typeof a]
      const bv = b[sortCol as keyof typeof b]
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    return list
  }, [quotes, tab, search, sortCol, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function switchTab(t: Tab) { setTab(t); setSearch('') }

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-0.5 overflow-x-auto hide-scrollbar p-0.5 rounded-lg w-fit"
             style={{ backgroundColor: 'var(--bg-hover)' }}>
          {TABS.map(t => (
            <button key={t.value} onClick={() => switchTab(t.value)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
              style={tab === t.value
                ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto w-full sm:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name…"
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs border focus:outline-none"
            style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} {tab === 'all' ? `of ${quotes.filter(q=>q.price>0).length}` : ''} symbols
          {totalPages > 1 && ` · page ${page} of ${totalPages}`}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
              {([
                { label: 'Symbol',  col: 'symbol'    },
                { label: 'Name',    col: 'name'      },
                { label: 'Price',   col: 'price'     },
                { label: 'Change',  col: 'change'    },
                { label: '% Chg',   col: 'changePct' },
                { label: 'Volume',  col: 'volume'    },
                { label: 'High',    col: 'high'      },
                { label: 'Low',     col: 'low'       },
              ] as { label: string; col: SortCol }[]).map(({ label, col }) => {
                const active = sortCol === col
                const Icon = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
                return (
                  <th key={col}
                      onClick={() => handleSort(col)}
                      className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity"
                      style={{ color: active ? '#FEA500' : 'var(--text-muted)' }}>
                    <span className="flex items-center gap-0.5">
                      {label} <Icon size={9} />
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
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
                  {search ? `No results for "${search}"` : 'No data available'}
                </td>
              </tr>
            ) : (
              pageData.map(q => {
                const color = getChangeColor(q.change)
                return (
                  <tr key={q.symbol}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <Link href={`/stocks/${q.symbol}`}
                              className="font-bold hover:underline"
                              style={{ color: '#FEA500' }}>
                          {q.symbol}
                        </Link>
                        {isKMI(q.indexKeys, q.symbol) && <KMIBadge />}
                      </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3"
             style={{ borderTop: '1px solid var(--bg-border)' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors border"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
            <ChevronLeft size={13} /> Prev
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show first, last, current ±2, with ellipsis
              let pg: number | null = null
              if (totalPages <= 7) pg = i + 1
              else if (i === 0) pg = 1
              else if (i === 6) pg = totalPages
              else {
                const mid = Math.min(Math.max(page, 3), totalPages - 2)
                pg = mid - 2 + i
                if (pg <= 1 || pg >= totalPages) pg = null
              }
              if (!pg) return <span key={i} className="px-1 text-xs self-center" style={{ color: 'var(--text-muted)' }}>…</span>
              return (
                <button key={pg} onClick={() => setPage(pg!)}
                  className="w-7 h-7 rounded-md text-xs font-semibold transition-colors"
                  style={page === pg
                    ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                    : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                  {pg}
                </button>
              )
            })}
          </div>

          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors border"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
