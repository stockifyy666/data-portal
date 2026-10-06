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
  sector?: string
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

// ─── Sector helpers ───────────────────────────────────────────────────────────

const SECTOR_MAP: Record<string,string> = {
  '0801':'Automobiles','0802':'Auto Parts','0803':'Cable & Elec.','0804':'Cement',
  '0805':'Chemical','0806':'Closed-End MF','0807':'Commercial Banks','0808':'Engineering',
  '0809':'Fertilizers','0810':'Food & Personal Care','0811':'Glass & Ceramics',
  '0812':'Insurance','0813':'Inv. Companies','0818':'Miscellaneous','0819':'Modarbas',
  '0820':'Oil & Gas Expl.','0821':'Oil & Gas Mktg.','0822':'Paper & Board',
  '0823':'Pharmaceuticals','0824':'Power Generation','0825':'Refinery',
  '0826':'Sugar & Allied','0827':'Synthetic & Rayon','0828':'Technology',
  '0829':'Textile Composite','0830':'Textile Spinning','0831':'Textile Weaving',
  '0832':'Tobacco','0833':'Transport','0836':'REIT','0837':'ETFs','0838':'Real Estate',
}
function getSectorName(code?: string) { return code ? (SECTOR_MAP[code] ?? `Sector ${code}`) : 'Other' }

function buildSectors(holdings: EnrichedHolding[]) {
  const map: Record<string,{ name:string; holdings:EnrichedHolding[]; value:number; pnl:number }> = {}
  for (const h of holdings) {
    const key = getSectorName(h.sector)
    if (!map[key]) map[key] = { name: key, holdings: [], value: 0, pnl: 0 }
    const val = h.ltp > 0 ? h.quantity * h.ltp : h.quantity * h.average_price
    const pnl = val - h.quantity * h.average_price
    map[key].holdings.push(h)
    map[key].value += val
    map[key].pnl   += pnl
  }
  return Object.values(map).filter(s => s.value > 0).sort((a,b) => b.value - a.value)
}

// ─── Premium P&L Histogram ────────────────────────────────────────────────────

function HoldingsPnlChart({ holdings }: { holdings: EnrichedHolding[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<{ x: number; w: number; h: EnrichedHolding; pnl: number; pct: number; mktVal: number }[]>([])
  const [tip, setTip] = useState<{ x: number; y: number; h: EnrichedHolding; pnl: number; pct: number; mktVal: number } | null>(null)

  const data = holdings.map(h => {
    const mktVal = h.ltp > 0 ? h.quantity * h.ltp : h.quantity * h.average_price
    const cost   = h.quantity * h.average_price
    const pnl    = mktVal - cost
    const pct    = cost > 0 ? (pnl / cost) * 100 : 0
    return { h, pnl, pct, mktVal }
  }).sort((a, b) => b.pnl - a.pnl)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const css     = getComputedStyle(document.documentElement)
    const textMut = css.getPropertyValue('--text-muted').trim()  || '#7a839e'
    const border  = css.getPropertyValue('--bg-border').trim()   || '#1e2232'
    const textPri = css.getPropertyValue('--text-primary').trim() || '#e2e8f0'

    const PAD = { top: 24, right: 20, bottom: 72, left: 72 }
    const cW   = W - PAD.left - PAD.right
    const cH   = H - PAD.top  - PAD.bottom

    const maxPnl  = Math.max(...data.map(d => d.pnl), 1)
    const minPnl  = Math.min(...data.map(d => d.pnl), -1)
    const range   = maxPnl - minPnl || 1
    const toY     = (v: number) => PAD.top + cH - ((v - minPnl) / range) * cH
    const z0      = toY(0)

    // Grid lines
    const steps = 5
    for (let i = 0; i <= steps; i++) {
      const v = minPnl + (range / steps) * i
      const y = toY(v)
      ctx.strokeStyle = border; ctx.lineWidth = 0.5; ctx.setLineDash([3, 4])
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      ctx.setLineDash([])
      const lbl = Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
                : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v.toFixed(0)
      ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      ctx.fillText(lbl, PAD.left - 6, y)
    }

    // Zero line
    ctx.strokeStyle = 'rgba(254,165,0,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(PAD.left, z0); ctx.lineTo(W - PAD.right, z0); ctx.stroke()
    ctx.setLineDash([])

    const gW   = cW / data.length
    const bW   = Math.max(Math.min(gW * 0.62, 36), 8)
    barsRef.current = []

    data.forEach((d, i) => {
      const cx  = PAD.left + i * gW + gW / 2
      const bx  = cx - bW / 2
      const top = Math.min(toY(d.pnl), z0)
      const bh  = Math.max(Math.abs(toY(d.pnl) - z0), 1)
      const up  = d.pnl >= 0

      // Shadow glow
      ctx.save()
      ctx.shadowColor = up ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'
      ctx.shadowBlur  = 8

      // Gradient bar
      const grad = ctx.createLinearGradient(0, top, 0, top + bh)
      if (up) {
        grad.addColorStop(0, '#4ade80')
        grad.addColorStop(1, '#15803d')
      } else {
        grad.addColorStop(0, '#f87171')
        grad.addColorStop(1, '#991b1b')
      }
      ctx.fillStyle = grad
      const r = Math.min(4, bW / 2)
      ctx.beginPath()
      if (up) {
        ctx.moveTo(bx + r, top); ctx.lineTo(bx + bW - r, top)
        ctx.quadraticCurveTo(bx + bW, top, bx + bW, top + r)
        ctx.lineTo(bx + bW, top + bh); ctx.lineTo(bx, top + bh)
        ctx.lineTo(bx, top + r); ctx.quadraticCurveTo(bx, top, bx + r, top)
      } else {
        ctx.moveTo(bx, top); ctx.lineTo(bx + bW, top)
        ctx.lineTo(bx + bW, top + bh - r); ctx.quadraticCurveTo(bx + bW, top + bh, bx + bW - r, top + bh)
        ctx.lineTo(bx + r, top + bh); ctx.quadraticCurveTo(bx, top + bh, bx, top + bh - r)
        ctx.lineTo(bx, top)
      }
      ctx.closePath(); ctx.fill()
      ctx.restore()

      // Thin white highlight strip at top of bar
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(bx + 1, up ? top : top, bW - 2, 2)

      // % label — always above/below the zero line, never in the axis label zone
      const fontSize = Math.min(9, gW / 3.5)
      const pctStr   = `${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(2)}%`
      ctx.fillStyle = up ? '#4ade80' : '#f87171'
      ctx.font = `600 ${fontSize}px system-ui`
      ctx.textAlign = 'center'
      if (up) {
        // above bar top
        ctx.textBaseline = 'bottom'
        ctx.fillText(pctStr, cx, top - 3)
      } else {
        // just above zero line so it never touches the x-axis labels
        ctx.textBaseline = 'bottom'
        ctx.fillText(pctStr, cx, z0 - 4)
      }

      // X-axis label (symbol)
      ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      const label = d.h.symbol.length > 5 ? d.h.symbol.slice(0, 5) : d.h.symbol
      ctx.fillText(label, cx, H - PAD.bottom + 10)

      // Mkt val under label
      if (gW > 28) {
        const mv = d.mktVal >= 1_000_000 ? `${(d.mktVal / 1_000_000).toFixed(1)}M`
                 : d.mktVal >= 1_000 ? `${(d.mktVal / 1_000).toFixed(0)}K` : d.mktVal.toFixed(0)
        ctx.fillStyle = 'rgba(122,131,158,0.65)'; ctx.font = '8px system-ui'
        ctx.fillText(mv, cx, H - PAD.bottom + 23)
      }

      barsRef.current.push({ x: bx - 4, w: bW + 8, h: d.h, pnl: d.pnl, pct: d.pct, mktVal: d.mktVal })
    })

    // Y-axis label
    ctx.save(); ctx.translate(12, PAD.top + cH / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Unrealised P&L (PKR)', 0, 0); ctx.restore()

    // Legend
    const legItems = [
      { color: '#4ade80', label: 'Profit' },
      { color: '#f87171', label: 'Loss' },
    ]
    let lx = PAD.left
    const ly = H - 10
    legItems.forEach(({ color, label }) => {
      ctx.fillStyle = color; ctx.fillRect(lx, ly - 6, 10, 7)
      ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText(label, lx + 13, ly)
      lx += ctx.measureText(label).width + 26
    })
  }, [data])

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px   = (e.clientX - rect.left) * (e.currentTarget.offsetWidth / rect.width)
    const bar  = barsRef.current.find(b => px >= b.x && px < b.x + b.w)
    if (!bar) { setTip(null); e.currentTarget.style.cursor = 'default'; return }
    e.currentTarget.style.cursor = 'pointer'
    setTip({ ...bar, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 8 })
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={ref} onMouseMove={onMove} onMouseLeave={() => setTip(null)}
        style={{ width: '100%', height: 260, display: 'block' }} />
      {tip && (
        <div style={{
          position: 'absolute', left: tip.x, top: tip.y, pointerEvents: 'none', zIndex: 20,
          background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
          borderRadius: 10, padding: '10px 14px', fontSize: 11, lineHeight: 1.85,
          boxShadow: '0 8px 28px rgba(0,0,0,0.25)', minWidth: 190,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
            {tip.h.symbol}
            <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{tip.h.name}</span>
          </div>
          {[
            ['Unrealised P&L', `${tip.pnl >= 0 ? '+' : ''}${fmtPKR(tip.pnl)}`, tip.pnl >= 0 ? '#4ade80' : '#f87171'],
            ['Return',         `${tip.pct >= 0 ? '+' : ''}${tip.pct.toFixed(2)}%`, tip.pct >= 0 ? '#4ade80' : '#f87171'],
            ['Market Value',   fmtPKR(tip.mktVal), 'var(--text-primary)'],
            ['Qty',            tip.h.quantity.toLocaleString(), 'var(--text-secondary)'],
            ['Avg Price',      `Rs ${tip.h.average_price.toFixed(2)}`, 'var(--text-secondary)'],
            ['LTP',            tip.h.ltp > 0 ? `Rs ${tip.h.ltp.toFixed(2)}` : '—', 'var(--text-secondary)'],
          ].map(([lbl, val, color]) => (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{lbl}</span>
              <span style={{ fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sector Donut Pie Chart ───────────────────────────────────────────────────

// Full PSX sector universe — all sectors listed on Pakistan Stock Exchange
const PSX_ALL_SECTORS = [
  'Commercial Banks', 'Oil & Gas Exploration Companies', 'Cement',
  'Fertilizer', 'Power Generation & Distribution', 'Oil & Gas Marketing Companies',
  'Technology & Communication', 'Automobile Assembler', 'Pharmaceutical',
  'Steel - Alloy', 'Textile Composite', 'Chemical', 'Refinery',
  'Food & Personal Care Products', 'Engineering', 'Paper & Board',
  'Insurance', 'Glass & Ceramics', 'Cable & Electrical Goods',
  'Sugar & Allied Industries', 'Transport', 'Tobacco', 'Automobile Parts & Accessories',
  'Synthetic & Rayon', 'Leasing Companies', 'Modarabas', 'Real Estate Investment Trust',
  'Woollen', 'Jute', 'Vanaspati & Allied Industries', 'Miscellaneous',
]

const SECTOR_PALETTE = [
  '#FEA500','#3b82f6','#a855f7','#06b6d4','#f59e0b',
  '#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef',
  '#e11d48','#0891b2','#7c3aed','#059669','#dc2626',
  '#2563eb','#9333ea','#16a34a','#ca8a04','#0284c7',
  '#7e22ce','#15803d','#b45309','#0e7490','#be123c',
  '#1d4ed8',
]

function PSXSectorWheel({ holdings }: { holdings: EnrichedHolding[] }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const slicesRef  = useRef<{ a0:number; a1:number; r0:number; r1:number; name:string }[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered,  setHovered]  = useState<string | null>(null)

  const portfolioSectors = useMemo(() => buildSectors(holdings), [holdings])
  const portfolioMap = useMemo(() => {
    const m = new Map<string, typeof portfolioSectors[0]>()
    portfolioSectors.forEach(s => m.set(s.name, s))
    // also try fuzzy match: "Technology" → "Technology & Communication"
    portfolioSectors.forEach(s => {
      PSX_ALL_SECTORS.forEach(psx => {
        if (!m.has(psx) && (psx.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(psx.toLowerCase().split(' ')[0]))) {
          m.set(psx, s)
        }
      })
    })
    return m
  }, [portfolioSectors])

  const total = portfolioSectors.reduce((s, d) => s + d.value, 0)

  // Merge: PSX sectors + any portfolio sectors not in the PSX list
  const allSectors = useMemo(() => {
    const extra = portfolioSectors.filter(s => !PSX_ALL_SECTORS.some(p => portfolioMap.get(p) === s))
    return [...PSX_ALL_SECTORS, ...extra.map(e => e.name)]
  }, [portfolioSectors, portfolioMap])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const css     = getComputedStyle(document.documentElement)
    const textPri = css.getPropertyValue('--text-primary').trim()  || '#e2e8f0'
    const textMut = css.getPropertyValue('--text-muted').trim()    || '#7a839e'
    const bgCard  = css.getPropertyValue('--bg-card').trim()       || '#111827'

    // Pie sits in the centre — label zone adds padding on all sides
    const LABEL_PAD = 110
    const cx = W / 2, cy = H / 2
    const Rout  = Math.min(W, H) / 2 - LABEL_PAD
    const Rhole = Rout * 0.44

    // 3-level alternating end-radii so adjacent labels don't collide
    const LEVELS = [Rout + 32, Rout + 55, Rout + 78]

    slicesRef.current = []
    const sw = (Math.PI * 2) / allSectors.length

    allSectors.forEach((name, idx) => {
      const a     = -Math.PI / 2 + idx * sw
      const midA  = a + sw / 2
      const sec   = portfolioMap.get(name)
      const hasHolding = !!sec
      const isAct = selected === name
      const isHov = hovered  === name
      const color = SECTOR_PALETTE[idx % SECTOR_PALETTE.length]

      const push = (isAct || isHov) ? 8 : 0
      const cx2  = cx + Math.cos(midA) * push
      const cy2  = cy + Math.sin(midA) * push

      // Draw slice
      ctx.save()
      if (hasHolding) {
        ctx.shadowColor = isAct ? color + '99' : color + '44'
        ctx.shadowBlur  = isAct ? 16 : 4
      }
      ctx.beginPath()
      ctx.moveTo(cx2, cy2)
      ctx.arc(cx2, cy2, Rout, a, a + sw)
      ctx.arc(cx2, cy2, Rhole, a + sw, a, true)
      ctx.closePath()
      if (hasHolding) {
        const rg = ctx.createRadialGradient(cx2, cy2, Rhole * 0.5, cx2, cy2, Rout)
        rg.addColorStop(0, color + 'cc')
        rg.addColorStop(1, color + (isAct ? 'ff' : 'dd'))
        ctx.fillStyle = rg
      } else {
        ctx.fillStyle = isHov ? 'rgba(100,116,139,0.35)' : 'rgba(71,85,105,0.18)'
      }
      ctx.fill()
      ctx.restore()

      // Border
      ctx.strokeStyle = bgCard + 'cc'; ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx2, cy2)
      ctx.arc(cx2, cy2, Rout, a, a + sw)
      ctx.arc(cx2, cy2, Rhole, a + sw, a, true)
      ctx.closePath(); ctx.stroke()

      // Leader line + label
      const lineStart = Rout + 4
      const lineEnd   = LEVELS[idx % 3]
      const sx  = cx + Math.cos(midA) * lineStart
      const sy  = cy + Math.sin(midA) * lineStart
      const ex  = cx + Math.cos(midA) * lineEnd
      const ey  = cy + Math.sin(midA) * lineEnd
      const onRight = ex >= cx

      // Elbow: radial segment → short horizontal tick
      const TICK = 10
      const tx  = ex + (onRight ? TICK : -TICK)
      const ty  = ey

      const lineColor = hasHolding ? color : 'rgba(100,116,139,0.35)'
      ctx.strokeStyle = lineColor; ctx.lineWidth = hasHolding ? 1.2 : 0.7
      ctx.setLineDash(hasHolding ? [] : [2, 2])
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke()
      ctx.setLineDash([])

      // Label at end of tick
      const labelX = tx + (onRight ? 3 : -3)
      const short  = name.length > 20 ? name.slice(0, 19) + '…' : name
      const fsize  = hasHolding ? 8 : 7
      ctx.font = `${hasHolding ? '700' : '400'} ${fsize}px system-ui`
      ctx.fillStyle   = hasHolding ? (isAct || isHov ? color : 'var(--text-primary, #e2e8f0)') : 'rgba(100,116,139,0.6)'
      ctx.textAlign   = onRight ? 'left' : 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(short, labelX, ty)

      slicesRef.current.push({ a0: a, a1: a + sw, r0: Rhole, r1: Rout, name })
    })

    // Center hole
    ctx.beginPath(); ctx.arc(cx, cy, Rhole - 1, 0, Math.PI * 2)
    ctx.fillStyle = bgCard; ctx.fill()

    // Center text
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (selected) {
      const sec = portfolioMap.get(selected)
      const short = selected.length > 13 ? selected.slice(0, 12) + '…' : selected
      ctx.fillStyle = textMut; ctx.font = '600 8px system-ui'
      ctx.fillText(short, cx, cy - 14)
      if (sec) {
        ctx.fillStyle = textPri; ctx.font = 'bold 13px system-ui'
        const mv = sec.value >= 1_000_000 ? `${(sec.value / 1_000_000).toFixed(1)}M`
                 : sec.value >= 1_000 ? `${(sec.value / 1_000).toFixed(0)}K` : sec.value.toFixed(0)
        ctx.fillText(mv, cx, cy)
        ctx.fillStyle = sec.pnl >= 0 ? '#4ade80' : '#f87171'
        ctx.font = '600 8px system-ui'
        ctx.fillText(`${sec.pnl >= 0 ? '+' : ''}${fmtPKR(sec.pnl)}`, cx, cy + 14)
      } else {
        ctx.fillStyle = textMut; ctx.font = '9px system-ui'
        ctx.fillText('No holdings', cx, cy + 4)
      }
    } else {
      ctx.fillStyle = textMut; ctx.font = '600 9px system-ui'; ctx.fillText('PSX Sectors', cx, cy - 14)
      ctx.fillStyle = textPri; ctx.font = 'bold 13px system-ui'
      const tv = total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)}M`
               : total >= 1_000 ? `${(total / 1_000).toFixed(0)}K` : total.toFixed(0)
      ctx.fillText(tv, cx, cy)
      ctx.fillStyle = textMut; ctx.font = '8px system-ui'
      ctx.fillText(`${portfolioSectors.length} / ${allSectors.length} sectors`, cx, cy + 14)
    }
  }, [allSectors, portfolioMap, selected, hovered, total, portfolioSectors.length])

  function hitTest(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (canvas.offsetWidth  / rect.width)
    const py = (e.clientY - rect.top)  * (canvas.offsetHeight / rect.height)
    const cx = canvas.offsetWidth / 2, cy = canvas.offsetHeight / 2
    const dx = px - cx, dy = py - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    let ang = Math.atan2(dy, dx)
    if (ang < -Math.PI / 2) ang += Math.PI * 2
    return slicesRef.current.find(s => dist >= s.r0 && dist <= s.r1 + 6 && ang >= s.a0 && ang < s.a1) ?? null
  }

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const sl = hitTest(e)
    e.currentTarget.style.cursor = sl ? 'pointer' : 'default'
    setHovered(sl ? sl.name : null)
  }

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const sl = hitTest(e)
    setSelected(prev => sl ? (prev === sl.name ? null : sl.name) : null)
  }

  const selectedSec = selected ? portfolioMap.get(selected) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '520px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Wheel */}
      <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => setHovered(null)} onClick={onClick}
        style={{ width: '100%', height: 480, display: 'block', cursor: 'default' }} />

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        {/* Header */}
        {!selected ? (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Your Holdings by Sector
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              {portfolioSectors.length} of {allSectors.length} PSX sectors · click a slice to explore
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {portfolioSectors.map((sec, idx) => {
                const color = SECTOR_PALETTE[allSectors.indexOf(sec.name) % SECTOR_PALETTE.length] || SECTOR_PALETTE[idx]
                const share = total > 0 ? ((sec.value / total) * 100).toFixed(2) : '0.00'
                const up    = sec.pnl >= 0
                return (
                  <button key={sec.name} onClick={() => setSelected(prev => prev === sec.name ? null : sec.name)}
                    style={{
                      display: 'grid', gridTemplateColumns: '10px 1fr auto',
                      alignItems: 'center', gap: 8, padding: '7px 8px',
                      borderRadius: 6, border: '1px solid transparent',
                      background: 'var(--bg-hover)', cursor: 'pointer', width: '100%',
                    }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{share}% · {sec.holdings.length} stock{sec.holdings.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: up ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {up ? '+' : ''}{fmtPKR(sec.pnl)}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <button onClick={() => setSelected(null)} style={{
                fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)',
                border: '1px solid var(--bg-border)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer',
              }}>← Back</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{selected}</span>
            </div>

            {selectedSec ? (
              <>
                {/* Sector summary strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
                  {[
                    ['Market Value', fmtPKR(selectedSec.value)],
                    ['Unrealised P&L', `${selectedSec.pnl >= 0 ? '+' : ''}${fmtPKR(selectedSec.pnl)}`],
                    ['Portfolio Share', `${total > 0 ? ((selectedSec.value / total) * 100).toFixed(2) : '0.00'}%`],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: lbl === 'Unrealised P&L' ? (selectedSec.pnl >= 0 ? '#4ade80' : '#f87171') : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Holdings in this sector */}
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Holdings in this sector
                </p>
                {selectedSec.holdings.map(h => {
                  const cost  = h.quantity * h.average_price
                  const mktV  = h.ltp > 0 ? h.quantity * h.ltp : cost
                  const pnl   = mktV - cost
                  const pct   = cost > 0 ? (pnl / cost) * 100 : 0
                  const up    = pnl >= 0
                  const dayPnl = h.ltp > 0 && h.prevClose > 0 ? h.quantity * (h.ltp - h.prevClose) : null
                  return (
                    <div key={h.id} style={{
                      border: '1px solid var(--bg-border)', borderRadius: 10, padding: '10px 12px',
                      marginBottom: 6, background: 'var(--bg-hover)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <a href={`/stocks/${h.symbol}`} style={{ fontSize: 13, fontWeight: 700, color: '#FEA500', textDecoration: 'none' }}>{h.symbol}</a>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{h.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: up ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                            {up ? '+' : ''}{pct.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: 10, color: up ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                            {up ? '+' : ''}{fmtPKR(pnl)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                        {[
                          ['Mkt Val', fmtPKR(mktV)],
                          ['LTP', h.ltp > 0 ? `${h.ltp.toFixed(2)}` : '—'],
                          ['Avg', `${h.average_price.toFixed(2)}`],
                          ['Qty', h.quantity.toLocaleString()],
                        ].map(([lbl, val]) => (
                          <div key={lbl}>
                            <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {dayPnl !== null && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--bg-border)', fontSize: 9, color: 'var(--text-muted)' }}>
                          Today: <span style={{ fontWeight: 700, color: dayPnl >= 0 ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                            {dayPnl >= 0 ? '+' : ''}{fmtPKR(dayPnl)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No holdings in this sector</div>
                <div style={{ fontSize: 11 }}>You don&apos;t have any stocks from the <strong>{selected}</strong> sector in your portfolio.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sunburst: sector outer + companies inner ──────────────────────────────────

interface HitSlice {
  kind: 'sector'|'company'
  sectorName: string
  symbol?: string
  a0: number; a1: number; r0: number; r1: number
}

function HoldingsSunburst({ holdings }: { holdings: EnrichedHolding[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitsRef   = useRef<HitSlice[]>([])
  const [drill,   setDrill]   = useState<string|null>(null)
  const [tip,     setTip]     = useState<{x:number;y:number;lines:string[]}|null>(null)

  const sectors = useMemo(() => buildSectors(holdings), [holdings])
  const total   = sectors.reduce((s,d)=>s+d.value,0)
  const maxPnl  = Math.max(...sectors.map(s=>Math.abs(s.pnl)), 1)
  const active  = drill ? sectors.find(s=>s.name===drill) : null

  const GREEN = '#4abe7c'
  const RED   = '#e05252'

  function compColor(pnl:number, idx:number, count:number): string {
    const shade = count>1 ? 0.85 + 0.15*(idx/(count-1)) : 1
    if (pnl>=0) return `rgba(74,190,124,${shade})`
    return `rgba(224,82,82,${shade})`
  }
  function secColor(pnl:number): string { return pnl>=0 ? GREEN : RED }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || sectors.length===0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const gc = ctx

    const dpr = window.devicePixelRatio||1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width=W*dpr; canvas.height=H*dpr; gc.scale(dpr,dpr)
    gc.clearRect(0,0,W,H)

    const css     = getComputedStyle(document.documentElement)
    const textPri = css.getPropertyValue('--text-primary').trim()  || '#1a1a2e'
    const textMut = css.getPropertyValue('--text-muted').trim()    || '#6b7280'
    const bgCard  = css.getPropertyValue('--bg-card').trim()       || '#ffffff'

    // PSX layout: center at left-center so labels can spread right
    const cx = W * 0.42, cy = H / 2
    const Rout  = Math.min(cx, cy) - 32   // outer edge (company thin ring)
    const Rsec  = Rout * 0.82             // inner edge of company ring / outer of sector ring
    const Rhole = Rout * 0.38             // hole radius

    hitsRef.current = []

    function drawArc(r0:number,r1:number,a0:number,a1:number,fill:string) {
      gc.beginPath()
      gc.arc(cx,cy,r1,a0,a1)
      gc.arc(cx,cy,r0,a1,a0,true)
      gc.closePath()
      gc.fillStyle=fill; gc.fill()
      gc.strokeStyle='rgba(255,255,255,0.55)'; gc.lineWidth=1.2; gc.stroke()
    }

    // Leader-line label outside the chart
    function drawLabel(text:string, midA:number, pnl:number) {
      const LABEL_R = Rout + 10
      const LINE_R  = Rout + 4
      const ix = cx + Math.cos(midA)*LINE_R
      const iy = cy + Math.sin(midA)*LINE_R
      const ox = cx + Math.cos(midA)*LABEL_R
      const oy = cy + Math.sin(midA)*LABEL_R
      const right = ox > cx
      const tx = right ? ox + 4 : ox - 4

      gc.strokeStyle = pnl>=0 ? GREEN : RED
      gc.lineWidth = 0.8
      gc.beginPath(); gc.moveTo(ix,iy); gc.lineTo(ox,oy); gc.stroke()

      gc.fillStyle  = textMut
      gc.font       = '9px system-ui'
      gc.textAlign  = right ? 'left' : 'right'
      gc.textBaseline = 'middle'
      const short = text.length>13 ? text.slice(0,12)+'…' : text
      gc.fillText(short, tx, oy)
    }

    if (drill && active) {
      // ── DRILL: fill full donut with sector's companies ──
      const comps = active.holdings
        .map(h=>({ h, val:h.ltp>0?h.quantity*h.ltp:h.quantity*h.average_price,
                      pnl:(h.ltp>0?h.quantity*h.ltp:h.quantity*h.average_price)-h.quantity*h.average_price }))
        .filter(c=>c.val>0).sort((a,b)=>b.val-a.val)
      const sTotal = comps.reduce((s,c)=>s+c.val,0)||1
      let a = -Math.PI/2
      comps.forEach((c,i) => {
        const sw = (c.val/sTotal)*Math.PI*2
        drawArc(Rhole, Rout, a, a+sw, compColor(c.pnl,i,comps.length))
        if (sw > 0.18) drawLabel(c.h.name, a+sw/2, c.pnl)
        hitsRef.current.push({ kind:'company', sectorName:drill, symbol:c.h.symbol,
          a0:a, a1:a+sw, r0:Rhole, r1:Rout })
        a += sw
      })
      // hole + center text
      gc.beginPath(); gc.arc(cx,cy,Rhole,0,Math.PI*2); gc.fillStyle=bgCard; gc.fill()
      gc.textAlign='center'; gc.textBaseline='middle'
      gc.fillStyle=textMut; gc.font='600 10px system-ui'
      gc.fillText(drill.length>16?drill.slice(0,15)+'…':drill, cx, cy-10)
      gc.fillStyle=textPri; gc.font='bold 14px system-ui'
      gc.fillText(fmtPKR(active.value), cx, cy+10)

    } else {
      // ── FULL VIEW: inner thick ring = sectors, outer thin ring = companies ──
      let a = -Math.PI/2
      sectors.forEach(sec => {
        const sw = (sec.value/total)*Math.PI*2

        // outer thin ring: individual companies
        const comps = sec.holdings
          .map(h=>({ h, val:h.ltp>0?h.quantity*h.ltp:h.quantity*h.average_price,
                        pnl:(h.ltp>0?h.quantity*h.ltp:h.quantity*h.average_price)-h.quantity*h.average_price }))
          .filter(c=>c.val>0)
        const cTotal = comps.reduce((s,c)=>s+c.val,0)||1
        let ca = a
        comps.forEach((c,i) => {
          const csw = (c.val/cTotal)*sw
          drawArc(Rsec+1, Rout, ca, ca+csw, compColor(c.pnl,i,comps.length))
          hitsRef.current.push({ kind:'company', sectorName:sec.name, symbol:c.h.symbol,
            a0:ca, a1:ca+csw, r0:Rsec+1, r1:Rout })
          ca += csw
        })

        // inner thick ring: sector
        drawArc(Rhole, Rsec, a, a+sw, secColor(sec.pnl))
        hitsRef.current.push({ kind:'sector', sectorName:sec.name, a0:a, a1:a+sw, r0:Rhole, r1:Rsec })

        // leader label for sectors with enough arc
        if (sw > 0.25) drawLabel(sec.name, a+sw/2, sec.pnl)
        a += sw
      })

      // hole + center text
      gc.beginPath(); gc.arc(cx,cy,Rhole,0,Math.PI*2); gc.fillStyle=bgCard; gc.fill()
      gc.textAlign='center'; gc.textBaseline='middle'
      gc.fillStyle=textMut; gc.font='600 10px system-ui'; gc.fillText('Portfolio', cx, cy-10)
      gc.fillStyle=textPri; gc.font='bold 14px system-ui'; gc.fillText(fmtPKR(total), cx, cy+10)
    }
    gc.textBaseline='alphabetic'
  }, [sectors, total, drill, active])

  function hit(e: React.MouseEvent<HTMLCanvasElement>): HitSlice|null {
    const c  = canvasRef.current!
    const r  = c.getBoundingClientRect()
    const sx = c.offsetWidth / c.getBoundingClientRect().width
    const sy = c.offsetHeight / c.getBoundingClientRect().height
    const px = (e.clientX - r.left) * sx
    const py = (e.clientY - r.top)  * sy
    const cx2 = c.offsetWidth * 0.42
    const cy2 = c.offsetHeight / 2
    const dx = px - cx2, dy = py - cy2
    const d  = Math.sqrt(dx*dx+dy*dy)
    let a = Math.atan2(dy,dx); if(a < -Math.PI/2) a += Math.PI*2
    return hitsRef.current.find(s=>d>=s.r0&&d<=s.r1+8&&a>=s.a0&&a<s.a1) ?? null
  }

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const h = hit(e)
    if (!h) { setDrill(null); return }
    if (h.kind==='sector') setDrill(prev=>prev===h.sectorName?null:h.sectorName)
    else setDrill(h.sectorName)
    setTip(null)
  }

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const h = hit(e)
    if (!h) { setTip(null); e.currentTarget.style.cursor='default'; return }
    e.currentTarget.style.cursor='pointer'
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + 14
    const y = e.clientY - rect.top  - 8
    if (h.kind==='sector') {
      const sec = sectors.find(s=>s.name===h.sectorName)!
      setTip({ x, y, lines:[
        sec.name,
        `Market Value: ${fmtPKR(sec.value)} (${((sec.value/total)*100).toFixed(2)}%)`,
        `Total P&L: ${sec.pnl>=0?'+':''}${fmtPKR(sec.pnl)}`,
        `${sec.holdings.length} holding${sec.holdings.length!==1?'s':''}`,
        'Click to drill into companies →',
      ]})
    } else {
      const sec = sectors.find(s=>s.name===h.sectorName)!
      const hh  = sec.holdings.find(hh=>hh.symbol===h.symbol)
      if (!hh) return
      const val    = hh.ltp>0?hh.quantity*hh.ltp:hh.quantity*hh.average_price
      const pnl    = val - hh.quantity*hh.average_price
      const pnlPct = hh.quantity*hh.average_price>0 ? pnl/(hh.quantity*hh.average_price)*100 : 0
      const todayPnl = hh.ltp>0&&hh.prevClose>0 ? hh.quantity*(hh.ltp-hh.prevClose) : null
      setTip({ x, y, lines:[
        hh.symbol, hh.name,
        `Mkt Value: ${fmtPKR(val)}`,
        `P&L: ${pnl>=0?'+':''}${fmtPKR(pnl)} (${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%)`,
        todayPnl!==null ? `Today: ${todayPnl>=0?'+':''}${fmtPKR(todayPnl)}` : '',
        `Qty ${hh.quantity.toLocaleString()} @ avg ${hh.average_price.toFixed(2)}`,
      ]})
    }
  }

  const sorted = [...sectors].sort((a,b)=>b.pnl-a.pnl)

  return (
    <div>
      <style>{`@keyframes sbIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}.sb-in{animation:sbIn 0.15s ease}`}</style>

      {drill && (
        <button onClick={()=>setDrill(null)} style={{
          display:'inline-flex',alignItems:'center',gap:5,marginBottom:10,
          fontSize:11,fontWeight:600,color:'var(--text-muted)',background:'none',
          border:'1px solid var(--bg-border)',borderRadius:6,padding:'4px 10px',cursor:'pointer',
        }}>← All Sectors</button>
      )}

      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        {/* Canvas */}
        <div style={{ position:'relative', flex:'0 0 58%', minWidth:0 }}>
          <canvas ref={canvasRef}
            onClick={onClick} onMouseMove={onMove} onMouseLeave={()=>setTip(null)}
            style={{ width:'100%', height:340, display:'block' }}
          />
          {tip && (
            <div style={{
              position:'absolute', left:tip.x, top:tip.y, pointerEvents:'none', zIndex:10,
              background:'var(--bg-card)', border:'1px solid var(--bg-border)',
              borderRadius:7, padding:'8px 12px', fontSize:11, lineHeight:1.75,
              boxShadow:'0 6px 24px rgba(0,0,0,0.18)', maxWidth:230,
            }}>
              {tip.lines.filter(Boolean).map((l,i)=>(
                <div key={i} style={{
                  fontWeight:i<=1?700:400,
                  color:i===0?'var(--text-primary)':i===1?'var(--text-secondary)':'var(--text-muted)',
                  fontSize:i===0?'12px':'11px',
                }}>{l}</div>
              ))}
            </div>
          )}
        </div>

        {/* Right P&L panel — exactly like PSX reference */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:1 }}>
          {sorted.map(sec => {
            const barW = (Math.abs(sec.pnl)/maxPnl)*90
            const up   = sec.pnl>=0
            const act  = drill===sec.name
            const pnlStr = Math.abs(sec.pnl)>=1000
              ? `${up?'+':''}${(sec.pnl/1000).toFixed(1)}K`
              : `${up?'+':''}${sec.pnl.toFixed(0)}`
            return (
              <button key={sec.name} onClick={()=>setDrill(act?null:sec.name)} style={{
                display:'grid', gridTemplateColumns:'10px 1fr auto',
                alignItems:'center', gap:8,
                padding:'6px 8px', borderRadius:5, border:'none',
                background: act ? (up?'rgba(74,190,124,0.07)':'rgba(224,82,82,0.07)') : 'transparent',
                cursor:'pointer', width:'100%',
              }}>
                {/* color strip */}
                <div style={{ width:3,height:16,borderRadius:2, background:up?GREEN:RED, justifySelf:'center' }} />
                {/* name + bar */}
                <div style={{ display:'flex', flexDirection:'column', gap:3, minWidth:0 }}>
                  <span style={{ fontSize:11,fontWeight:500,color:'var(--text-primary)',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'left' }}>
                    {sec.name}
                  </span>
                  <div style={{ height:3, background:'var(--bg-border)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${barW}%`, height:'100%', background:up?GREEN:RED, borderRadius:2 }} />
                  </div>
                </div>
                {/* value */}
                <span style={{ fontSize:11,fontWeight:700,fontVariantNumeric:'tabular-nums',
                  color:up?GREEN:RED, whiteSpace:'nowrap' }}>
                  {pnlStr}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Drill-down table */}
      {drill && active && (
        <div className="sb-in" style={{ marginTop:12,border:'1px solid var(--bg-border)',borderRadius:8,overflow:'hidden' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'8px 14px',borderBottom:'1px solid var(--bg-border)',background:'var(--bg-hover)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ fontSize:12,fontWeight:700,color:'var(--text-primary)' }}>{drill}</span>
              <span style={{ fontSize:10,padding:'1px 7px',borderRadius:10,
                background:'var(--bg-border)',color:'var(--text-muted)',fontWeight:600 }}>
                {active.holdings.length} holding{active.holdings.length!==1?'s':''}
              </span>
              <span style={{ fontSize:11,fontWeight:700,color:active.pnl>=0?GREEN:RED }}>
                {active.pnl>=0?'+':''}{fmtPKR(active.pnl)}
              </span>
            </div>
            <button onClick={()=>setDrill(null)}
              style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:18,lineHeight:1,padding:'0 4px' }}>×</button>
          </div>
          <table style={{ width:'100%',fontSize:11,borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
                {['Symbol','Company','Qty','Avg Price','Mkt Value','P&L','Return'].map(col=>(
                  <th key={col} style={{ textAlign:'left',padding:'7px 12px',fontSize:9,fontWeight:700,
                    letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-muted)',whiteSpace:'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.holdings.map(h=>{
                const cost=h.quantity*h.average_price
                const mktV=h.ltp>0?h.quantity*h.ltp:cost
                const pnl=mktV-cost, pct=cost>0?pnl/cost*100:0, up=pnl>=0
                return (
                  <tr key={h.id} style={{ borderBottom:'1px solid var(--bg-border)' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-hover)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                    <td style={{ padding:'8px 12px' }}>
                      <a href={`/stocks/${h.symbol}`} style={{ color:'#FEA500',fontWeight:700,textDecoration:'none' }}>{h.symbol}</a>
                    </td>
                    <td style={{ padding:'8px 12px',color:'var(--text-secondary)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{h.name}</td>
                    <td style={{ padding:'8px 12px',color:'var(--text-secondary)',fontVariantNumeric:'tabular-nums' }}>{h.quantity.toLocaleString()}</td>
                    <td style={{ padding:'8px 12px',color:'var(--text-secondary)',fontVariantNumeric:'tabular-nums' }}>{h.average_price.toFixed(2)}</td>
                    <td style={{ padding:'8px 12px',fontWeight:600,color:'var(--text-primary)',fontVariantNumeric:'tabular-nums' }}>{fmtPKR(mktV)}</td>
                    <td style={{ padding:'8px 12px',fontWeight:600,fontVariantNumeric:'tabular-nums',color:up?GREEN:RED }}>{up?'+':''}{fmtPKR(pnl)}</td>
                    <td style={{ padding:'8px 12px',fontWeight:600,fontVariantNumeric:'tabular-nums',color:up?GREEN:RED }}>{up?'+':''}{pct.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 12px',
            borderTop:'1px solid var(--bg-border)',background:'var(--bg-hover)' }}>
            <span style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em' }}>Sector Total</span>
            <span style={{ fontSize:12,fontWeight:700,color:'var(--text-primary)',fontVariantNumeric:'tabular-nums' }}>{fmtPKR(active.value)}</span>
          </div>
        </div>
      )}
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
      sector:        map[h.symbol]?.sector,
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

      {/* ── Holdings Charts ── */}
      {activeTab === 'holdings' && holdings.length > 0 && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {/* P&L Histogram */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Unrealised P&amp;L per Holding</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0' }}>Sorted best to worst · hover for details</p>
              </div>
            </div>
            <HoldingsPnlChart holdings={holdings} />
          </div>
          {/* Sector Donut Pie */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Sector Allocation</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0' }}>All PSX sectors shown · colored = you have holdings · click any slice to explore</p>
              </div>
            </div>
            <PSXSectorWheel holdings={holdings} />
          </div>
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
                      // Build a real .xlsx (Office Open XML ZIP) in the browser
                      const enc = new TextEncoder()
                      const esc = (v: string) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                      const allRows = [headers, ...rows]
                      const sheetRows = allRows.map((row, ri) =>
                        `<row r="${ri+1}">${row.map((v, ci) => {
                          const addr = String.fromCharCode(65+ci)+(ri+1)
                          const num = ri > 0 && ci >= 1 && ci <= 6
                          return num
                            ? `<c r="${addr}"><v>${v}</v></c>`
                            : `<c r="${addr}" t="inlineStr"${ri===0?' s="1"':''}><is><t>${esc(String(v))}</t></is></c>`
                        }).join('')}</row>`
                      ).join('')
                      const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
                      const wbXml    = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="History" sheetId="1" r:id="rId1"/></sheets></workbook>`
                      const relsXml  = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
                      const ctXml    = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
                      const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
                      const files: [string, Uint8Array][] = [
                        ['[Content_Types].xml', enc.encode(ctXml)],
                        ['_rels/.rels',         enc.encode(rootRels)],
                        ['xl/workbook.xml',     enc.encode(wbXml)],
                        ['xl/_rels/workbook.xml.rels', enc.encode(relsXml)],
                        ['xl/worksheets/sheet1.xml',   enc.encode(sheetXml)],
                      ]
                      const u16 = (n: number) => [n&0xff,(n>>8)&0xff]
                      const u32 = (n: number) => [n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>24)&0xff]
                      const crc32 = (d: Uint8Array) => {
                        const t = Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);return c})
                        let c=0xFFFFFFFF; for(const b of d)c=t[(c^b)&0xff]^(c>>>8); return(c^0xFFFFFFFF)>>>0
                      }
                      const parts: number[]=[], cd: number[]=[]
                      let offset=0
                      for(const [name,data] of files){
                        const nb=enc.encode(name),crc=crc32(data)
                        const local=[0x50,0x4B,0x03,0x04,...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...nb,...data]
                        cd.push(0x50,0x4B,0x01,0x02,...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...nb)
                        offset+=local.length; parts.push(...local)
                      }
                      const eocd=[0x50,0x4B,0x05,0x06,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cd.length),...u32(offset),...u16(0)]
                      const blob = new Blob([new Uint8Array([...parts,...cd,...eocd])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href=url; a.download='portfolio_history.xlsx'; a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                    <Download size={11} /> Export Excel
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
