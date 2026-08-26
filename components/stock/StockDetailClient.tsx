'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TrendingUp, TrendingDown, BarChart2, FileText, Users,
  Newspaper, Bell, Building2, ChevronDown, ExternalLink,
} from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/utils/format'
import type { StockQuote } from '@/types/market'
import { COMPANY_BRANDS } from '@/data/company-brands'

/* ── Types ──────────────────────────────────────────────────────── */
type Overview = Record<string, number | string>

type Candle = {
  date: string; open: number; high: number
  low: number; close: number; volume: number
}

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

type ProfileData = {
  profile: { data: {
    name: string; symbol: string; sector_name: string; description: string
    people:   Array<{ position: string; name: string }>
    auditors: string; offices: string[]
  }}
  org: { data: {
    nm: string; per: Array<{ nm: string; des: string; pht: string; ed: string | null }>
  }} | null
}

type NewsItem = {
  title: string; date: string; description: string
  link: string; image: string; source: string
}

type Announcement = {
  id: number; title: string; date: string; announcementType: string
  dividend: number | null; bonus: number | null; exDate: string | null
  pdf_id: string | null; name: string
}

/* ── Tabs ────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',      label: 'Overview',        Icon: BarChart2  },
  { id: 'chart',         label: 'Chart',            Icon: TrendingUp },
  { id: 'peers',         label: 'Sector Peers',     Icon: Users      },
  { id: 'compare',       label: 'Compare Sector',   Icon: BarChart2  },
  { id: 'financials',    label: 'Financials',       Icon: FileText   },
  { id: 'fundamentals',  label: 'Fundamentals',     Icon: BarChart2  },
  { id: 'shareholders',  label: 'Shareholders',     Icon: Users      },
  { id: 'news',          label: 'News',             Icon: Newspaper  },
  { id: 'announcements', label: 'Announcements',    Icon: Bell       },
] as const

type TabId = typeof TABS[number]['id']

/* ── Helpers ─────────────────────────────────────────────────────── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-semibold font-number" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}>
      {children}
    </h3>
  )
}

function LoadingRows({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-3 w-40 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-3 flex-1 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
      ))}
    </div>
  )
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || isNaN(v)) return '—'
  // Values that are ratios stored as decimals (< 10 and not currency) get %
  return v.toFixed(decimals)
}

/* ── Interactive SVG chart with tooltip ─────────────────────────── */
function MiniChart({ candles, mode }: { candles: Candle[]; mode: 'intraday' | 'weekly' }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (!candles.length) return null

  const prices = candles.map(c => c.close)
  const min    = Math.min(...prices)
  const max    = Math.max(...prices)
  const range  = max - min || 1
  const W = 600; const H = 200; const PAD = 10

  const points = candles.map((c, i) => ({
    x: candles.length > 1 ? (i / (candles.length - 1)) * W : W / 2,
    y: H - PAD - ((c.close - min) / range) * (H - PAD * 2),
    c,
  }))

  const ptStr  = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaD  = `M0,${H} L${ptStr.replace(/ /g, ' L')} L${W},${H} Z`
  const isUp   = candles[candles.length - 1].close >= candles[0].close
  const color  = isUp ? '#16a34a' : '#dc2626'
  const fillOp = isUp ? '#16a34a18' : '#dc262618'

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverIdx(Math.round(ratio * (candles.length - 1)))
  }

  const hp  = hoverIdx !== null ? points[hoverIdx] : null
  const hc  = hoverIdx !== null ? candles[hoverIdx] : null

  function fmtLabel(c: Candle) {
    if (mode === 'intraday') {
      // date field for intraday is typically a unix timestamp or "HH:MM" string
      const d = new Date(Number(c.date) * 1000)
      return isNaN(d.getTime()) ? c.date : d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    }
    const d = new Date(c.date)
    return isNaN(d.getTime()) ? c.date : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div className="relative select-none">
      {/* Hover tooltip */}
      {hp && hc && (
        <div
          className="absolute z-10 pointer-events-none text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg"
          style={{
            left:            Math.min(hp.x / W * 100, 75) + '%',
            top:             4,
            backgroundColor: 'var(--bg-card)',
            border:          '1px solid var(--bg-border)',
            color:           'var(--text-primary)',
            minWidth:        110,
          }}
        >
          <p className="font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{fmtLabel(hc)}</p>
          <div className="grid grid-cols-2 gap-x-2">
            <span style={{ color: 'var(--text-muted)' }}>O</span>
            <span className="font-number text-right">{hc.open.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)' }}>H</span>
            <span className="font-number text-right text-green-600">{hc.high.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)' }}>L</span>
            <span className="font-number text-right text-red-500">{hc.low.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)' }}>C</span>
            <span className="font-number text-right font-bold" style={{ color }}>{hc.close.toFixed(2)}</span>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 220, cursor: 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Area fill */}
        <path d={areaD} fill={fillOp} />
        {/* Line */}
        <polyline points={ptStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

        {/* Crosshair & dot */}
        {hp && (
          <>
            <line x1={hp.x} y1={0} x2={hp.x} y2={H}
                  stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
            <line x1={0} y1={hp.y} x2={W} y2={hp.y}
                  stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
            <circle cx={hp.x} cy={hp.y} r={5} fill={color} stroke="white" strokeWidth="2" />
          </>
        )}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map(r => {
          const val = min + r * range
          const y   = H - PAD - r * (H - PAD * 2)
          return (
            <text key={r} x={4} y={y} fontSize={10} fill="var(--text-muted)" dominantBaseline="middle">
              {val.toFixed(2)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Fundamentals grouped view ───────────────────────────────────── */
type FundGroup = { heading: string; rows: Array<{ label: string; values: (number | null)[] }> }

function fmtFundVal(label: string, val: number | null): string {
  if (val == null) return '—'
  const lbl = label.toLowerCase()
  // Pure ratios shown as Nx (not percentage)
  const isRatio = lbl.includes('cover') || lbl.includes('dividend cover')
  if (isRatio) return `${val.toFixed(2)}x`
  // Percentage-based metrics (decimal → multiply by 100)
  const isPct = lbl.includes('margin') || lbl.includes('yield') ||
    lbl.includes('return on') || lbl.includes('retention') || lbl.includes('payout')
  if (isPct) return `${(val * 100).toFixed(1)}%`
  // Large numbers (shares, per-share values, etc.)
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
  if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(1)}K`
  return val.toFixed(2)
}

function TrendBar({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length < 2) return null
  const min = Math.min(...nums), max = Math.max(...nums)
  const range = max - min || 1
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" className="shrink-0">
      {nums.slice(0, 6).reverse().map((v, i, arr) => {
        const x1 = (i / (arr.length - 1)) * 60 + 2
        const x2 = ((i + 1) / (arr.length - 1)) * 60 + 2
        const y1 = 18 - ((v - min) / range) * 16
        const y2 = 18 - ((arr[i + 1] - min) / range) * 16
        if (i === arr.length - 1) return null
        const rising = arr[i + 1] >= v
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={rising ? '#16a34a' : '#dc2626'} strokeWidth="1.5" strokeLinecap="round" />
      })}
    </svg>
  )
}

/* ── Metric detail modal ──────────────────────────────────────────── */
type MetricRow = { label: string; values: (number | null)[] }
type MetricPeriod = { period_end: string; year: string | number; quarter?: string | null }

function MetricModal({
  row, periods, symbol, onClose,
}: {
  row: MetricRow
  periods: MetricPeriod[]
  symbol: string
  onClose: () => void
}) {
  const [qData,    setQData]    = useState<StatementData | null>(null)
  const [qLoading, setQLoading] = useState(true)

  useEffect(() => {
    setQLoading(true)
    fetch(`/api/stock/${symbol}/statement?type=other&interval=quarterly`)
      .then(r => r.json())
      .then(j => { if (j?.data) setQData(j.data) })
      .catch(() => {})
      .finally(() => setQLoading(false))
  }, [symbol])

  // Close on backdrop click
  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Build paired data for a set of periods + values
  function buildPaired(ps: MetricPeriod[], vals: (number | null)[]) {
    return ps
      .map((p, i) => ({ label: p.quarter ? `${p.year} ${p.quarter}` : String(p.year), value: vals[i] }))
      .filter(d => d.value != null)
      .reverse()
  }

  // Render a bar chart + table section
  function renderSection(title: string, ps: MetricPeriod[], vals: (number | null)[]) {
    const paired = buildPaired(ps, vals)
    if (!paired.length) return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data available</p>
      </div>
    )

    const pvVals = paired.map(d => d.value as number)
    const min    = Math.min(...pvVals)
    const max    = Math.max(...pvVals)
    const range  = max - min || 1
    const barH   = 130
    const barW   = Math.max(26, Math.min(52, Math.floor(460 / paired.length)))

    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{title}</p>

        {/* Bar chart */}
        <div className="overflow-x-auto mb-4">
          <div style={{ minWidth: paired.length * barW + 40, position: 'relative' }}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => {
              const yVal = min + t * range
              return (
                <div key={t} style={{
                  position: 'absolute', left: 0, right: 0,
                  top: barH - t * barH,
                  borderTop: '1px dashed var(--bg-border)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 2, lineHeight: 1 }}>
                    {fmtFundVal(row.label, yVal)}
                  </span>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: barH, gap: 3, paddingLeft: 36 }}>
              {paired.map((d, i) => {
                const v      = d.value!
                const h      = Math.max(2, ((v - min) / range) * (barH - 4))
                const isLast = i === paired.length - 1
                const pos    = v >= 0
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 auto', minWidth: barW - 3 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap' }}>
                      {fmtFundVal(row.label, v)}
                    </span>
                    <div style={{
                      width: '70%', height: h,
                      borderRadius: '4px 4px 0 0',
                      backgroundColor: isLast ? (pos ? '#FEA500' : '#dc2626') : (pos ? '#16a34a' : '#ef4444'),
                      opacity: isLast ? 1 : 0.6,
                      transition: 'height 0.3s',
                    }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 3, paddingLeft: 36, marginTop: 4 }}>
              {paired.map((d, i) => (
                <div key={i} style={{ flex: '1 0 auto', minWidth: barW - 3, textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                <th className="text-left py-2 pr-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Period</th>
                <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Value</th>
                <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {[...paired].reverse().map((d, i, arr) => {
                const prev   = arr[i + 1]?.value ?? null
                const change = d.value != null && prev != null ? d.value - prev : null
                const up     = change != null ? change >= 0 : null
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    <td className="py-2 pr-4 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{d.label}</td>
                    <td className="py-2 text-right text-[12px] font-bold font-number tabular-nums"
                      style={{ color: (d.value ?? 0) < 0 ? '#dc2626' : 'var(--text-primary)' }}>
                      {fmtFundVal(row.label, d.value ?? null)}
                    </td>
                    <td className="py-2 text-right text-[11px] font-semibold font-number tabular-nums"
                      style={{ color: up == null ? 'var(--text-muted)' : up ? '#16a34a' : '#dc2626' }}>
                      {change == null ? '—' : `${up ? '+' : ''}${fmtFundVal(row.label, change)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Find matching quarterly field by label
  const qField = qData?.fields.find(f => !f.is_heading && f.label.trim().toLowerCase() === row.label.trim().toLowerCase())
  const qPeriods = qData?.periods ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onBackdrop}
    >
      <div
        className="rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{row.label}</h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Annual &amp; Quarterly history
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-bold"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto p-5 flex-1 space-y-6">
          {/* Annual section */}
          {renderSection('Annual — Year by Year', periods, row.values)}

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--bg-border)' }} />

          {/* Quarterly section */}
          {qLoading ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Quarterly</p>
              <div className="flex gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-1 h-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                ))}
              </div>
            </div>
          ) : qField
            ? renderSection('Quarterly', qPeriods as MetricPeriod[], qField.values)
            : (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Quarterly</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No quarterly data available for this metric</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

/* ── Fundamentals section definitions ─────────────────────────────── */
const FUND_SECTIONS: { heading: string; match: (lbl: string) => boolean }[] = [
  // ── 1. Equity Ratios ────────────────────────────────────────────────
  {
    heading: 'Equity Ratios',
    match: l => /book value(?! per share)|book value growth|exp.*book value|price to book value|exp.*price to book|return on equity|exp.*return on equity|retention ratio|exp.*retention ratio|equity to assets|return on assets|return on cap|roce|roa\b|roe\b/i.test(l),
  },
  // ── 2. Dividends ────────────────────────────────────────────────────
  {
    heading: 'Dividends',
    match: l => /dividend|payout ratio|exp.*payout|dividend yield|exp.*yield|dividend cover|exp.*dividend/i.test(l),
  },
  // ── 3. Cash ─────────────────────────────────────────────────────────
  {
    heading: 'Cash',
    match: l => /cash flow per share|cash per share|free cash|operating cash|fcf/i.test(l),
  },
  // ── 4. Earnings ─────────────────────────────────────────────────────
  {
    heading: 'Earnings',
    match: l => /\beps\b|earnings per share|latest eps|eps last quarter|last annual eps|price.?to.?earn|price earning|p\/e|exp.*earn|exp.*p\/e|earning growth|peg ratio/i.test(l),
  },
  // ── 5. Important Ratios ─────────────────────────────────────────────
  {
    heading: 'Important Ratios',
    match: l => /book value per share|debt.?to.?equity|debt.equity|xprice|price date|market price|price to book|p\/b/i.test(l),
  },
  // ── 6. Advances & Deposits ──────────────────────────────────────────
  {
    heading: 'Advances & Deposits',
    match: l => /equity to advances|advance.?deposit|cash to deposit/i.test(l),
  },
  // ── 7. Profitability ────────────────────────────────────────────────
  {
    heading: 'Profitability',
    match: l => /profit.*margin|net profit|gross (profit|spread)|operating.*margin|ebitda.*margin|markup per share|mark.?up per share/i.test(l),
  },
  // ── 8. Valuation ────────────────────────────────────────────────────
  {
    heading: 'Valuation',
    match: l => /market cap|enterprise value|\bev\b|ev\//i.test(l),
  },
  // ── 9. Liquidity ────────────────────────────────────────────────────
  {
    heading: 'Liquidity',
    match: l => /current ratio|quick ratio|working capital|acid.?test/i.test(l),
  },
  // ── 10. Solvency ────────────────────────────────────────────────────
  {
    heading: 'Solvency',
    match: l => /interest coverage|leverage|gearing|total debt|long.?term debt|asset coverage/i.test(l),
  },
  // ── 11. Financial Health ────────────────────────────────────────────
  {
    heading: 'Financial Health',
    match: l => /revenue growth|sales growth|ebitda(?!.*margin)|gross profit(?!.*margin)|total assets|net assets|total equity/i.test(l),
  },
]

function assignFundSection(label: string): string {
  for (const sec of FUND_SECTIONS) {
    if (sec.match(label)) return sec.heading
  }
  return 'Other'
}

function FundamentalsView({ data, overview, symbol }: { data: StatementData; overview: Overview | null; symbol: string }) {
  const periods = data.periods.slice(0, 10)   // more periods available for modal
  const ttmIdx  = 0

  const [activeRow, setActiveRow] = useState<MetricRow | null>(null)

  // Collect only data rows then bin into thematic sections
  const allRows = data.fields.filter(f => !f.is_heading && f.label.trim())

  const sectionOrder = [...FUND_SECTIONS.map(s => s.heading), 'Other']
  const buckets: Record<string, FundGroup> = {}
  for (const heading of sectionOrder) buckets[heading] = { heading, rows: [] }
  for (const f of allRows) buckets[assignFundSection(f.label)].rows.push({ label: f.label, values: f.values })
  const groups = sectionOrder.map(h => buckets[h]).filter(g => g.rows.length > 0)

  return (
    <>
      {/* Modal */}
      {activeRow && (
        <MetricModal
          row={activeRow}
          periods={periods}
          symbol={symbol}
          onClose={() => setActiveRow(null)}
        />
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map(group => (
            <div key={group.heading}
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>

              {/* Section header */}
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {group.heading}
                </h3>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Click card for history</span>
              </div>

              {/* Small metric cards — clickable */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {group.rows.map(row => {
                  const ttm        = row.values[ttmIdx]
                  const prev       = row.values[1] ?? null
                  const trend      = ttm != null && prev != null ? (ttm > prev ? 'up' : ttm < prev ? 'down' : 'flat') : null
                  const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : 'var(--text-muted)'
                  const formatted  = fmtFundVal(row.label, ttm)

                  return (
                    <button
                      key={row.label}
                      onClick={() => setActiveRow(row)}
                      className="rounded-xl p-3 flex flex-col gap-2 text-left transition-all hover:brightness-110 active:scale-95"
                      style={{ backgroundColor: 'var(--bg-hover)', cursor: 'pointer', width: '100%' }}>

                      {/* Label + sparkline */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                          {row.label}
                        </span>
                        <TrendBar values={row.values} />
                      </div>

                      {/* Current value + trend */}
                      <div className="flex items-end justify-between gap-1">
                        <span className="text-lg font-bold font-number leading-none"
                          style={{ color: (ttm ?? 0) < 0 ? '#dc2626' : 'var(--text-primary)' }}>
                          {formatted}
                        </span>
                        {trend && trend !== 'flat' && (
                          <span className="text-[10px] font-semibold leading-none mb-0.5" style={{ color: trendColor }}>
                            {trend === 'up' ? '▲' : '▼'} vs prior
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Market Stats (PSX) — from live overview data ── */}
        {overview && (() => {
          const fmt  = (v: number | undefined | null, prefix = '') =>
            v && Number(v) ? `${prefix}${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
          const fmtV = (v: number | undefined | null) =>
            v && Number(v) >= 1_000_000 ? `${(Number(v) / 1_000_000).toFixed(2)}M`
              : v && Number(v) >= 1_000 ? `${(Number(v) / 1_000).toFixed(1)}K`
              : v ? String(v) : '—'

          const stats: { label: string; value: string }[] = [
            { label: 'Prev Close (LDCP)', value: fmt(Number(overview.lastClose)) },
            { label: 'Volume',            value: fmtV(Number(overview.volume))   },
            { label: '52W High',          value: fmt(Number(overview.high52))    },
            { label: '52W Low',           value: fmt(Number(overview.low52))     },
            { label: '50D MA',            value: fmt(Number((overview as any).ma50))  },
            { label: '200D MA',           value: fmt(Number((overview as any).ma200)) },
            { label: 'Idx Weight',        value: (overview as any).idxWeight ? String((overview as any).idxWeight) : '—' },
          ]

          return (
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Market Stats (PSX)
                </h3>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {stats.map(s => (
                  <div key={s.label} className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <span className="text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                    <div className="flex items-end justify-between gap-1">
                      <span className="text-lg font-bold font-number leading-none"
                        style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}

/* ── Shareholders grouped view ───────────────────────────────────── */
function ShareholdersView({ data }: { data: StatementData }) {
  const periods = data.periods.slice(0, 6)

  // Split into groups by heading rows
  type ShGroup = { heading: string; rows: Array<{ label: string; values: (number | null)[] }> }
  const groups: ShGroup[] = []
  let current: ShGroup = { heading: 'Shareholders', rows: [] }
  for (const f of data.fields) {
    if (f.is_heading) {
      if (current.rows.length) groups.push(current)
      current = { heading: f.label, rows: [] }
    } else if (f.label.trim()) {
      current.rows.push({ label: f.label, values: f.values })
    }
  }
  if (current.rows.length) groups.push(current)

  const fmt = (v: number | null) => v == null ? '—' : `${(v * 100).toFixed(2)}%`
  const pct  = (v: number | null) => v == null ? 0 : Math.min(100, Math.max(0, v * 100))

  const COLORS = [
    '#FEA500','#16a34a','#2563eb','#9333ea','#dc2626',
    '#0891b2','#d97706','#15803d','#7c3aed','#b91c1c',
  ]

  return (
    <div className="space-y-6">
      {/* Period strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Periods:
        </span>
        {periods.map(p => (
          <span key={p.period_end}
            className="px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {p.year}
          </span>
        ))}
      </div>

      {groups.map((group, gi) => {
        // Compute total for this group's latest period to make a mini donut legend
        const latestTotal = group.rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)

        return (
          <div key={group.heading}>
            {/* Group heading */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-white">
                  {group.heading}
                </h3>
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
              {latestTotal > 0 && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  Total: {(latestTotal * 100).toFixed(1)}%
                </span>
              )}
            </div>

            <div className="space-y-2">
              {group.rows.map((row, ri) => {
                const latest = row.values[0]
                const prev   = row.values[1] ?? null
                const bar    = pct(latest)
                const color  = COLORS[(gi * 5 + ri) % COLORS.length]
                const trend  = latest != null && prev != null
                  ? latest > prev ? 'up' : latest < prev ? 'down' : 'flat'
                  : null

                return (
                  <div key={row.label}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: 'var(--bg-hover)' }}>

                    {/* Label + latest value + trend */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {row.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {trend && (
                          <span className="text-[10px] font-semibold"
                            style={{ color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : 'var(--text-muted)' }}>
                            {trend === 'up' ? '▲' : '▼'}
                          </span>
                        )}
                        <span className="text-sm font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                          {fmt(latest)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${bar}%`, backgroundColor: color }} />
                    </div>

                    {/* Historical values */}
                    <div className="flex gap-3 flex-wrap">
                      {periods.slice(1).map((p, j) => {
                        const v = row.values[j + 1]
                        return (
                          <div key={p.period_end} className="flex flex-col items-center min-w-[36px]">
                            <span className="text-[9px] leading-none mb-0.5" style={{ color: 'var(--text-muted)' }}>
                              {p.year}
                            </span>
                            <span className="text-[10px] font-number font-semibold leading-none"
                              style={{ color: 'var(--text-secondary)' }}>
                              {fmt(v)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Statement Table ─────────────────────────────────────────────── */
// Capital Stake API returns financial statement values already in thousands of PKR (000's).
// EPS is the only field returned as a raw rupee amount (not in thousands).
function fmtStmt(label: string, val: number | null): string {
  if (val == null) return '—'
  const isEps = /\beps\b/i.test(label)
  if (isEps) return val.toFixed(2)
  // Values are in thousands — format with commas, wrap negatives in parens like Capital Stake
  const abs = Math.abs(Math.round(val))
  const str = abs.toLocaleString('en-US')
  return val < 0 ? `(${str})` : str
}

function StatementTable({ data, maxCols = 6 }: { data: StatementData; maxCols?: number }) {
  const periods = data.periods.slice(0, maxCols)
  return (
    <div className="space-y-2">
      {/* Capital Stake note */}
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        All numbers in thousands (000s) except EPS · Source: Capital Stake
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--bg-border)' }}>
              <th className="text-left py-2 px-2 min-w-[200px] font-semibold"
                  style={{ color: 'var(--text-muted)' }}>
                Item
              </th>
              {periods.map(p => (
                <th key={p.period_end} className="text-right py-2 px-3 whitespace-nowrap font-semibold"
                    style={{ color: 'var(--text-muted)' }}>
                  {p.quarter ? `${p.year} ${p.quarter}` : p.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.fields.map((f, i) => {
              if (f.is_heading) {
                return (
                  <tr key={i}>
                    <td colSpan={periods.length + 1}
                        className="py-2 px-2 text-[11px] font-bold uppercase tracking-wide pt-5"
                        style={{ color: 'var(--text-secondary)' }}>
                      {f.label}
                    </td>
                  </tr>
                )
              }
              const isBold = /^(sales|gross profit|profit (from|before|after)|total)/i.test(f.label.trim())
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}>
                  <td className={`py-2 px-2 ${isBold ? 'font-semibold' : ''}`}
                      style={{ color: isBold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {f.label}
                  </td>
                  {periods.map((_, j) => {
                    const val = f.values[j]
                    const display = fmtStmt(f.label, val)
                    const isNeg = (val ?? 0) < 0
                    return (
                      <td key={j} className={`text-right py-2 px-3 font-number ${isBold ? 'font-semibold' : ''}`}
                          style={{ color: isNeg ? '#dc2626' : isBold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {display}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── TradingView Widget ──────────────────────────────────────────── */
function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.height = '420px'
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = '100%'
    wrapper.appendChild(inner)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol:              `PSX:${symbol}`,
      interval:            'D',
      timezone:            'Asia/Karachi',
      theme:               document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      style:               '1',
      locale:              'en',
      enable_publishing:   false,
      hide_side_toolbar:   false,
      allow_symbol_change: false,
      save_image:          false,
      height:              420,
      width:               '100%',
    })
    wrapper.appendChild(script)
    container.appendChild(wrapper)
  }, [symbol])

  return <div ref={containerRef} className="w-full overflow-hidden rounded-lg" style={{ height: 420 }} />
}

/* ── Index VS Stock — TradingView lightweight-charts ─────────────── */
function IndexVsStockChart({ stockCandles, indexCandles, symbol }: {
  stockCandles: Candle[]; indexCandles: Candle[]; symbol: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLight, setIsLight] = useState(
    () => typeof document !== 'undefined' && !document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const update = () => setIsLight(!document.documentElement.classList.contains('dark'))
    update()
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current || stockCandles.length < 2 || indexCandles.length < 2) return

    // Build aligned % return series inside the effect so closures are fresh
    // Strip timestamp — API returns "2026-08-19 16:00:00", chart needs "2026-08-19"
    const stockMap = new Map(stockCandles.map(c => [c.date.slice(0, 10), c.close]))
    const indexMap = new Map(indexCandles.map(c => [c.date.slice(0, 10), c.close]))
    const dates    = [...stockMap.keys()].filter(d => indexMap.has(d)).sort()
    if (dates.length < 2) return

    const base0S = stockMap.get(dates[0])!
    const base0I = indexMap.get(dates[0])!

    const stockSeries = dates.map(d => ({
      time: d as `${number}-${number}-${number}`,
      value: +((stockMap.get(d)! / base0S - 1) * 100).toFixed(2),
    }))
    const indexSeries = dates.map(d => ({
      time: d as `${number}-${number}-${number}`,
      value: +((indexMap.get(d)! / base0I - 1) * 100).toFixed(2),
    }))

    let cancelled = false
    let dispose: (() => void) | null = null

    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (cancelled || !containerRef.current) return

      const bg     = isLight ? '#ffffff' : '#0C1628'
      const text   = isLight ? '#64748b' : '#5B7499'
      const grid   = isLight ? '#f1f5f9' : '#0F2040'
      const border = isLight ? '#e2e8f0' : '#1C3054'
      const lblBg  = isLight ? '#f8fafc' : '#112040'

      const w = containerRef.current!.getBoundingClientRect().width || 600

      const chart = createChart(containerRef.current!, {
        width:  w,
        height: 280,
        layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
        grid:   { vertLines: { color: grid }, horzLines: { color: grid } },
        crosshair: {
          vertLine: { color: border, labelBackgroundColor: lblBg },
          horzLine: { color: border, labelBackgroundColor: lblBg },
        },
        rightPriceScale: {
          borderColor: border,
          scaleMargins: { top: 0.06, bottom: 0.06 },
        },
        timeScale: { borderColor: border, timeVisible: false },
        handleScroll: true,
        handleScale:  true,
      })

      const stockLine = chart.addLineSeries({
        color:     '#4A8FF4',
        lineWidth: 2,
        title: symbol,
      })
      stockLine.setData(stockSeries)

      const indexLine = chart.addLineSeries({
        color:     '#F5A623',
        lineWidth: 2,
        lineStyle: 1,
        title: 'KSE-100',
      })
      indexLine.setData(indexSeries)

      chart.timeScale().fitContent()

      // ── Custom tooltip ──────────────────────────────────────────
      const tooltip = document.createElement('div')
      Object.assign(tooltip.style, {
        position:     'absolute',
        display:      'none',
        padding:      '8px 10px',
        background:   isLight ? '#ffffff' : '#1e293b',
        border:       `1px solid ${isLight ? '#e2e8f0' : '#334155'}`,
        borderRadius: '6px',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.12)',
        fontSize:     '12px',
        pointerEvents:'none',
        zIndex:       '10',
        minWidth:     '120px',
      })
      containerRef.current!.style.position = 'relative'
      containerRef.current!.appendChild(tooltip)

      chart.subscribeCrosshairMove(param => {
        if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
          tooltip.style.display = 'none'
          return
        }
        const sVal = param.seriesData.get(stockLine) as { value: number } | undefined
        const iVal = param.seriesData.get(indexLine) as { value: number } | undefined
        if (!sVal && !iVal) { tooltip.style.display = 'none'; return }

        // Format date from YYYY-MM-DD string
        const dateStr = typeof param.time === 'string' ? param.time : ''
        const d = new Date(dateStr + 'T00:00:00')
        const label = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })

        const textColor = isLight ? '#374151' : '#cbd5e1'
        const boldColor = isLight ? '#111827' : '#f1f5f9'

        tooltip.innerHTML = `
          <div style="font-weight:600;color:${boldColor};margin-bottom:5px;font-size:11px">${label}</div>
          ${sVal != null ? `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="width:8px;height:8px;border-radius:50%;background:#4A8FF4;flex-shrink:0"></span>
            <span style="color:${textColor}">${symbol}:</span>
            <span style="font-weight:700;color:${boldColor}">${sVal.value.toFixed(1)}%</span>
          </div>` : ''}
          ${iVal != null ? `<div style="display:flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:#F5A623;flex-shrink:0"></span>
            <span style="color:${textColor}">KSE-100:</span>
            <span style="font-weight:700;color:${boldColor}">${iVal.value.toFixed(1)}%</span>
          </div>` : ''}
        `

        const containerW = containerRef.current!.getBoundingClientRect().width
        const tipW = 145
        let left = param.point.x + 12
        if (left + tipW > containerW - 60) left = param.point.x - tipW - 12

        tooltip.style.display = 'block'
        tooltip.style.left = `${left}px`
        tooltip.style.top  = `${Math.max(0, param.point.y - 40)}px`
      })

      const ro = new ResizeObserver(entries => {
        if (!cancelled && entries[0]) {
          chart.applyOptions({ width: entries[0].contentRect.width })
        }
      })
      ro.observe(containerRef.current!)
      dispose = () => { ro.disconnect(); chart.remove() }
    })

    return () => { cancelled = true; dispose?.() }
  }, [isLight, stockCandles, indexCandles, symbol])

  // Compute legend returns from props (for header display only)
  const _sMap = new Map(stockCandles.map(c => [c.date.slice(0, 10), c.close]))
  const _iMap = new Map(indexCandles.map(c => [c.date.slice(0, 10), c.close]))
  const _dates = [..._sMap.keys()].filter(d => _iMap.has(d)).sort()
  const _b0S = _dates.length ? _sMap.get(_dates[0])! : 1
  const _b0I = _dates.length ? _iMap.get(_dates[0])! : 1
  const _last = _dates[_dates.length - 1]
  const stockRet = _last ? +(_sMap.get(_last)! / _b0S - 1).toFixed(4) * 100 : 0
  const indexRet = _last ? +(_iMap.get(_last)! / _b0I - 1).toFixed(4) * 100 : 0
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
      {/* Legend header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
        <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          Index vs Stock — % Return
        </span>
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: '#4A8FF4' }} />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{symbol}</span>
            <span className="font-extrabold tabular-nums" style={{ color: stockRet >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmt(stockRet)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4" style={{ borderTop: '2px dashed #F5A623' }} />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>KSE-100</span>
            <span className="font-extrabold tabular-nums" style={{ color: indexRet >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmt(indexRet)}
            </span>
          </span>
        </div>
      </div>
      {/* Chart */}
      <div ref={containerRef} style={{ height: 280 }} />
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function StockDetailClient({
  symbol,
  overview: overviewProp,
}: {
  symbol:   string
  overview: Overview | null
}) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const validTabIds  = TABS.map(t => t.id)
  const initialTab   = (searchParams.get('tab') ?? 'overview') as TabId
  const [tab, setTab] = useState<TabId>(
    validTabIds.includes(initialTab) ? initialTab : 'overview'
  )
  const loaded = useRef<Set<TabId>>(new Set())

  function switchTab(id: TabId) {
    setTab(id)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', id)
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }

  const [overview,    setOverview]    = useState<Overview | null>(overviewProp)
  const [overviewLoad, setOverviewLoad] = useState(!overviewProp)

  /* Per-tab state */
  const [candles,   setCandles]   = useState<Candle[]>([])
  const [chartMode, setChartMode] = useState<'intraday' | 'weekly'>('intraday')
  const [chartLoad, setChartLoad] = useState(false)

  const [stmtData,   setStmtData]   = useState<StatementData | null>(null)
  const [stmtType,   setStmtType]   = useState<'income' | 'balance'>('income')
  const [stmtInt,    setStmtInt]    = useState<'annual' | 'quarterly'>('annual')
  const [stmtLoad,   setStmtLoad]   = useState(false)
  const [stmtPdfUrl, setStmtPdfUrl] = useState<string | null>(null)

  const [fundData,     setFundData]     = useState<StatementData | null>(null)
  const [fundLoad,     setFundLoad]     = useState(false)
  const [fundInterval, setFundInterval] = useState<'annual' | 'quarterly'>('annual')

  // Snapshot fundamentals — loaded on overview tab so Company Snapshot shows immediately
  const [snapFunds,    setSnapFunds]    = useState<StatementData | null>(null)
  const [snapLoad,     setSnapLoad]     = useState(false)

  const [shData,    setShData]    = useState<StatementData | null>(null)
  const [shLoad,    setShLoad]    = useState(false)

  const [profile,   setProfile]   = useState<ProfileData | null>(null)
  const [profLoad,  setProfLoad]  = useState(false)

  const [peers,       setPeers]      = useState<StockQuote[]>([])
  const [peersLoad,   setPeersLoad]  = useState(false)

  // Compare tab state
  const [cmpSearch,        setCmpSearch]        = useState('')
  const [cmpDropOpen,      setCmpDropOpen]      = useState(false)
  const [cmpSelected,      setCmpSelected]      = useState<string[]>([])
  const [cmpResults,       setCmpResults]       = useState<string[] | null>(null)
  const [radarHover,       setRadarHover]       = useState<number | null>(null)
  const [cmpMetricSelected,setCmpMetricSelected]= useState<string[]>([])   // multi-select
  const [cmpMetricDropOpen,setCmpMetricDropOpen]= useState(false)
  const [cmpMetricCustom,  setCmpMetricCustom]  = useState('')
  const [cmpMetricLoading, setCmpMetricLoading] = useState(false)
  // nested: metricLabel → symbol → yearly rows
  const [cmpMetricData,    setCmpMetricData]    = useState<Record<string,Record<string,{year:string;value:number}[]>>>({})

  function cmpToggle(sym: string) {
    setCmpSelected(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : prev.length < 3 ? [...prev, sym] : prev
    )
  }

  type PeerFunds = { roe: number|null; mktCap: number|null; de: number|null; pb: number|null }
  const [peerFunds, setPeerFunds] = useState<Record<string, PeerFunds>>({})

  function parseFunds(fields: Array<{ label: string; values: (number|null)[] }>): PeerFunds {
    let roe: number|null = null, mktCap: number|null = null, de: number|null = null, pb: number|null = null
    for (const f of fields) {
      if (!f.label || f.values[0] == null) continue
      const l = f.label.toLowerCase()
      const v = f.values[0]
      if (/return on equity|roe\b/.test(l))          roe    = v
      else if (/market cap/.test(l))                  mktCap = v
      else if (/debt.?to.?equity|debt.equity/.test(l)) de   = v
      else if (/price to book|p\/b/.test(l))          pb     = v
    }
    return { roe, mktCap, de, pb }
  }

  async function fetchFunds(sym: string): Promise<PeerFunds> {
    try {
      const j = await fetch(`/api/stock/${sym}/statement?type=fundamentals&interval=annual`).then(r => r.json())
      return parseFunds(j?.data?.fields ?? [])
    } catch { return { roe: null, mktCap: null, de: null, pb: null } }
  }

  const [indexCandles, setIndexCandles] = useState<Candle[]>([])
  const [stockCandles, setStockCandles] = useState<Candle[]>([])
  const [vsLoad,       setVsLoad]       = useState(false)

  // Stock search
  const [allQuotes,    setAllQuotes]    = useState<StockQuote[]>([])
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Load all quotes once for search
  useEffect(() => {
    fetch('/api/market/quotes')
      .then(r => r.json())
      .then(j => setAllQuotes(j.quotes ?? []))
      .catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchResults = searchQuery.trim().length >= 1
    ? allQuotes
        .filter(q =>
          q.symbol.toUpperCase().includes(searchQuery.toUpperCase()) ||
          q.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10)
    : []

  const [news,      setNews]      = useState<NewsItem[]>([])
  const [newsLoad,  setNewsLoad]  = useState(false)

  const [anns,      setAnns]      = useState<Announcement[]>([])
  const [annLoad,   setAnnLoad]   = useState(false)

  const fetchChart = useCallback(async () => {
    setChartLoad(true)
    try {
      const url  = chartMode === 'intraday'
        ? `/api/stock/${symbol}/intraday?period=1D`
        : `/api/stock/${symbol}/daily`
      const res  = await fetch(url)
      const json = await res.json()
      const raw  = Array.isArray(json.data) ? json.data : []
      // intraday: reverse chronological → chronological; weekly: last 35 days (~5 weeks)
      setCandles(chartMode === 'intraday' ? [...raw].reverse() : raw.slice(-35))
    } catch { setCandles([]) }
    setChartLoad(false)
  }, [symbol, chartMode])

  const fetchStatement = useCallback(async () => {
    setStmtLoad(true); setStmtData(null)
    try {
      const res  = await fetch(`/api/stock/${symbol}/statement?type=${stmtType}&interval=${stmtInt}`)
      const json = await res.json()
      if (json.data) setStmtData(json.data)
    } catch {}
    setStmtLoad(false)
  }, [symbol, stmtType, stmtInt])

  // Fetch overview client-side on mount (SSR prop may be null if market data wasn't cached)
  useEffect(() => {
    if (overview) return
    setOverviewLoad(true)
    fetch(`/api/market/${symbol}/overview`)
      .then(r => r.json())
      .then(j => { if (j.data) setOverview(j.data) })
      .catch(() => {})
      .finally(() => setOverviewLoad(false))
  }, [symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load per tab
  useEffect(() => {
    if (loaded.current.has(tab)) return
    loaded.current.add(tab)

    if (tab === 'overview') {
      // Chart data
      if (!stockCandles.length) {
        setVsLoad(true)
        Promise.all([
          fetch(`/api/stock/${symbol}/daily`).then(r => r.json()),
          fetch(`/api/stock/KSE100/daily`).then(r => r.json()),
        ]).then(([sj, ij]) => {
          setStockCandles(Array.isArray(sj.data) ? sj.data : [])
          setIndexCandles(Array.isArray(ij.data) ? ij.data : [])
        }).catch(() => {}).finally(() => setVsLoad(false))
      }

      // Snapshot fundamentals (Company Snapshot card)
      if (!snapFunds) {
        setSnapLoad(true)
        fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
          .then(r => r.json())
          .then(j => { if (j.data) setSnapFunds(j.data) })
          .catch(() => {})
          .finally(() => setSnapLoad(false))
      }
    }

    if ((tab === 'peers' || tab === 'compare') && !peers.length) {
      setPeersLoad(true)
      fetch('/api/market/quotes')
        .then(r => r.json())
        .then(async j => {
          const all: StockQuote[] = j.quotes ?? []
          const sectorCode = all.find(q => q.symbol === symbol)?.sector ?? ''
          if (sectorCode) {
            const filtered = all
              .filter(q =>
                q.sector === sectorCode &&
                q.symbol !== symbol &&
                q.price > 0 &&
                !/\(R\d*\)|\bRight\b/i.test(q.name) &&
                !/R\d*$/.test(q.symbol)
              )
              .sort((a, b) => b.volume - a.volume)
            setPeers(filtered)
            // Fetch fundamentals for self + top 10 peers in parallel
            const symbols = [symbol, ...filtered.slice(0, 10).map(p => p.symbol)]
            const results = await Promise.all(symbols.map(s => fetchFunds(s).then(f => [s, f] as const)))
            setPeerFunds(Object.fromEntries(results))
          }
        })
        .catch(() => {})
        .finally(() => setPeersLoad(false))
    }

    if (tab === 'overview' && !profile) {
      setProfLoad(true)
      fetch(`/api/stock/${symbol}/profile`)
        .then(r => r.json()).then(j => setProfile(j))
        .catch(() => {}).finally(() => setProfLoad(false))
    } else if (tab === 'chart') {
      fetchChart()
    } else if (tab === 'financials') {
      fetchStatement()
      // Fetch latest financial statement PDF from announcements
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json())
        .then(j => {
          if (!Array.isArray(j.announcements)) return
          const fin = j.announcements.find((a: Announcement) =>
            a.pdf_id &&
            /financial|result|statement|account|annual|quarter/i.test(a.announcementType + ' ' + a.title)
          )
          if (fin?.pdf_id) setStmtPdfUrl(fin.pdf_id)
        })
        .catch(() => {})
    } else if (tab === 'fundamentals') {
      setFundLoad(true); setFundData(null)
      fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setFundData(j.data) })
        .catch(() => {}).finally(() => setFundLoad(false))
    } else if (tab === 'shareholders' && !shData) {
      setShLoad(true)
      fetch(`/api/stock/${symbol}/statement?type=shareholders&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setShData(j.data) })
        .catch(() => {}).finally(() => setShLoad(false))
    } else if ((tab as string) === 'profile' && !profile) {
      setProfLoad(true)
      fetch(`/api/stock/${symbol}/profile`)
        .then(r => r.json()).then(j => setProfile(j))
        .catch(() => {}).finally(() => setProfLoad(false))
    } else if (tab === 'news' && !news.length) {
      setNewsLoad(true)
      fetch(`/api/stock/${symbol}/news`)
        .then(r => r.json()).then(j => { if (Array.isArray(j.data)) setNews(j.data.slice(0, 20)) })
        .catch(() => {}).finally(() => setNewsLoad(false))
    } else if (tab === 'announcements' && !anns.length) {
      setAnnLoad(true)
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json()).then(j => { if (j.announcements) setAnns(j.announcements.slice(0, 50)) })
        .catch(() => {}).finally(() => setAnnLoad(false))
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch chart when mode changes
  useEffect(() => {
    if (tab === 'chart') fetchChart()
  }, [chartMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch statement when filters change
  useEffect(() => {
    if (tab === 'financials') fetchStatement()
  }, [stmtType, stmtInt]) // eslint-disable-line react-hooks/exhaustive-deps



  const isUp   = Number(overview?.changePct ?? 0) >= 0
  const sector = String(overview?.sector ?? '')

  return (
    <div className="space-y-5 animate-data">

      {/* ── Stock Search ────────────────────────────────────────────── */}
      <div ref={searchRef} style={{ position: 'relative', zIndex: 40 }}>
        <div className="flex items-center gap-2 px-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search another stock by symbol or name…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="flex-1 py-2.5 text-sm bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
              className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>✕</button>
          )}
        </div>

        {/* Dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            {searchResults.map(q => {
              const up = q.changePct >= 0
              return (
                <a key={q.symbol} href={`/stocks/${q.symbol}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onClick={() => { setSearchQuery(''); setSearchOpen(false) }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                      {q.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{q.symbol}</p>
                      <p className="text-[11px] truncate max-w-[220px]" style={{ color: 'var(--text-muted)' }}>{q.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                      {q.price.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-semibold font-number" style={{ color: up ? '#16a34a' : '#dc2626' }}>
                      {up ? '+' : ''}{q.changePct.toFixed(2)}%
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto hide-scrollbar -mx-1">
        <div className="flex gap-0.5 p-1 rounded-xl w-max min-w-full"
             style={{ backgroundColor: 'var(--bg-hover)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         whitespace-nowrap transition-colors"
              style={tab === t.id
                ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
            >
              <t.Icon size={12} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ OVERVIEW ════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        overviewLoad ? (
          <div className="card space-y-4">
            <div className="h-10 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-2 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                </div>
              ))}
            </div>
          </div>
        ) : overview ? (
          <div className="space-y-4">
            {/* Price card */}
            <div className="card">
              <div className="flex items-end gap-6 mb-5">
                <div>
                  <p className="text-4xl font-black font-number" style={{ color: 'var(--text-primary)' }}>
                    {formatPrice(Number(overview.price))}
                  </p>
                  <p className={`text-base font-semibold font-number mt-1 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                    {isUp ? <TrendingUp size={14} className="inline mr-1" /> : <TrendingDown size={14} className="inline mr-1" />}
                    {formatChange(Number(overview.change))} ({formatPercent(Number(overview.changePct) / 100)})
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4"
                   style={{ borderTop: '1px solid var(--bg-border)' }}>
                <Stat label="Open"      value={formatPrice(Number(overview.open))} />
                <Stat label="High"      value={formatPrice(Number(overview.high))} />
                <Stat label="Low"       value={formatPrice(Number(overview.low))} />
                <Stat label="Volume"    value={formatVolume(Number(overview.volume))} />
                <Stat label="52W High"  value={formatPrice(Number(overview.high52))} />
                <Stat label="52W Low"   value={formatPrice(Number(overview.low52))} />
              </div>
            </div>
            {/* ── Company Snapshot ──────────────────────────────────── */}
            <div className="card">
              <SectionHeading>Company Snapshot</SectionHeading>

              {(() => {
                // ── field extractor ──
                function pick(pattern: RegExp): number | null {
                  if (!snapFunds) return null
                  return snapFunds.fields.find(f => !f.is_heading && pattern.test(f.label.trim()))?.values[0] ?? null
                }

                // ── formatter ──
                function fmtSnap(key: string, raw: number | null): string {
                  if (raw == null || isNaN(raw)) return '—'
                  switch (key) {
                    // Percentage fields (stored as decimal 0–1 in fundamentals)
                    case 'divYield':
                    case 'netMargin':
                      return `${(raw * 100).toFixed(2)}%`
                    case 'freeFloatPct':
                      // May be stored as 0–100 or 0–1; cap heuristic
                      return `${raw > 1 ? raw.toFixed(1) : (raw * 100).toFixed(1)}%`
                    // Ratio / per-share fields — display as-is
                    case 'eps':
                    case 'pe':
                    case 'pb':
                    case 'peg':
                      return raw.toFixed(2)
                    // Large count / monetary fields (stored in thousands by CS API)
                    case 'mktCap':
                    case 'sharesOut':
                    case 'freeFloat': {
                      const abs = Math.abs(raw)
                      if (abs >= 1_000_000) return `${(raw / 1_000_000).toFixed(2)}B`
                      if (abs >= 1_000)     return `${(raw / 1_000).toFixed(2)}M`
                      if (abs >= 1)         return `${raw.toFixed(2)}K`
                      return raw.toFixed(2)
                    }
                    case 'weeklyVol': {
                      const abs = Math.abs(raw)
                      if (abs >= 1_000_000) return `${(raw / 1_000_000).toFixed(2)}M`
                      if (abs >= 1_000)     return `${(raw / 1_000).toFixed(1)}K`
                      return raw.toFixed(0)
                    }
                    default: return raw.toFixed(2)
                  }
                }

                const snap = {
                  mktCap:      pick(/market cap/i),
                  sharesOut:   pick(/shares outstanding/i),
                  freeFloat:   pick(/free float(?!.*%)/i),
                  weeklyVol:   pick(/weekly.*vol|average.*vol/i),
                  freeFloatPct:pick(/free float.*%|free.*float.*percent/i),
                  divYield:    pick(/dividend yield/i),
                  eps:         pick(/\beps\b|latest eps|earnings per share/i),
                  netMargin:   pick(/net.*income.*margin|net.*profit.*margin/i),
                  pb:          pick(/price.*book.*value|price.*to.*book|p\/b\b/i),
                  pe:          pick(/price.*to.*earn|price.*earnings|p\/e\b/i),
                  peg:         pick(/peg/i),
                }

                // ── Fundamentals rows (from snapshot fetch) ──
                const fundRows: { label: string; key: keyof typeof snap; value: string }[] = [
                  { label: 'Market Cap',         key: 'mktCap',       value: fmtSnap('mktCap',       snap.mktCap)       },
                  { label: 'Shares Outstanding', key: 'sharesOut',    value: fmtSnap('sharesOut',    snap.sharesOut)    },
                  { label: 'Free Float Shares',  key: 'freeFloat',    value: fmtSnap('freeFloat',    snap.freeFloat)    },
                  { label: 'Weekly Avg Volume',  key: 'weeklyVol',    value: fmtSnap('weeklyVol',    snap.weeklyVol)    },
                  { label: 'Free Float %',       key: 'freeFloatPct', value: fmtSnap('freeFloatPct', snap.freeFloatPct) },
                  { label: 'Dividend Yield',     key: 'divYield',     value: fmtSnap('divYield',     snap.divYield)     },
                  { label: 'Earnings Per Share', key: 'eps',          value: fmtSnap('eps',          snap.eps ?? (overview.eps ? Number(overview.eps) : null)) },
                  { label: 'Net Income Margin',  key: 'netMargin',    value: fmtSnap('netMargin',    snap.netMargin)    },
                  { label: 'Price to Book',      key: 'pb',           value: fmtSnap('pb',           snap.pb)           },
                  { label: 'Price to Earnings',  key: 'pe',           value: fmtSnap('pe',           snap.pe)           },
                  { label: 'PEG Ratio',          key: 'peg',          value: fmtSnap('peg',          snap.peg)          },
                ]

                const SnapCell = ({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) => (
                  <div className="flex flex-col gap-1 px-4 py-3"
                    style={{ borderRight: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider leading-none"
                      style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </p>
                    {loading
                      ? <div className="h-4 w-16 rounded animate-pulse mt-0.5" style={{ backgroundColor: 'var(--bg-hover)' }} />
                      : <p className="text-sm font-bold font-number leading-none mt-0.5"
                          style={{ color: 'var(--text-primary)' }}>
                          {value}
                        </p>
                    }
                  </div>
                )

                return (
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--bg-border)' }}>

                    {/* Section: Company Info */}
                    <div className="px-4 py-2"
                      style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--bg-border)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--brand)' }}>Company Info</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                      {fundRows.map(r => (
                        <SnapCell key={r.label} label={r.label} value={r.value} loading={snapLoad} />
                      ))}
                    </div>

                  </div>
                )
              })()}
            </div>

            {/* ── Index vs Stock chart ─────────────────────────────── */}
            <div className="card">
              <SectionHeading>Index VS Stocks</SectionHeading>
              {vsLoad ? (
                <div className="h-72 rounded animate-pulse mt-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ) : stockCandles.length > 1 && indexCandles.length > 1
                ? <IndexVsStockChart stockCandles={stockCandles} indexCandles={indexCandles} symbol={symbol} />
                : <p className="text-sm py-4 text-center mt-3" style={{ color: 'var(--text-muted)' }}>Chart data not available.</p>
              }
            </div>

            {/* ── About / Brands ───────────────────────────────────── */}
            <div className="card space-y-4">
              <SectionHeading>About the Company</SectionHeading>

              {profLoad ? (
                <div className="h-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ) : profile?.profile?.data ? (
                <div className="space-y-4">
                  {profile.profile.data.description && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {profile.profile.data.description}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {profile.profile.data.sector_name && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Sector</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.profile.data.sector_name}</p>
                      </div>
                    )}
                    {profile.profile.data.auditors && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Auditors</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.profile.data.auditors}</p>
                      </div>
                    )}
                    {profile.profile.data.offices?.[0] && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Registered Office</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.profile.data.offices[0]}</p>
                      </div>
                    )}
                  </div>

                  {/* Board of Directors / Management */}
                  {profile.org?.data?.per && profile.org.data.per.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Board & Management
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {profile.org.data.per.slice(0, 6).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg"
                               style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                 style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                              {p.nm.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.nm}</p>
                              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.des}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Company profile not available.</p>
              )}
            </div>

            {/* ── Brands & Subsidiaries ────────────────────────────── */}
            {(() => {
              const brands = COMPANY_BRANDS[symbol] ?? []
              return (
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionHeading>Brands &amp; Subsidiaries</SectionHeading>
                    {brands.length === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        Coming soon
                      </span>
                    )}
                  </div>

                  {brands.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No brands data available for {symbol} yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {brands.map((brand, i) => (
                        <div key={i}
                          className="rounded-xl p-3 flex items-start gap-3"
                          style={{ backgroundColor: 'var(--bg-hover)' }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xl"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
                            {brand.logo ?? '🏢'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                              {brand.name}
                            </p>
                            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                              {brand.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
        ) : (
          <div className="card"><p style={{ color: 'var(--text-muted)' }}>No overview data available.</p></div>
        )
      )}

      {/* ══ CHART ═══════════════════════════════════════════════════ */}
      {tab === 'chart' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['intraday', 'weekly'] as const).map(m => (
              <button key={m}
                onClick={() => setChartMode(m)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={chartMode === m
                  ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                {m === 'intraday' ? 'Intraday (1D)' : 'Weekly History'}
              </button>
            ))}
          </div>

          {chartLoad ? (
            <div className="h-52 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          ) : candles.length ? (
            <>
              <MiniChart candles={candles} mode={chartMode} />
              <div className="grid grid-cols-3 gap-4 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <Stat label="Open"   value={formatPrice(candles[0]?.open ?? 0)} />
                <Stat label="High"   value={formatPrice(Math.max(...candles.map(c => c.high)))} />
                <Stat label="Low"    value={formatPrice(Math.min(...candles.map(c => c.low)))} />
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No chart data available.
            </p>
          )}
        </div>
      )}

      {/* ══ INDEX VS STOCK ══════════════════════════════════════════ */}
      {/* ══ SECTOR PEERS ════════════════════════════════════════════ */}
      {tab === 'peers' && (
        <div className="card space-y-3">
          <SectionHeading>Sector Peer Comparison</SectionHeading>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            All companies in the same sector · ranked by trading volume
          </p>
          {peersLoad ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ))}
            </div>
          ) : peers.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No peer data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-border)' }}>
                    {['Company','Price','Chg%','EPS','P/E','ROE','Mkt Cap','D/E','Div Yield','P/B'].map(h => (
                      <th key={h}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider ${h==='Company'?'text-left pr-3':'text-right px-2'}`}
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const selfPrice     = Number(overview?.price ?? 0)
                    const selfChangePct = Number(overview?.changePct ?? 0)
                    const selfQ         = allQuotes.find(q => q.symbol === symbol)
                    const selfEps       = Number(overview?.eps ?? selfQ?.eps ?? 0)
                    const selfDps       = selfQ?.dps ?? 0
                    const selfPe        = selfEps > 0 ? (selfPrice / selfEps).toFixed(1) : '—'
                    const selfDivY      = selfDps > 0 && selfPrice > 0 ? `${((selfDps/selfPrice)*100).toFixed(1)}%` : '—'
                    const selfChgColor  = selfChangePct >= 0 ? '#16a34a' : '#dc2626'
                    function fmtMC(mc: number) {
                      if (!mc) return '—'
                      if (mc >= 1e12) return `${(mc/1e12).toFixed(2)}T`
                      if (mc >= 1e9)  return `${(mc/1e9).toFixed(2)}B`
                      if (mc >= 1e6)  return `${(mc/1e6).toFixed(1)}M`
                      return `${(mc/1e3).toFixed(1)}K`
                    }
                    return [
                      <tr key="__self__" style={{ borderBottom:'1px solid var(--bg-border)', backgroundColor:'rgba(254,165,0,0.08)' }}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>{symbol.charAt(0)}</div>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{symbol}</p>
                                <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background:'linear-gradient(135deg,#FEA500,#986300)',color:'white' }}>You</span>
                              </div>
                              <p className="text-[9px] truncate max-w-[100px]" style={{ color:'var(--text-muted)' }}>{String(overview?.name??'')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-xs font-bold tabular-nums" style={{ color:'var(--text-primary)' }}>{selfPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-semibold tabular-nums" style={{ color:selfChgColor }}>{selfChangePct>=0?'+':''}{selfChangePct.toFixed(2)}%</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:selfEps<0?'#dc2626':'var(--text-secondary)' }}>{selfEps?selfEps.toFixed(2):'—'}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{selfPe}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>—</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{fmtMC(selfQ?.mc??0)}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>—</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{selfDivY}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>—</td>
                      </tr>,
                      ...peers.map((peer, i) => {
                        const pe      = peer.eps > 0 ? (peer.price/peer.eps).toFixed(1) : '—'
                        const divY    = peer.dps>0&&peer.price>0 ? `${((peer.dps/peer.price)*100).toFixed(1)}%` : '—'
                        const chgClr  = peer.changePct>=0?'#16a34a':'#dc2626'
                        return (
                          <tr key={peer.symbol} style={{ borderBottom:'1px solid var(--bg-border)', backgroundColor:i%2===0?'transparent':'var(--bg-hover)' }}>
                            <td className="py-2.5 pr-3">
                              <a href={`/stocks/${peer.symbol}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>{peer.symbol.charAt(0)}</div>
                                <div>
                                  <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{peer.symbol}</p>
                                  <p className="text-[9px] truncate max-w-[100px]" style={{ color:'var(--text-muted)' }}>{peer.name}</p>
                                </div>
                              </a>
                            </td>
                            <td className="py-2.5 px-2 text-right text-xs font-bold tabular-nums" style={{ color:'var(--text-primary)' }}>{peer.price.toFixed(2)}</td>
                            <td className="py-2.5 px-2 text-right text-xs font-semibold tabular-nums" style={{ color:chgClr }}>{peer.changePct>=0?'+':''}{peer.changePct.toFixed(2)}%</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:peer.eps<0?'#dc2626':'var(--text-secondary)' }}>{peer.eps?peer.eps.toFixed(2):'—'}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{pe}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>—</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{fmtMC(peer.mc)}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>—</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{divY}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>—</td>
                          </tr>
                        )
                      }),
                    ]
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ COMPARE SECTOR ═════════════════════════════════════════ */}
      {tab === 'compare' && (() => {
        // Pool: self + all peers (peers loaded same time as 'peers' tab)
        const selfQ    = allQuotes.find(q => q.symbol === symbol)
        const allPool  = [
          { symbol, name: String(overview?.name ?? symbol), q: selfQ },
          ...peers.map(p => ({ symbol: p.symbol, name: p.name, q: p as StockQuote })),
        ]

        const searchLow = cmpSearch.trim().toLowerCase()
        const dropItems = allPool.filter(p =>
          p.symbol !== symbol &&   // exclude self from dropdown (always included)
          (searchLow === '' || p.symbol.toLowerCase().includes(searchLow) || p.name.toLowerCase().includes(searchLow))
        )

        type CmpStock = {
          symbol: string; name: string; color: string
          price: number; volume: number; eps: number; pe: number
          dps: number; divY: number; mc: number; roe: number; pb: number
        }
        const COLORS = ['#FEA500','#3b82f6','#16a34a','#a855f7']

        function buildStock(sym: string, color: string): CmpStock {
          const q    = allPool.find(p => p.symbol === sym)?.q
          const eps  = sym === symbol ? Number(overview?.eps ?? q?.eps ?? 0) : (q?.eps ?? 0)
          const price= sym === symbol ? Number(overview?.price ?? q?.price ?? 0) : (q?.price ?? 0)
          const pe   = eps > 0 ? price / eps : 0
          const dps  = q?.dps ?? 0
          const divY = dps > 0 && price > 0 ? (dps / price) * 100 : 0
          return {
            symbol: sym,
            name: allPool.find(p => p.symbol === sym)?.name ?? sym,
            color,
            price, volume: q?.volume ?? 0, eps, pe, dps, divY,
            mc: q?.mc ?? 0, roe: 0, pb: 0,
          }
        }

        const compareStocks: CmpStock[] = cmpResults
          ? [buildStock(symbol, COLORS[0]), ...cmpResults.map((s, i) => buildStock(s, COLORS[i+1]))]
          : []

        // All selected metrics (presets + optional custom entry)
        const customTrimmed = cmpMetricCustom.trim()
        const effectiveMetrics: string[] = [
          ...cmpMetricSelected,
          ...(customTrimmed && !cmpMetricSelected.includes(customTrimmed) ? [customTrimmed] : []),
        ]
        const hasCustomMetric = effectiveMetrics.length > 0

        // Radar axes (only used when no custom metric selected)
        type AxisKey = keyof Pick<CmpStock,'volume'|'eps'|'pe'|'dps'|'mc'|'roe'|'pb'>
        const AXES: { label: string; key: AxisKey }[] = [
          { label: 'Volume',  key: 'volume' },
          { label: 'EPS',     key: 'eps'    },
          { label: 'P/E',     key: 'pe'     },
          { label: 'DPS',     key: 'dps'    },
          { label: 'Mkt Cap', key: 'mc'     },
          { label: 'ROE',     key: 'roe'    },
          { label: 'P/B',     key: 'pb'     },
        ]
        const CX=170, CY=170, R=120, N=AXES.length
        function axPt(ai: number, r: number) {
          const a = (Math.PI*2*ai)/N - Math.PI/2
          return { x: CX+r*Math.cos(a), y: CY+r*Math.sin(a) }
        }
        function normVals(key: AxisKey) {
          const vals = compareStocks.map(s => Math.max(0, s[key] as number))
          const max  = Math.max(...vals, 0.0001)
          return vals.map(v => v/max)
        }
        const normalized = AXES.map(a => normVals(a.key))
        function polygon(si: number) {
          return AXES.map((_,ai) => { const v=normalized[ai][si]; const p=axPt(ai,v*R); return `${p.x},${p.y}` }).join(' ')
        }
        function fmtMC(mc: number) {
          if (!mc) return '—'
          if (mc>=1e12) return `${(mc/1e12).toFixed(2)}T`
          if (mc>=1e9)  return `${(mc/1e9).toFixed(2)}B`
          if (mc>=1e6)  return `${(mc/1e6).toFixed(1)}M`
          return mc.toFixed(0)
        }

        return (
          <div className="space-y-4">
            {/* Selection card */}
            <div className="card space-y-4">
              <div>
                <SectionHeading>Compare Sector</SectionHeading>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {symbol} is always included · select up to 3 sector peers to compare
                </p>
              </div>

              {/* Always-selected chip */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
                  {symbol}
                  <span className="text-[9px] opacity-80">You</span>
                </div>
                {cmpSelected.map((sym, idx) => (
                  <div key={sym} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor:`${COLORS[idx+1]}20`, color:COLORS[idx+1], border:`1px solid ${COLORS[idx+1]}40` }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:COLORS[idx+1] }} />
                    {sym}
                    <button onClick={() => setCmpSelected(p => p.filter(s=>s!==sym))}
                      className="ml-0.5 opacity-60 hover:opacity-100 font-bold">×</button>
                  </div>
                ))}
                {cmpSelected.length < 3 && (
                  <span className="text-[11px]" style={{ color:'var(--text-muted)' }}>
                    {3 - cmpSelected.length} more slot{3-cmpSelected.length!==1?'s':''}
                  </span>
                )}
              </div>

              {/* Search dropdown */}
              <div className="relative">
                {peersLoad ? (
                  <div className="h-9 rounded-lg animate-pulse" style={{ backgroundColor:'var(--bg-hover)' }} />
                ) : (
                  <>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="5.5" cy="5.5" r="4" stroke="var(--text-muted)" strokeWidth="1.5"/>
                        <path d="M9 9L11.5 11.5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <input
                        type="text"
                        value={cmpSearch}
                        onChange={e => { setCmpSearch(e.target.value); setCmpDropOpen(true) }}
                        onFocus={() => setCmpDropOpen(true)}
                        placeholder="Search companies in this sector…"
                        className="w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none"
                        style={{ backgroundColor:'var(--bg-hover)', borderColor:'var(--bg-border)', color:'var(--text-primary)' }}
                      />
                      {cmpSearch && (
                        <button onClick={() => { setCmpSearch(''); setCmpDropOpen(false) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                          style={{ color:'var(--text-muted)' }}>✕</button>
                      )}
                    </div>

                    {cmpDropOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onMouseDown={() => setCmpDropOpen(false)} />
                        <div className="absolute z-20 top-full mt-1 w-full rounded-xl overflow-hidden shadow-xl max-h-56 overflow-y-auto"
                          style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
                          {dropItems.length === 0 ? (
                            <p className="px-4 py-3 text-xs" style={{ color:'var(--text-muted)' }}>No matches</p>
                          ) : dropItems.map(item => {
                            const isSel = cmpSelected.includes(item.symbol)
                            const isFull = !isSel && cmpSelected.length >= 3
                            const selIdx = cmpSelected.indexOf(item.symbol)
                            return (
                              <button key={item.symbol}
                                disabled={isFull}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => { cmpToggle(item.symbol); setCmpSearch(''); setCmpDropOpen(false) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                                style={{
                                  backgroundColor: isSel ? 'rgba(254,165,0,0.06)' : 'transparent',
                                  opacity: isFull ? 0.4 : 1,
                                  cursor: isFull ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={e => !isFull && ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)')}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? 'rgba(254,165,0,0.06)' : 'transparent'}
                              >
                                <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors"
                                  style={{
                                    borderColor: isSel ? COLORS[selIdx+1] : 'var(--bg-border)',
                                    backgroundColor: isSel ? COLORS[selIdx+1] : 'transparent',
                                  }}>
                                  {isSel && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                                    style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>
                                    {item.symbol.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{item.symbol}</p>
                                    <p className="text-[10px] truncate" style={{ color:'var(--text-muted)' }}>{item.name}</p>
                                  </div>
                                </div>
                                {item.q && (
                                  <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color:'var(--text-secondary)' }}>
                                    Rs {item.q.price.toFixed(2)}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Metric selector — dropdown with checkboxes */}
              {(() => {
                const METRIC_GROUPS = [
                  { label: 'General',      items: ['Revenue','Net Revenue','Gross Profit','Operating Profit','EBITDA','Net Profit','Total Assets','Total Equity','Total Debt','Cash & Equivalents'] },
                  { label: 'Banking',      items: ['Advances','Deposits','Net Interest Income','Investments','Markup Income','NPL'] },
                  { label: 'Cement / Mfg',items: ['Cost of Sales','Depreciation','Capital Expenditure','Inventory'] },
                  { label: 'Energy',       items: ['Other Income','Finance Cost','Tax Expense','Retained Earnings'] },
                ]
                const toggle = (m: string) => {
                  setCmpMetricSelected(prev =>
                    prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                  )
                  setCmpMetricData({})
                  setCmpResults(null)
                }
                const addCustom = () => {
                  const t = cmpMetricCustom.trim()
                  if (t && !cmpMetricSelected.includes(t)) {
                    setCmpMetricSelected(prev => [...prev, t])
                    setCmpMetricCustom('')
                    setCmpMetricData({})
                    setCmpResults(null)
                  }
                }
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color:'var(--text-secondary)' }}>
                        Compare by Metrics
                        <span className="font-normal opacity-60 ml-1">(optional — replaces default)</span>
                      </span>
                      {cmpMetricSelected.length > 0 && (
                        <button onMouseDown={e => e.preventDefault()}
                          onClick={() => { setCmpMetricSelected([]); setCmpMetricCustom(''); setCmpMetricData({}); setCmpResults(null) }}
                          className="text-[10px] opacity-50 hover:opacity-100" style={{ color:'var(--text-muted)' }}>
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Dropdown trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setCmpMetricDropOpen(p => !p)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-hover)',
                          borderColor: cmpMetricSelected.length > 0 ? '#FEA500' : 'var(--bg-border)',
                          color: 'var(--text-primary)',
                        }}>
                        <span style={{ color: cmpMetricSelected.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {cmpMetricSelected.length === 0
                            ? 'Select metrics to compare…'
                            : `${cmpMetricSelected.length} metric${cmpMetricSelected.length > 1 ? 's' : ''} selected`}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                          style={{ transform: cmpMetricDropOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s', flexShrink:0 }}>
                          <path d="M2 4L6 8L10 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {cmpMetricDropOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onMouseDown={() => setCmpMetricDropOpen(false)} />
                          <div className="absolute z-20 top-full mt-1 w-full rounded-xl shadow-xl overflow-hidden"
                            style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)', maxHeight:320, overflowY:'auto' }}>

                            {/* Groups with checkboxes */}
                            {METRIC_GROUPS.map(g => (
                              <div key={g.label}>
                                <div className="px-3 pt-3 pb-1">
                                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>{g.label}</p>
                                </div>
                                {g.items.map(m => {
                                  const sel = cmpMetricSelected.includes(m)
                                  return (
                                    <button key={m}
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={() => toggle(m)}
                                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors"
                                      style={{ color:'var(--text-primary)' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                                      {/* Checkbox */}
                                      <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                                        style={{
                                          borderColor: sel ? '#FEA500' : 'var(--bg-border)',
                                          backgroundColor: sel ? '#FEA500' : 'transparent',
                                        }}>
                                        {sel && (
                                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </div>
                                      <span className="font-medium" style={{ color: sel ? '#FEA500' : 'var(--text-primary)' }}>{m}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ))}

                            {/* Custom field */}
                            <div className="px-3 pt-3 pb-3 border-t mt-1" style={{ borderColor:'var(--bg-border)' }}>
                              <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text-muted)' }}>Custom Field</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={cmpMetricCustom}
                                  onChange={e => setCmpMetricCustom(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
                                  placeholder="Type field name…"
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none"
                                  style={{ backgroundColor:'var(--bg-hover)', borderColor:'var(--bg-border)', color:'var(--text-primary)' }}
                                />
                                <button
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={addCustom}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                  style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Selected chips */}
                    {cmpMetricSelected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cmpMetricSelected.map(m => (
                          <div key={m} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ backgroundColor:'rgba(254,165,0,0.12)', color:'#FEA500', border:'1px solid rgba(254,165,0,0.35)' }}>
                            {m}
                            <button onMouseDown={e => e.preventDefault()} onClick={() => toggle(m)}
                              className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Compare button */}
              <button
                disabled={cmpSelected.length === 0}
                onClick={async () => {
                  const selected = [...cmpSelected]
                  setCmpResults(selected)
                  if (effectiveMetrics.length === 0) return
                  setCmpMetricLoading(true)
                  setCmpMetricData({})
                  // Fetch each company's fundamentals once
                  const allSyms = [symbol, ...selected]
                  const fetches = allSyms.map(sym =>
                    fetch(`/api/stock/${sym}/statement?type=fundamentals&interval=annual`)
                      .then(r => r.json())
                      .then(j => ({ sym, data: (j?.data ?? null) as StatementData | null }))
                      .catch(() => ({ sym, data: null as StatementData | null }))
                  )
                  const raw = await Promise.all(fetches)
                  // Build nested: metricLabel → symbol → rows
                  const nested: Record<string,Record<string,{year:string;value:number}[]>> = {}
                  for (const metric of effectiveMetrics) {
                    nested[metric] = {}
                    for (const { sym, data } of raw) {
                      if (!data) continue
                      const field = data.fields.find(f =>
                        !f.is_heading &&
                        f.label.toLowerCase().includes(metric.toLowerCase())
                      )
                      if (field) {
                        nested[metric][sym] = data.periods
                          .map((p, i) => ({ year: String(p.year), value: (field.values[i] ?? 0) as number }))
                          .filter(r => r.value != null && r.value !== 0)
                          .slice(0, 5)
                      }
                    }
                  }
                  setCmpMetricData(nested)
                  setCmpMetricLoading(false)
                }}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
                Compare Sector {cmpSelected.length > 0 ? `(${cmpSelected.length+1} companies)` : ''}
                {effectiveMetrics.length > 0 ? ` · ${effectiveMetrics.length} metric${effectiveMetrics.length>1?'s':''}` : ''}
              </button>
            </div>

            {/* Results */}
            {cmpResults && cmpResults.length > 0 && (() => {
              // ── METRIC MODE: API-fetched single metric ──────────────
              if (hasCustomMetric) {
                if (cmpMetricLoading) return (
                  <div className="card space-y-3">
                    <div className="h-4 w-40 rounded animate-pulse" style={{ backgroundColor:'var(--bg-hover)' }} />
                    {[...Array(3)].map((_,i) => (
                      <div key={i} className="h-20 rounded-lg animate-pulse" style={{ backgroundColor:'var(--bg-hover)' }} />
                    ))}
                  </div>
                )

                // API returns values already in millions (Rs Mn) for financial statements
                // Detect scale from all values in all metrics to pick a consistent unit label
                function detectUnit(vals: number[]): { divisor: number; label: string } {
                  const max = Math.max(...vals.map(Math.abs).filter(Boolean), 0)
                  if (max >= 1000) return { divisor: 1000, label: 'Rs Bn' }   // values in Mn, show as Bn
                  if (max >= 1)    return { divisor: 1,    label: 'Rs Mn' }   // values in Mn, show as Mn
                  return              { divisor: 0.001,    label: 'Rs Th' }   // very small → in thousands
                }
                function fmtMetricVal(v: number, divisor: number) {
                  if (v == null || v === 0) return '—'
                  const scaled = v / divisor
                  return scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)
                }

                return (
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="card flex flex-wrap gap-3 items-center py-3">
                      <span className="text-[11px] font-bold mr-1" style={{ color:'var(--text-secondary)' }}>Companies:</span>
                      {compareStocks.map(s => (
                        <div key={s.symbol} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor:s.color }} />
                          <span className="text-[11px] font-semibold" style={{ color:'var(--text-secondary)' }}>{s.symbol}</span>
                          {s.symbol === symbol && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background:'linear-gradient(135deg,#FEA500,#986300)',color:'white' }}>You</span>}
                        </div>
                      ))}
                    </div>

                    {/* One card per metric */}
                    {effectiveMetrics.map(metric => {
                      const mData = cmpMetricData[metric] ?? {}
                      const allYears = [...new Set(
                        Object.values(mData).flatMap(rows => rows.map(r => r.year))
                      )].sort((a,b) => Number(b) - Number(a))

                      const latestVals = compareStocks.map(s => ({
                        ...s, val: mData[s.symbol]?.[0]?.value ?? 0,
                      }))
                      const maxVal = Math.max(...latestVals.map(s => Math.abs(s.val)), 0.0001)
                      const noData = Object.keys(mData).length === 0

                      // Detect a consistent unit for all values in this metric
                      const allVals = Object.values(mData).flatMap(rows => rows.map(r => r.value))
                      const unit = detectUnit(allVals)

                      return (
                        <div key={metric} className="card space-y-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <SectionHeading>{metric}</SectionHeading>
                            {!noData && (
                              <span className="text-[10px] font-semibold px-2 py-1 rounded-lg tabular-nums"
                                style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
                                Figures in {unit.label}
                              </span>
                            )}
                          </div>

                          {noData ? (
                            <div className="rounded-xl px-4 py-4 text-center text-xs" style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
                              No data found for &ldquo;{metric}&rdquo; in any company&apos;s statements.
                            </div>
                          ) : (
                            <>
                              {/* Bar chart — latest value */}
                              <div className="space-y-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>
                                  Latest Year — {allYears[0] ?? ''}
                                </p>
                                {latestVals.map(s => (
                                  <div key={s.symbol}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:s.color }} />
                                        <span className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{s.symbol}</span>
                                      </div>
                                      <span className="text-xs font-bold tabular-nums" style={{ color: s.val ? s.color : 'var(--text-muted)' }}>
                                        {s.val ? `${fmtMetricVal(s.val, unit.divisor)} ${unit.label}` : '—'}
                                      </span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor:'var(--bg-hover)' }}>
                                      <div className="h-full rounded-full"
                                        style={{ width: s.val ? `${(Math.abs(s.val)/maxVal)*100}%` : '0%', backgroundColor: s.color }} />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Year-by-year table */}
                              {allYears.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
                                        <th className="py-2 px-3 text-left font-semibold" style={{ color:'var(--text-muted)' }}>Year</th>
                                        {compareStocks.map(s => (
                                          <th key={s.symbol} className="py-2 px-3 text-right font-bold" style={{ color: s.color }}>{s.symbol}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allYears.map((yr, ri) => (
                                        <tr key={yr} style={{ borderBottom: ri < allYears.length-1 ? '1px solid var(--bg-border)' : 'none' }}>
                                          <td className="py-2 px-3 font-semibold" style={{ color:'var(--text-secondary)' }}>{yr}</td>
                                          {compareStocks.map(s => {
                                            const row = mData[s.symbol]?.find(r => r.year === yr)
                                            return (
                                              <td key={s.symbol} className="py-2 px-3 text-right font-bold tabular-nums"
                                                style={{ color: row ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {row ? fmtMetricVal(row.value, unit.divisor) : '—'}
                                              </td>
                                            )
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // ── DEFAULT MODE: radar + individual tables ─────────────
              return (
              <div className="card space-y-6">
                {/* Legend */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <SectionHeading>Comparison Results</SectionHeading>
                  <div className="flex flex-wrap gap-3">
                    {compareStocks.map(s => (
                      <div key={s.symbol} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor:s.color }} />
                        <span className="text-[11px] font-semibold" style={{ color:'var(--text-secondary)' }}>{s.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spider / radar chart */}
                <div className="flex justify-center">
                  <div className="relative" style={{ width:340, maxWidth:'100%' }}>
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ maxWidth:'100%', display:'block' }}
                      onMouseLeave={() => setRadarHover(null)}>
                      {[0.25,0.5,0.75,1].map(lvl => (
                        <polygon key={lvl}
                          points={AXES.map((_,ai)=>{ const p=axPt(ai,lvl*R); return `${p.x},${p.y}` }).join(' ')}
                          fill="none" stroke="var(--bg-border)" strokeWidth="1"/>
                      ))}
                      {AXES.map((_,ai) => {
                        const p = axPt(ai,R)
                        const isHov = radarHover === ai
                        return <line key={ai} x1={CX} y1={CY} x2={p.x} y2={p.y}
                          stroke={isHov ? '#FEA500' : 'var(--bg-border)'} strokeWidth={isHov ? 2 : 1}/>
                      })}
                      {AXES.map((ax,ai) => {
                        const p = axPt(ai,R+20)
                        const anchor = p.x < CX-4 ? 'end' : p.x > CX+4 ? 'start' : 'middle'
                        const isHov  = radarHover === ai
                        return (
                          <text key={ai} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle"
                            style={{ fontSize:10, fill: isHov ? '#FEA500' : 'var(--text-secondary)', fontWeight:700, fontFamily:'inherit' }}>
                            {ax.label}
                          </text>
                        )
                      })}
                      {[...compareStocks].reverse().map((s,ri) => {
                        const si = compareStocks.length-1-ri
                        return (
                          <polygon key={s.symbol} points={polygon(si)}
                            fill={s.color} fillOpacity="0.15"
                            stroke={s.color} strokeWidth="2.5" strokeLinejoin="round"/>
                        )
                      })}
                      {compareStocks.map((s,si) =>
                        AXES.map((_,ai) => {
                          const v    = normalized[ai][si]
                          const p    = axPt(ai, v*R)
                          const isHov = radarHover === ai
                          return <circle key={`${si}-${ai}`} cx={p.x} cy={p.y} r={isHov ? 5 : 3.5} fill={s.color}
                            style={{ transition:'r 0.15s' }}/>
                        })
                      )}
                      {AXES.map((_,ai) => {
                        const p = axPt(ai, R)
                        return (
                          <line key={`hz-${ai}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
                            stroke="transparent" strokeWidth="24"
                            style={{ cursor:'crosshair' }}
                            onMouseEnter={() => setRadarHover(ai)}/>
                        )
                      })}
                    </svg>

                    {radarHover !== null && (() => {
                      const ax   = AXES[radarHover]
                      const tip  = axPt(radarHover, R + 20)
                      const svgW = 340
                      const rawLeft = (tip.x / svgW) * 100
                      const left    = Math.min(Math.max(rawLeft, 5), 75)
                      const above   = tip.y < CY

                      function fmtVal(key: AxisKey, s: CmpStock): string {
                        const v = s[key] as number
                        if (key === 'volume') return v > 0 ? v.toLocaleString() : '—'
                        if (key === 'mc')     return fmtMC(v)
                        if (key === 'roe' || key === 'pb') return '—'
                        return v !== 0 ? v.toFixed(2) : '—'
                      }

                      return (
                        <div className="absolute pointer-events-none z-30 rounded-xl shadow-2xl px-3 py-2.5 min-w-[160px]"
                          style={{
                            left: `${left}%`,
                            [above ? 'bottom' : 'top']: '55%',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--bg-border)',
                          }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color:'#FEA500' }}>
                            {ax.label}
                          </p>
                          {compareStocks.map(s => (
                            <div key={s.symbol} className="flex items-center justify-between gap-4 py-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:s.color }}/>
                                <span className="text-[11px] font-semibold" style={{ color:'var(--text-secondary)' }}>{s.symbol}</span>
                              </div>
                              <span className="text-[11px] font-bold tabular-nums" style={{ color:'var(--text-primary)' }}>
                                {fmtVal(ax.key, s)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Individual tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {compareStocks.map(s => (
                    <div key={s.symbol} className="rounded-xl overflow-hidden"
                      style={{ border:`1px solid ${s.color}50` }}>
                      <div className="px-3 py-2.5 flex items-center gap-2"
                        style={{ backgroundColor:`${s.color}15`, borderBottom:`1px solid ${s.color}30` }}>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor:s.color }}/>
                        <span className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{s.symbol}</span>
                        {s.symbol === symbol && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background:'linear-gradient(135deg,#FEA500,#986300)',color:'white' }}>You</span>}
                        <span className="text-[10px] truncate" style={{ color:'var(--text-muted)' }}>{s.name}</span>
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { label:'Price',     value: s.price>0 ? `Rs ${s.price.toFixed(2)}` : '—' },
                            { label:'Volume',    value: s.volume>0 ? s.volume.toLocaleString() : '—' },
                            { label:'EPS',       value: s.eps!==0 ? s.eps.toFixed(2) : '—' },
                            { label:'P/E',       value: s.pe>0 ? s.pe.toFixed(1) : '—' },
                            { label:'DPS',       value: s.dps>0 ? s.dps.toFixed(2) : '—' },
                            { label:'Div Yield', value: s.divY>0 ? `${s.divY.toFixed(1)}%` : '—' },
                            { label:'Mkt Cap',   value: fmtMC(s.mc) },
                            { label:'ROE',       value: '—' },
                            { label:'P/B',       value: '—' },
                          ].map((row,ri,arr) => (
                            <tr key={row.label} style={{ borderBottom: ri<arr.length-1 ? '1px solid var(--bg-border)' : 'none' }}>
                              <td className="py-2 px-3 font-medium" style={{ color:'var(--text-muted)' }}>{row.label}</td>
                              <td className="py-2 px-3 text-right font-bold tabular-nums" style={{ color:'var(--text-primary)' }}>{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
              )
            })()}
          </div>
        )
      })()}

      {/* ══ FINANCIALS ══════════════════════════════════════════════ */}
      {tab === 'financials' && (
        <div className="card space-y-4">
          {/* Filter row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1">
              {(['income', 'balance'] as const).map(t => (
                <button key={t} onClick={() => setStmtType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={stmtType === t
                    ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                    : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  {t === 'income' ? 'Income Statement' : 'Balance Sheet'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              {(['annual', 'quarterly'] as const).map(i => (
                <button key={i} onClick={() => setStmtInt(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={stmtInt === i
                    ? { backgroundColor: 'var(--bg-border)', color: 'var(--text-primary)' }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                >
                  {i === 'annual' ? 'Annual' : 'Quarterly'}
                </button>
              ))}
            </div>
          </div>

          {/* PDF link for current statement release */}
          {stmtPdfUrl && (
            <a href={stmtPdfUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
               style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
              <ExternalLink size={12} />
              View Statement PDF
            </a>
          )}

          {stmtLoad ? <LoadingRows /> : stmtData
            ? <StatementTable data={stmtData} maxCols={stmtInt === 'quarterly' ? 8 : 6} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>
          }
        </div>
      )}

      {/* ══ FUNDAMENTALS ════════════════════════════════════════════ */}
      {tab === 'fundamentals' && (
        <div className="card space-y-4">
          <SectionHeading>Financial Ratios &amp; Metrics</SectionHeading>
          {fundLoad ? <LoadingRows /> : fundData
            ? <FundamentalsView data={fundData} overview={overview} symbol={symbol} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No fundamentals data.</p>
          }
        </div>
      )}

      {/* ══ SHAREHOLDERS ════════════════════════════════════════════ */}
      {tab === 'shareholders' && (
        <div className="card">
          <SectionHeading>Shareholder Pattern</SectionHeading>
          {shLoad ? <LoadingRows /> : shData
            ? <ShareholdersView data={shData} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No shareholder data.</p>
          }
        </div>
      )}

      {/* ══ NEWS ═══════════════════════════════════════════════════ */}
      {tab === 'news' && (
        <div className="space-y-3">
          {newsLoad ? (
            <div className="card"><LoadingRows n={5} /></div>
          ) : news.length ? (
            news.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                 className="card flex gap-4 items-start hover:opacity-90 transition-opacity">
                {item.image && (
                  <img src={item.image} alt="" className="w-20 h-14 object-cover rounded shrink-0"
                       onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {item.source}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="card text-center py-10">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No news found.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ ANNOUNCEMENTS ══════════════════════════════════════════ */}
      {tab === 'announcements' && (
        <div className="card">
          <SectionHeading>Corporate Announcements (Last 12 Months)</SectionHeading>
          {annLoad ? <LoadingRows n={6} /> : anns.length ? (
            <div className="space-y-0">
              {anns.map((ann, i) => (
                <div key={i} className="flex items-start gap-4 py-3 transition-colors"
                     style={{ borderBottom: '1px solid var(--bg-border)' }}
                     onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'}
                     onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}>
                  <div className="shrink-0 w-16 text-center">
                    <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                      {new Date(ann.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(ann.date).getFullYear()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {ann.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        {ann.announcementType}
                      </span>
                      {ann.dividend != null && (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          Dividend: Rs {ann.dividend}
                        </span>
                      )}
                      {ann.bonus != null && (
                        <span className="text-[10px] text-blue-600 font-semibold">
                          Bonus: {ann.bonus}%
                        </span>
                      )}
                      {ann.exDate && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Ex-date: {ann.exDate}
                        </span>
                      )}
                    </div>
                  </div>
                  {ann.pdf_id && (
                    <a href={ann.pdf_id} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] shrink-0 px-2 py-1 rounded border transition-colors hover:opacity-80"
                       style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
                      PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No announcements found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
