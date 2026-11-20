'use client'

// =============================================================================
// FILE: components/stock/StockFundamentalsView.tsx
// PURPOSE: Fundamentals tab content for the stock detail page.
//          - FundamentalsView: thematic metric cards (Earnings, Profitability, etc.)
//            Each card is clickable — opens MetricModal with bar chart + table history.
//          - MetricModal: drill-down modal with annual + quarterly bar charts.
//          - TrendBar: sparkline SVG used inside each metric card.
//          Section buckets defined by FUND_SECTIONS regex matchers.
// =============================================================================

import { useState, useEffect, Fragment } from 'react'
import type { Overview } from './stock-detail-types'

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

type FundGroup = { heading: string; rows: Array<{ label: string; values: (number | null)[] }> }
type MetricRow = { label: string; values: (number | null)[] }
type MetricPeriod = { period_end: string; year: string | number; quarter?: string | null }

function fmtFundVal(label: string, val: number | null): string {
  if (val == null) return '—'
  const lbl = label.toLowerCase()
  const isRatio = lbl.includes('cover') || lbl.includes('ratio (times)') || lbl.includes('(times)')
  if (isRatio) return `${val.toFixed(2)}x`
  // New UAT API: pct fields already in % form (e.g. 10.27 = 10.27%), detected by label suffix
  const isAlreadyPct = lbl.includes('(%)') || lbl.includes('percent')
  if (isAlreadyPct) return `${val.toFixed(2)}%`
  // Legacy API: pct fields as fractions (0–1)
  const isFracPct = lbl.includes('margin') || lbl.includes('yield') ||
    lbl.includes('return on') || lbl.includes('retention') || lbl.includes('payout')
  if (isFracPct && Math.abs(val) <= 1) return `${(val * 100).toFixed(2)}%`
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

// ── Quarterly key metrics ────────────────────────────────────────────────────
// Capital Stake's quarterly key-metrics endpoint isn't in our plan (403), so the
// quarterly history is calculated from the quarterly income statement and
// balance sheet the app already loads (same cached data — no extra API call).
// Values are single-quarter figures. Price-based ratios (P/E, P/B, yield…) need
// historical prices and stay annual-only.

type QStmt = StatementData | null

function pickLine(stmt: QStmt, patterns: RegExp[]): (number | null)[] | null {
  if (!stmt) return null
  for (const re of patterns) {
    const f = stmt.fields.find(x => !x.is_heading && re.test(x.label.trim()))
    if (f) return f.values
  }
  return null
}

const ratio = (a: (number | null)[] | null, b: (number | null)[] | null, n: number, scale = 1, absB = false) =>
  Array.from({ length: n }, (_, i) => {
    const x = a?.[i], y = b?.[i]
    if (x == null || y == null) return null
    const d = absB ? Math.abs(y) : y
    return d === 0 ? null : (x / d) * scale
  })

/** Quarterly series for a key-metric label, or null if it can't be derived. */
function quarterlyMetric(label: string, inc: QStmt, bal: QStmt):
  { periods: MetricPeriod[]; values: (number | null)[] } | null {
  const l = label.toLowerCase()
  const fromIncome = inc && inc.periods.length ? inc : null
  const fromBal    = bal && bal.periods.length ? bal : null

  const sales = pickLine(fromIncome, [/^(net )?sales$/i, /^(net )?revenue/i, /^turnover/i])
  const gross = pickLine(fromIncome, [/^gross profit/i])
  const pbt   = pickLine(fromIncome, [/^profit.*before tax/i])
  const pat   = pickLine(fromIncome, [/^profit.*after tax/i, /^net profit/i])
  const eps   = pickLine(fromIncome, [/^eps$/i, /earnings per share/i])
  const fin   = pickLine(fromIncome, [/^finance cost/i, /^financial charges/i])

  const equity = pickLine(fromBal, [/^total equity$/i, /^total shareholders'? equity/i])
  const assets = pickLine(fromBal, [/^total assets$/i])
  const ca     = pickLine(fromBal, [/^total current assets$/i])
  const cl     = pickLine(fromBal, [/^total current liabilities$/i])
  const ltDebt = pickLine(fromBal, [/^long term (loan|financing|borrowing)s?$/i])

  const ni = fromIncome?.periods.length ?? 0
  const nb = fromBal?.periods.length ?? 0
  const inc_ = (values: (number | null)[] | null) =>
    values && fromIncome ? { periods: fromIncome.periods as MetricPeriod[], values: values.slice(0, ni) } : null
  const bal_ = (values: (number | null)[] | null) =>
    values && fromBal ? { periods: fromBal.periods as MetricPeriod[], values: values.slice(0, nb) } : null

  if (/^sales$/.test(l))                     return inc_(sales)
  if (/earnings per share/.test(l))          return inc_(eps)
  if (/profit after tax/.test(l))            return inc_(pat)
  if (/gross profit margin/.test(l))         return sales && gross ? inc_(ratio(gross, sales, ni, 100)) : null
  if (/net profit margin/.test(l))           return sales && pat ? inc_(ratio(pat, sales, ni, 100)) : null
  if (/interest cover/.test(l)) {
    if (!pbt || !fin) return null
    return inc_(Array.from({ length: ni }, (_, i) => {
      const p = pbt[i], f = fin[i]
      return p == null || f == null || f === 0 ? null : (p + Math.abs(f)) / Math.abs(f)
    }))
  }
  if (/current ratio/.test(l))               return ca && cl ? bal_(ratio(ca, cl, nb)) : null
  if (/equity to assets/.test(l))            return equity && assets ? bal_(ratio(equity, assets, nb, 100)) : null
  if (/long term debt to equity/.test(l))    return ltDebt && equity ? bal_(ratio(ltDebt, equity, nb, 100)) : null
  return null
}

const PRICE_BASED = /price|dividend|payout|book value/i

function MetricModal({
  row, periods, symbol, onClose,
}: {
  row: MetricRow
  periods: MetricPeriod[]
  symbol: string
  onClose: () => void
}) {
  const [qInc,     setQInc]     = useState<StatementData | null>(null)
  const [qBal,     setQBal]     = useState<StatementData | null>(null)
  const [qLoading, setQLoading] = useState(true)

  // Quarterly income + balance sheet: same cached statements the Financials tab uses
  useEffect(() => {
    setQLoading(true)
    const get = (type: 'income' | 'balance') =>
      fetch(`/api/stock/${symbol}/statement?type=${type}&interval=quarterly`)
        .then(r => r.json()).then(j => (j?.data ?? null) as StatementData | null).catch(() => null)
    Promise.all([get('income'), get('balance')])
      .then(([inc, bal]) => { setQInc(inc); setQBal(bal) })
      .finally(() => setQLoading(false))
  }, [symbol])

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function buildPaired(ps: MetricPeriod[], vals: (number | null)[]) {
    return ps
      .map((p, i) => ({ label: p.quarter ? `${p.year} ${p.quarter}` : String(p.year), value: vals[i] }))
      .filter(d => d.value != null)
      .reverse()
  }

  // Quarterly view: bars grouped by year (Q1–Q4 side by side) + a Year × Quarter table
  function renderQuarterly(ps: MetricPeriod[], vals: (number | null)[]) {
    const QS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
    // One calm hue, light → deep across the year (corporate, not multicolour)
    const Q_COLORS = ['#9db8d6', '#6f93bd', '#4a72a3', '#2c5282']   // Q1→Q4 steel blue
    const byYear = new Map<string, (number | null)[]>()
    ps.forEach((p, i) => {
      const q = QS.indexOf(String(p.quarter ?? '').toUpperCase() as typeof QS[number])
      if (q < 0) return
      const y = String(p.year)
      if (!byYear.has(y)) byYear.set(y, [null, null, null, null])
      byYear.get(y)![q] = vals[i] ?? null
    })
    const years = Array.from(byYear.keys()).sort()
    const all   = years.flatMap(y => byYear.get(y)!).filter((v): v is number => v != null)
    if (!all.length) return null

    // Latest reported quarter (highlighted)
    let latestKey = ''
    for (const y of [...years].reverse()) {
      const row = byYear.get(y)!
      const qi = [3, 2, 1, 0].find(i => row[i] != null)
      if (qi != null) { latestKey = `${y}-${qi}`; break }
    }

    const top = Math.max(0, ...all), bottom = Math.min(0, ...all), span = top - bottom || 1
    const PLOT = 150, LABEL = 20, AXIS_W = 44
    const yOf  = (v: number) => LABEL + ((top - v) / span) * PLOT
    const zeroY = yOf(0)
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => bottom + t * span)
    const MIN_GROUP = 140          // min px per year; groups stretch to fill the width

    // Year total (sum) for flow metrics, average for ratios
    const isFlow = /^sales$|earnings per share|profit after tax/i.test(row.label)
    const yearAgg = (arr: (number | null)[]) => {
      const n = arr.filter((v): v is number => v != null)
      if (!n.length) return null
      return isFlow ? n.reduce((a, b) => a + b, 0) : n.reduce((a, b) => a + b, 0) / n.length
    }

    return (
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Quarterly — by year</p>
          <div className="flex items-center gap-3">
            {QS.map((q, i) => (
              <span key={q} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: Q_COLORS[i] }} />{q}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mb-4 pb-1">
          <div style={{ minWidth: AXIS_W + years.length * MIN_GROUP, position: 'relative', height: LABEL + PLOT + 24 }}>
            {ticks.map((v, i) => (
              <div key={i} style={{ position: 'absolute', left: AXIS_W, right: 0, top: yOf(v),
                borderTop: v === 0 ? '1px solid var(--text-muted)' : '1px dashed var(--bg-border)', opacity: v === 0 ? 0.45 : 1 }}>
                <span style={{ position: 'absolute', right: '100%', marginRight: 6, top: -6, fontSize: 10, fontWeight: 600,
                  color: 'var(--text-secondary)', whiteSpace: 'nowrap', lineHeight: 1 }}>{fmtFundVal(row.label, v)}</span>
              </div>
            ))}
            <div style={{ position: 'absolute', left: AXIS_W, right: 0, top: 0, bottom: 0, display: 'flex', gap: 8 }}>
              {years.map((y, yi) => (
                <div key={y} style={{ position: 'relative', flex: '1 1 0', minWidth: MIN_GROUP,
                  background: yi % 2 ? 'transparent' : 'rgba(127,127,127,0.04)', borderRadius: 6 }}>
                  {byYear.get(y)!.map((v, qi) => {
                    if (v == null) return null
                    const pos = v >= 0
                    const y1  = yOf(Math.max(v, 0))
                    const h   = Math.max(2, Math.abs(yOf(v) - zeroY))
                    // 4 slots across 98% of the group, ~4.5% gap between bars
                    const slot = 98 / 4
                    const left = `${1 + qi * slot + 2.25}%`
                    const width = `${slot - 4.5}%`
                    const latest = latestKey === `${y}-${qi}`
                    const c = pos ? Q_COLORS[qi] : '#ef4444'
                    return (
                      <Fragment key={qi}>
                      {/* value above (or below, if negative) the bar */}
                      <span style={{ position: 'absolute', left, width, maxWidth: 72,
                        top: pos ? y1 - 14 : y1 + h + 2, textAlign: 'center', whiteSpace: 'nowrap',
                        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
                        fontSize: 9, fontWeight: latest ? 800 : 600, fontVariantNumeric: 'tabular-nums',
                        color: latest ? c : 'var(--text-secondary)' }}>
                        {fmtFundVal(row.label, v)}
                      </span>
                      <div title={`${y} ${QS[qi]}: ${fmtFundVal(row.label, v)}`}
                        style={{ position: 'absolute', left, width, maxWidth: 72, top: y1, height: h,
                          borderRadius: pos ? '4px 4px 0 0' : '0 0 4px 4px',
                          background: c, opacity: latest ? 1 : 0.85,
                          boxShadow: latest ? `0 0 0 2px var(--bg-card), 0 0 0 3px ${c}` : 'none' }} />
                      </Fragment>
                    )
                  })}
                  <span style={{ position: 'absolute', left: 0, right: 0, top: LABEL + PLOT + 7, textAlign: 'center',
                    fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>{y}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Year × Quarter table */}
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-[12px]" style={{ minWidth: 420 }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Year</th>
                {QS.map((q, i) => (
                  <th key={q} className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: Q_COLORS[i] }}>{q}</th>
                ))}
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {isFlow ? 'Year total' : 'Year avg'}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...years].reverse().map(y => {
                const arr = byYear.get(y)!
                const agg = yearAgg(arr)
                const complete = arr.every(v => v != null)
                return (
                  <tr key={y} style={{ borderTop: '1px solid var(--bg-border)' }}>
                    <td className="py-2 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>{y}</td>
                    {arr.map((v, qi) => {
                      const latest = latestKey === `${y}-${qi}`
                      return (
                        <td key={qi} className="py-2 px-3 text-right font-number tabular-nums"
                          style={{ color: v == null ? 'var(--text-muted)' : v < 0 ? '#dc2626' : 'var(--text-primary)',
                                   fontWeight: latest ? 800 : 500,
                                   background: latest ? 'rgba(254,165,0,0.12)' : 'transparent' }}>
                          {v == null ? '—' : fmtFundVal(row.label, v)}
                        </td>
                      )
                    })}
                    <td className="py-2 px-3 text-right font-number tabular-nums font-bold" style={{ color: 'var(--text-secondary)' }}>
                      {agg == null ? '—' : fmtFundVal(row.label, agg)}
                      {isFlow && !complete && agg != null && <span className="text-[9px] font-semibold ml-1" style={{ color: 'var(--text-muted)' }}>YTD</span>}
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

  function renderSection(title: string, ps: MetricPeriod[], vals: (number | null)[]) {
    const paired = buildPaired(ps, vals)
    if (!paired.length) return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data available</p>
      </div>
    )

    // Scale from zero (so small values still show a proportionate bar) and
    // handle negatives with bars that hang below the zero line.
    const pvVals = paired.map(d => d.value as number)
    const top    = Math.max(0, ...pvVals)
    const bottom = Math.min(0, ...pvVals)
    const span   = top - bottom || 1
    const PLOT   = 150                 // bar area height (px)
    const LABEL  = 18                  // room above the tallest bar for its value
    const AXIS_W = 44
    const colW   = Math.max(paired.length > 8 ? 42 : 56, Math.min(84, Math.floor(520 / paired.length)))
    const yOf    = (v: number) => LABEL + ((top - v) / span) * PLOT   // px from top of the chart box
    const zeroY  = yOf(0)
    const ticks  = [0, 0.25, 0.5, 0.75, 1].map(t => bottom + t * span)

    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <div className="overflow-x-auto mb-4 pb-1">
          <div style={{ minWidth: AXIS_W + paired.length * colW, position: 'relative', height: LABEL + PLOT + 22 }}>
            {/* Gridlines + y-axis labels (behind bars) */}
            {ticks.map((v, i) => (
              <div key={i} style={{
                position: 'absolute', left: AXIS_W, right: 0, top: yOf(v),
                borderTop: v === 0 ? '1px solid var(--text-muted)' : '1px dashed var(--bg-border)',
                opacity: v === 0 ? 0.45 : 1, zIndex: 0,
              }}>
                <span style={{ position: 'absolute', right: '100%', marginRight: 6, top: -6,
                  fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {fmtFundVal(row.label, v)}
                </span>
              </div>
            ))}

            {/* Bars */}
            <div style={{ position: 'absolute', left: AXIS_W, right: 0, top: 0, bottom: 0, display: 'flex', zIndex: 1 }}>
              {paired.map((d, i) => {
                const v      = d.value!
                const isLast = i === paired.length - 1
                const pos    = v >= 0
                const y1     = yOf(Math.max(v, 0))
                const h      = Math.max(2, Math.abs(yOf(v) - zeroY))
                const color  = isLast ? (pos ? '#FEA500' : '#dc2626') : (pos ? '#16a34a' : '#ef4444')
                return (
                  <div key={i} style={{ position: 'relative', flex: '1 1 0', minWidth: colW }} title={`${d.label}: ${fmtFundVal(row.label, v)}`}>
                    {/* value label: above positive bars, below negative bars */}
                    <span style={{
                      position: 'absolute', left: 0, right: 0, textAlign: 'center',
                      top: pos ? y1 - 15 : y1 + h + 3,
                      fontSize: 10, fontWeight: isLast ? 800 : 600, whiteSpace: 'nowrap',
                      color: isLast ? color : 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmtFundVal(row.label, v)}
                    </span>
                    <div style={{
                      position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '62%', maxWidth: 96, top: y1, height: h,
                      borderRadius: pos ? '5px 5px 0 0' : '0 0 5px 5px',
                      background: `linear-gradient(${pos ? '180deg' : '0deg'}, ${color}, ${color}${isLast ? 'cc' : '99'})`,
                      boxShadow: isLast ? `0 0 0 1px ${color}55, 0 4px 14px ${color}40` : 'none',
                      transition: 'top .3s, height .3s',
                    }} />
                    {/* period label */}
                    <span style={{
                      position: 'absolute', left: 0, right: 0, top: LABEL + PLOT + 6, textAlign: 'center',
                      fontSize: 9, fontWeight: isLast ? 700 : 500, whiteSpace: 'nowrap',
                      color: isLast ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {d.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

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

  // Quarterly history from 2021 onwards
  const QUARTERLY_FROM = 2021
  const qAll    = qLoading ? null : quarterlyMetric(row.label, qInc, qBal)
  const qKeep   = qAll ? qAll.periods.map(p => Number(p.year) >= QUARTERLY_FROM) : []
  const qSeries = qAll ? {
    periods: qAll.periods.filter((_, i) => qKeep[i]),
    values:  qAll.values.filter((_, i) => qKeep[i]),
  } : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onBackdrop}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--bg-border)', flexShrink: 0 }}>
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{row.label}</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Annual &amp; Quarterly history
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold hover:brightness-95"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-auto p-5 flex-1 space-y-6">
          {renderSection('Annual — Year by Year', periods, row.values)}
          <div style={{ borderTop: '1px solid var(--bg-border)' }} />
          {qLoading ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Quarterly</p>
              <div className="flex gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-1 h-20 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                ))}
              </div>
            </div>
          ) : qSeries && qSeries.values.some(v => v != null)
            ? (renderQuarterly(qSeries.periods, qSeries.values) ?? renderSection('Quarterly', qSeries.periods, qSeries.values))
            : (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Quarterly</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {PRICE_BASED.test(row.label)
                    ? 'Annual only — this metric depends on the share price or dividends, which are not available per quarter.'
                    : 'No quarterly data available for this metric'}
                </p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

const FUND_SECTIONS: { heading: string; match: (lbl: string) => boolean }[] = [
  { heading: 'Earnings',        match: l => /\beps\b|earnings per share|latest eps|eps last quarter|last annual eps|price.?to.?earn|price earning|p\/e|exp.*earn|exp.*p\/e|earning growth|peg ratio|\bpeg\b/i.test(l) },
  { heading: 'Important Ratios',match: l => /market price per share|book value per share|price.?book ratio|price to book|price to sales|sales per share|capital employed|number of shares|xprice|price date|p\/b/i.test(l) },
  { heading: 'Profitability',   match: l => /gross profit margin|operating profit margin|profit before tax margin|net profit margin|other operating income|profit.*margin|gross (profit|spread)|operating.*margin|ebitda.*margin|markup per share|mark.?up per share/i.test(l) },
  { heading: 'Dividends',       match: l => /dividend per share|dividend yield|dividend cover|payout ratio|exp.*payout|exp.*dividend|dividend/i.test(l) },
  { heading: 'Equity Ratios',   match: l => /return on capital employed|return on equity|return on assets|retention ratio|equity to assets|equity multiplier|book value(?! per share)|book value growth|roce|roa\b|roe\b/i.test(l) },
  { heading: 'Debt',            match: l => /debt.?to.?equity|long.?term debt.?to.?equity|short.?term debt.?to.?equity|long.?term debt.?to.?assets|short.?term debt.?to.?assets|debt to equity|debt\/equity|\bde ratio\b|leverage|gearing|total debt|long.?term debt|asset coverage/i.test(l) },
  { heading: 'Cash',            match: l => /cash per share|cash flow per share|free cash|operating cash|fcf/i.test(l) },
  { heading: 'Liquidity',       match: l => /current ratio|quick ratio|acid.?test|solvency ratio/i.test(l) },
  { heading: 'Financial Health',match: l => /net assets per share|liabilities to assets|long.?term debt to equity|interest cov|revenue growth|sales growth|total assets|net assets|total equity/i.test(l) },
  { heading: 'Efficiency',      match: l => /total assets turnover|fixed asset turnover|inventory turnover|inventory days|receivable days|payables days|asset turnover|working capital/i.test(l) },
  { heading: 'Market Stats',    match: l => /previous close|ldcp|52.?w(eek)?.?(high|low)|50.?d(ay)?|200.?d(ay)?|moving average|index weight|market cap|enterprise value|\bev\b|ev\//i.test(l) },
]

function assignFundSection(label: string): string {
  for (const sec of FUND_SECTIONS) {
    if (sec.match(label)) return sec.heading
  }
  return 'Other'
}

export function FundamentalsView({ data, overview, symbol }: {
  data: StatementData; overview: Overview | null; symbol: string
}) {
  const periods = data.periods.slice(0, 10)
  const ttmIdx  = 0
  const [activeRow, setActiveRow] = useState<MetricRow | null>(null)

  const allRows = data.fields.filter(f => !f.is_heading && f.label.trim())
  const sectionOrder = [...FUND_SECTIONS.map(s => s.heading), 'Other']
  const buckets: Record<string, FundGroup> = {}
  for (const heading of sectionOrder) buckets[heading] = { heading, rows: [] }
  for (const f of allRows) buckets[assignFundSection(f.label)].rows.push({ label: f.label, values: f.values })
  const groups = sectionOrder.map(h => buckets[h]).filter(g => g.rows.length > 0)

  return (
    <>
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
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                  {group.heading}
                </h3>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Click a row for history</span>
              </div>
              {/* Table: Metric · Trend · Latest · Previous · Change — row opens history */}
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 440 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                      <th className="text-left py-2 pl-4 pr-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Metric</th>
                      <th className="text-center py-2 px-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Trend</th>
                      <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{periods[0]?.year ?? 'Latest'}</th>
                      <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{periods[1]?.year ?? 'Prev'}</th>
                      <th className="text-right py-2 pl-2 pr-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, ri) => {
                      const ttm  = row.values[ttmIdx] ?? null
                      const prev = row.values[1] ?? null
                      const chg  = ttm != null && prev != null && prev !== 0 ? ((ttm - prev) / Math.abs(prev)) * 100 : null
                      const flat = chg != null && Math.abs(chg) < 0.05
                      const up   = chg != null && chg > 0
                      return (
                        <tr key={row.label} onClick={() => setActiveRow(row)}
                          className="cursor-pointer transition-colors"
                          style={{ borderTop: ri ? '1px solid var(--bg-border)' : 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setActiveRow(row) }}>
                          <td className="py-2.5 pl-4 pr-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{row.label}</td>
                          <td className="py-2.5 px-2"><div className="flex justify-center"><TrendBar values={row.values} /></div></td>
                          <td className="py-2.5 px-2 text-right text-sm font-black font-number tabular-nums whitespace-nowrap"
                            style={{ color: (ttm ?? 0) < 0 ? '#dc2626' : 'var(--text-primary)' }}>{fmtFundVal(row.label, ttm)}</td>
                          <td className="py-2.5 px-2 text-right text-[12px] font-number tabular-nums whitespace-nowrap"
                            style={{ color: 'var(--text-secondary)' }}>{fmtFundVal(row.label, prev)}</td>
                          <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                            {chg == null ? (
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold font-number tabular-nums px-2 py-0.5 rounded-full"
                                style={{ color: flat ? 'var(--text-secondary)' : up ? '#16a34a' : '#dc2626',
                                         background: flat ? 'var(--bg-hover)' : up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)' }}>
                                {flat ? '' : up ? '▲' : '▼'} {Math.abs(chg) >= 1000 ? '999+' : Math.abs(chg).toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

        </div>
      </div>
    </>
  )
}
