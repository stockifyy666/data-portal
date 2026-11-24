'use client'

// Insider transactions for one company. Data comes from /api/stock/[symbol]/insider,
// which reads the stored insider table (synced Mon–Fri 5 PM PKT) — no Capital Stake call.

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Repeat, Gift, Inbox, Users } from 'lucide-react'
import { SectionHeading, LoadingRows } from '../stock-detail-helpers'

type Txn = {
  id: string; date: string; type: string; noticeDate: string
  name: string; role: string; price: number; shares: number; market: string
}
type Filter = 'all' | 'buy' | 'sell' | 'other'

const nf = new Intl.NumberFormat('en-US')
const pf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
  if (t === 'buy') return 'Buy'
  if (t === 'sell') return 'Sell'
  if (t === 'esos') return 'ESOS'
  return t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
}

function TypeBadge({ type }: { type: string }) {
  const style =
    type === 'buy'  ? { color: '#16a34a', background: 'rgba(22,163,74,.12)' } :
    type === 'sell' ? { color: '#dc2626', background: 'rgba(220,38,38,.12)' } :
                      { color: 'var(--text-secondary)', background: 'var(--bg-hover)' }
  const Icon = type === 'buy' ? ArrowUpRight : type === 'sell' ? ArrowDownRight : Repeat
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap" style={style}>
      <Icon size={11} /> {typeLabel(type)}
    </span>
  )
}

export function StockInsiderTab({ symbol }: { symbol: string }) {
  const [rows,    setRows]    = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [filter,  setFilter]  = useState<Filter>('all')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/stock/${encodeURIComponent(symbol)}/insider`)
      .then(r => r.json())
      .then(j => { if (alive) { setRows(Array.isArray(j.data) ? j.data : []); setError(Boolean(j.error)) } })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [symbol])

  const s = useMemo(() => {
    let buy = 0, sell = 0, nBuy = 0, nSell = 0, nOther = 0, otherSh = 0
    const people = new Set<string>()
    for (const r of rows) {
      people.add(r.name)
      const v = r.price * r.shares
      if (r.type === 'buy')       { buy += v;  nBuy++ }
      else if (r.type === 'sell') { sell += v; nSell++ }
      else                        { nOther++;  otherSh += r.shares }
    }
    return { buy, sell, nBuy, nSell, nOther, otherSh, people: people.size, net: buy - sell }
  }, [rows])

  const shown = useMemo(() => rows.filter(r =>
    filter === 'all'  ? true :
    filter === 'buy'  ? r.type === 'buy' :
    filter === 'sell' ? r.type === 'sell' :
    r.type !== 'buy' && r.type !== 'sell'), [rows, filter])

  const signed = (v: number) => `${v >= 0 ? '+' : '−'}${fmtValue(Math.abs(v))}`

  const CARDS: { id: Filter; label: string; value: string; sub: string; accent: string; Icon: typeof Repeat }[] = [
    { id: 'all',   label: 'All transactions', Icon: Users,          accent: '#f59e0b',
      value: nf.format(rows.length), sub: `${s.people} insider${s.people === 1 ? '' : 's'} · Net ${signed(s.net)} PKR` },
    { id: 'buy',   label: 'Insider buying',   Icon: ArrowUpRight,   accent: '#10b981',
      value: `${fmtValue(s.buy)} PKR`,  sub: `${s.nBuy} buy${s.nBuy === 1 ? '' : 's'}` },
    { id: 'sell',  label: 'Insider selling',  Icon: ArrowDownRight, accent: '#ef4444',
      value: `${fmtValue(s.sell)} PKR`, sub: `${s.nSell} sell${s.nSell === 1 ? '' : 's'}` },
    { id: 'other', label: 'Other',            Icon: Gift,           accent: '#06b6d4',
      value: nf.format(s.nOther),       sub: `ESOS, gifts & transfers · ${fmtValue(s.otherSh)} shares` },
  ]

  if (loading) return <div className="card"><SectionHeading>Insider Transactions</SectionHeading><LoadingRows n={8} /></div>

  if (!rows.length) {
    return (
      <div className="card py-14 text-center" style={{ color: 'var(--text-secondary)' }}>
        <Inbox size={24} className="mx-auto mb-2 opacity-60" />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {error ? 'Insider data is not available right now' : `No insider transactions for ${symbol}`}
        </p>
        <p className="text-xs mt-1">{error ? 'Please try again in a moment.' : 'No filings by directors or major holders on record.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI cards — click to filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS.map(({ id, label, value, sub, accent, Icon }) => {
          const active = filter === id
          return (
            <button key={id} onClick={() => setFilter(active && id !== 'all' ? 'all' : id)} aria-pressed={active}
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
              <p className="text-xl font-black font-number tabular-nums mt-2 relative truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[11px] font-medium truncate relative mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-border)' }}>
              {['Date', 'Insider', 'Type', 'Shares', 'Price', 'Value (PKR)', 'Market', 'Notice'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center" style={{ color: 'var(--text-secondary)' }}>No transactions of this type.</td></tr>
            ) : shown.map(r => (
              <tr key={r.id} className="transition-colors hover:bg-[var(--bg-hover)]" style={{ borderBottom: '1px solid var(--bg-border)' }}>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.date)}</td>
                <td className="px-3 py-2.5">
                  <div className="font-medium truncate max-w-[240px]" style={{ color: 'var(--text-primary)' }} title={r.name}>{r.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{r.role}</div>
                </td>
                <td className="px-3 py-2.5"><TypeBadge type={r.type} /></td>
                <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{nf.format(r.shares)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{r.price ? pf.format(r.price) : '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>{r.price ? fmtValue(r.price * r.shares) : '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{r.market}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.noticeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Updated every working day at 5:00 PM PKT.</p>
    </div>
  )
}
