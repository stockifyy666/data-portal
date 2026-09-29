'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'

// ─── Sector palette (31 colors) ──────────────────────────────────────────────
const SECTOR_PALETTE = [
  '#FEA500','#3b82f6','#a855f7','#06b6d4','#f59e0b',
  '#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef',
  '#e11d48','#0891b2','#7c3aed','#059669','#dc2626',
  '#2563eb','#9333ea','#16a34a','#ca8a04','#0284c7',
  '#7e22ce','#15803d','#b45309','#0e7490','#be123c',
  '#1d4ed8',
]

const PSX_ALL_SECTORS = [
  'Commercial Banks','Oil & Gas Exploration Companies','Cement',
  'Fertilizer','Power Generation & Distribution','Oil & Gas Marketing Companies',
  'Technology & Communication','Automobile Assembler','Pharmaceutical',
  'Steel - Alloy','Textile Composite','Chemical','Refinery',
  'Food & Personal Care Products','Engineering','Paper & Board',
  'Insurance','Glass & Ceramics','Cable & Electrical Goods',
  'Sugar & Allied Industries','Transport','Tobacco','Automobile Parts & Accessories',
  'Synthetic & Rayon','Leasing Companies','Modarabas','Real Estate Investment Trust',
  'Woollen','Jute','Vanaspati & Allied Industries','Miscellaneous',
]

const INDEX_OPTIONS = [
  { value: 'KSE100',    label: 'KSE-100'       },
  { value: 'KSE30',     label: 'KSE-30'        },
  { value: 'KMI30',     label: 'KMI-30'        },
  { value: 'KMIALLSHR', label: 'KMI All Share' },
  { value: 'ALLSHR',    label: 'All Share'     },
]

// ─── Sector code → name map (PSX sector codes) ──────────────────────────────
const SECTOR_NAMES: Record<string, string> = {
  '0801': 'Automobile Assembler',         '0802': 'Automobile Parts & Accessories',
  '0803': 'Cable & Electrical Goods',     '0804': 'Cement',
  '0805': 'Chemical',                     '0806': 'Closed-End Mutual Fund',
  '0807': 'Commercial Banks',             '0808': 'Engineering',
  '0809': 'Fertilizer',                   '0810': 'Food & Personal Care Products',
  '0811': 'Glass & Ceramics',             '0812': 'Insurance',
  '0813': 'Investment Companies',         '0814': 'Jute',
  '0815': 'Leasing Companies',            '0816': 'Leather & Tanneries',
  '0818': 'Miscellaneous',               '0819': 'Modarabas',
  '0820': 'Oil & Gas Exploration Companies', '0821': 'Oil & Gas Marketing Companies',
  '0822': 'Paper & Board',               '0823': 'Pharmaceutical',
  '0824': 'Power Generation & Distribution', '0825': 'Refinery',
  '0826': 'Sugar & Allied Industries',   '0827': 'Synthetic & Rayon',
  '0828': 'Technology & Communication',  '0829': 'Textile Composite',
  '0830': 'Textile Spinning',            '0831': 'Woollen',
  '0832': 'Tobacco',                     '0833': 'Transport',
  '0834': 'Vanaspati & Allied Industries','0835': 'Steel - Alloy',
  '0836': 'Real Estate Investment Trust', '0837': 'ETFs',
  '0838': 'Real Estate',
}

function normSector(code: string): string {
  if (!code) return 'Miscellaneous'
  return SECTOR_NAMES[code] ?? code
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SectorData {
  name: string
  color: string
  marketCap: number
  pointsChange: number
  stocks: StockQuote[]
  pctChange: number
}

// ─── Sector Wheel Chart (redesigned) ─────────────────────────────────────────
function SectorWheel({
  sectors,
  allSectorNames,
  selected,
  onSelect,
}: {
  sectors: Map<string, SectorData>
  allSectorNames: string[]
  selected: string | null
  onSelect: (s: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const slicesRef = useRef<{ a0: number; a1: number; r0: number; r1: number; name: string }[]>([])
  const [hovered, setHovered] = useState<string | null>(null)

  // Sorted active sectors by market cap (for the table)
  const activeSectors = useMemo(() =>
    allSectorNames
      .filter(n => sectors.has(n))
      .sort((a, b) => (sectors.get(b)!.marketCap) - (sectors.get(a)!.marketCap)),
  [allSectorNames, sectors])

  const totalMktCap = useMemo(() =>
    activeSectors.reduce((s, n) => s + (sectors.get(n)?.marketCap ?? 0), 0),
  [activeSectors, sectors])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const css = getComputedStyle(document.documentElement)
    const textMut = css.getPropertyValue('--text-muted').trim() || '#6b7280'
    // Normalize bgCard to always be a 6-char hex so appending 2-char alpha is safe.
    // CSS vars can return 3-char shorthand (#fff) which makes #fffdd (5 chars = invalid).
    const rawBgCard = css.getPropertyValue('--bg-card').trim() || '#0f1929'
    const bgCard = rawBgCard.startsWith('#') && rawBgCard.length === 4
      ? '#' + rawBgCard[1] + rawBgCard[1] + rawBgCard[2] + rawBgCard[2] + rawBgCard[3] + rawBgCard[3]
      : rawBgCard

    const cx = W / 2, cy = H / 2
    const Rout  = Math.min(W * 0.36, H / 2 - 30)
    const Rhole = Rout * 0.52

    // Proportional arcs by market cap; tiny floor for empty sectors
    const MIN_EMPTY_FRAC = 0.003
    const grandTotalMC = totalMktCap || allSectorNames.reduce((s, n) => s + (sectors.get(n)?.marketCap || 1), 0)
    const emptyCount   = allSectorNames.filter(n => !sectors.has(n)).length
    const emptyBudget  = grandTotalMC * MIN_EMPTY_FRAC
    const grandTotal   = grandTotalMC + emptyBudget * emptyCount

    const sliceAngles: { a0: number; a1: number }[] = []
    let cursor = -Math.PI / 2
    allSectorNames.forEach(name => {
      const sd = sectors.get(name)
      const w  = sd ? (sd.marketCap || 1) : emptyBudget
      const sw = (w / grandTotal) * Math.PI * 2
      sliceAngles.push({ a0: cursor, a1: cursor + sw })
      cursor += sw
    })

    slicesRef.current = []

    // Draw slices with gradient fills
    allSectorNames.forEach((name, idx) => {
      const { a0, a1 } = sliceAngles[idx]
      const midA  = (a0 + a1) / 2
      const sData = sectors.get(name)
      const color = sData?.color ?? '#1e293b'
      const isHov = hovered === name
      const isSel = selected === name
      const expand = isHov || isSel

      const rOuter = expand ? Rout + 10 : Rout
      const rInner = expand ? Rhole - 3 : Rhole

      ctx.save()
      if (expand) {
        ctx.shadowColor = color
        ctx.shadowBlur  = 20
      }

      // Gradient per slice (radial: darker inside → lighter outside)
      const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter)
      if (sData) {
        const alpha = expand ? 'ff' : isSel ? 'ee' : 'cc'
        grad.addColorStop(0, color + (expand ? 'bb' : '88'))
        grad.addColorStop(1, color + alpha)
      } else {
        grad.addColorStop(0, '#0f172a')
        grad.addColorStop(1, '#1e2d3d')
      }

      ctx.beginPath()
      ctx.arc(cx, cy, rOuter, a0, a1)
      ctx.arc(cx, cy, rInner, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()

      // Thin separator stroke
      ctx.strokeStyle = bgCard
      ctx.lineWidth   = sData ? 1.5 : 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, rOuter, a0, a1)
      ctx.arc(cx, cy, rInner, a1, a0, true)
      ctx.closePath()
      ctx.stroke()

      // Inline label for large slices (> 5% of total)
      if (sData) {
        const span = a1 - a0
        const frac = span / (Math.PI * 2)
        if (frac > 0.05) {
          const lx = cx + Math.cos(midA) * (rInner + (rOuter - rInner) * 0.5)
          const ly = cy + Math.sin(midA) * (rInner + (rOuter - rInner) * 0.5)
          ctx.save()
          ctx.translate(lx, ly)
          ctx.rotate(midA + Math.PI / 2)
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const fs = Math.min(11, Math.max(8, frac * 120))
          ctx.font = `700 ${fs}px system-ui`
          ctx.fillStyle = '#ffffff'
          const short = name.split(' ').slice(0, 2).join(' ')
          ctx.fillText(short, 0, 0)
          ctx.restore()
        }
      }

      slicesRef.current.push({ a0, a1, r0: Rhole - 3, r1: Rout + 14, name })
    })

    // Leader lines for top sectors only (> 2.5% market cap)
    const LABEL_THRESHOLD = 0.01
    const ELBOW_R = Rout + 18
    const COL_R   = Rout + 60

    interface LabelItem {
      name: string; midA: number; color: string; pct: number
      naturalY: number; finalY: number; onRight: boolean
    }
    const candidates: LabelItem[] = []
    allSectorNames.forEach((name, idx) => {
      const sd = sectors.get(name)
      if (!sd) return
      const frac = (sd.marketCap || 0) / (grandTotalMC || 1)
      if (frac < LABEL_THRESHOLD) return
      const { a0, a1 } = sliceAngles[idx]
      const midA = (a0 + a1) / 2
      candidates.push({
        name, midA, color: sd.color, pct: sd.pctChange,
        naturalY: cy + Math.sin(midA) * ELBOW_R,
        finalY:   cy + Math.sin(midA) * ELBOW_R,
        onRight:  Math.cos(midA) >= 0,
      })
    })

    const spreadLabels = (items: LabelItem[]) => {
      if (!items.length) return
      items.sort((a, b) => a.naturalY - b.naturalY)
      const GAP = 22
      for (let p = 0; p < 15; p++) {
        for (let i = 1; i < items.length; i++)
          if (items[i].finalY < items[i-1].finalY + GAP) items[i].finalY = items[i-1].finalY + GAP
        for (let i = items.length-2; i >= 0; i--)
          if (items[i].finalY > items[i+1].finalY - GAP) items[i].finalY = items[i+1].finalY - GAP
        const mn = items[0].finalY, mx = items[items.length-1].finalY
        if (mn < 10) items.forEach(l => { l.finalY += 10 - mn })
        if (mx > H-10) items.forEach(l => { l.finalY -= mx - (H-10) })
      }
    }
    const R = candidates.filter(l =>  l.onRight)
    const L = candidates.filter(l => !l.onRight)
    spreadLabels(R); spreadLabels(L)

    ;[...R, ...L].forEach(l => {
      const isActive = hovered === l.name || selected === l.name
      const ex = cx + Math.cos(l.midA) * ELBOW_R
      const ey = cy + Math.sin(l.midA) * ELBOW_R
      const sx = cx + Math.cos(l.midA) * (Rout + 2)
      const sy = cy + Math.sin(l.midA) * (Rout + 2)
      const colX = l.onRight ? cx + COL_R : cx - COL_R
      const lineC = isActive ? l.color : l.color + '99'

      ctx.strokeStyle = lineC
      ctx.lineWidth   = isActive ? 1.5 : 0.9
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.setLineDash([2, 3])
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(colX, l.finalY); ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = l.color; ctx.fill()

      // Tick mark at column
      ctx.strokeStyle = l.color + '66'
      ctx.lineWidth = 1
      const tickDir = l.onRight ? 6 : -6
      ctx.beginPath(); ctx.moveTo(colX, l.finalY); ctx.lineTo(colX + tickDir, l.finalY); ctx.stroke()

      ctx.textAlign    = l.onRight ? 'left' : 'right'
      ctx.textBaseline = 'middle'
      const lbl = l.name.length > 20 ? l.name.slice(0, 18) + '…' : l.name
      ctx.font      = isActive ? '700 10px system-ui' : '600 9.5px system-ui'
      ctx.fillStyle = isActive ? l.color : (css.getPropertyValue('--text-primary').trim() || '#111827')
      ctx.fillText(lbl, colX + (l.onRight ? 10 : -10), l.finalY - 5)
      const pctStr = `${l.pct >= 0 ? '+' : ''}${l.pct.toFixed(2)}%`
      ctx.font      = '8px system-ui'
      ctx.fillStyle = l.pct >= 0 ? '#16a34a' : '#dc2626'
      ctx.fillText(pctStr, colX + (l.onRight ? 10 : -10), l.finalY + 7)
    })

    // Center
    ctx.beginPath(); ctx.arc(cx, cy, Rhole - 1, 0, Math.PI * 2)
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rhole)
    centerGrad.addColorStop(0, bgCard)
    // Only append hex alpha when bgCard is a 6-char hex; fall back to same color otherwise
    centerGrad.addColorStop(1, /^#[0-9a-fA-F]{6}$/.test(bgCard) ? bgCard + 'dd' : bgCard)
    ctx.fillStyle = centerGrad; ctx.fill()

    // Center text is rendered as HTML overlay — no canvas text here
  }, [sectors, allSectorNames, selected, hovered, activeSectors, totalMktCap])

  function hitTest(e: React.MouseEvent<HTMLCanvasElement>): string | null {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (e.currentTarget.offsetWidth / rect.width)
    const my = (e.clientY - rect.top)  * (e.currentTarget.offsetHeight / rect.height)
    const canvas = canvasRef.current!
    const cx = canvas.offsetWidth / 2, cy = canvas.offsetHeight / 2
    const dx = mx - cx, dy = my - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const raw   = Math.atan2(dy, dx)
    const angle = raw < 0 ? raw + Math.PI * 2 : raw

    for (const sl of slicesRef.current) {
      if (dist < sl.r0 || dist > sl.r1) continue
      let a0 = sl.a0 < 0 ? sl.a0 + Math.PI * 2 : sl.a0
      let a1 = sl.a1 < 0 ? sl.a1 + Math.PI * 2 : sl.a1
      if (a0 <= a1 ? (angle >= a0 && angle <= a1) : (angle >= a0 || angle <= a1)) return sl.name
    }
    return null
  }

  // Center overlay data — always reads latest sectors prop, never stale
  const centerSd = (hovered && sectors.get(hovered)) || (selected && sectors.get(selected)) || null
  const centerName = hovered || selected || null

  return (
    <div>
      {/* Donut canvas + HTML center overlay */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={e => setHovered(hitTest(e))}
          onMouseLeave={() => setHovered(null)}
          onClick={e => { const h = hitTest(e); onSelect(h === selected ? null : h) }}
          style={{ width: '100%', height: 520, display: 'block', cursor: hovered ? 'pointer' : 'default' }}
        />
        {/* Center label — HTML so it always reflects current data */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
          width: 140,
        }}>
          {centerSd && centerName ? (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: centerSd.color,
                lineHeight: 1.3, marginBottom: 4,
              }}>
                {centerName.split(' ').slice(0, 3).join(' ')}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 800,
                color: centerSd.pctChange >= 0 ? '#16a34a' : '#dc2626',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {centerSd.pctChange >= 0 ? '+' : ''}{centerSd.pctChange.toFixed(2)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {centerSd.stocks.length} stocks
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#FEA500' }}>PSX</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                {activeSectors.length} sectors
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>click a slice</div>
            </>
          )}
        </div>
      </div>

      {/* Sector table — sorted by market cap, all sectors, click to drill down */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto auto',
          gap: '0 12px', padding: '0 4px 6px',
          borderBottom: '1px solid var(--bg-border)',
        }}>
          {['Sector', 'Stocks', 'Mkt Cap %', 'Change'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {activeSectors.map(name => {
            const sd  = sectors.get(name)!
            const isSel = selected === name
            const up  = sd.pctChange >= 0
            const pct = totalMktCap > 0 ? (sd.marketCap / totalMktCap) * 100 : 0
            return (
              <button
                key={name}
                onClick={() => onSelect(isSel ? null : name)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                  gap: '0 12px', width: '100%', padding: '8px 4px',
                  background: isSel ? sd.color + '14' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--bg-border)',
                  cursor: 'pointer', alignItems: 'center', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                {/* Sector name with color dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: sd.color, flexShrink: 0,
                    boxShadow: isSel ? `0 0 6px ${sd.color}` : 'none',
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: isSel ? 700 : 600,
                    color: isSel ? sd.color : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{name}</span>
                </div>
                {/* Stock count */}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                  {sd.stocks.length}
                </span>
                {/* Market cap % with mini bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(pct * 2.5, 100)}%`, height: '100%', borderRadius: 2, background: sd.color + 'bb' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', width: 42, textAlign: 'right' }}>
                    {pct.toFixed(2)}%
                  </span>
                </div>
                {/* % change */}
                <span style={{
                  fontSize: 11, fontWeight: 700, color: up ? '#16a34a' : '#dc2626',
                  fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                }}>
                  {up ? '+' : ''}{sd.pctChange.toFixed(2)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Top Points Contributors Histogram ───────────────────────────────────────
interface ContribBar {
  symbol: string
  name: string
  pts: number
  pct: number
  sector: string
}

function ContribHistogram({ bars }: { bars: ContribBar[] }) {
  const ref    = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<{ x: number; w: number; bar: ContribBar }[]>([])
  const [tip, setTip] = useState<(ContribBar & { x: number; y: number; flipLeft: boolean }) | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !bars.length) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const css = getComputedStyle(document.documentElement)
    const textMut = css.getPropertyValue('--text-muted').trim() || '#7a839e'
    const border  = css.getPropertyValue('--bg-border').trim()  || '#1e2232'

    const PAD = { top: 40, right: 20, bottom: 40, left: 72 }
    const cW = W - PAD.left - PAD.right
    const cH = H - PAD.top  - PAD.bottom

    // Symmetric axis so zero line stays centred regardless of pos/neg imbalance
    const absMax = Math.max(...bars.map(b => Math.abs(b.pts)), 1) * 1.15
    const maxPts =  absMax
    const minPts = -absMax
    const range  = maxPts - minPts
    const toY    = (v: number) => PAD.top + cH - ((v - minPts) / range) * cH
    const z0     = toY(0)   // always exactly the vertical midpoint

    // Grid
    for (let i = 0; i <= 5; i++) {
      const v = minPts + (range / 5) * i
      const y = toY(v)
      ctx.strokeStyle = border; ctx.lineWidth = 0.5; ctx.setLineDash([3, 4])
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      ctx.fillText(v.toFixed(2), PAD.left - 6, y)
    }

    // Zero line
    ctx.strokeStyle = 'rgba(254,165,0,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(PAD.left, z0); ctx.lineTo(W - PAD.right, z0); ctx.stroke()
    ctx.setLineDash([])

    const gW = cW / bars.length
    const bW = Math.max(Math.min(gW * 0.62, 38), 8)
    hitRef.current = []

    bars.forEach((b, i) => {
      const cx2 = PAD.left + i * gW + gW / 2
      const bx  = cx2 - bW / 2
      const top = Math.min(toY(b.pts), z0)
      const bh  = Math.max(Math.abs(toY(b.pts) - z0), 1)
      const up  = b.pts >= 0

      ctx.save()
      ctx.shadowColor = up ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'
      ctx.shadowBlur  = 8

      const grad = ctx.createLinearGradient(0, top, 0, top + bh)
      if (up) { grad.addColorStop(0, '#4ade80'); grad.addColorStop(1, '#15803d') }
      else    { grad.addColorStop(0, '#f87171'); grad.addColorStop(1, '#991b1b') }
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

      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(bx + 1, top, bW - 2, 2)

      const fs = Math.min(10, Math.max(7, gW / 3.2))
      ctx.textAlign = 'center'
      const ptsStr = `${b.pts >= 0 ? '+' : ''}${b.pts.toFixed(2)}`
      const pctStr = `${b.pct >= 0 ? '+' : ''}${b.pct.toFixed(2)}%`

      const minBarForLabel = fs * 2.2  // bar must be taller than ~2 text lines to show symbol
      if (up) {
        // pts value — above bar top
        ctx.fillStyle = '#4ade80'; ctx.font = `700 ${fs}px system-ui`
        ctx.textBaseline = 'bottom'; ctx.fillText(ptsStr, cx2, top - 4)
        // symbol name — just inside bar top (only if bar is tall enough)
        if (bh >= minBarForLabel) {
          ctx.fillStyle = '#ffffff'; ctx.font = `600 ${Math.max(7, fs - 1)}px system-ui`
          ctx.textBaseline = 'top'; ctx.fillText(b.symbol.slice(0, 6), cx2, top + 4)
        }
        // % change — just above zero line (bottom of positive bar)
        ctx.fillStyle = 'rgba(74,222,128,0.85)'; ctx.font = `600 ${Math.max(7, fs - 1)}px system-ui`
        ctx.textBaseline = 'bottom'; ctx.fillText(pctStr, cx2, z0 - 3)
      } else {
        // pts value — below bar bottom
        ctx.fillStyle = '#f87171'; ctx.font = `700 ${fs}px system-ui`
        ctx.textBaseline = 'top'; ctx.fillText(ptsStr, cx2, top + bh + 4)
        // symbol name — just inside bar top (only if bar is tall enough)
        if (bh >= minBarForLabel) {
          ctx.fillStyle = '#ffffff'; ctx.font = `600 ${Math.max(7, fs - 1)}px system-ui`
          ctx.textBaseline = 'bottom'; ctx.fillText(b.symbol.slice(0, 6), cx2, top + bh - 4)
        }
        // % change — just below zero line (top of negative bar)
        ctx.fillStyle = 'rgba(248,113,113,0.85)'; ctx.font = `600 ${Math.max(7, fs - 1)}px system-ui`
        ctx.textBaseline = 'top'; ctx.fillText(pctStr, cx2, z0 + 3)
      }

      hitRef.current.push({ x: bx - 4, w: bW + 8, bar: b })
    })

    // Y-axis label
    ctx.save(); ctx.translate(12, PAD.top + cH / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Index Points', 0, 0); ctx.restore()
  }, [bars])

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (e.currentTarget.offsetWidth / rect.width)
    const hit = hitRef.current.find(h => px >= h.x && px < h.x + h.w)
    if (!hit) { setTip(null); e.currentTarget.style.cursor = 'default'; return }
    e.currentTarget.style.cursor = 'pointer'
    const relX = e.clientX - rect.left
    const flipLeft = relX > rect.width * 0.6   // flip tooltip left when near right edge
    setTip({ ...hit.bar, x: relX, y: e.clientY - rect.top - 8, flipLeft })
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={ref} onMouseMove={onMove} onMouseLeave={() => setTip(null)}
        style={{ width: '100%', height: 320, display: 'block' }} />
      {tip && (
        <div style={{
          position: 'absolute',
          ...(tip.flipLeft ? { right: `calc(100% - ${tip.x}px + 14px)` } : { left: tip.x + 14 }),
          top: tip.y, pointerEvents: 'none', zIndex: 20,
          background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
          borderRadius: 10, padding: '10px 14px', fontSize: 11, lineHeight: 1.85,
          boxShadow: '0 8px 28px rgba(0,0,0,0.25)', minWidth: 200,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
            <Link href={`/stocks/${tip.symbol}`} style={{ color: '#FEA500', textDecoration: 'none' }}>{tip.symbol}</Link>
            <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{tip.name}</span>
          </div>
          {[
            ['Points',  `${tip.pts >= 0 ? '+' : ''}${tip.pts.toFixed(2)}`, tip.pts >= 0 ? '#4ade80' : '#f87171'],
            ['Change',  `${tip.pct >= 0 ? '+' : ''}${tip.pct.toFixed(2)}%`, tip.pct >= 0 ? '#4ade80' : '#f87171'],
            ['Sector',  tip.sector, 'var(--text-secondary)'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{l}</span>
              <span style={{ fontWeight: 600, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IndicesPage() {
  const [quotes,      setQuotes]      = useState<StockQuote[]>([])
  const [indexLevels, setIndexLevels] = useState<Record<string, { prevClose: number; change: number }>>({})
  const [loading,     setLoading]     = useState(true)
  const [indexKey,    setIndexKey]    = useState('KSE100')
  const [selected,    setSelected]    = useState<string | null>(null)
  const [topN,        setTopN]        = useState(20)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qData, iData] = await Promise.all([
        cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 60_000),
        cachedFetch<{ indices: { key: string; current: number; change: number }[] }>('/api/market/indices', 60_000),
      ])
      setQuotes(qData?.quotes ?? [])
      // Build prevClose map: prevClose = current - change
      const lvls: Record<string, { prevClose: number; change: number }> = {}
      for (const idx of iData?.indices ?? []) {
        lvls[idx.key] = { prevClose: idx.current - idx.change, change: idx.change }
      }
      setIndexLevels(lvls)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelected(null) }, [indexKey])

  // Filter to chosen index
  const indexStocks = useMemo(() =>
    quotes.filter(q => q.indexKeys?.includes(indexKey)),
  [quotes, indexKey])

  // Build sector map from index stocks
  const sectors = useMemo(() => {
    const map = new Map<string, SectorData>()
    indexStocks.forEach(q => {
      const sName = normSector(q.sector ?? '')
      const color = SECTOR_PALETTE[PSX_ALL_SECTORS.indexOf(sName) % SECTOR_PALETTE.length] ?? '#FEA500'
      // Use previous-close market cap for stable sector weights (matches portal convention)
      const cap = (q.lastClose || 0) > 0 && (q.sharesOut || 0) > 0
        ? q.lastClose * q.sharesOut
        : q.mc > 0 ? q.mc : (q.price || 0) * (q.sharesOut || 0)
      // points contribution ≈ price change × shares outstanding (proxy for index weight)
      const pts = (q.change || 0) * (q.sharesOut || 1)
      if (!map.has(sName)) {
        map.set(sName, { name: sName, color, marketCap: 0, pointsChange: 0, stocks: [], pctChange: 0 })
      }
      const sd = map.get(sName)!
      sd.marketCap    += cap
      sd.pointsChange += pts
      sd.stocks.push(q)
    })
    // Market-cap weighted avg pct change per sector
    // Use previous-close market cap (lastClose × sharesOut) as weights so a
    // stock's intraday move doesn't skew its own weight in the calculation.
    map.forEach(sd => {
      const stocks = sd.stocks.filter(q => (q.price || 0) > 0)
      if (!stocks.length) return
      const weights = stocks.map(q => {
        const prevMc = (q.lastClose || 0) > 0 && (q.sharesOut || 0) > 0
          ? q.lastClose * q.sharesOut
          : q.mc > 0 ? q.mc : (q.sharesOut || 0) > 0 ? q.price * q.sharesOut : 0
        return prevMc
      })
      const totalW = weights.reduce((s, w) => s + w, 0)
      if (totalW > 0) {
        sd.pctChange = stocks.reduce((s, q, i) => s + (q.changePct || 0) * weights[i], 0) / totalW
      } else {
        sd.pctChange = stocks.reduce((s, q) => s + (q.changePct || 0), 0) / stocks.length
      }
    })
    return map
  }, [indexStocks])

  const allSectorNames = useMemo(() => {
    const extra = [...sectors.keys()].filter(k => !PSX_ALL_SECTORS.includes(k))
    return [...PSX_ALL_SECTORS, ...extra]
  }, [sectors])

  // Top contributors (sorted by absolute points change, show top N)
  const topContribs = useMemo((): ContribBar[] => {
    const prevIndexLevel = indexLevels[indexKey]?.prevClose ?? 0
    // Total prev-close market cap of all index stocks
    const totalPrevMC = indexStocks.reduce((s, q) => {
      const pmc = (q.lastClose || 0) > 0 && (q.sharesOut || 0) > 0
        ? q.lastClose * q.sharesOut : q.mc > 0 ? q.mc : 0
      return s + pmc
    }, 0)

    return indexStocks
      .filter(q => (q.changePct ?? 0) !== 0)
      .map(q => {
        const pmc = (q.lastClose || 0) > 0 && (q.sharesOut || 0) > 0
          ? q.lastClose * q.sharesOut : q.mc > 0 ? q.mc : 0
        // Index points contribution = weight × prevClose × pctChange/100
        const pts = totalPrevMC > 0 && prevIndexLevel > 0
          ? (pmc / totalPrevMC) * prevIndexLevel * ((q.changePct ?? 0) / 100)
          : (q.change ?? 0)
        return {
          symbol: q.symbol,
          name:   q.name ?? q.symbol,
          pts,
          pct:    q.changePct ?? 0,
          sector: normSector(q.sector ?? ''),
        }
      })
      .sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts))
      .slice(0, topN)
      .sort((a, b) => {
        if (a.pts >= 0 && b.pts >= 0) return b.pts - a.pts   // positives: largest first (left)
        if (a.pts < 0  && b.pts < 0)  return a.pts - b.pts   // negatives: most negative first (left of negatives)
        return b.pts - a.pts                                   // positives before negatives
      })
  }, [indexStocks, topN, indexLevels, indexKey])

  // Index-level KPIs
  const kse = useMemo(() => {
    if (!indexStocks.length) return null
    // Use actual index change from API; fallback to sum of stock price changes
    const totalPts = indexLevels[indexKey]?.change
      ?? indexStocks.reduce((s, q) => s + (q.change ?? 0), 0)
    const totalVol   = indexStocks.reduce((s, q) => s + (q.volume ?? 0), 0)
    const gainers    = indexStocks.filter(q => (q.changePct ?? 0) > 0).length
    const losers     = indexStocks.filter(q => (q.changePct ?? 0) < 0).length
    const unchanged  = indexStocks.length - gainers - losers
    const label      = INDEX_OPTIONS.find(o => o.value === indexKey)?.label ?? indexKey
    return { totalPts, totalVol, gainers, losers, unchanged, label, count: indexStocks.length }
  }, [indexStocks, indexKey, indexLevels])

  // Sector drill-down
  const selData = selected ? sectors.get(selected) : null

  const up = (kse?.totalPts ?? 0) >= 0

  return (
    <div className="space-y-5 animate-data">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Activity size={20} style={{ color: '#FEA500' }} />
            Indices
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            PSX index breakdown — sector wheel &amp; top contributors
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Index selector */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-border)' }}>
            {INDEX_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setIndexKey(opt.value)}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: indexKey === opt.value
                    ? 'linear-gradient(135deg,#FEA500,#986300)'
                    : 'var(--bg-card)',
                  color: indexKey === opt.value ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 12,
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
              color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
          <div className="animate-spin rounded-full border-2 border-t-amber-500"
               style={{ width: 36, height: 36, borderColor: 'var(--bg-border)', borderTopColor: '#FEA500' }} />
        </div>
      ) : !indexStocks.length ? (
        <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          No data available for {indexKey}
        </div>
      ) : (
        <>
          {/* KPI Row */}
          {kse && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
              {[
                {
                  label: `${kse.label} Change`,
                  value: `${kse.totalPts >= 0 ? '+' : ''}${kse.totalPts.toFixed(2)} pts`,
                  sub: '',
                  color: up ? '#4ade80' : '#f87171',
                  Icon: up ? TrendingUp : TrendingDown,
                },
                {
                  label: 'Components',
                  value: kse.count.toLocaleString(),
                  sub: `${sectors.size} sectors`,
                  color: '#FEA500',
                  Icon: Activity,
                },
                {
                  label: 'Gainers',
                  value: kse.gainers,
                  sub: '',
                  color: '#4ade80',
                  Icon: TrendingUp,
                },
                {
                  label: 'Losers',
                  value: kse.losers,
                  sub: '',
                  color: '#f87171',
                  Icon: TrendingDown,
                },
                {
                  label: 'Unchanged',
                  value: kse.unchanged,
                  sub: '',
                  color: 'var(--text-muted)',
                  Icon: Activity,
                },
                {
                  label: 'Volume',
                  value: kse.totalVol.toLocaleString('en-PK'),
                  sub: 'shares',
                  color: '#60a5fa',
                  Icon: Activity,
                },
              ].map(({ label, value, sub, color, Icon }) => (
                <div key={label} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon size={14} style={{ color }} />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                  </div>
                  {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Sector Wheel — full width */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                SECTOR ALLOCATION — {kse?.label}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                All PSX sectors shown · colored = present in {kse?.label} · click a slice to explore
              </p>
            </div>
            <SectorWheel
              sectors={sectors}
              allSectorNames={allSectorNames}
              selected={selected}
              onSelect={setSelected}
            />
          </div>

          {/* Drill-down panel — full width below wheel */}
          {selected && (
            <div className="card" style={{ padding: 16 }}>
              {!selData ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: 24 }}>📭</span>
                  <p style={{ marginTop: 8, fontWeight: 600, color: 'var(--text-primary)' }}>{selected}</p>
                  <p style={{ fontSize: 13 }}>No {kse?.label} stocks in this sector</p>
                </div>
              ) : (
                <>
                  {/* Sector KPI bar */}
                  <div style={{
                    borderRadius: 10, padding: '14px 20px', marginBottom: 14,
                    background: selData.color + '14', border: `1px solid ${selData.color}44`,
                    display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: selData.color }}>{selected}</div>
                    {[
                      ['Stocks',     String(selData.stocks.length),                                                              'var(--text-primary)'],
                      ['Avg Change', `${selData.pctChange >= 0 ? '+' : ''}${selData.pctChange.toFixed(2)}%`,                    selData.pctChange >= 0 ? '#4ade80' : '#f87171'],
                      ['Mkt Cap',    `Rs ${selData.marketCap.toLocaleString('en-PK')}`, '#60a5fa'],
                    ].map(([l, v, c]) => (
                      <div key={String(l)}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: String(c), fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                      </div>
                    ))}
                    <button
                      onClick={() => setSelected(null)}
                      style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, fontSize: 11,
                        background: 'var(--bg-hover)', border: '1px solid var(--bg-border)',
                        color: 'var(--text-muted)', cursor: 'pointer' }}
                    >✕ Close</button>
                  </div>

                  {/* Stock grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8 }}>
                    {selData.stocks
                      .slice().sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
                      .map(q => {
                        const chg = q.changePct ?? 0
                        const up2 = chg >= 0
                        return (
                          <Link key={q.symbol} href={`/stocks/${q.symbol}`}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 14px', borderRadius: 8, textDecoration: 'none',
                              background: 'var(--bg-hover)', border: '1px solid var(--bg-border)',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#FEA500' }}>{q.symbol}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                {(q.name ?? '').slice(0, 24)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                {q.price?.toFixed(2) ?? '—'}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: up2 ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                                {up2 ? '+' : ''}{chg.toFixed(2)}%
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Top Points Contributors */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  TOP POINTS CONTRIBUTORS — {kse?.label}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Stocks ranked by absolute index point impact · hover for detail
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[10, 20, 30].map(n => (
                  <button
                    key={n}
                    onClick={() => setTopN(n)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: '1px solid var(--bg-border)', cursor: 'pointer',
                      background: topN === n ? 'linear-gradient(135deg,#FEA500,#986300)' : 'var(--bg-card)',
                      color: topN === n ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>
            <ContribHistogram bars={topContribs} />
          </div>

          {/* Full stock table for selected sector OR all index stocks */}
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              {selected ? `${selected} — All Stocks` : `All ${kse?.label} Stocks`}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 10 }}>
                ({(selected ? (selData?.stocks ?? []) : indexStocks).length} companies)
              </span>
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    {['Symbol', 'Name', 'LTP', 'Change', '% Change', 'Volume', 'Sector'].map(h => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: h === 'Symbol' || h === 'Name' ? 'left' : 'right',
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                        color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selected ? (selData?.stocks ?? []) : indexStocks)
                    .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
                    .map((q, i) => {
                      const chg = q.changePct ?? 0
                      const up2 = chg >= 0
                      return (
                        <tr key={q.symbol} style={{
                          borderBottom: '1px solid var(--bg-border)',
                          background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                        }}>
                          <td style={{ padding: '8px 10px' }}>
                            <Link href={`/stocks/${q.symbol}`} style={{ color: '#FEA500', fontWeight: 700, textDecoration: 'none' }}>
                              {q.symbol}
                            </Link>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', maxWidth: 200 }}>
                            {(q.name ?? '').slice(0, 28)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {q.price?.toFixed(2) ?? '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: up2 ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                            {up2 ? '+' : ''}{(q.change ?? 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: up2 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                              color: up2 ? '#4ade80' : '#f87171',
                            }}>
                              {up2 ? '+' : ''}{chg.toFixed(2)}%
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {(q.volume ?? 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 10 }}>
                            {normSector(q.sector ?? '')}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
