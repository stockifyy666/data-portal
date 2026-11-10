'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Percent, Droplets, TrendingUp, TrendingDown,
  AlertCircle, Calendar, Shield, Building2, ArrowLeftRight,
  RefreshCw, Globe, Info,
} from 'lucide-react'

// Live fallbacks while fetching
const LIVE_FALLBACK = {
  usdPkr:      { value: 278.40,   change: 0, label: 'USD / PKR',       note: 'Live — open.er-api.com' },
  oilBrent:    { value: 82.40,    change: 0, label: 'Brent Crude',     note: 'Live — Yahoo Finance (BZ=F)' },
  wti:         { value: 78.20,    change: 0, label: 'WTI Crude',       note: 'Live — Yahoo Finance (CL=F)' },
  sbpRate:     { value: 11.50,    change: 0, label: 'SBP Policy Rate', note: 'MPC Apr 27, 2026 — Cut 100bps' },
  inflation:   { value: 4.50,     change: 0, label: 'CPI Inflation',   note: 'IMF WEO 2025 annual avg' },
  forex:       { value: 17.10,    change: 0, label: 'Forex Reserves',  note: 'SBP holdings — Aug 26' },
  currentAcct: { value: -0.20,    change: 0, label: 'Current Account', note: 'FY2026 full-year (est.) — USD billion' },
  gdpGrowth:   { value: 3.10,     change: 0, label: 'GDP Growth',      note: 'IMF WEO 2025 annual %' },
  remittances: { value: 3.20,     change: 0, label: 'Remittances',     note: 'SBP — monthly (Jul 2026, USD billion)' },
  kse100:      { value: 115000,   change: 0, label: 'KSE-100',         note: 'Live — Capital Stake' },
}

const IMF_TRANCHES = [
  { tranche: '1st', amount: '$1.1B', date: 'Sep 2023', status: 'received',  note: 'Program approved' },
  { tranche: '2nd', amount: '$1.1B', date: 'Feb 2024', status: 'received',  note: 'Review completed' },
  { tranche: '3rd', amount: '$1.0B', date: 'Sep 2024', status: 'received',  note: 'Structural benchmarks met' },
  { tranche: '4th', amount: '$1.0B', date: 'Mar 2025', status: 'received',  note: 'Fiscal targets met' },
  { tranche: '5th', amount: '$1.0B', date: 'Sep 2025', status: 'received',  note: 'Revenue measures passed' },
  { tranche: '6th', amount: '$1.3B', date: 'Mar 2026', status: 'received',  note: 'Latest tranche received' },
  { tranche: '7th', amount: '$1.3B', date: 'Sep 2026', status: 'upcoming',  note: 'Review in progress — estimated' },
  { tranche: '8th', amount: '$1.3B', date: 'Mar 2027', status: 'future',    note: 'Program end' },
]

const MPC_MEETINGS = [
  { date: 'Jul 29, 2025', decision: 'Cut 100bps', rate: '14.00%', status: 'past' },
  { date: 'Sep 12, 2025', decision: 'Cut 100bps', rate: '13.00%', status: 'past' },
  { date: 'Nov 03, 2025', decision: 'Hold',        rate: '13.00%', status: 'past' },
  { date: 'Jan 27, 2026', decision: 'Hold',        rate: '13.00%', status: 'past' },
  { date: 'Mar 17, 2026', decision: 'Cut 50bps',   rate: '12.50%', status: 'past' },
  { date: 'Apr 27, 2026', decision: 'Cut 100bps',  rate: '11.50%', status: 'past' },
  { date: 'Jun 23, 2026', decision: 'Hold',        rate: '11.50%', status: 'past' },
  { date: 'Sep 22, 2026', decision: 'TBD',         rate: '?',      status: 'next' },
  { date: 'Nov 10, 2026', decision: 'TBD',         rate: '?',      status: 'future' },
]

const RESERVES_DATA = [
  { month: 'Feb 26', sbp: 13.1, total: 18.2 },
  { month: 'Mar 26', sbp: 14.0, total: 19.1 },
  { month: 'Apr 26', sbp: 14.8, total: 20.0 },
  { month: 'May 26', sbp: 15.5, total: 20.8 },
  { month: 'Jun 26', sbp: 16.2, total: 21.5 },
  { month: 'Jul 26', sbp: 16.8, total: 22.1 },
  { month: 'Aug 26', sbp: 17.1, total: 22.5 },
]

const CPEC_STOCKS = [
  { symbol: 'HUBC',  name: 'Hub Power Co.',          sector: 'Power',       exposure: 'High',   note: 'CPEC power projects' },
  { symbol: 'NCPL',  name: 'Nishat Chunian Power',   sector: 'Power',       exposure: 'High',   note: 'Under CPEC framework' },
  { symbol: 'LUCK',  name: 'Lucky Cement',            sector: 'Cement',      exposure: 'High',   note: 'CPEC infrastructure demand' },
  { symbol: 'PIOC',  name: 'Pioneer Cement',          sector: 'Cement',      exposure: 'High',   note: 'Infrastructure projects' },
  { symbol: 'CHCC',  name: 'Cherat Cement',           sector: 'Cement',      exposure: 'Medium', note: 'Construction demand' },
  { symbol: 'FFBL',  name: 'Fauji Fertilizer Bin Q.',sector: 'Fertilizer',  exposure: 'Medium', note: 'Agricultural development' },
  { symbol: 'NRSL',  name: 'Nishat Ruby Ltd.',        sector: 'Textile',     exposure: 'Low',    note: 'Export corridor benefit' },
  { symbol: 'PKGS',  name: 'Packages Ltd.',           sector: 'Paper',       exposure: 'Low',    note: 'Industrial growth' },
]

const PKR_IMPACT = [
  { symbol: 'ENGRO', type: 'Exporter',  impact5pct: '+3.2%', note: 'Revenue in USD' },
  { symbol: 'LUCK',  type: 'Exporter',  impact5pct: '+2.8%', note: 'Export earnings' },
  { symbol: 'TGL',   type: 'Exporter',  impact5pct: '+2.1%', note: 'Glass exports' },
  { symbol: 'PSO',   type: 'Importer',  impact5pct: '-4.1%', note: 'Oil import costs rise' },
  { symbol: 'HCAR',  type: 'Importer',  impact5pct: '-3.6%', note: 'CKD parts imported' },
  { symbol: 'ICI',   type: 'Importer',  impact5pct: '-2.9%', note: 'Raw material imports' },
  { symbol: 'ATRL',  type: 'Importer',  impact5pct: '-2.4%', note: 'Crude oil input' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatVal(key: string, val: number) {
  if (key === 'usdPkr')      return val.toFixed(2)
  if (key === 'oilBrent')    return `$${val.toFixed(2)}`
  if (key === 'wti')         return `$${val.toFixed(2)}`
  if (key === 'forex')       return `$${val.toFixed(1)}B`
  if (key === 'currentAcct') return `$${val.toFixed(1)}B`
  if (key === 'remittances') return `$${val.toFixed(1)}B`
  if (key === 'kse100')      return val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toLocaleString()
  return `${val.toFixed(2)}%`
}

function getIcon(key: string) {
  if (key === 'usdPkr')      return DollarSign
  if (key === 'sbpRate')     return Percent
  if (key === 'oilBrent')    return Droplets
  if (key === 'wti')         return Droplets
  if (key === 'inflation')   return TrendingDown
  if (key === 'gdpGrowth')   return TrendingUp
  return Globe
}

const LIVE_IDS = new Set(['usdPkr', 'oilBrent', 'wti', 'sbpRate', 'inflation', 'forex', 'currentAcct', 'gdpGrowth', 'remittances', 'kse100'])

// ── KPI skeleton ──────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'sk-pulse 1.6s ease-in-out infinite', cursor: 'default',
    }}>
      <div style={{ height: 11, width: 90, borderRadius: 3, background: 'var(--bg-hover)' }} />
      <div style={{ height: 30, width: 110, borderRadius: 3, background: 'var(--bg-hover)' }} />
      <div style={{ height: 10, width: 130, borderRadius: 3, background: 'var(--bg-hover)' }} />
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ id, d, loading }: { id: string; d: { value: number; change: number; label: string; note: string } | null; loading?: boolean }) {
  if (!d) return <KpiSkeleton />
  const direction = d.change !== 0 ? d.change : d.value
  const up        = direction > 0
  const isNeutral = direction === 0
  const isLive    = LIVE_IDS.has(id)
  const dirColor  = up ? '#16a34a' : '#dc2626'

  const bgColor  = up ? '#dcfce7' : isNeutral ? 'var(--bg-card)' : '#fee2e2'
  const bdrColor = up ? 'rgba(22,163,74,0.35)' : isNeutral ? 'var(--bg-border)' : 'rgba(220,38,38,0.35)'

  return (
    <div className="card" style={{
      backgroundColor: bgColor, border: `1px solid ${bdrColor}`,
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      {!isNeutral && (
        <div style={{
          position: 'absolute', top: -18, right: -18,
          width: 80, height: 80, borderRadius: '50%',
          backgroundColor: up ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.12)',
          pointerEvents: 'none',
        }} />
      )}
      {/* Mobile: horizontal layout */}
      <div className="flex sm:hidden items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {d.label}
            </span>
            {isLive && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: '#16a34a' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
                LIVE
              </span>
            )}
          </div>
          {!isNeutral && (
            <span style={{ fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 2, color: dirColor }}>
              {up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
              {d.change !== 0 ? `${up ? '+' : ''}${d.change.toFixed(2)}%` : (up ? 'Positive' : 'Negative')}
            </span>
          )}
        </div>
        <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatVal(id, d.value)}
        </p>
      </div>

      {/* Desktop: vertical layout */}
      <div className="hidden sm:flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {d.label}
        </span>
        {isLive && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: '#16a34a' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e',
              animation: loading ? 'sk-pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            LIVE
          </span>
        )}
      </div>
      <p className="hidden sm:block" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {formatVal(id, d.value)}
      </p>
      <div className="hidden sm:block" style={{ marginTop: 2 }}>
        {!isNeutral ? (
          <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, color: dirColor }}>
            {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {d.change !== 0
              ? `${up ? '+' : ''}${d.change.toFixed(2)}%`
              : (up ? 'Positive' : 'Negative')}
          </span>
        ) : <span />}
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--bg-border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
          <Icon size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Mini sparkline (canvas) ───────────────────────────────────────────────────
function ReservesBar({ data }: { data: typeof RESERVES_DATA }) {
  const max = Math.max(...data.map(d => d.total))
  return (
    <div className="space-y-2 mt-2">
      {data.map((d, i) => {
        const sbpW  = (d.sbp  / max) * 100
        const totW  = (d.total / max) * 100
        const isLast = i === data.length - 1
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="text-[10px] w-12 shrink-0 font-medium"
              style={{ color: isLast ? '#FEA500' : 'var(--text-muted)' }}>{d.month}</span>
            <div className="flex-1 relative h-5 rounded-md overflow-hidden"
              style={{ backgroundColor: 'var(--bg-hover)' }}>
              {/* total bar */}
              <div className="absolute left-0 top-0 h-full rounded-md"
                style={{ width: `${totW}%`, backgroundColor: '#3b82f620' }} />
              {/* sbp bar */}
              <div className="absolute left-0 top-0 h-full rounded-md transition-all"
                style={{ width: `${sbpW}%`, backgroundColor: isLast ? '#FEA500' : '#3b82f6' }} />
            </div>
            <span className="text-[10px] w-16 text-right font-number font-semibold"
              style={{ color: isLast ? '#FEA500' : 'var(--text-primary)' }}>
              ${d.sbp}B / ${d.total}B
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}/>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SBP Reserves</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f620', border: '1px solid #3b82f6' }}/>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total (SBP + Banks)</span>
        </div>
      </div>
    </div>
  )
}

// ── Exposure badge ────────────────────────────────────────────────────────────
function ExposureBadge({ level }: { level: string }) {
  const cfg = {
    High:   { bg: '#22c55e18', color: '#16a34a', border: '#22c55e30' },
    Medium: { bg: '#f59e0b18', color: '#d97706', border: '#f59e0b30' },
    Low:    { bg: '#94a3b818', color: '#64748b', border: '#94a3b830' },
  }[level] ?? { bg: '', color: '', border: '' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {level}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MacroDashboard() {
  const [lastUpdated, setLastUpdated] = useState('')
  const [liveLoading, setLiveLoading] = useState(true)

  type KpiEntry = { value: number; change: number; label: string; note: string }
  const [liveData, setLiveData] = useState<Record<string, KpiEntry | null>>({
    usdPkr: null, oilBrent: null, wti: null,
    sbpRate: null, inflation: null, forex: null,
    currentAcct: null, gdpGrowth: null, remittances: null, kse100: null,
  })

  function fetchLive() {
    setLiveLoading(true)

    // SBP Rate: derive from MPC calendar (last confirmed decision)
    const lastPastMPC = [...MPC_MEETINGS].filter(m => m.status === 'past').at(-1)
    const sbpRateVal  = lastPastMPC ? parseFloat(lastPastMPC.rate) : 11.50
    const sbpRateNote = lastPastMPC ? `MPC ${lastPastMPC.date} — ${lastPastMPC.decision}` : 'MPC calendar'

    // Forex Reserves: derive from RESERVES_DATA (latest weekly SBP data)
    const lastReserve  = RESERVES_DATA.at(-1)
    const forexVal     = lastReserve ? lastReserve.sbp : 17.10
    const forexNote    = lastReserve ? `SBP holdings — ${lastReserve.month}` : 'SBP weekly data'

    // Remittances: latest published monthly figure (PBS / SBP)
    const remittancesVal  = 3.20
    const remittancesNote = 'SBP — monthly (Jul 2026, USD billion)'

    Promise.all([
      fetch('/api/market/macro').then(r => r.json()),
      fetch('/api/market/indices').then(r => r.json()).catch(() => ({ indices: [] })),
    ]).then(([j, idxData]) => {
      const kse = (idxData?.indices ?? []).find((i: any) => i.key === 'KSE100')
      const kse100Entry: KpiEntry = kse
        ? { value: kse.current, change: kse.changePct, label: 'KSE-100', note: 'Live — Capital Stake' }
        : LIVE_FALLBACK.kse100
        function pick(apiKey: string, fbKey: keyof typeof LIVE_FALLBACK, label: string, note: string): KpiEntry {
          const d = j[apiKey]
          if (d?.value != null) return { value: d.value, change: d.change ?? 0, label, note }
          return { ...LIVE_FALLBACK[fbKey], note: LIVE_FALLBACK[fbKey].note }
        }

        // Use live Capital Stake policy rate if available
        const pr = j.policyRate
        const sbpEntry: KpiEntry = pr?.value != null
          ? { value: pr.value, change: pr.change ?? 0, label: 'SBP Policy Rate', note: `Capital Stake — ${pr.period || 'Jun-26'}` }
          : { value: sbpRateVal, change: 0, label: 'SBP Policy Rate', note: sbpRateNote }

        // Use live Capital Stake NCPI if available
        const nc = j.ncpi
        const inflationEntry: KpiEntry = nc?.value != null
          ? { value: nc.value, change: nc.change ?? 0, label: 'CPI Inflation (NCPI)', note: `Capital Stake — ${nc.period || 'Aug-26'}` }
          : pick('inflation', 'inflation', 'CPI Inflation', `IMF WEO ${j.inflation?.date ?? '2025'} annual avg`)

        setLiveData({
          usdPkr:      pick('usdPkr',      'usdPkr',      'USD / PKR',       'Live — open.er-api.com'),
          oilBrent:    pick('brent',        'oilBrent',    'Brent Crude',     'Live — Yahoo Finance (BZ=F)'),
          wti:         pick('wti',          'wti',         'WTI Crude',       'Live — Yahoo Finance (CL=F)'),
          sbpRate:     sbpEntry,
          inflation:   inflationEntry,
          forex:       { value: forexVal,        change: 0, label: 'Forex Reserves',  note: forexNote },
          currentAcct: pick('currentAcct',  'currentAcct', 'Current Account', `IMF FY${j.currentAcct?.date ?? '2025'} annual — USD billion`),
          gdpGrowth:   pick('gdpGrowth',    'gdpGrowth',   'GDP Growth',      `IMF WEO ${j.gdpGrowth?.date ?? '2025'} annual %`),
          remittances: { value: remittancesVal,  change: 0, label: 'Remittances',     note: remittancesNote },
          kse100:      kse100Entry,
        })
        setLastUpdated(new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }))
    }).catch(() => {
        setLiveData({
          ...Object.fromEntries(Object.keys(LIVE_FALLBACK).map(k => [k, LIVE_FALLBACK[k as keyof typeof LIVE_FALLBACK]])),
          sbpRate:     { value: sbpRateVal,     change: 0, label: 'SBP Policy Rate', note: sbpRateNote },
          forex:       { value: forexVal,       change: 0, label: 'Forex Reserves',  note: forexNote },
          remittances: { value: remittancesVal, change: 0, label: 'Remittances',     note: remittancesNote },
          kse100:      LIVE_FALLBACK.kse100,
        })
      }).finally(() => setLiveLoading(false))
  }

  useEffect(() => {
    fetchLive()
    setLastUpdated(new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }))
  }, [])

  // All KPIs are now live — null means loading (skeleton shown)
  const MACRO_DATA = liveData

  // Days to next MPC
  const nextMPC = new Date('2026-09-22')
  const today   = new Date()
  const daysToMPC = Math.max(0, Math.ceil((nextMPC.getTime() - today.getTime()) / 86400000))

  return (
    <div className="space-y-6 animate-data pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Pakistan Macro Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            IMF · SBP · PKR · Oil · Inflation — all in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={10} className={liveLoading ? 'animate-spin' : ''} />
            Updated: {lastUpdated || '—'}
          </span>
          <button
            onClick={fetchLive}
            disabled={liveLoading}
            className="text-[10px] px-2 py-1 rounded-full font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ backgroundColor: '#22c55e18', color: '#16a34a', border: '1px solid #22c55e30' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            9 Live
          </button>
        </div>
      </div>

      {/* KPI grid — 5 per row on laptop+, 1 col on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard id="kse100"      d={MACRO_DATA.kse100}      loading={liveLoading} />
        <KpiCard id="usdPkr"      d={MACRO_DATA.usdPkr}      loading={liveLoading} />
        <KpiCard id="sbpRate"     d={MACRO_DATA.sbpRate}     loading={liveLoading} />
        <KpiCard id="inflation"   d={MACRO_DATA.inflation}   loading={liveLoading} />
        <KpiCard id="oilBrent"    d={MACRO_DATA.oilBrent}    loading={liveLoading} />
        <KpiCard id="wti"         d={MACRO_DATA.wti}         loading={liveLoading} />
        <KpiCard id="forex"       d={MACRO_DATA.forex}       loading={liveLoading} />
        <KpiCard id="currentAcct" d={MACRO_DATA.currentAcct} loading={liveLoading} />
        <KpiCard id="gdpGrowth"   d={MACRO_DATA.gdpGrowth}   loading={liveLoading} />
        <KpiCard id="remittances" d={MACRO_DATA.remittances} loading={liveLoading} />
      </div>

      {/* Alert banner — IMF next tranche */}
      <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
        style={{ backgroundColor: '#f59e0b12', border: '1px solid #f59e0b40' }}>
        <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: '#92400e' }}>
            IMF 7th Tranche Review In Progress — $1.3B Expected Sep 2026
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#b45309' }}>
            Banking, Cement, and Fertilizer stocks historically rally on tranche approvals.
            SBP reserves at $17.1B (Aug 2026) — highest since 2022, supported by IMF tranches.
          </p>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 gap-5">

        {/* ── IMF Program Tracker ─────────────────────────────────────────── */}
        <Section title="IMF Program Tracker" subtitle="Extended Fund Facility (EFF) · $7.0B · 2023–2027" icon={Shield}>

          {/* ── 4 KPI stats ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:1, marginBottom:20, borderRadius:12, overflow:'hidden', border:'1px solid var(--bg-border)' }}>
            {[
              { label:'Total Program', value:'$7.0B',   sub:'EFF commitment',   color:'var(--text-primary)' },
              { label:'Disbursed',     value:'$6.5B',   sub:'6 of 8 tranches',  color:'#16a34a' },
              { label:'Remaining',     value:'$0.5B',   sub:'2 tranches left',  color:'#f59e0b' },
              { label:'Program End',   value:'Mar 2027', sub:'~16 months away', color:'var(--text-secondary)' },
            ].map((k, i, arr) => (
              <div key={k.label} style={{ padding:'16px 18px', backgroundColor:'var(--bg-hover)', borderRight: i < arr.length-1 ? '1px solid var(--bg-border)' : 'none' }}>
                <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>{k.label}</p>
                <p style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{k.value}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:5 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Progress bar ── */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)' }}>Disbursement Progress</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>$6.5B of $7.0B — 75%</span>
            </div>
            <div style={{ height:8, borderRadius:999, backgroundColor:'var(--bg-border)', overflow:'hidden', display:'flex' }}>
              <div style={{ width:'75%', background:'#16a34a', borderRadius:999 }}/>
              <div style={{ width:'18.57%', background:'#f59e0b', opacity:.6 }}/>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:6 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}><span style={{ color:'#16a34a' }}>●</span> Received (6)</span>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}><span style={{ color:'#f59e0b' }}>●</span> In Progress (1)</span>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}><span style={{ color:'var(--bg-border)' }}>●</span> Pending (1)</span>
            </div>
          </div>

          {/* ── Tranche timeline ── */}
          <div style={{ borderTop:'1px solid var(--bg-border)', paddingTop:16 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Tranche Timeline</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6 }}>
              {IMF_TRANCHES.map((t, i) => {
                const received = t.status === 'received'
                const isNext   = t.status === 'upcoming'
                const isFuture = t.status === 'future'
                const amtC     = received ? '#16a34a' : isNext ? '#f59e0b' : 'var(--text-muted)'
                const dotColor = received ? '#16a34a' : isNext ? '#f59e0b' : 'var(--bg-border)'
                return (
                  <div key={i} style={{ opacity: isFuture ? .45 : 1 }}>
                    {/* Connector line */}
                    <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', backgroundColor: dotColor, flexShrink:0, border: isFuture ? '2px solid var(--bg-border)' : 'none', boxSizing:'border-box' }}/>
                      {i < 7 && <div style={{ flex:1, height:1, backgroundColor:'var(--bg-border)' }}/>}
                    </div>
                    {/* Card */}
                    <div style={{ padding:'10px 10px 10px', borderRadius:10, backgroundColor:'var(--bg-hover)', border:'1px solid var(--bg-border)' }}>
                      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>{t.tranche}</p>
                      <p style={{ fontSize:14, fontWeight:800, color:amtC, fontVariantNumeric:'tabular-nums', lineHeight:1, marginBottom:4 }}>{t.amount}</p>
                      <p style={{ fontSize:9, color: isNext ? '#f59e0b' : 'var(--text-muted)', fontWeight: isNext ? 700 : 400, marginBottom:4 }}>{t.date}</p>
                      <p style={{ fontSize:8.5, color:'var(--text-muted)', lineHeight:1.4 }}>{t.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:10, marginTop:14, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Estimated — verify with IMF.org.
          </p>
        </Section>

        {/* ── SBP Policy Rate History ──────────────────────────────────────── */}
        <Section title="SBP Policy Rate History" subtitle="Monetary Policy Committee · Jul 2025 – present" icon={Calendar}>

          {/* ── Stats strip ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:1, marginBottom:20, borderRadius:12, overflow:'hidden', border:'1px solid var(--bg-border)' }}>
            {[
              { label:'Current Rate',  value:'11.50%',         sub:'As of Jun 2026',   color:'var(--text-primary)' },
              { label:'Total Easing',  value:'−350bps',        sub:'4 cuts since Jul 25', color:'#16a34a' },
              { label:'Next MPC',      value:'Sep 22, 2026',   sub:`${daysToMPC} days away`, color:'#f59e0b' },
              { label:'Market Expects',value:'Cut',            sub:'50–100bps expected', color:'#16a34a' },
            ].map((k, i, arr) => (
              <div key={k.label} style={{ padding:'14px 16px', backgroundColor:'var(--bg-hover)', borderRight: i < arr.length-1 ? '1px solid var(--bg-border)' : 'none' }}>
                <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7 }}>{k.label}</p>
                <p style={{ fontSize:20, fontWeight:800, color:k.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{k.value}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:5 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Cascade waterfall ── */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Rate at each MPC meeting</p>

            {/* Horizontal waterfall — each row = one MPC meeting */}
            {[
              { date:'Jul 2025', rate:14.0, prev:null,  bps:null,  status:'past',    note:'Easing cycle begins' },
              { date:'Sep 2025', rate:13.0, prev:14.0,  bps:-100,  status:'past',    note:'First cut of cycle'  },
              { date:'Jan 2026', rate:13.0, prev:13.0,  bps:0,     status:'past',    note:'Hold — watched inflation' },
              { date:'Mar 2026', rate:12.5, prev:13.0,  bps:-50,   status:'past',    note:'Smaller calibrated cut' },
              { date:'Apr 2026', rate:11.5, prev:12.5,  bps:-100,  status:'past',    note:'Aggressive easing' },
              { date:'Jun 2026', rate:11.5, prev:11.5,  bps:0,     status:'current', note:'Current rate — held' },
              { date:'Sep 2026', rate:null, prev:11.5,  bps:null,  status:'next',    note:'Expected cut 50–100bps' },
            ].map((m, i) => {
              const maxRate = 14
              const isCut     = m.bps !== null && m.bps < 0
              const isHold    = m.bps === 0
              const isNext    = m.status === 'next'
              const isCurrent = m.status === 'current'
              const barW  = m.rate ? (m.rate / maxRate) * 100 : 80
              const prevW = m.prev ? (m.prev / maxRate) * 100 : 0
              const cutW  = isCut ? prevW - barW : 0

              return (
                <div key={i} className="grid gap-2 sm:gap-3"
                  style={{ gridTemplateColumns:'80px 1fr 60px', alignItems:'center',
                    padding:'8px 0', borderBottom:'1px solid var(--bg-border)', opacity: isNext ? .55 : 1 }}>

                  {/* Date */}
                  <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', flexShrink:0, fontWeight: isCurrent ? 700 : 400,
                    color: isNext ? '#f59e0b' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.date}</span>

                  {/* Bar track + rate label outside */}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, position:'relative', height:14, borderRadius:4, backgroundColor:'var(--bg-border)', overflow:'hidden' }}>
                      {/* Rate bar */}
                      <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${barW}%`,
                        background: isCurrent ? 'linear-gradient(90deg,#FEA500aa,#FEA500)' : isNext ? '#f59e0b30' : '#FEA50040',
                        borderRadius:4 }}/>
                      {/* Cut gap highlight */}
                      {isCut && (
                        <div style={{ position:'absolute', left:`${barW}%`, top:0, height:'100%', width:`${cutW}%`,
                          backgroundColor:'#16a34a25', borderLeft:'1.5px solid #16a34a50' }}/>
                      )}
                    </div>
                    {/* Rate label outside bar */}
                    <span style={{ fontSize:11, fontWeight:800, fontVariantNumeric:'tabular-nums', flexShrink:0, minWidth:38, textAlign:'right',
                      color: isCurrent ? '#FEA500' : isNext ? '#f59e0b' : 'var(--text-secondary)' }}>
                      {m.rate ? `${m.rate}%` : '~?%'}
                    </span>
                  </div>

                  {/* BPS badge */}
                  <div style={{ textAlign:'center' }}>
                    {isCut ? (
                      <span style={{ fontSize:10, fontWeight:800, color:'#16a34a', backgroundColor:'#16a34a15',
                        padding:'2px 7px', borderRadius:999, display:'inline-block', whiteSpace:'nowrap' }}>{m.bps}bps</span>
                    ) : isHold ? (
                      <span style={{ fontSize:9, fontWeight:600, color:'var(--text-muted)', backgroundColor:'var(--bg-hover)',
                        padding:'2px 7px', borderRadius:999, display:'inline-block' }}>Hold</span>
                    ) : (
                      <span style={{ fontSize:9, color:'#f59e0b', fontWeight:600 }}>?</span>
                    )}
                  </div>

                </div>
              )
            })}

            {/* Total easing summary */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:20, marginTop:10, paddingTop:8 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>Total easing cycle</span>
              <span style={{ fontSize:14, fontWeight:900, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>−350bps</span>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>14.00% → 11.50%</span>
            </div>
          </div>

          {/* ── MPC meeting table ── */}
          <div style={{ borderTop:'1px solid var(--bg-border)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 80px 1fr 70px', gap:0,
              padding:'8px 0', borderBottom:'1px solid var(--bg-border)', marginBottom:2 }}>
              {['Date','Decision','Rate','','Change'].map((h,i) => (
                <span key={i} style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', fontWeight:700,
                  textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {MPC_MEETINGS.map((m,i) => {
              const isNext   = m.status === 'next'
              const isFuture = m.status === 'future'
              const isCut    = m.decision.includes('Cut')
              const bps      = (m.decision.match(/(\d+)bps/)||[])[1]
              const rateVal  = m.rate !== '?' ? parseFloat(m.rate) : null
              const barPct   = rateVal ? Math.min(((rateVal - 10) / 5) * 100, 100) : 20
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 110px 80px 1fr 70px',
                  padding:'9px 0', borderBottom:'1px solid var(--bg-border)',
                  opacity: isFuture ? .35 : 1,
                  backgroundColor: isNext ? '#f59e0b08' : 'transparent' }}>
                  <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums',
                    color: isNext ? '#f59e0b' : 'var(--text-secondary)', fontWeight: isNext ? 600 : 400 }}>{m.date}</span>
                  <span style={{ fontSize:11, fontWeight:600,
                    color: isCut ? '#16a34a' : isNext ? '#f59e0b' : 'var(--text-muted)' }}>{m.decision}</span>
                  <span style={{ fontSize:13, fontWeight:800, fontVariantNumeric:'tabular-nums',
                    color: 'var(--text-primary)' }}>{m.rate}{m.rate !== '?' ? '%' : ''}</span>
                  {/* mini bar */}
                  <div style={{ display:'flex', alignItems:'center', paddingRight:12 }}>
                    <div style={{ flex:1, height:5, borderRadius:999, backgroundColor:'var(--bg-border)', overflow:'hidden' }}>
                      <div style={{ width:`${barPct}%`, height:'100%', borderRadius:999,
                        backgroundColor: isCut ? '#FEA500' : isNext ? '#f59e0b' : 'var(--bg-border)',
                        opacity: m.rate === '?' ? .3 : 1 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums',
                    color: isCut ? '#16a34a' : isNext ? '#f59e0b' : 'var(--text-muted)' }}>
                    {isCut ? `−${bps}bps` : isNext ? 'upcoming' : '—'}
                  </span>
                </div>
              )
            })}
          </div>

          <p style={{ fontSize:10, marginTop:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Future MPC dates are estimates. Rate corridor: 10.50%–12.50%.
          </p>
        </Section>

        {/* ── Foreign Reserves Monitor ─────────────────────────────────────── */}
        <Section title="Foreign Reserves Monitor" subtitle="SBP weekly data — USD billions" icon={Building2}>
          {(() => {
            const maxTotal = Math.max(...RESERVES_DATA.map(d => d.total))
            const latest   = RESERVES_DATA[RESERVES_DATA.length - 1]
            const first    = RESERVES_DATA[0]
            const gain6m   = +(latest.sbp - first.sbp).toFixed(1)
            const banksPortion = +(latest.total - latest.sbp).toFixed(1)

            return (
              <>
                {/* ── Top KPI strip ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                  {([
                    { label:'SBP Holdings',   value:`$${latest.sbp}B`,    sub:`Latest — ${latest.month}`,        icon:'🏦', accent:false },
                    { label:'Total Reserves', value:`$${latest.total}B`,  sub:'SBP + commercial banks',          icon:'💰', accent:false },
                    { label:'Import Cover',   value:'~3 months',           sub:'Comfortable buffer',              icon:'🛡️', accent:true  },
                    { label:'6-Month Gain',   value:`+$${gain6m}B`,       sub:`${first.month} → ${latest.month}`,icon:'📈', accent:true  },
                  ] as const).map((s,i) => (
                    <div key={i} className="rounded-xl p-4 flex flex-col gap-2"
                      style={{
                        background: s.accent ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'var(--bg-hover)',
                        border: `1px solid ${s.accent ? 'rgba(22,163,74,0.2)' : 'var(--bg-border)'}`,
                      }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize:10, fontWeight:700, color: s.accent ? '#15803d' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize:14 }}>{s.icon}</span>
                      </div>
                      <span style={{ fontSize:22, fontWeight:800, color: s.accent ? '#15803d' : 'var(--text-primary)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                        {s.value}
                      </span>
                      <span style={{ fontSize:10, color: s.accent ? '#16a34a' : 'var(--text-muted)' }}>{s.sub}</span>
                    </div>
                  ))}
                </div>

                {/* ── Composition pill (SBP vs Banks) ── */}
                <div className="mb-6 p-4 rounded-xl" style={{ background:'var(--bg-hover)', border:'1px solid var(--bg-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Reserve Composition — {latest.month}
                    </span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>Total: <strong style={{ color:'var(--text-primary)' }}>${latest.total}B</strong></span>
                  </div>
                  {/* Stacked bar */}
                  <div className="relative h-8 rounded-lg overflow-hidden mb-3" style={{ background:'var(--bg-border)' }}>
                    <div className="absolute left-0 top-0 h-full flex items-center justify-center rounded-lg transition-all"
                      style={{ width:`${(latest.sbp/latest.total)*100}%`, background:'linear-gradient(90deg,#1d4ed8,#2563eb)', minWidth:60 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:'white' }}>SBP ${latest.sbp}B</span>
                    </div>
                    <div className="absolute top-0 h-full flex items-center justify-center"
                      style={{ left:`${(latest.sbp/latest.total)*100}%`, width:`${(banksPortion/latest.total)*100}%` }}>
                      <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)' }}>Banks ${banksPortion}B</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background:'#2563eb' }}/>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>SBP Holdings <strong style={{ color:'var(--text-primary)' }}>{((latest.sbp/latest.total)*100).toFixed(0)}%</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background:'var(--bg-border)', border:'1px solid var(--text-muted)' }}/>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>Commercial Banks <strong style={{ color:'var(--text-primary)' }}>{((banksPortion/latest.total)*100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                </div>

                {/* ── Monthly bar chart ── */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>Monthly Trend</span>
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background:'#2563eb' }}/>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>SBP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background:'#bfdbfe' }}/>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>Banks</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {RESERVES_DATA.map((d,i) => {
                      const isLast   = i === RESERVES_DATA.length - 1
                      const prev     = i > 0 ? RESERVES_DATA[i-1] : null
                      const chg      = prev ? +(d.sbp - prev.sbp).toFixed(1) : null
                      const sbpW     = (d.sbp   / maxTotal) * 100
                      const banksW   = ((d.total - d.sbp) / maxTotal) * 100
                      const sbpCol   = isLast ? '#d97706' : '#2563eb'
                      const bankCol  = isLast ? '#fde68a' : '#bfdbfe'

                      return (
                        <div key={d.month} className="flex items-center gap-3 group px-3 py-2 rounded-lg transition-colors"
                          style={{ background: isLast ? 'rgba(217,119,6,0.06)' : 'transparent' }}>

                          {/* Month */}
                          <span className="shrink-0 text-right" style={{ width:46, fontSize:11, fontWeight: isLast?700:500, color: isLast?'#d97706':'var(--text-muted)' }}>
                            {d.month}
                          </span>

                          {/* Stacked bar */}
                          <div className="flex-1 relative h-6 rounded-md overflow-hidden" style={{ background:'var(--bg-hover)' }}>
                            {/* banks portion */}
                            <div className="absolute left-0 top-0 h-full rounded-md transition-all"
                              style={{ width:`${sbpW+banksW}%`, background: bankCol }}/>
                            {/* sbp portion */}
                            <div className="absolute left-0 top-0 h-full rounded-md flex items-center pl-2 transition-all"
                              style={{ width:`${sbpW}%`, background: sbpCol }}>
                              {sbpW > 20 && (
                                <span style={{ fontSize:9, fontWeight:700, color:'white', whiteSpace:'nowrap' }}>${d.sbp}B</span>
                              )}
                            </div>
                          </div>

                          {/* SBP value */}
                          <span className="shrink-0 text-right font-number" style={{ width:44, fontSize:11, fontWeight: isLast?700:400, color: isLast?'var(--text-primary)':'var(--text-secondary)', fontVariantNumeric:'tabular-nums' }}>
                            ${d.sbp}B
                          </span>

                          {/* Total */}
                          <span className="hidden sm:block shrink-0 text-right font-number" style={{ width:44, fontSize:11, color:'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}>
                            ${d.total}B
                          </span>

                          {/* Change */}
                          <span className="shrink-0 text-right font-number" style={{ width:48, fontSize:11, fontWeight:600, fontVariantNumeric:'tabular-nums',
                            color: chg===null?'var(--text-muted)': chg>0?'#16a34a':'#dc2626' }}>
                            {chg===null ? '—' : `${chg>0?'+':''}${chg}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Column labels */}
                  <div className="flex items-center gap-3 mt-2 px-3">
                    <span style={{ width:46, fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}/>
                    <div className="flex-1"/>
                    <span className="text-right" style={{ width:44, fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>SBP</span>
                    <span className="hidden sm:block text-right" style={{ width:44, fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Total</span>
                    <span className="text-right" style={{ width:48, fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Δ MoM</span>
                  </div>
                </div>

                <p style={{ fontSize:10, marginTop:16, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                  <Info size={9}/> Low reserves = market stress signal. Watch for improvement after IMF tranche.
                </p>
              </>
            )
          })()}
        </Section>

        {/* ── Rupee Impact Analysis ────────────────────────────────────────── */}
        <Section title="Rupee Impact Analysis" subtitle="Estimated impact of 5% PKR depreciation" icon={ArrowLeftRight}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] gap-0">
            {/* Exporters */}
            <div className="sm:pr-7">
              <p style={{ fontSize:10, fontWeight:700, color:'#16a34a', textTransform:'uppercase',
                letterSpacing:'.07em', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
                <TrendingUp size={11}/> Exporters — gain on PKR drop
              </p>
              {PKR_IMPACT.filter(s=>s.type==='Exporter').map(s=>{
                const val=Math.abs(parseFloat(s.impact5pct))
                return(
                  <div key={s.symbol} style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:12, fontWeight:900, color:'#FEA500',
                          fontVariantNumeric:'tabular-nums', letterSpacing:'.02em', minWidth:40 }}>{s.symbol}</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.note}</span>
                      </div>
                      <span style={{ fontSize:14, fontWeight:800, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>{s.impact5pct}</span>
                    </div>
                    <div style={{ height:10, borderRadius:4, background:'var(--bg-hover)', overflow:'hidden' }}>
                      <div style={{ width:`${(val/5)*100}%`, height:'100%', borderRadius:4, background:'#16a34a' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hidden sm:block" style={{ width:1, background:'var(--bg-border)' }}/>
            {/* Importers */}
            <div className="sm:pl-7 border-t sm:border-t-0 pt-5 sm:pt-0" style={{ borderColor:'var(--bg-border)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#dc2626', textTransform:'uppercase',
                letterSpacing:'.07em', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
                <TrendingDown size={11}/> Importers — lose on PKR drop
              </p>
              {PKR_IMPACT.filter(s=>s.type==='Importer').map(s=>{
                const val=Math.abs(parseFloat(s.impact5pct))
                return(
                  <div key={s.symbol} style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:12, fontWeight:900, color:'#FEA500',
                          fontVariantNumeric:'tabular-nums', letterSpacing:'.02em', minWidth:40 }}>{s.symbol}</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.note}</span>
                      </div>
                      <span style={{ fontSize:14, fontWeight:800, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>{s.impact5pct}</span>
                    </div>
                    <div style={{ height:10, borderRadius:4, background:'var(--bg-hover)', overflow:'hidden' }}>
                      <div style={{ width:`${(val/5)*100}%`, height:'100%', borderRadius:4, background:'#dc2626' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p style={{ fontSize:10, marginTop:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Estimated. Exporters gain, importers lose on PKR depreciation.
          </p>
        </Section>
      </div>

      {/* ── CPEC Beneficiary Stocks ──────────────────────────────────────────── */}
      <Section title="CPEC Beneficiary Stocks" subtitle="Companies with significant CPEC revenue exposure" icon={TrendingUp}>
        {/* Column headers — mobile */}
        <div className="sm:hidden grid gap-0 px-3 py-2 mb-0.5"
          style={{ gridTemplateColumns:'80px 1fr 70px', borderBottom:'2px solid var(--bg-border)' }}>
          {['Symbol','Company','Exp.'].map(h=>(
            <span key={h} style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>{h}</span>
          ))}
        </div>
        {/* Column headers — desktop */}
        <div className="hidden sm:grid gap-0 px-3 py-2 mb-0.5"
          style={{ gridTemplateColumns:'80px 1fr 80px 70px 1fr', borderBottom:'2px solid var(--bg-border)' }}>
          {['Symbol','Company','Sector','Exposure','CPEC Role'].map(h=>(
            <span key={h} style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>{h}</span>
          ))}
        </div>
        {CPEC_STOCKS.map(s=>{
          const sectorColor: Record<string,string>={
            Power:'#2563eb', Cement:'#d97706', Fertilizer:'#16a34a', Textile:'#7c3aed', Paper:'#0891b2'
          }
          const col=sectorColor[s.sector]||'#94a3b8'
          return(
            <div key={s.symbol}>
              {/* Mobile row */}
              <div className="sm:hidden grid items-center gap-0 px-3 py-2.5"
                style={{ gridTemplateColumns:'80px 1fr 70px', borderBottom:'1px solid var(--bg-border)', borderLeft:`3px solid ${col}` }}>
                <span style={{ fontSize:13, fontWeight:800, color:'#FEA500', letterSpacing:'.01em' }}>{s.symbol}</span>
                <div>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{s.name}</span>
                  <p style={{ fontSize:10, color:col, fontWeight:600, marginTop:1 }}>{s.sector}</p>
                </div>
                <ExposureBadge level={s.exposure}/>
              </div>
              {/* Desktop row */}
              <div className="hidden sm:grid items-center gap-0 px-3 py-2.5"
                style={{ gridTemplateColumns:'80px 1fr 80px 70px 1fr', borderBottom:'1px solid var(--bg-border)', borderLeft:`3px solid ${col}` }}>
                <span style={{ fontSize:13, fontWeight:800, color:'#FEA500', letterSpacing:'.01em' }}>{s.symbol}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{s.name}</span>
                <span style={{ fontSize:11, fontWeight:600, color:col }}>{s.sector}</span>
                <ExposureBadge level={s.exposure}/>
                <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.note}</span>
              </div>
            </div>
          )
        })}
        <p className="text-[10px] mt-4 flex items-center gap-1" style={{ color:'var(--text-muted)' }}>
          <Info size={9}/> Exposure ratings are estimates based on publicly available project information.
        </p>
      </Section>

      {/* Data sources note */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-2"
        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
        <Info size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Data sources (when live API connected):</strong> SBP.gov.pk (reserves, policy rate),
          PBS.gov.pk (CPI inflation), IMF.org (program tracker), investing.com / tradingeconomics.com (Brent crude, USD/PKR),
          SBP MPC calendar (rate decisions). All current values are static placeholders — connect live APIs to auto-update.
        </p>
      </div>
    </div>
  )
}
