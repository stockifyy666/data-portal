'use client'

import { useState } from 'react'
import type { Overview, StatementData } from '../stock-detail-types'
import type { StockQuote } from '@/types/market'
import { SectionHeading } from '../stock-detail-helpers'

type Props = {
  symbol:    string
  overview:  Overview | null
  peers:     StockQuote[]
  peersLoad: boolean
  allQuotes: StockQuote[]
}

export function StockCompareTab({ symbol, overview, peers, peersLoad, allQuotes }: Props) {
  const [cmpSearch,         setCmpSearch]         = useState('')
  const [cmpDropOpen,       setCmpDropOpen]        = useState(false)
  const [cmpSelected,       setCmpSelected]        = useState<string[]>([])
  const [cmpResults,        setCmpResults]         = useState<string[] | null>(null)
  const [radarHover,        setRadarHover]         = useState<number | null>(null)
  const [cmpMetricSelected, setCmpMetricSelected]  = useState<string[]>([])
  const [cmpMetricDropOpen, setCmpMetricDropOpen]  = useState(false)
  const [cmpMetricCustom,   setCmpMetricCustom]    = useState('')
  const [cmpMetricLoading,  setCmpMetricLoading]   = useState(false)
  const [cmpMetricData,     setCmpMetricData]      = useState<Record<string,Record<string,{year:string;value:number}[]>>>({})

  function cmpToggle(sym: string) {
    setCmpSelected(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : prev.length < 3 ? [...prev, sym] : prev
    )
  }

  // Pool: self + all peers
  const selfQ   = allQuotes.find(q => q.symbol === symbol)
  const allPool = [
    { symbol, name: String(overview?.name ?? symbol), q: selfQ },
    ...peers.map(p => ({ symbol: p.symbol, name: p.name, q: p as StockQuote })),
  ]

  const searchLow = cmpSearch.trim().toLowerCase()
  const dropItems = allPool.filter(p =>
    p.symbol !== symbol &&
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

  const customTrimmed = cmpMetricCustom.trim()
  const effectiveMetrics: string[] = [
    ...cmpMetricSelected,
    ...(customTrimmed && !cmpMetricSelected.includes(customTrimmed) ? [customTrimmed] : []),
  ]
  const hasCustomMetric = effectiveMetrics.length > 0

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
    if (!mc) return '-'
    if (mc>=1e12) return `${(mc/1e12).toFixed(2)}T`
    if (mc>=1e9)  return `${(mc/1e9).toFixed(2)}B`
    if (mc>=1e6)  return `${(mc/1e6).toFixed(1)}M`
    return mc.toFixed(0)
  }

  const METRIC_GROUPS = [
    { label: 'General',      items: ['Revenue','Net Revenue','Gross Profit','Operating Profit','EBITDA','Net Profit','Total Assets','Total Equity','Total Debt','Cash & Equivalents'] },
    { label: 'Banking',      items: ['Advances','Deposits','Net Interest Income','Investments','Markup Income','NPL'] },
    { label: 'Cement / Mfg',items: ['Cost of Sales','Depreciation','Capital Expenditure','Inventory'] },
    { label: 'Energy',       items: ['Other Income','Finance Cost','Tax Expense','Retained Earnings'] },
  ]

  function toggleMetric(m: string) {
    setCmpMetricSelected(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
    setCmpMetricData({})
    setCmpResults(null)
  }
  function addCustom() {
    const t = cmpMetricCustom.trim()
    if (t && !cmpMetricSelected.includes(t)) {
      setCmpMetricSelected(prev => [...prev, t])
      setCmpMetricCustom('')
      setCmpMetricData({})
      setCmpResults(null)
    }
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
                className="ml-0.5 opacity-60 hover:opacity-100 font-bold">x</button>
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
                  placeholder="Search companies in this sector..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none"
                  style={{ backgroundColor:'var(--bg-hover)', borderColor:'var(--bg-border)', color:'var(--text-primary)' }}
                />
                {cmpSearch && (
                  <button onClick={() => { setCmpSearch(''); setCmpDropOpen(false) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                    style={{ color:'var(--text-muted)' }}>{'✕'}</button>
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

        {/* Metric selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold" style={{ color:'var(--text-secondary)' }}>
              Compare by Metrics
              <span className="font-normal opacity-60 ml-1">(optional - replaces default)</span>
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
                  ? 'Select metrics to compare...'
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
                            onClick={() => toggleMetric(m)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors"
                            style={{ color:'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
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
                        placeholder="Type field name..."
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
                  <button onMouseDown={e => e.preventDefault()} onClick={() => toggleMetric(m)}
                    className="opacity-60 hover:opacity-100 ml-0.5">x</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compare button */}
        <button
          disabled={cmpSelected.length === 0}
          onClick={async () => {
            const selected = [...cmpSelected]
            setCmpResults(selected)
            if (effectiveMetrics.length === 0) return
            setCmpMetricLoading(true)
            setCmpMetricData({})
            const allSyms = [symbol, ...selected]
            const fetches = allSyms.map(sym =>
              fetch(`/api/stock/${sym}/statement?type=fundamentals&interval=annual`)
                .then(r => r.json())
                .then(j => ({ sym, data: (j?.data ?? null) as StatementData | null }))
                .catch(() => ({ sym, data: null as StatementData | null }))
            )
            const raw = await Promise.all(fetches)
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
        if (hasCustomMetric) {
          if (cmpMetricLoading) return (
            <div className="card space-y-3">
              <div className="h-4 w-40 rounded animate-pulse" style={{ backgroundColor:'var(--bg-hover)' }} />
              {[...Array(3)].map((_,i) => (
                <div key={i} className="h-20 rounded-lg animate-pulse" style={{ backgroundColor:'var(--bg-hover)' }} />
              ))}
            </div>
          )

          function detectUnit(vals: number[]): { divisor: number; label: string } {
            const max = Math.max(...vals.map(Math.abs).filter(Boolean), 0)
            if (max >= 1000) return { divisor: 1000, label: 'Rs Bn' }
            if (max >= 1)    return { divisor: 1,    label: 'Rs Mn' }
            return              { divisor: 0.001,    label: 'Rs Th' }
          }
          function fmtMetricVal(v: number, divisor: number) {
            if (v == null || v === 0) return '-'
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
                        {/* Bar chart - latest value */}
                        <div className="space-y-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>
                            Latest Year - {allYears[0] ?? ''}
                          </p>
                          {latestVals.map(s => (
                            <div key={s.symbol}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:s.color }} />
                                  <span className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{s.symbol}</span>
                                </div>
                                <span className="text-xs font-bold tabular-nums" style={{ color: s.val ? s.color : 'var(--text-muted)' }}>
                                  {s.val ? `${fmtMetricVal(s.val, unit.divisor)} ${unit.label}` : '-'}
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
                                          {row ? fmtMetricVal(row.value, unit.divisor) : '-'}
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

        // DEFAULT MODE: radar + individual tables
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
                    if (key === 'volume') return v > 0 ? v.toLocaleString() : '-'
                    if (key === 'mc')     return fmtMC(v)
                    if (key === 'roe' || key === 'pb') return '-'
                    return v !== 0 ? v.toFixed(2) : '-'
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
                        { label:'Price',     value: s.price>0 ? `Rs ${s.price.toFixed(2)}` : '-' },
                        { label:'Volume',    value: s.volume>0 ? s.volume.toLocaleString() : '-' },
                        { label:'EPS',       value: s.eps!==0 ? s.eps.toFixed(2) : '-' },
                        { label:'P/E',       value: s.pe>0 ? s.pe.toFixed(1) : '-' },
                        { label:'DPS',       value: s.dps>0 ? s.dps.toFixed(2) : '-' },
                        { label:'Div Yield', value: s.divY>0 ? `${s.divY.toFixed(2)}%` : '-' },
                        { label:'Mkt Cap',   value: fmtMC(s.mc) },
                        { label:'ROE',       value: '-' },
                        { label:'P/B',       value: '-' },
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
}
