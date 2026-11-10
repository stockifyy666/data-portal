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

import { useState, useEffect } from 'react'

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

type Overview = Record<string, number | string>

type FundGroup = { heading: string; rows: Array<{ label: string; values: (number | null)[] }> }
type MetricRow = { label: string; values: (number | null)[] }
type MetricPeriod = { period_end: string; year: string | number; quarter?: string | null }

function fmtFundVal(label: string, val: number | null): string {
  if (val == null) return '—'
  const lbl = label.toLowerCase()
  const isRatio = lbl.includes('cover') || lbl.includes('dividend cover')
  if (isRatio) return `${val.toFixed(2)}x`
  const isPct = lbl.includes('margin') || lbl.includes('yield') ||
    lbl.includes('return on') || lbl.includes('retention') || lbl.includes('payout')
  if (isPct) return `${(val * 100).toFixed(2)}%`
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

        <div className="overflow-auto p-5 flex-1 space-y-6">
          {renderSection('Annual — Year by Year', periods, row.values)}
          <div style={{ borderTop: '1px solid var(--bg-border)' }} />
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
                <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {group.heading}
                </h3>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Click card for history</span>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-medium leading-snug break-words min-w-0 flex-1" style={{ color: 'var(--text-secondary)' }}>
                          {row.label}
                        </span>
                        <div className="shrink-0 ml-1"><TrendBar values={row.values} /></div>
                      </div>
                      <div className="flex items-end justify-between gap-1">
                        <span className="text-sm font-bold font-number leading-none truncate"
                          style={{ color: (ttm ?? 0) < 0 ? '#dc2626' : 'var(--text-primary)' }}>
                          {formatted}
                        </span>
                        {trend && trend !== 'flat' && (
                          <span className="text-[9px] font-semibold leading-none shrink-0" style={{ color: trendColor }}>
                            {trend === 'up' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {overview && (() => {
            const fmt  = (v: number | undefined | null) =>
              v && Number(v) ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
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
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Market Stats (PSX)
                  </h3>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stats.map(s => (
                    <div key={s.label} className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <span className="text-[10px] font-medium leading-snug break-words min-w-0" style={{ color: 'var(--text-secondary)' }}>
                        {s.label}
                      </span>
                      <span className="text-sm font-bold font-number leading-none truncate" style={{ color: 'var(--text-primary)' }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}
