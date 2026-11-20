'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Activity, RefreshCw, ArrowLeft, X } from 'lucide-react'
import { cachedFetch } from '@/lib/utils/clientCache'
import { useTheme } from '@/components/providers/ThemeProvider'
import { formatVolume, formatCompactMC } from '@/lib/utils/format'
import type { StockQuote } from '@/types/market'

// ─── Sector palette — corporate: gold lead + navy, teal, slate, bronze ─────
const SECTOR_PALETTE = [
  '#C9962B','#1F3A5F','#2E7D7A','#8A6A3B','#4A6C8C',
  '#B5A07A','#3B4A5A','#6F8F7A','#A35D3D','#7D8C9B',
  '#D4B26A','#28566E','#5B7F95','#9C8462','#46705E',
  '#C27C4E','#2D4458','#88A3B5','#B98E4F','#5E6B78',
  '#A7B8A0','#7A5230','#3F7F9A','#CDBB95','#53616E',
  '#9FB3C8','#8E7356','#4C8A84','#B0B9C2','#6A5A48',
  '#94A7A1',
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

// ─── Sector Wheel (SVG donut — modern corporate) ────────────────────────────
// pctChange on SectorData is a fraction (0.0012 = 0.12%) — fmtPct scales it.
const fmtPct = (f: number) => `${f >= 0 ? '+' : ''}${(f * 100).toFixed(2)}%`

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

// Market cap for a stock — same convention as the sector aggregation
function stockCap(q: StockQuote) {
  return (q.lastClose || 0) > 0 && (q.sharesOut || 0) > 0
    ? q.lastClose * q.sharesOut
    : q.mc > 0 ? q.mc : (q.price || 0) * (q.sharesOut || 0)
}

type Slice = { key: string; label: string; sub?: string; color: string; shade: number; chg: number; value: number; share: number; a0: number; a1: number; href?: string }

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
  const [hovered, setHovered] = useState<string | null>(null)
  useEffect(() => { setHovered(null) }, [selected])

  const activeSectors = useMemo(() =>
    allSectorNames
      .filter(n => sectors.has(n))
      .sort((a, b) => (sectors.get(b)!.marketCap) - (sectors.get(a)!.marketCap)),
  [allSectorNames, sectors])

  const totalMktCap = useMemo(() =>
    activeSectors.reduce((s, n) => s + (sectors.get(n)?.marketCap ?? 0), 0),
  [activeSectors, sectors])

  const selSd   = selected ? sectors.get(selected) ?? null : null
  const drill   = !!selSd

  // Geometry
  const S = 320, cx = S / 2, cy = S / 2, R1 = 150, R0 = 108, GAP = 0.012

  const slices: Slice[] = useMemo(() => {
    const items = drill
      ? selSd!.stocks.map(q => ({ key: q.symbol, label: q.symbol, sub: q.name, value: stockCap(q), chg: q.changePct || 0, color: selSd!.color, href: `/stocks/${q.symbol}` }))
      : activeSectors.map(n => { const d = sectors.get(n)!; return { key: n, label: n, sub: undefined, value: d.marketCap, chg: d.pctChange, color: d.color, href: undefined } })
    items.sort((x, y) => y.value - x.value)
    const total = items.reduce((t, x) => t + x.value, 0) || 1
    let cur = -Math.PI / 2
    return items.map((it, i) => {
      const sweep = (it.value / total) * Math.PI * 2
      const a0 = cur, a1 = cur + sweep
      cur = a1
      const pad = items.length > 1 && sweep > GAP * 3 ? GAP / 2 : 0
      // In drill mode every company is a shade of the sector colour
      const shade = drill ? Math.max(0.35, 1 - (i / Math.max(1, items.length - 1)) * 0.65) : 1
      return { ...it, shade, share: (it.value / total) * 100, a0: a0 + pad, a1: a1 - pad }
    })
  }, [drill, selSd, activeSectors, sectors])

  const totalValue  = drill ? selSd!.marketCap : totalMktCap
  const focusSl     = hovered ? slices.find(x => x.key === hovered) ?? null : null
  const weightedChg = useMemo(() => {
    const t = slices.reduce((s, x) => s + x.value, 0)
    return t ? slices.reduce((s, x) => s + x.chg * x.value, 0) / t : 0
  }, [slices])

  const top = slices.slice(0, 8)
  const restShare = slices.slice(8).reduce((s, x) => s + x.share, 0)

  function clickSlice(sl: Slice) {
    if (drill) { if (sl.href) window.location.href = sl.href }
    else onSelect(sl.key)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] xl:grid-cols-[minmax(0,340px)_1fr] items-center">
      {/* Donut */}
      <div className="relative mx-auto w-full" style={{ maxWidth: 340, containerType: 'inline-size' }}>
        <svg key={selected ?? 'all'} viewBox={`0 0 ${S} ${S}`} className="w-full h-auto block wheel-spin" role="img"
          aria-label={drill ? `${selected} companies` : 'Sector allocation'}>
          <circle cx={cx} cy={cy} r={(R0 + R1) / 2} fill="none" stroke="var(--bg-border)" strokeWidth={R1 - R0} opacity={0.5} />
          {slices.map(sl => {
            if (sl.a1 <= sl.a0) return null
            const on  = hovered === sl.key
            const dim = hovered && !on
            const path = sl.a1 - sl.a0 >= Math.PI * 2 - 0.001
              ? null
              : arcPath(cx, cy, on ? R0 - 2 : R0, on ? R1 + 6 : R1, sl.a0, sl.a1)
            return path ? (
              <path key={sl.key} d={path} fill={sl.color} fillOpacity={sl.shade}
                opacity={dim ? 0.35 : 1} style={{ cursor: 'pointer', transition: 'opacity .2s' }}
                onMouseEnter={() => setHovered(sl.key)} onMouseLeave={() => setHovered(null)}
                onClick={() => clickSlice(sl)}>
                <title>{`${sl.label} · ${sl.share.toFixed(1)}%`}</title>
              </path>
            ) : (
              <circle key={sl.key} cx={cx} cy={cy} r={(R0 + R1) / 2} fill="none" stroke={sl.color} strokeWidth={R1 - R0}
                style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(sl.key)} onMouseLeave={() => setHovered(null)}
                onClick={() => clickSlice(sl)} />
            )
          })}
          <circle cx={cx} cy={cy} r={R0 - 14} fill="none" stroke="var(--bg-border)" strokeWidth={1} />
          {drill && (
            <circle cx={cx} cy={cy} r={R0 - 4} fill="transparent" style={{ cursor: 'pointer' }}
              onClick={() => onSelect(null)}>
              <title>Back to all sectors</title>
            </circle>
          )}
        </svg>

        {/* Centre read-out */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center" style={{ width: '54%', maxHeight: '54%' }}>
          {focusSl ? (
            <>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: focusSl.color, opacity: focusSl.shade, marginBottom: 6 }} />
              <p className="wheel-txt-label" style={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                {focusSl.label}
              </p>
              {focusSl.sub && <p className="wheel-txt-small truncate max-w-full" style={{ color: 'var(--text-muted)' }}>{focusSl.sub}</p>}
              <p className="wheel-txt-big" style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {focusSl.share.toFixed(1)}%
              </p>
              <p className="wheel-txt-small" style={{ fontWeight: 700, color: focusSl.chg >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtPct(focusSl.chg)}
              </p>
            </>
          ) : (
            <>
              <p className="wheel-txt-label" style={{ fontWeight: 700, letterSpacing: '.08em', color: drill ? selSd!.color : 'var(--text-muted)', textTransform: 'uppercase' }}>
                {drill ? selected : 'Market cap'}
              </p>
              <p className="wheel-txt-big" style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCompactMC(totalValue)}
              </p>
              <p className="wheel-txt-small" style={{ fontWeight: 700, color: weightedChg >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtPct(weightedChg)} today
              </p>
              <p className="wheel-txt-small" style={{ color: 'var(--text-muted)' }}>
                {slices.length} {drill ? (slices.length === 1 ? 'company' : 'companies') : 'sectors'}
              </p>
              {drill && (
                <p className="wheel-txt-small inline-flex items-center gap-1" style={{ color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                  <ArrowLeft size={11} strokeWidth={2.5} /> Click to go back
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="min-w-0">
        <div className="flex items-center justify-between pb-2 mb-1 gap-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
          {drill ? (
            <button onClick={() => onSelect(null)} className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide"
              style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft size={13} strokeWidth={2.5} /> ALL SECTORS
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>/ {selected}</span>
            </button>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-muted)' }}>TOP SECTORS BY WEIGHT</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-muted)' }}>CHG</span>
        </div>
        {(drill ? slices : top).map(sl => {
          const on = hovered === sl.key
          const up = sl.chg >= 0
          const lead = (drill ? slices : top)[0]?.share || 1
          return (
            <button key={sl.key}
              onMouseEnter={() => setHovered(sl.key)} onMouseLeave={() => setHovered(null)}
              onClick={() => clickSlice(sl)}
              className="w-full text-left py-2 px-2 -mx-2 rounded-md transition-colors"
              style={{ background: on ? 'var(--bg-hover)' : 'transparent' }}>
              <div className="flex items-center gap-2.5">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: sl.color, opacity: sl.shade, flexShrink: 0 }} />
                <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2" style={{ fontSize: 12, fontWeight: on ? 700 : 600, color: 'var(--text-primary)' }}>
                  <span className="truncate">{sl.label}</span>
                  {sl.sub && <span className="truncate text-[10px] sm:text-xs" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{sl.sub}</span>}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', width: 44, textAlign: 'right', flexShrink: 0 }}>
                  {sl.share.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: up ? 'var(--color-up)' : 'var(--color-down)', fontVariantNumeric: 'tabular-nums', width: 56, textAlign: 'right', flexShrink: 0 }}>
                  {fmtPct(sl.chg)}
                </span>
              </div>
              <div className="mt-1.5 ml-[18px] h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (sl.share / lead) * 100)}%`, background: sl.color, opacity: sl.shade }} />
              </div>
            </button>
          )
        })}
        {!drill && restShare > 0 && (
          <p className="pt-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            + {slices.length - top.length} other sectors · {restShare.toFixed(1)}% · click a slice to see its companies
          </p>
        )}
        {drill && (
          <p className="pt-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click a company to open its page</p>
        )}
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
  weight: number   // % weight in index (0-100)
  mc: number       // market cap in PKR (000's)
}

function ContribHistogram({ bars }: { bars: ContribBar[] }) {
  const ref    = useRef<HTMLCanvasElement>(null)
  // Each hit area tracks its pixel bounds for precise hover detection
  const hitRef = useRef<{ x: number; w: number; yTop: number; yBot: number; bar: ContribBar }[]>([])
  const [tip, setTip] = useState<(ContribBar & { x: number; y: number; flipLeft: boolean }) | null>(null)
  const { theme } = useTheme()  // re-draw whenever dark/light toggles

  // Re-draw on resize and browser zoom (zoom changes devicePixelRatio and the
  // canvas CSS width) — otherwise the old bitmap is stretched and text distorts.
  const [sizeTick, setSizeTick] = useState(0)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    const bump = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setSizeTick(t => t + 1)) }
    const ro = new ResizeObserver(bump)
    ro.observe(canvas)
    let mq: MediaQueryList | null = null
    const watchDpr = () => {
      mq?.removeEventListener('change', onDpr)
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      mq.addEventListener('change', onDpr)
    }
    function onDpr() { bump(); watchDpr() }
    watchDpr()
    return () => { ro.disconnect(); mq?.removeEventListener('change', onDpr); cancelAnimationFrame(raf) }
  }, [])

  // Split into mirrored gainers (above) and losers (below), each sorted descending
  const gainers = useMemo(() => bars.filter(b => b.pts >= 0).sort((a, b) => b.pts - a.pts),  [bars])
  const losers  = useMemo(() => bars.filter(b => b.pts <  0).sort((a, b) => a.pts - b.pts),  [bars])
  const totalCols = Math.max(gainers.length, losers.length, 1)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !bars.length) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const css     = getComputedStyle(document.documentElement)
    const isDark  = document.documentElement.classList.contains('dark')
    const textMut = css.getPropertyValue('--text-muted').trim() || (isDark ? '#7a839e' : '#64748b')
    const textPri = css.getPropertyValue('--text-primary').trim() || (isDark ? '#f1f5f9' : '#0f172a')
    const border  = css.getPropertyValue('--bg-border').trim()  || (isDark ? '#1e2232' : '#e2e8f0')

    // Narrow screens: tighter padding and fewer columns so labels never overlap
    const narrow = W < 640
    const PAD = narrow ? { top: 44, right: 8, bottom: 52, left: 40 } : { top: 52, right: 20, bottom: 60, left: 72 }
    const cW = W - PAD.left - PAD.right
    const cH = H - PAD.top  - PAD.bottom

    // Symmetric axis — zero line stays exactly centred
    const absMax = Math.max(
      ...gainers.map(b => Math.abs(b.pts)),
      ...losers.map(b => Math.abs(b.pts)),
      1
    )
    // sqrt scale: compresses the huge range so small bars are still distinctly taller
    // than the next tier. min 5% of half-chart height, max 95% of half-chart height.
    const halfH  = cH / 2
    const minBh  = halfH * 0.10   // 10% of half = 5% of total — always visible
    const maxBh  = halfH * 0.95
    const toBarH = (v: number) => {
      const fraction = Math.abs(v) / absMax           // 0→1 linear
      const scaled   = Math.pow(fraction, 0.45)       // sqrt-ish compression
      return Math.max(scaled * maxBh, minBh)
    }
    const z0 = PAD.top + halfH   // zero line at exact vertical midpoint

    // Grid: just the zero reference + two symmetric tick labels (max gain / max loss)
    ctx.strokeStyle = border; ctx.lineWidth = 0.5; ctx.setLineDash([3, 4])
    ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(W - PAD.right, PAD.top); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top + cH); ctx.lineTo(W - PAD.right, PAD.top + cH); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(`+${absMax.toFixed(2)}`, PAD.left - 6, PAD.top)
    ctx.fillText(`-${absMax.toFixed(2)}`, PAD.left - 6, PAD.top + cH)

    // Zero line (gold, solid)
    ctx.strokeStyle = 'rgba(254,165,0,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(PAD.left, z0); ctx.lineTo(W - PAD.right, z0); ctx.stroke()

    const MIN_COL = narrow ? 38 : 44                      // px per column needed for readable labels
    const cols = Math.max(1, Math.min(totalCols, Math.floor(cW / MIN_COL)))
    const gW = cW / cols
    const bW = Math.max(Math.min(gW * 0.78, 52), 10)
    hitRef.current = []

    const drawBar = (b: ContribBar, colIdx: number) => {
      const up     = b.pts >= 0
      const cx2    = PAD.left + colIdx * gW + gW / 2
      const bx     = cx2 - bW / 2
      const bh     = toBarH(b.pts)
      const barTop = up ? z0 - bh : z0

      // No shadow blur — keeps bars sharp and crisp
      const grad = ctx.createLinearGradient(0, barTop, 0, barTop + bh)
      if (up) { grad.addColorStop(0, '#22c55e'); grad.addColorStop(1, '#166534') }
      else    { grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#7f1d1d') }
      ctx.fillStyle = grad

      const r = Math.min(4, bW / 2)
      ctx.beginPath()
      if (up) {
        ctx.moveTo(bx + r, barTop); ctx.lineTo(bx + bW - r, barTop)
        ctx.quadraticCurveTo(bx + bW, barTop, bx + bW, barTop + r)
        ctx.lineTo(bx + bW, barTop + bh); ctx.lineTo(bx, barTop + bh)
        ctx.lineTo(bx, barTop + r); ctx.quadraticCurveTo(bx, barTop, bx + r, barTop)
      } else {
        ctx.moveTo(bx, barTop); ctx.lineTo(bx + bW, barTop)
        ctx.lineTo(bx + bW, barTop + bh - r); ctx.quadraticCurveTo(bx + bW, barTop + bh, bx + bW - r, barTop + bh)
        ctx.lineTo(bx + r, barTop + bh); ctx.quadraticCurveTo(bx, barTop + bh, bx, barTop + bh - r)
        ctx.lineTo(bx, barTop)
      }
      ctx.closePath(); ctx.fill()

      // Sheen
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(bx + 1, barTop, bW - 2, 2)

      // Labels — all outside the bar, symbol uses theme primary color so it's always readable
      const fs = Math.min(10, Math.max(8, gW / 4.2))
      const sf = Math.max(8, fs - 1)
      ctx.textAlign = 'center'
      const ptsStr = `${b.pts >= 0 ? '+' : ''}${b.pts.toFixed(2)}`
      const pctStr = fmtPct(b.pct)

      if (up) {
        // Green bars: symbol just above bar top, pts above symbol
        ctx.fillStyle = textPri; ctx.font = `700 ${sf}px system-ui`
        ctx.textBaseline = 'bottom'; ctx.fillText(b.symbol.slice(0, 6), cx2, barTop - 1)
        ctx.fillStyle = '#16a34a'; ctx.font = `700 ${fs}px system-ui`
        ctx.textBaseline = 'bottom'; ctx.fillText(ptsStr, cx2, barTop - 1 - sf - 1)
      } else {
        // Red bars: pts just below bar (1px gap), symbol below pts
        ctx.fillStyle = '#dc2626'; ctx.font = `700 ${fs}px system-ui`
        ctx.textBaseline = 'top'; ctx.fillText(ptsStr, cx2, barTop + bh + 1)
        ctx.fillStyle = textPri; ctx.font = `700 ${sf}px system-ui`
        ctx.textBaseline = 'top'; ctx.fillText(b.symbol.slice(0, 6), cx2, barTop + bh + 1 + fs + 2)
      }

      hitRef.current.push({ x: bx - 4, w: bW + 8, yTop: barTop, yBot: barTop + bh, bar: b })
    }

    // Draw all gainers (above) then all losers (below) at paired column positions
    gainers.slice(0, cols).forEach((b, i) => drawBar(b, i))
    losers.slice(0, cols).forEach((b, i)  => drawBar(b, i))

    // Y-axis label
    if (!narrow) { ctx.save(); ctx.translate(12, PAD.top + cH / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Index Points', 0, 0); ctx.restore() }

    // Note how many are shown when the width forces a cut
    if (cols < totalCols) {
      ctx.fillStyle = textMut; ctx.font = '9px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'
      ctx.fillText(`Top ${cols} of ${totalCols} shown`, W - PAD.right, 6)
    }
  }, [gainers, losers, totalCols, bars, theme, sizeTick])  // theme from useTheme() triggers redraw on dark/light switch

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px  = (e.clientX - rect.left) * (e.currentTarget.offsetWidth  / rect.width)
    const py  = (e.clientY - rect.top)  * (e.currentTarget.offsetHeight / rect.height)
    const hit = hitRef.current.find(h => px >= h.x && px < h.x + h.w && py >= h.yTop && py <= h.yBot)
    if (!hit) { setTip(null); e.currentTarget.style.cursor = 'default'; return }
    e.currentTarget.style.cursor = 'pointer'
    const relX = e.clientX - rect.left
    const flipLeft = relX > rect.width * 0.6
    setTip({ ...hit.bar, x: relX, y: e.clientY - rect.top - 8, flipLeft })
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={ref} onMouseMove={onMove} onMouseLeave={() => setTip(null)}
        style={{ width: '100%', height: 420, display: 'block' }} />
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
            ['Index Points', `${tip.pts >= 0 ? '+' : ''}${tip.pts.toFixed(2)}`,  tip.pts >= 0 ? '#4ade80' : '#f87171'],
            ['% Px Chg',     fmtPct(tip.pct), tip.pct >= 0 ? '#4ade80' : '#f87171'],
            ['Weight',       `${tip.weight.toFixed(2)}%`,                          'var(--text-secondary)'],
            ['Mkt Cap (000s)', `PKR ${tip.mc.toLocaleString('en-PK')}`,            'var(--text-secondary)'],
            ['Sector',       tip.sector,                                            'var(--text-muted)'],
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
  // USD/PKR rate for showing market cap in dollars (from /api/market/macro —
  // external FX source, cached; no Capital Stake calls)
  const [usdPkr, setUsdPkr] = useState<number | null>(null)
  useEffect(() => {
    cachedFetch<{ usdPkr?: { value: number } | null }>('/api/market/macro', 60 * 60_000)
      .then(j => { if (j?.usdPkr?.value) setUsdPkr(j.usdPkr.value) })
      .catch(() => {})
  }, [])
  const [indexKey,    setIndexKey]    = useState('KSE100')
  const [selected,    setSelected]    = useState<string | null>(null)

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
      const color = SECTOR_PALETTE[PSX_ALL_SECTORS.indexOf(sName) % SECTOR_PALETTE.length] ?? '#7D8C9B'
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

  // Top contributors: top 15 gainers + top 15 losers by absolute index point impact
  const topContribsSplit = useMemo(() => {
    const prevIndexLevel = indexLevels[indexKey]?.prevClose ?? 0
    // Total market cap of all index stocks (using API-provided mc)
    const totalPrevMC = indexStocks.reduce((s, q) => s + (q.mc > 0 ? q.mc : 0), 0)

    return indexStocks
      .filter(q => (q.changePct ?? 0) !== 0)
      .map(q => {
        // Use API-provided market cap directly — same source as reference platform
        const pmc = q.mc > 0 ? q.mc : 0
        // Index points contribution = weight × index prevClose × pctChange/100
        const pts = totalPrevMC > 0 && prevIndexLevel > 0
          ? (pmc / totalPrevMC) * prevIndexLevel * (q.changePct ?? 0)   // changePct is already a fraction
          : (q.change ?? 0)
        const weight = totalPrevMC > 0 ? (pmc / totalPrevMC) * 100 : 0
        return {
          symbol: q.symbol,
          name:   q.name ?? q.symbol,
          pts,
          pct:    q.changePct ?? 0,
          sector: normSector(q.sector ?? ''),
          weight,
          mc:     Math.round(pmc / 1000),   // API mc is in PKR → display in 000's
        }
      })
      .sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts))
      .reduce<{ g: ContribBar[]; l: ContribBar[] }>((acc, b) => {
        if (b.pts >= 0 && acc.g.length < 15) acc.g.push(b)
        if (b.pts <  0 && acc.l.length < 15) acc.l.push(b)
        return acc
      }, { g: [], l: [] })
  }, [indexStocks, indexLevels, indexKey])

  // Flatten for histogram — top 15 gainers + top 15 losers
  const topContribs = useMemo(
    () => [...(topContribsSplit?.g ?? []), ...(topContribsSplit?.l ?? [])],
    [topContribsSplit]
  )

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
    <div className="space-y-5 animate-data" style={{ overflowX: 'hidden' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Activity size={20} style={{ color: '#FEA500' }} />
            Indices
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            PSX index breakdown — sector wheel &amp; top contributors
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
          {/* Index selector — dropdown below xl (phones, tablets, small laptops with sidebar), segmented buttons on desktop */}
          <select value={indexKey} onChange={e => setIndexKey(e.target.value)} aria-label="Select index"
            className="xl:hidden flex-1 sm:flex-none sm:w-44 min-w-0 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            {INDEX_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <div className="hidden xl:flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bg-border)' }}>
            {INDEX_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setIndexKey(opt.value)}
                style={{
                  padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
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
            aria-label="Refresh"
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 xl:py-1.5 rounded-lg text-xs"
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden xl:inline">Refresh</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
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
                  value: formatVolume(kse.totalVol),
                  sub: 'shares',
                  color: '#60a5fa',
                  Icon: Activity,
                },
              ].map(({ label, value, sub, color, Icon }) => (
                <div key={label} className="card min-w-0 !px-3 !py-2.5 sm:!px-4 sm:!py-3.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 min-w-0">
                    <Icon size={13} style={{ color, flexShrink: 0 }} />
                    <span className="truncate" title={label} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </div>
                  <div className="truncate text-base sm:text-lg" style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
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
                Weighted by market cap · hover or click a sector to explore
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
                  {/* Sector KPI bar — header row + responsive stat grid */}
                  <div className="rounded-[10px] p-3 sm:px-5 sm:py-3.5 mb-3.5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8"
                    style={{ background: selData.color + '14', border: `1px solid ${selData.color}44` }}>
                    <div className="flex items-center justify-between gap-3 lg:contents">
                      <div className="truncate text-sm sm:text-[15px] font-bold" style={{ color: selData.color }}>{selected}</div>
                      <button onClick={() => setSelected(null)}
                        className="inline-flex items-center gap-1 shrink-0 lg:order-last lg:ml-auto"
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                          background: 'var(--bg-hover)', border: '1px solid var(--bg-border)',
                          color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={12} /> Close
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 lg:flex lg:gap-8">
                      {[
                        ['Stocks',        String(selData.stocks.length), 'var(--text-primary)'],
                        ['Avg Change',    fmtPct(selData.pctChange),     selData.pctChange >= 0 ? '#4ade80' : '#f87171'],
                        ['Mkt Cap',       formatCompactMC(selData.marketCap), '#60a5fa'],
                        ['Mkt Cap (USD)', usdPkr ? formatCompactMC(selData.marketCap / usdPkr).replace('Rs ', '$') : '—', '#60a5fa'],
                      ].map(([l, v, c]) => (
                        <div key={String(l)} className="min-w-0">
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                          <div className="text-[15px] sm:text-[17px] truncate" style={{ fontWeight: 700, color: String(c), fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stock grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: 8 }}>
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
                                {fmtPct(chg)}
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
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                TOP POINTS CONTRIBUTORS — {kse?.label}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Stocks ranked by absolute index point impact
              </p>
            </div>

            {/* Mobile: top 8 gainers + 8 losers as cards */}
            <div className="sm:hidden space-y-3">
              {/* Gainers */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#16a34a' }}><TrendingUp size={12} /> Top Point Contributors</p>
                <div className="space-y-1.5">
                  {(topContribsSplit?.g ?? []).slice(0, 8).map(b => (
                    <div key={b.symbol} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                      <Link href={`/stocks/${b.symbol}`} className="font-bold text-xs shrink-0 w-16 truncate" style={{ color: '#FEA500', textDecoration: 'none' }}>{b.symbol}</Link>
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(b.pts) / Math.abs((topContribsSplit?.g[0]?.pts) ?? 1) * 100, 100)}%`, backgroundColor: '#22c55e' }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold font-number shrink-0" style={{ color: '#4ade80' }}>+{b.pts.toFixed(2)}</span>
                      <span className="text-[10px] font-semibold font-number shrink-0" style={{ color: '#16a34a' }}>{fmtPct(b.pct)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Losers */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#dc2626' }}><TrendingDown size={12} /> Top Point Decliners</p>
                <div className="space-y-1.5">
                  {(topContribsSplit?.l ?? []).slice(0, 8).map(b => (
                    <div key={b.symbol} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <Link href={`/stocks/${b.symbol}`} className="font-bold text-xs shrink-0 w-16 truncate" style={{ color: '#FEA500', textDecoration: 'none' }}>{b.symbol}</Link>
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(b.pts) / Math.abs((topContribsSplit?.l[0]?.pts) ?? 1) * 100, 100)}%`, backgroundColor: '#ef4444' }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold font-number shrink-0" style={{ color: '#f87171' }}>{b.pts.toFixed(2)}</span>
                      <span className="text-[10px] font-semibold font-number shrink-0" style={{ color: '#dc2626' }}>{fmtPct(b.pct)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop: canvas histogram */}
            <div className="hidden sm:block">
              <ContribHistogram bars={topContribs} />
            </div>
          </div>

        </>
      )}
    </div>
  )
}
