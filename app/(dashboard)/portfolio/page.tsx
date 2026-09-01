'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Briefcase, TrendingUp, TrendingDown, Plus, Trash2, X,
  Search, Loader2, Calendar, History, ArrowDownRight, Download,
} from 'lucide-react'
import { formatPrice, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Holding {
  id: string
  symbol: string
  quantity: number
  avg_buy_price: number
  updated_at: string
  portfolio_id?: string
}

interface EnrichedHolding extends Holding {
  name: string
  ltp: number
  prevClose: number
  average_price: number
  indexKeys?: string[]
}

interface Transaction {
  id: string
  symbol: string
  quantity: number
  buy_price: number
  sell_price: number
  commission: number
  sold_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPKR(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `Rs ${(n / 1_000).toFixed(1)}K`
  return `Rs ${n.toFixed(2)}`
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Add Stock Modal ──────────────────────────────────────────────────────────

interface AddModalProps {
  quotes: StockQuote[]
  onClose: () => void
  onAdd: (symbol: string, qty: number, price: number, commission: number) => Promise<void>
}

function AddModal({ quotes, onClose, onAdd }: AddModalProps) {
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<StockQuote | null>(null)
  const [qty,           setQty]           = useState('')
  const [price,         setPrice]         = useState('')
  const [commissionPct, setCommissionPct] = useState('0.15')
  const [saving,        setSaving]        = useState(false)
  const [err,           setErr]           = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = search.length >= 1
    ? quotes.filter(q =>
        q.symbol.toLowerCase().includes(search.toLowerCase()) ||
        q.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []

  function selectStock(q: StockQuote) {
    setSelected(q); setSearch(q.symbol)
    setPrice(q.price > 0 ? q.price.toFixed(2) : '')
  }

  const preview = useMemo(() => {
    const q = parseFloat(qty), p = parseFloat(price), pct = parseFloat(commissionPct) || 0
    if (!q || q <= 0 || !p || p <= 0) return null
    const investment = q * p
    const commRs = investment * (pct / 100)
    const total = investment + commRs
    return { investment, commissionPct: pct, commissionRs: commRs, total, effectivePrice: total / q }
  }, [qty, price, commissionPct])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setErr('Please select a stock'); return }
    const qtyN = parseFloat(qty), priceN = parseFloat(price)
    const pctN = parseFloat(commissionPct) || 0
    const commN = qtyN * priceN * (pctN / 100)
    if (!qtyN || qtyN <= 0)     { setErr('Enter a valid quantity'); return }
    if (!priceN || priceN <= 0) { setErr('Enter a valid purchase price'); return }
    setSaving(true); setErr('')
    try { await onAdd(selected.symbol, qtyN, priceN, commN); onClose() }
    catch (e: any) { setErr(e.message ?? 'Failed to add holding'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-md"
           style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
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
                   style={{ color: 'var(--text-muted)' }}>Stock</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }} />
              <input ref={inputRef} value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }}
                placeholder="Search symbol or company…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            </div>
            {filtered.length > 0 && !selected && (
              <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
                   style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
                {filtered.map(q => (
                  <button key={q.symbol} type="button" onClick={() => selectStock(q)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:opacity-80"
                    style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    <span className="flex items-center gap-1">
                      <span className="font-bold" style={{ color: '#FEA500' }}>{q.symbol}</span>
                      {isKMI(q.indexKeys, q.symbol) && <KMIBadge />}
                      <span className="ml-1 truncate max-w-[180px] inline-block align-bottom"
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

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                     style={{ color: 'var(--text-muted)' }}>Quantity (shares)</label>
              <input type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none font-number"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                     style={{ color: 'var(--text-muted)' }}>Buy Price (Rs/share)</label>
              <input type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 265.00"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none font-number"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              {selected && selected.price > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  LTP: <span className="font-number font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPrice(selected.price)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Commission % */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                   style={{ color: 'var(--text-muted)' }}>
              Commission / Brokerage (%) <span style={{ fontWeight: 400 }}>— default 0.15%</span>
            </label>
            <div className="relative">
              <input type="number" min="0" max="5" step="0.01" value={commissionPct}
                onChange={e => setCommissionPct(e.target.value)}
                placeholder="e.g. 0.15"
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg outline-none font-number"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                    style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          {/* Preview */}
          {preview && (
            <div className="rounded-lg px-3 py-2.5 text-xs space-y-1.5"
                 style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Investment</span>
                <span className="font-number" style={{ color: 'var(--text-primary)' }}>{fmtPKR(preview.investment)}</span>
              </div>
              {preview.commissionRs > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Commission ({preview.commissionPct}%)</span>
                  <span className="font-number" style={{ color: '#dc2626' }}>+ {fmtPKR(preview.commissionRs)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total Cost</span>
                <span className="font-number font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPKR(preview.total)}</span>
              </div>
              {preview.commissionRs > 0 && (
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Effective avg: <span className="font-number" style={{ color: 'var(--text-primary)' }}>Rs {preview.effectivePrice.toFixed(2)}/share</span>
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm rounded-lg font-medium"
              style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
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

// ─── Sell Modal ───────────────────────────────────────────────────────────────

interface SellModalProps {
  holding: EnrichedHolding
  onClose: () => void
  onSell: (holdingId: string, qty: number, sellPrice: number, commission: number) => Promise<void>
}

function SellModal({ holding, onClose, onSell }: SellModalProps) {
  const [qty,           setQty]           = useState(String(holding.quantity))
  const [sellPrice,     setSellPrice]     = useState(holding.ltp > 0 ? holding.ltp.toFixed(2) : '')
  const [commissionPct, setCommissionPct] = useState('0.15')
  const [saving,        setSaving]        = useState(false)
  const [err,           setErr]           = useState('')

  const preview = useMemo(() => {
    const q = parseFloat(qty), sp = parseFloat(sellPrice), pct = parseFloat(commissionPct) || 0
    if (!q || q <= 0 || !sp || sp <= 0) return null
    const cost        = q * holding.average_price
    const commRs      = q * sp * (pct / 100)
    const proceeds    = q * sp - commRs
    const realizedPnl = proceeds - cost
    const returnPct   = cost > 0 ? (realizedPnl / cost) * 100 : 0
    return { cost, proceeds, commissionPct: pct, commissionRs: commRs, realizedPnl, returnPct }
  }, [qty, sellPrice, commissionPct, holding.average_price])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qtyN = parseFloat(qty), spN = parseFloat(sellPrice)
    const pctN = parseFloat(commissionPct) || 0
    const commN = qtyN * spN * (pctN / 100)
    if (!qtyN || qtyN <= 0)              { setErr('Enter a valid quantity'); return }
    if (qtyN > holding.quantity)         { setErr(`Max quantity is ${holding.quantity}`); return }
    if (!spN || spN <= 0)               { setErr('Enter a valid sell price'); return }
    setSaving(true); setErr('')
    try { await onSell(holding.id, qtyN, spN, commN); onClose() }
    catch (e: any) { setErr(e.message ?? 'Failed to record sale'); setSaving(false) }
  }

  const isProfit = (preview?.realizedPnl ?? 0) >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-md"
           style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Sell {holding.symbol}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {holding.name} · Held: {holding.quantity.toLocaleString()} shares · Avg: Rs {holding.average_price.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Qty + Sell Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                     style={{ color: 'var(--text-muted)' }}>
                Quantity to Sell <span style={{ fontWeight: 400 }}>(max {holding.quantity.toLocaleString()})</span>
              </label>
              <input type="number" min="1" max={holding.quantity} step="1"
                value={qty} onChange={e => setQty(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none font-number"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                     style={{ color: 'var(--text-muted)' }}>Sell Price (Rs/share)</label>
              <input type="number" min="0.01" step="0.01"
                value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none font-number"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              {holding.ltp > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  LTP: <span className="font-number font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPrice(holding.ltp)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Commission % */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                   style={{ color: 'var(--text-muted)' }}>
              Commission / Brokerage (%) <span style={{ fontWeight: 400 }}>— default 0.15%</span>
            </label>
            <div className="relative">
              <input type="number" min="0" max="5" step="0.01"
                value={commissionPct} onChange={e => setCommissionPct(e.target.value)}
                placeholder="e.g. 0.15"
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg outline-none font-number"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                    style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          {/* P&L preview */}
          {preview && (
            <div className="rounded-lg px-3 py-2.5 text-xs space-y-1.5"
                 style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Cost Basis</span>
                <span className="font-number" style={{ color: 'var(--text-primary)' }}>{fmtPKR(preview.cost)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Gross Proceeds</span>
                <span className="font-number" style={{ color: 'var(--text-primary)' }}>{fmtPKR(parseFloat(qty) * parseFloat(sellPrice))}</span>
              </div>
              {preview.commissionRs > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Commission ({preview.commissionPct}%)</span>
                  <span className="font-number" style={{ color: '#dc2626' }}>− {fmtPKR(preview.commissionRs)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-semibold" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <span style={{ color: 'var(--text-primary)' }}>Realized P&L</span>
                <span className="font-number font-bold" style={{ color: isProfit ? '#16a34a' : '#dc2626' }}>
                  {isProfit ? '+' : ''}{fmtPKR(preview.realizedPnl)}
                  <span className="ml-1 text-[10px] font-normal">
                    ({isProfit ? '+' : ''}{preview.returnPct.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm rounded-lg font-medium"
              style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 text-sm rounded-lg font-semibold flex items-center justify-center gap-2 text-white"
              style={{ backgroundColor: saving ? '#6b7280' : '#dc2626' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <ArrowDownRight size={13} />}
              {saving ? 'Recording…' : 'Confirm Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'holdings' | 'history'

export default function PortfolioPage() {
  const [holdings,      setHoldings]      = useState<EnrichedHolding[]>([])
  const [transactions,  setTransactions]  = useState<Transaction[]>([])
  const [quotes,        setQuotes]        = useState<StockQuote[]>([])
  const [kse100Chg,     setKse100Chg]     = useState<number | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [histLoading,   setHistLoading]   = useState(false)
  const [error,         setError]         = useState('')
  const [activeTab,     setActiveTab]     = useState<Tab>('holdings')
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [sellHolding,   setSellHolding]   = useState<EnrichedHolding | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const portfolioIdRef = useRef<string | null>(null)

  const enrich = useCallback((raw: Holding[], qs: StockQuote[]): EnrichedHolding[] => {
    const map = Object.fromEntries(qs.map(q => [q.symbol, q]))
    return raw.map(h => ({
      ...h,
      name:          map[h.symbol]?.name      ?? h.symbol,
      ltp:           map[h.symbol]?.price     ?? 0,
      prevClose:     map[h.symbol]?.lastClose ?? 0,
      average_price: h.avg_buy_price,
      indexKeys:     map[h.symbol]?.indexKeys,
    }))
  }, [])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const [portRes, quotesJson, indicesJson] = await Promise.all([
        fetch('/api/portfolio'),
        cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000),
        cachedFetch<{ indices: { id: string; changePct: number }[] }>('/api/market/indices', 5 * 60_000).catch(() => ({ indices: [] })),
      ])
      const kse100 = indicesJson.indices?.find((i: any) => i.key === 'KSE100')
      if (kse100) setKse100Chg(kse100.changePct)
      if (!portRes.ok) throw new Error('Failed to load portfolio')
      const portJson = await portRes.json()
      const rawHoldings: Holding[]  = portJson.data?.holdings ?? []
      const allQuotes: StockQuote[] = quotesJson.quotes ?? []

      // Stash portfolio_id for sell flow
      if (portJson.data?.portfolios?.[0]?.id) {
        portfolioIdRef.current = portJson.data.portfolios[0].id
      }

      // Also attach portfolio_id to each holding
      const enrichedRaw = rawHoldings.map(h => ({
        ...h,
        portfolio_id: portJson.data?.portfolios?.find(
          (p: any) => p.portfolio_holdings?.some((ph: any) => ph.id === h.id)
        )?.id ?? portfolioIdRef.current ?? '',
      }))

      setQuotes(allQuotes)
      setHoldings(enrich(enrichedRaw, allQuotes))
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    setHistLoading(true)
    try {
      const res = await fetch('/api/portfolio/history')
      if (!res.ok) return
      const json = await res.json()
      setTransactions(json.transactions ?? [])
    } finally {
      setHistLoading(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'history' && transactions.length === 0) loadHistory()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(symbol: string, qty: number, price: number, commission: number) {
    const effectivePrice = commission > 0 ? (qty * price + commission) / qty : price
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, quantity: qty, averagePrice: effectivePrice }),
    })
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed to add holding') }
    await loadData()
  }

  async function handleSell(holdingId: string, qty: number, sellPrice: number, commission: number) {
    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) throw new Error('Holding not found')
    const portfolioId = holding.portfolio_id || portfolioIdRef.current || ''
    const res = await fetch('/api/portfolio/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holdingId,
        symbol:      holding.symbol,
        quantity:    qty,
        buyPrice:    holding.average_price,
        sellPrice,
        commission,
        portfolioId,
      }),
    })
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed to record sale') }
    // Refresh both tabs
    await loadData()
    setTransactions([]) // force history reload on next tab switch
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
    } finally { setDeleting(null) }
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = holdings.reduce((acc, h) => {
    const cost   = h.quantity * h.average_price
    const mktVal = h.quantity * h.ltp
    const today  = h.quantity * (h.ltp - h.prevClose)
    return { cost: acc.cost + cost, value: acc.value + mktVal, todayPnl: acc.todayPnl + today }
  }, { cost: 0, value: 0, todayPnl: 0 })

  const totalPnl    = totals.value - totals.cost
  const totalPnlPct = totals.cost > 0 ? (totalPnl / totals.cost) * 100 : 0
  const isUp        = totalPnl >= 0
  const todayIsUp   = totals.todayPnl >= 0

  // Realized P&L from history
  const realizedPnl = transactions.reduce((sum, t) => {
    return sum + (t.quantity * t.sell_price - t.commission) - (t.quantity * t.buy_price)
  }, 0)

  return (
    <div className="space-y-5 animate-data">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Portfolio</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track your PSX holdings &amp; P&amp;L</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: '#FEA500', color: '#000' }}>
          <Plus size={13} /> Add Stock
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
          { label: 'Market Value', value: fmtPKR(totals.value),                              color: 'var(--text-primary)', sub: null },
          { label: 'Cost Basis',   value: fmtPKR(totals.cost),                               color: 'var(--text-primary)', sub: null },
          { label: 'Total P&L',    value: (isUp?'+':'')+fmtPKR(totalPnl),                   color: isUp?'#16a34a':'#dc2626', sub: `${isUp?'+':''}${totalPnlPct.toFixed(2)}%` },
          { label: "Today P&L",    value: (todayIsUp?'+':'')+fmtPKR(totals.todayPnl),        color: todayIsUp?'#16a34a':'#dc2626', sub: null },
        ].map(c => (
          <div key={c.label} className="card">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            {loading
              ? <div className="h-5 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
              : <>
                  <p className="text-lg font-bold font-number" style={{ color: c.color }}>{c.value}</p>
                  {c.sub && <p className="text-xs font-number mt-0.5" style={{ color: c.color }}>{c.sub}</p>}
                </>
            }
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-hover)' }}>
        {([
          { id: 'holdings', label: 'Holdings',         icon: <Briefcase size={12} /> },
          { id: 'history',  label: `History${transactions.length > 0 ? ` (${transactions.length})` : ''}`, icon: <History size={12} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={activeTab === t.id
              ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
              : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Holdings tab ── */}
      {activeTab === 'holdings' && (
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="space-y-3 p-2">
              {[1,2,3].map(i => <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />)}
            </div>
          ) : holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Briefcase size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No holdings yet</p>
              <button onClick={() => setShowAddModal(true)}
                className="text-xs px-4 py-2 rounded-lg font-semibold mt-1"
                style={{ backgroundColor: '#FEA500', color: '#000' }}>
                Add your first stock
              </button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  {['Symbol','Company','Qty','Avg Price','Investment','LTP','Mkt Value','P&L','Today P&L','vs KSE100','Return','Added',''].map(col => (
                    <th key={col}
                        className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--text-muted)' }}>{col}</th>
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
                  const up       = pnl >= 0, todayUp = todayPnl >= 0
                  const isDel    = deleting === h.id

                  return (
                    <tr key={h.id}
                        style={{ borderBottom: '1px solid var(--bg-border)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1">
                          <Link href={`/stocks/${h.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>
                            {h.symbol}
                          </Link>
                          {isKMI(h.indexKeys, h.symbol) && <KMIBadge />}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 max-w-[120px] truncate"><Link href={`/stocks/${h.symbol}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{h.name}</Link></td>
                      <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>{h.quantity.toLocaleString()}</td>
                      <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>{formatPrice(h.average_price)}</td>
                      <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtPKR(cost)}</td>
                      <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>{h.ltp > 0 ? formatPrice(h.ltp) : '—'}</td>
                      <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-primary)' }}>{h.ltp > 0 ? fmtPKR(mktVal) : '—'}</td>
                      <td className={`py-2.5 px-2 font-number font-semibold ${clr}`}>
                        {h.ltp > 0 ? `${up?'+':''}${fmtPKR(pnl)}` : '—'}
                      </td>
                      <td className={`py-2.5 px-2 font-number font-semibold ${todayUp ? 'text-green-600' : 'text-red-500'}`}>
                        {h.ltp > 0 && h.prevClose > 0 ? `${todayUp?'+':''}${fmtPKR(todayPnl)}` : '—'}
                      </td>
                      <td className="py-2.5 px-2 font-number text-xs">
                        {h.ltp > 0 && h.prevClose > 0 && kse100Chg !== null ? (() => {
                          const stockChgPct = ((h.ltp - h.prevClose) / h.prevClose) * 100
                          const diff = stockChgPct - kse100Chg
                          const better = diff >= 0
                          return (
                            <span className="flex items-center gap-0.5 font-semibold"
                                  style={{ color: better ? '#16a34a' : '#dc2626' }}>
                              {better ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                              {better?'+':''}{diff.toFixed(2)}%
                            </span>
                          )
                        })() : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className={`py-2.5 px-2 font-number ${clr}`}>
                        {h.ltp > 0
                          ? <span className="flex items-center gap-1">
                              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {up?'+':''}{pnlPct.toFixed(2)}%
                            </span>
                          : '—'}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {fmtDate(h.updated_at)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSellHolding(h)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
                            style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
                            title="Sell">
                            Sell
                          </button>
                          <button onClick={() => handleDelete(h.id)} disabled={isDel}
                            className="p-1 rounded hover:opacity-70 disabled:opacity-30"
                            title="Remove holding">
                            {isDel
                              ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                              : <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div className="card overflow-x-auto">
          {histLoading ? (
            <div className="space-y-3 p-2">
              {[1,2,3].map(i => <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <History size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No sold stocks yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Click <strong>Sell</strong> on any holding to record a sale
              </p>
            </div>
          ) : (
            <>
              {/* Realized P&L summary */}
              <div className="flex items-center justify-between mb-4 pb-3"
                   style={{ borderBottom: '1px solid var(--bg-border)' }}>
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {transactions.length} trade{transactions.length !== 1 ? 's' : ''} recorded
                  </p>
                  <button
                    onClick={() => {
                      const headers = ['Symbol','Qty Sold','Buy Price','Sell Price','Commission (Rs)','Realized P&L','Return %','Sold On']
                      const rows = transactions.map(t => {
                        const realized = (t.quantity * t.sell_price - t.commission) - (t.quantity * t.buy_price)
                        const retPct = t.quantity * t.buy_price > 0 ? (realized / (t.quantity * t.buy_price) * 100).toFixed(2) : '0'
                        return [t.symbol, t.quantity, t.buy_price.toFixed(2), t.sell_price.toFixed(2), t.commission.toFixed(2), realized.toFixed(2), retPct, fmtDate(t.sold_at)]
                      })
                      const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url; a.download = 'portfolio_history.csv'; a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                    <Download size={11} /> Export CSV
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Realized P&L</p>
                  <p className="text-base font-bold font-number" style={{ color: realizedPnl >= 0 ? '#16a34a' : '#dc2626' }}>
                    {realizedPnl >= 0 ? '+' : ''}{fmtPKR(realizedPnl)}
                  </p>
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    {['Symbol','Qty Sold','Buy Price','Sell Price','Commission','Realized P&L','Return','Sold On'].map(col => (
                      <th key={col}
                          className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const realized  = (t.quantity * t.sell_price - t.commission) - (t.quantity * t.buy_price)
                    const returnPct = t.quantity * t.buy_price > 0
                      ? (realized / (t.quantity * t.buy_price)) * 100 : 0
                    const isProfit  = realized >= 0

                    return (
                      <tr key={t.id}
                          style={{ borderBottom: '1px solid var(--bg-border)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                        <td className="py-2.5 px-2">
                          <Link href={`/stocks/${t.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>
                            {t.symbol}
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                          {t.quantity.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                          {formatPrice(t.buy_price)}
                        </td>
                        <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatPrice(t.sell_price)}
                        </td>
                        <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-muted)' }}>
                          {t.commission > 0 ? fmtPKR(t.commission) : '—'}
                        </td>
                        <td className={`py-2.5 px-2 font-number font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                          {isProfit ? '+' : ''}{fmtPKR(realized)}
                        </td>
                        <td className={`py-2.5 px-2 font-number ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="flex items-center gap-1">
                            {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {isProfit ? '+' : ''}{returnPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {fmtDate(t.sold_at)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddModal quotes={quotes} onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
      {sellHolding && (
        <SellModal holding={sellHolding} onClose={() => setSellHolding(null)} onSell={handleSell} />
      )}
    </div>
  )
}
