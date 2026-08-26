'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Briefcase, TrendingUp, TrendingDown, Plus, Trash2, X, Search, Loader2 } from 'lucide-react'
import { formatPrice, getChangeColor } from '@/lib/utils/format'
import type { StockQuote } from '@/types/market'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Holding {
  id: string
  symbol: string
  quantity: number
  avg_buy_price: number
  updated_at: string
}

interface EnrichedHolding extends Holding {
  name: string
  ltp: number
  prevClose: number
  average_price: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPKR(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `Rs ${(n / 1_000).toFixed(1)}K`
  return `Rs ${n.toFixed(2)}`
}

// ─── Add Stock Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  quotes: StockQuote[]
  onClose: () => void
  onAdd: (symbol: string, qty: number, price: number) => Promise<void>
}

function AddModal({ quotes, onClose, onAdd }: AddModalProps) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<StockQuote | null>(null)
  const [qty, setQty]           = useState('')
  const [price, setPrice]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = search.length >= 1
    ? quotes.filter(q =>
        q.symbol.toLowerCase().includes(search.toLowerCase()) ||
        q.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []

  function selectStock(q: StockQuote) {
    setSelected(q)
    setSearch(q.symbol)
    setPrice(q.price > 0 ? q.price.toFixed(2) : '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setErr('Please select a stock'); return }
    const qtyN   = parseFloat(qty)
    const priceN = parseFloat(price)
    if (!qtyN || qtyN <= 0)   { setErr('Enter a valid quantity'); return }
    if (!priceN || priceN <= 0) { setErr('Enter a valid purchase price'); return }
    setSaving(true); setErr('')
    try {
      await onAdd(selected.symbol, qtyN, priceN)
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to add holding')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-md"
           style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Stock to Portfolio</h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Stock search */}
          <div className="relative">
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                   style={{ color: 'var(--text-muted)' }}>
              Stock
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }}
                placeholder="Search symbol or company…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--bg-page)',
                  border: '1px solid var(--bg-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            {filtered.length > 0 && !selected && (
              <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
                   style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
                {filtered.map(q => (
                  <button
                    key={q.symbol}
                    type="button"
                    onClick={() => selectStock(q)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:opacity-80"
                    style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    <span>
                      <span className="font-bold" style={{ color: '#FEA500' }}>{q.symbol}</span>
                      <span className="ml-2 truncate max-w-[200px] inline-block align-bottom"
                            style={{ color: 'var(--text-secondary)' }}>{q.name}</span>
                    </span>
                    <span className="font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatPrice(q.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                   style={{ color: 'var(--text-muted)' }}>
              Quantity (shares)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 text-sm rounded-lg outline-none font-number"
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Purchase price */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                   style={{ color: 'var(--text-muted)' }}>
              Purchase Price (Rs)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 265.00"
              className="w-full px-3 py-2 text-sm rounded-lg outline-none font-number"
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
              }}
            />
            {selected && selected.price > 0 && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Current LTP: <span className="font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatPrice(selected.price)}
                </span>
              </p>
            )}
          </div>

          {err && (
            <p className="text-xs text-red-500">{err}</p>
          )}

          {/* Preview row */}
          {selected && qty && price && parseFloat(qty) > 0 && parseFloat(price) > 0 && (
            <div className="rounded-lg px-3 py-2 text-xs"
                 style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Total Investment</span>
                <span className="font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {fmtPKR(parseFloat(qty) * parseFloat(price))}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-secondary)',
              }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm rounded-lg font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FEA500', color: '#000' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add to Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [holdings, setHoldings]   = useState<EnrichedHolding[]>([])
  const [quotes, setQuotes]       = useState<StockQuote[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  // Build a symbol→quote lookup map
  const quoteMap = useCallback(
    (qs: StockQuote[]) => Object.fromEntries(qs.map(q => [q.symbol, q])),
    []
  )

  const enrich = useCallback((raw: Holding[], qs: StockQuote[]): EnrichedHolding[] => {
    const map = quoteMap(qs)
    return raw.map(h => {
      const q = map[h.symbol]
      return {
        ...h,
        name:         q?.name      ?? h.symbol,
        ltp:          q?.price     ?? 0,
        prevClose:    q?.lastClose ?? 0,
        average_price: h.avg_buy_price,
      }
    })
  }, [quoteMap])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const [portRes, quotesRes] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/market/quotes'),
      ])
      if (!portRes.ok) throw new Error('Failed to load portfolio')
      const portJson   = await portRes.json()
      const quotesJson = await quotesRes.json()

      const rawHoldings: Holding[] = portJson.data?.holdings ?? []
      const allQuotes: StockQuote[] = quotesJson.quotes ?? []
      setQuotes(allQuotes)
      setHoldings(enrich(rawHoldings, allQuotes))
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(symbol: string, qty: number, price: number) {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, quantity: qty, averagePrice: price }),
    })
    if (!res.ok) {
      const j = await res.json()
      throw new Error(j.error ?? 'Failed to add holding')
    }
    await loadData()
  }

  async function handleDelete(holdingId: string) {
    setDeleting(holdingId)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdingId }),
      })
      if (!res.ok) throw new Error('Failed to remove holding')
      setHoldings(prev => prev.filter(h => h.id !== holdingId))
    } finally {
      setDeleting(null)
    }
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = holdings.reduce((acc, h) => {
    const cost     = h.quantity * h.average_price
    const mktVal   = h.quantity * h.ltp
    const todayPnl = h.quantity * (h.ltp - h.prevClose)
    return { cost: acc.cost + cost, value: acc.value + mktVal, todayPnl: acc.todayPnl + todayPnl }
  }, { cost: 0, value: 0, todayPnl: 0 })

  const totalPnl    = totals.value - totals.cost
  const totalPnlPct = totals.cost > 0 ? (totalPnl / totals.cost) * 100 : 0
  const isUp        = totalPnl >= 0
  const todayIsUp   = totals.todayPnl >= 0

  return (
    <div className="space-y-5 animate-data">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Portfolio</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Track your PSX holdings &amp; P&amp;L
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: '#FEA500', color: '#000' }}>
          <Plus size={13} />
          Add Stock
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-500"
             style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)' }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Market Value', value: fmtPKR(totals.value),  sub: null,
            color: 'var(--text-primary)' },
          { label: 'Cost Basis',   value: fmtPKR(totals.cost),   sub: null,
            color: 'var(--text-primary)' },
          { label: 'Total P&L',
            value: (isUp ? '+' : '') + fmtPKR(totalPnl),
            sub: `${isUp ? '+' : ''}${totalPnlPct.toFixed(2)}%`,
            color: isUp ? '#16a34a' : '#dc2626' },
          { label: "Today P&L",
            value: (todayIsUp ? '+' : '') + fmtPKR(totals.todayPnl),
            sub: null,
            color: todayIsUp ? '#16a34a' : '#dc2626' },
        ].map(c => (
          <div key={c.label} className="card">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {c.label}
            </p>
            {loading ? (
              <div className="h-5 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
            ) : (
              <>
                <p className="text-lg font-bold font-number" style={{ color: c.color }}>{c.value}</p>
                {c.sub && <p className="text-xs font-number mt-0.5" style={{ color: c.color }}>{c.sub}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Briefcase size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No holdings yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs px-4 py-2 rounded-lg font-semibold mt-1"
              style={{ backgroundColor: '#FEA500', color: '#000' }}>
              Add your first stock
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Symbol', 'Company', 'Qty', 'Avg Price', 'Investment', 'LTP', 'Mkt Value', 'P&L', 'Today P&L', 'Return', ''].map(col => (
                  <th key={col}
                      className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const cost     = h.quantity * h.average_price
                const mktVal   = h.quantity * h.ltp
                const pnl      = mktVal - cost
                const pnlPct   = cost > 0 ? (pnl / cost) * 100 : 0
                const todayPnl = h.quantity * (h.ltp - h.prevClose)
                const clr      = getChangeColor(pnl)
                const up       = pnl >= 0
                const todayUp  = todayPnl >= 0
                const isDeleting = deleting === h.id

                return (
                  <tr key={h.id}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2.5 px-2">
                      <Link href={`/stocks/${h.symbol}`}
                            className="font-bold hover:underline"
                            style={{ color: '#FEA500' }}>
                        {h.symbol}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 max-w-[160px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {h.name}
                    </td>
                    <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                      {h.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                      {formatPrice(h.average_price)}
                    </td>
                    <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {fmtPKR(cost)}
                    </td>
                    <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {h.ltp > 0 ? formatPrice(h.ltp) : '—'}
                    </td>
                    <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-primary)' }}>
                      {h.ltp > 0 ? fmtPKR(mktVal) : '—'}
                    </td>
                    <td className={`py-2.5 px-2 font-number font-semibold ${clr}`}>
                      {h.ltp > 0 ? `${up ? '+' : ''}${fmtPKR(pnl)}` : '—'}
                    </td>
                    <td className={`py-2.5 px-2 font-number font-semibold ${todayUp ? 'text-green-600' : 'text-red-500'}`}>
                      {h.ltp > 0 && h.prevClose > 0 ? `${todayUp ? '+' : ''}${fmtPKR(todayPnl)}` : '—'}
                    </td>
                    <td className={`py-2.5 px-2 font-number ${clr}`}>
                      {h.ltp > 0 ? (
                        <span className="flex items-center gap-1">
                          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {up ? '+' : ''}{pnlPct.toFixed(2)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-2">
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={isDeleting}
                        className="p-1 rounded hover:opacity-70 disabled:opacity-30"
                        title="Remove holding">
                        {isDeleting
                          ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                          : <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                        }
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AddModal
          quotes={quotes}
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}
