'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                             from 'next/link'
import { Search, X, ChevronDown }       from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume, getChangeColor }
  from '@/lib/utils/format'
import { cachedFetch }  from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'

const INDEX_OPTIONS = [
  { value: '',         label: 'All Indices' },
  { value: 'KSE100',  label: 'KSE-100'     },
  { value: 'KSE30',   label: 'KSE-30'      },
  { value: 'KMI30',   label: 'KMI-30'      },
  { value: 'KMIALLSHR', label: 'KMI All Share' },
  { value: 'ALLSHR',  label: 'All Share'   },
]

const SECTOR_NAMES: Record<string, string> = {
  '0801': 'Automobiles',           '0802': 'Auto Parts & Accessories',
  '0803': 'Cable & Electrical',    '0804': 'Cement',
  '0805': 'Chemical',              '0806': 'Closed-End Mutual Fund',
  '0807': 'Commercial Banks',      '0808': 'Engineering',
  '0809': 'Fertilizers',           '0810': 'Food & Personal Care',
  '0811': 'Glass & Ceramics',      '0812': 'Insurance',
  '0813': 'Investment Companies',  '0814': 'Jute',
  '0815': 'Leasing Companies',     '0816': 'Leather & Tanneries',
  '0818': 'Miscellaneous',         '0819': 'Modarbas',
  '0820': 'Oil & Gas Exploration', '0821': 'Oil & Gas Marketing',
  '0822': 'Paper & Board',         '0823': 'Pharmaceuticals',
  '0824': 'Power Generation',      '0825': 'Refinery',
  '0826': 'Sugar & Allied',        '0827': 'Synthetic & Rayon',
  '0828': 'Technology & Comm.',    '0829': 'Textile Composite',
  '0830': 'Textile Spinning',      '0831': 'Textile Weaving',
  '0832': 'Tobacco',               '0833': 'Transport',
  '0834': 'Vanaspati & Allied',    '0835': 'Woolen',
  '0836': 'REIT',                  '0837': 'ETFs',
  '0838': 'Real Estate',           '0839': 'Textile (Other)',
}

function FilterSelect({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-lg border pl-3 pr-8 py-2 text-sm
                   focus:outline-none transition-colors cursor-pointer w-full"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor:     'var(--bg-border)',
          color:           'var(--text-primary)',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
      />
    </div>
  )
}

const PAGE_SIZE = 50

export default function StockBrowser() {
  const [quotes,     setQuotes]     = useState<StockQuote[]>([])
  const [loading,    setLoading]    = useState(true)
  const [indexKey,   setIndexKey]   = useState('')
  const [sectorCode, setSectorCode] = useState('')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes')
      .then(json => { if (json.quotes) setQuotes(json.quotes) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Derive available sectors from actual data
  const sectorOptions = useMemo(() => {
    const codes = new Set(quotes.map(q => q.sector).filter(Boolean))
    return [
      { value: '', label: 'All Industries' },
      ...Array.from(codes)
        .sort((a, b) => {
          const hasA = !!SECTOR_NAMES[a]
          const hasB = !!SECTOR_NAMES[b]
          if (hasA && !hasB) return -1
          if (!hasA && hasB) return 1
          return (SECTOR_NAMES[a] ?? a).localeCompare(SECTOR_NAMES[b] ?? b)
        })
        .map(code => ({ value: code, label: SECTOR_NAMES[code] ?? code })),
    ]
  }, [quotes])

  const filtered = useMemo(() => {
    let list = quotes.filter(q => q.price > 0)

    if (indexKey)   list = list.filter(q => q.indexKeys?.includes(indexKey))
    if (sectorCode) list = list.filter(q => q.sector === sectorCode)

    if (search.trim()) {
      const q = search.toUpperCase().trim()
      list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    }

    return list
  }, [quotes, indexKey, sectorCode, search])

  // Reset page when filters/search change
  useEffect(() => { setPage(1) }, [indexKey, sectorCode, search])

  function clearFilters() {
    setIndexKey('')
    setSectorCode('')
    setSearch('')
  }

  const hasFilter  = indexKey || sectorCode || search
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const COLS = ['Symbol', 'Company', 'Price', 'Change', '% Chg', 'Volume', '52W High', '52W Low']

  return (
    <div className="card">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        {/* Index dropdown */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>
            Index
          </label>
          <FilterSelect
            value={indexKey}
            onChange={setIndexKey}
            options={INDEX_OPTIONS}
          />
        </div>

        {/* Industry / Sector dropdown */}
        <div className="flex flex-col gap-1 min-w-[190px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>
            Industry
          </label>
          <FilterSelect
            value={sectorCode}
            onChange={setSectorCode}
            options={sectorOptions}
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>
            Search
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Symbol or name…"
              className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm
                         focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor:     'var(--bg-border)',
                color:           'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Clear button */}
        <button
          onClick={clearFilters}
          disabled={!hasFilter}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     transition-colors disabled:opacity-30"
          style={hasFilter
            ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
            : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }
          }
        >
          <X size={13} />
          Clear
        </button>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} securities
          {indexKey   && ` · ${INDEX_OPTIONS.find(o => o.value === indexKey)?.label}`}
          {sectorCode && ` · ${SECTOR_NAMES[sectorCode] ?? sectorCode}`}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
              {COLS.map(col => (
                <th key={col}
                    className="text-left py-2 px-2 text-[10px] font-semibold uppercase
                               tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  {COLS.map((_, j) => (
                    <td key={j} className="py-2.5 px-2">
                      <div className="h-3 rounded animate-pulse"
                           style={{ backgroundColor: 'var(--bg-hover)' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={COLS.length}
                    className="text-center py-12 text-sm"
                    style={{ color: 'var(--text-muted)' }}>
                  No securities match the selected filters.
                </td>
              </tr>
            ) : (
              pageItems.map(q => {
                const clr = getChangeColor(q.change)
                return (
                  <tr
                    key={q.symbol}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}
                  >
                    <td className="py-2 px-2">
                      <Link href={`/stocks/${q.symbol}`}
                            className="font-bold hover:underline"
                            style={{ color: '#FEA500' }}>
                        {q.symbol}
                      </Link>
                    </td>
                    <td className="py-2 px-2 max-w-[160px] truncate"
                        style={{ color: 'var(--text-secondary)' }}>
                      {q.name}
                    </td>
                    <td className="py-2 px-2 font-number font-semibold"
                        style={{ color: 'var(--text-primary)' }}>
                      {formatPrice(q.price)}
                    </td>
                    <td className={`py-2 px-2 font-number ${clr}`}>
                      {formatChange(q.change)}
                    </td>
                    <td className={`py-2 px-2 font-number font-semibold ${clr}`}>
                      {formatPercent(q.changePct / 100)}
                    </td>
                    <td className="py-2 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>
                      {formatVolume(q.volume)}
                    </td>
                    <td className="py-2 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(q.high52)}
                    </td>
                    <td className="py-2 px-2 font-number"
                        style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(q.low52)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 pt-3 flex items-center justify-between gap-2"
             style={{ borderTop: '1px solid var(--bg-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {totalPages} · Data refreshes every 5 min
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-30"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              ← Prev
            </button>

            {(() => {
              const pages: (number | '…')[] = []
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i)
              } else {
                pages.push(1)
                if (page > 3) pages.push('…')
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
                if (page < totalPages - 2) pages.push('…')
                pages.push(totalPages)
              }
              return pages.map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className="w-7 h-7 rounded text-xs font-medium transition-colors"
                    style={page === p
                      ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                      : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }
                    }>
                    {p}
                  </button>
                )
              )
            })()}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-30"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
              Next →
            </button>
          </div>
        </div>
      )}
      {!loading && totalPages <= 1 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Data refreshes every 5 minutes · Powered by Capital Stake
          </p>
        </div>
      )}
    </div>
  )
}
