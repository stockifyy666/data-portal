'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Search, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Repeat, Inbox, Gift,
} from 'lucide-react'

type Txn = {
  id: string; date: string; type: string; noticeDate: string
  symbol: string; company: string; name: string; role: string
  price: number; shares: number; market: string
}

type TypeFilter = 'all' | 'buy' | 'sell' | 'other'

const nf  = new Intl.NumberFormat('en-US')
const pf  = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(s: string) {
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtValue(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return pf.format(v)
}

function typeLabel(t: string) {
  if (t === 'buy')  return 'Buy'
  if (t === 'sell') return 'Sell'
  if (t === 'esos') return 'ESOS'
  return t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
}

function TypeBadge({ type }: { type: string }) {
  const style =
    type === 'buy'  ? { color: 'var(--color-up, #16a34a)',   background: 'rgba(22,163,74,.12)' } :
    type === 'sell' ? { color: 'var(--color-down, #dc2626)', background: 'rgba(220,38,38,.12)' } :
                      { color: 'var(--text-secondary)',      background: 'var(--bg-hover)' }
  const Icon = type === 'buy' ? ArrowUpRight : type === 'sell' ? ArrowDownRight : Repeat
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap" style={style}>
      <Icon size={11} /> {typeLabel(type)}
    </span>
  )
}

export default function InsiderPage() {
  const [rows,    setRows]    = useState<Txn[]>([])
  const [page,    setPage]    = useState(1)
  const [pages,   setPages]   = useState(1)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [query,   setQuery]   = useState('')
  const [type,    setType]    = useState<TypeFilter>('all')
  const [reload,  setReload]  = useState(0)

  // Search runs on the server across ALL stored records (debounced)
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/market/insider?page=${page}&q=${encodeURIComponent(search)}`, { signal: AbortSignal.timeout(20_000) })
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        setRows(Array.isArray(j.data) ? j.data : [])
        setPages(j.pages || 1)
        setTotal(j.total || 0)
        setError(Boolean(j.error))
      })
      .catch(() => { if (alive) { setRows([]); setError(true) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [page, search, reload])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (type === 'buy'   && r.type !== 'buy')  return false
      if (type === 'sell'  && r.type !== 'sell') return false
      if (type === 'other' && (r.type === 'buy' || r.type === 'sell')) return false
      return true
    })
  }, [rows, type])

  // Value totals for the rows on this page (type filter not applied, so the cards stay meaningful while filtering)
  const summary = useMemo(() => {
    let buy = 0, sell = 0, other = 0, nBuy = 0, nSell = 0, nOther = 0, n = 0
    for (const r of rows) {
      n++
      const v = r.price * r.shares
      if (r.type === 'buy')       { buy += v;   nBuy++ }
      else if (r.type === 'sell') { sell += v;  nSell++ }
      else                        { other += r.shares; nOther++ }
    }
    return { buy, sell, other, nBuy, nSell, nOther, count: n, all: buy + sell }
  }, [rows])

  const net       = summary.buy - summary.sell
  const signed    = (v: number) => `${v >= 0 ? '+' : '−'}${fmtValue(Math.abs(v))}`
  const plural    = (n: number, w: string) => `${nf.format(n)} ${w}${n === 1 ? '' : 's'}`

  // Same card style as the Shareholders tab KPIs; hex accents so the alpha suffixes work
  const CARDS: { id: TypeFilter; label: string; value: string; sub: string; accent: string; Icon: typeof Repeat }[] = [
    { id: 'all',   label: 'All transactions', Icon: Repeat,         accent: '#f59e0b',
      value: nf.format(total || summary.count),
      sub:   `Value ${fmtValue(summary.all)} PKR · Net ${signed(net)}` },
    { id: 'buy',   label: 'Insider buying',   Icon: ArrowUpRight,   accent: '#10b981',
      value: `${fmtValue(summary.buy)} PKR`,
      sub:   `${plural(summary.nBuy, 'buy')} · avg ${summary.nBuy ? fmtValue(summary.buy / summary.nBuy) : '—'}` },
    { id: 'sell',  label: 'Insider selling',  Icon: ArrowDownRight, accent: '#ef4444',
      value: `${fmtValue(summary.sell)} PKR`,
      sub:   `${plural(summary.nSell, 'sell')} · avg ${summary.nSell ? fmtValue(summary.sell / summary.nSell) : '—'}` },
    { id: 'other', label: 'Other',            Icon: Gift,           accent: '#06b6d4',
      value: nf.format(summary.nOther),
      sub:   `ESOS, gifts & transfers · ${fmtValue(summary.other)} shares` },
  ]

  const FILTERS: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'buy', label: 'Buys' },
    { id: 'sell', label: 'Sells' }, { id: 'other', label: 'Other' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="py-5 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Insider Transactions</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Trades by directors, executives &amp; substantial shareholders
            </p>
          </div>
          <button onClick={() => setReload(n => n + 1)} disabled={loading} aria-label="Refresh"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium shrink-0"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Search + type filter */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search symbol, company or insider…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setType(f.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={type === f.id
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards — Shareholders-tab style; click to filter the table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {CARDS.map(({ id, label, value, sub, accent, Icon }) => {
          const active = type === id
          return (
            <button key={id} onClick={() => setType(active && id !== 'all' ? 'all' : id)} aria-pressed={active}
              className="text-left rounded-xl p-3.5 relative overflow-hidden min-w-0 transition-all hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`,
                border:     `1px solid ${active ? accent : `${accent}40`}`,
                boxShadow:  active ? `0 0 0 3px ${accent}26` : 'none',
              }}>
              <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full" style={{ background: `${accent}22` }} />
              <div className="flex items-center gap-1.5 relative">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${accent}2e`, color: accent }}>
                  <Icon size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              {loading ? (
                <>
                  <div className="h-6 w-24 rounded animate-pulse mt-2" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-3 w-32 rounded animate-pulse mt-1.5" style={{ backgroundColor: 'var(--bg-hover)' }} />
                </>
              ) : (
                <>
                  <p className="text-xl font-black font-number tabular-nums mt-2 relative truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[11px] font-medium truncate relative mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card !p-0 mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-border)' }}>
              {['Date', 'Symbol', 'Insider', 'Type', 'Shares', 'Price', 'Value (PKR)', 'Market', 'Notice'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${i >= 4 && i <= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td colSpan={9} className="px-3 py-3">
                    <div className="h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-14 text-center" style={{ color: 'var(--text-secondary)' }}>
                  <Inbox size={22} className="mx-auto mb-2 opacity-60" />
                  {error ? 'Insider data is not available right now. Please try again.' : 'No transactions match your filters on this page.'}
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="transition-colors hover:bg-[var(--bg-hover)]" style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.date)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/stocks/${r.symbol}`} prefetch={false} className="font-bold hover:underline" style={{ color: '#FEA500' }}>
                      {r.symbol}
                    </Link>
                    <div className="text-[11px] truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }} title={r.company}>{r.company}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }} title={r.name}>{r.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{r.role}</div>
                  </td>
                  <td className="px-3 py-2.5"><TypeBadge type={r.type} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{nf.format(r.shares)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{r.price ? pf.format(r.price) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {r.price ? fmtValue(r.price * r.shares) : '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{r.market}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.noticeDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 mt-4 mb-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Page {page} of {nf.format(pages)}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={loading || page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <ChevronLeft size={13} /> Prev
          </button>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={loading || page >= pages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
