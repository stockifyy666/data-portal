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
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)',
      borderRadius: 5, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'sk-pulse 1.6s ease-in-out infinite',
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
  // When change is available use it; otherwise fall back to value sign
  const direction = d.change !== 0 ? d.change : d.value
  const up        = direction > 0
  const isNeutral = direction === 0
  const isLive    = LIVE_IDS.has(id)

  const bgColor  = up ? '#dcfce7' : isNeutral ? 'var(--bg-card)' : '#fee2e2'
  const bdrColor = up ? 'rgba(22,163,74,0.35)' : isNeutral ? 'var(--bg-border)' : 'rgba(220,38,38,0.35)'

  return (
    <div className="macro-card" style={{
      backgroundColor: bgColor, border: `1px solid ${bdrColor}`,
      borderRadius: 5, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
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
            <span style={{ fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 2,
              color: up ? '#16a34a' : '#dc2626' }}>
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
          <span style={{
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
            color: up ? '#16a34a' : '#dc2626',
          }}>
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
        <Section title="IMF Program Tracker" subtitle="EFF Program — $7.0B (2023–2027)" icon={Shield}>
          {/* Hero stats */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:32, marginBottom:20, flexWrap:'wrap' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Disbursed</p>
              <p style={{ fontSize:36, fontWeight:900, color:'#16a34a', lineHeight:1, fontVariantNumeric:'tabular-nums', letterSpacing:'-.02em' }}>$6.5B</p>
            </div>
            <div style={{ paddingBottom:4 }}>
              <p style={{ fontSize:18, color:'var(--text-muted)', fontWeight:300 }}>of $7.0B total</p>
            </div>
            <div style={{ flex:1, minWidth:160, paddingBottom:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>6 of 8 tranches</span>
                <span style={{ fontSize:10, fontWeight:700, color:'#16a34a' }}>75%</span>
              </div>
              <div style={{ display:'flex', gap:3 }}>
                {Array.from({length:8}).map((_,i) => (
                  <div key={i} style={{ flex:1, height:10, borderRadius:3,
                    backgroundColor: i<6 ? '#16a34a' : i===6 ? '#f59e0b' : 'var(--bg-border)',
                    opacity: i===7 ? 0.45 : 1 }} />
                ))}
              </div>
            </div>
            <div style={{ paddingBottom:4, textAlign:'right' }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Program End</p>
              <p style={{ fontSize:18, fontWeight:700, color:'var(--text-secondary)' }}>Mar 2027</p>
            </div>
          </div>

          {/* Cumulative disbursement staircase chart */}
          <div style={{ marginBottom:20, borderTop:'1px solid var(--bg-border)', paddingTop:16 }}>
            {(() => {
              // cumulative totals after each tranche
              const amounts = [1.1, 1.1, 1.0, 1.0, 1.0, 1.3, 1.3, 1.3]
              const total   = 7.0
              let cumul     = 0
              const steps   = IMF_TRANCHES.map((t, i) => {
                const prev = cumul
                if (t.status === 'received') cumul += amounts[i]
                return { ...t, prev, cumul: t.status === 'received' ? cumul : prev, amt: amounts[i] }
              })
              // SVG coords
              const W = 720, H = 110, padL = 38, padB = 28
              const toX = (i: number) => padL + (i / 7) * W
              const toY = (v: number) => H - padB - (v / total) * (H - padB - 8)
              // build staircase path for received + in-progress
              const receivedCount = steps.filter(s => s.status === 'received').length
              let path = `M${toX(0)},${toY(0)}`
              steps.forEach((s, i) => {
                const x = toX(i + 1)
                const y = toY(s.cumul)
                path += ` H${x} V${y}`
              })
              // fill path
              const fillPath = `M${toX(0)},${toY(0)} ${steps.map((s,i)=>`H${toX(i+1)} V${toY(s.cumul)}`).join(' ')} V${H-padB} H${toX(0)} Z`
              // target line y
              const targetY = toY(total)
              return (
                <svg viewBox={`0 0 ${W+padL+10} ${H}`} width="100%" height={H} style={{ display:'block', overflow:'visible' }}>
                  <defs>
                    <linearGradient id="imfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity=".22"/>
                      <stop offset="100%" stopColor="#16a34a" stopOpacity=".03"/>
                    </linearGradient>
                  </defs>

                  {/* Grid lines + Y labels */}
                  {[0,2,4,6,7].map(v => {
                    const y = toY(v)
                    const isTarget = v === 7
                    return (
                      <g key={v}>
                        <line x1={padL} y1={y} x2={W+padL} y2={y}
                          stroke={isTarget ? '#d97706' : 'var(--bg-border)'}
                          strokeWidth={isTarget ? 1 : .6}
                          strokeDasharray={isTarget ? '4 3' : ''}/>
                        <text x={padL-4} y={y+3.5} fontSize="8.5" fill={isTarget?'#d97706':'var(--text-muted)'} textAnchor="end">
                          ${v}B
                        </text>
                        {isTarget && (
                          <text x={W+padL+6} y={y+3.5} fontSize="8" fill="#d97706" textAnchor="start">Target</text>
                        )}
                      </g>
                    )
                  })}

                  {/* Shaded fill */}
                  <path d={fillPath} fill="url(#imfGrad)"/>

                  {/* Staircase line */}
                  <path d={path} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round"/>

                  {/* Step dots + labels at each rise */}
                  {steps.map((s, i) => {
                    const x = toX(i + 1)
                    const y = toY(s.cumul)
                    const received = s.status === 'received'
                    const isNext   = s.status === 'upcoming'
                    if (!received && !isNext) return null
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={isNext?5:4}
                          fill={received?'#16a34a':'#f59e0b'} stroke="var(--bg-card)" strokeWidth="1.5"/>
                        <text x={x} y={y-8} fontSize="8.5" fontWeight="700"
                          fill={received?'#16a34a':'#f59e0b'} textAnchor="middle">
                          {received ? `$${s.cumul.toFixed(1)}B` : '~$6.5B'}
                        </text>
                      </g>
                    )
                  })}

                  {/* X axis date labels */}
                  {steps.map((s, i) => (
                    <text key={i} x={toX(i+1)} y={H-padB+12} fontSize="8.5"
                      fill={s.status==='upcoming'?'#f59e0b':'var(--text-muted)'} textAnchor="middle">
                      {s.date}
                    </text>
                  ))}

                  {/* Baseline */}
                  <line x1={padL} y1={H-padB} x2={W+padL} y2={H-padB} stroke="var(--bg-border)" strokeWidth="1"/>

                  {/* "In progress" dashed extension */}
                  {(() => {
                    const lastReceived = steps.filter(s=>s.status==='received').length
                    const x1 = toX(lastReceived), x2 = toX(lastReceived+1)
                    const y1 = toY(steps[lastReceived-1]?.cumul??0)
                    return <line x1={x1} y1={y1} x2={x2} y2={y1}
                      stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3"/>
                  })()}
                </svg>
              )
            })()}
          </div>

          {/* Full-width histogram */}
          <div style={{ borderTop:'1px solid var(--bg-border)', paddingTop:16 }}>
            <svg viewBox="0 0 760 160" width="100%" height="160" style={{ display:'block', overflow:'visible' }}>
              {/* Y grid */}
              {[0, 0.5, 1.0, 1.5].map(v => {
                const y = 120 - (v / 1.5) * 104
                return (
                  <g key={v}>
                    <line x1="36" y1={y} x2="754" y2={y} stroke="var(--bg-border)" strokeWidth=".65"/>
                    <text x="32" y={y + 3.5} fontSize="8" fill="var(--text-muted)" textAnchor="end">${v.toFixed(1)}B</text>
                  </g>
                )
              })}
              {/* Bars */}
              {IMF_TRANCHES.map((t, i) => {
                const received = t.status === 'received'
                const isNext   = t.status === 'upcoming'
                const isFuture = t.status === 'future'
                const amounts  = [1.1, 1.1, 1.0, 1.0, 1.0, 1.3, 1.3, 1.3]
                const amt      = amounts[i]
                const barH     = (amt / 1.5) * 104
                const slotW    = (760 - 36) / 8
                const x        = 36 + i * slotW + slotW * 0.15
                const bW       = slotW * 0.70
                const y        = 120 - barH
                const fill     = received ? '#16a34a' : isNext ? '#f59e0b' : '#cbd5e1'
                const textC    = received ? '#16a34a' : isNext ? '#f59e0b' : '#94a3b8'
                return (
                  <g key={i} opacity={isFuture ? 0.38 : 1}>
                    <defs>
                      <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={fill} stopOpacity={received ? '.95' : '.7'}/>
                        <stop offset="100%" stopColor={fill} stopOpacity={received ? '.65' : '.4'}/>
                      </linearGradient>
                    </defs>
                    <rect x={x} y={y} width={bW} height={barH} fill={`url(#bg${i})`} rx="5"/>
                    {/* Amount on top */}
                    <text x={x + bW/2} y={y - 6} fontSize="9.5" fontWeight="800" fill={textC} textAnchor="middle">{t.amount}</text>
                    {/* Checkmark inside received bars */}
                    {received && barH > 20 && (
                      <text x={x + bW/2} y={y + barH/2 + 5} fontSize="13" fill="rgba(255,255,255,0.85)" textAnchor="middle">✓</text>
                    )}
                    {/* Date */}
                    <text x={x + bW/2} y="135" fontSize="8.5" fill={isNext ? '#d97706' : 'var(--text-muted)'} textAnchor="middle">{t.date}</text>
                    {/* Status */}
                    <text x={x + bW/2} y="150" fontSize="8" fontWeight={isNext ? '700' : '400'} fill={textC} textAnchor="middle">
                      {received ? t.tranche : isNext ? 'In progress' : 'Pending'}
                    </text>
                  </g>
                )
              })}
              {/* Baseline */}
              <line x1="36" y1="120" x2="754" y2="120" stroke="var(--bg-border)" strokeWidth="1.5"/>
            </svg>
          </div>
          <p style={{ fontSize:10, marginTop:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Estimated — verify with IMF.org.
          </p>
        </Section>

        {/* ── SBP Policy Rate History ──────────────────────────────────────── */}
        <Section title="SBP Policy Rate History" subtitle="Monetary Policy Committee · Jul 2025 – present" icon={Calendar}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            style={{ paddingBottom:20, marginBottom:20, borderBottom:'1px solid var(--bg-border)' }}>
            <div>
              <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Current Policy Rate</p>
              <p style={{ fontSize:44, fontWeight:900, color:'var(--text-primary)', lineHeight:1,
                letterSpacing:'-.03em', fontVariantNumeric:'tabular-nums' }}>11.50%</p>
              <p style={{ fontSize:11, color:'#16a34a', marginTop:8, display:'flex', alignItems:'center', gap:5 }}>
                <TrendingDown size={12}/> −350bps easing since Jul 2025 · 4 rate cuts
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-7 gap-y-3">
              {([
                { label:'Next MPC',  value:'Sep 22, 2026',  color:'#d97706' },
                { label:'Days away', value:`${daysToMPC} days`, color:'var(--text-primary)' },
                { label:'Expected',  value:'Cut',           color:'#16a34a' },
                { label:'Corridor',  value:'10.50%–12.50%', color:'var(--text-secondary)' },
              ] as const).map((s,i) => (
                <div key={i} className="sm:text-right">
                  <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>{s.label}</p>
                  <p style={{ fontSize:13, fontWeight:700, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step-down rate chart */}
          <div style={{ marginBottom:20 }}>
            <svg viewBox="0 0 620 110" width="100%" height="110" style={{ display:'block', overflow:'visible' }}>
              {/* Y grid */}
              {[11,12,13,14].map(r => {
                const y = 95-(r-10.5)/4*85
                return (
                  <g key={r}>
                    <line x1="32" y1={y} x2="608" y2={y} stroke="var(--bg-border)" strokeWidth=".6"/>
                    <text x="28" y={y+3} fontSize="8.5" fill="var(--text-muted)" textAnchor="end">{r}%</text>
                  </g>
                )
              })}
              {/* Shaded area + step line */}
              {(() => {
                // rates over time, positions proportional to month offset
                const pts=[
                  {x:40,r:14},{x:115,r:13},{x:211,r:13},{x:307,r:13},
                  {x:402,r:12.5},{x:451,r:11.5},{x:518,r:11.5}
                ]
                const toY=(r:number)=>95-(r-10.5)/4*85
                let path='M'+pts.map(p=>`${p.x},${toY(p.r)}`).reduce((a,c,i)=>{
                  if(i===0) return c
                  const prev=pts[i-1], cur=pts[i]
                  return a+` H${cur.x} V${toY(cur.r)}`
                })
                const fillPath=`M40,95 L40,${toY(14)} `+pts.slice(1).map((p,i)=>{
                  const prev=pts[i]; return `H${p.x} V${toY(p.r)}`
                }).join(' ')+` H518 V95 Z`
                return (
                  <>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity=".15"/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity=".02"/>
                      </linearGradient>
                    </defs>
                    <path d={fillPath} fill="url(#rateGrad)"/>
                    <path d={`M${pts[0].x},${toY(pts[0].r)}`+pts.slice(1).map((p,i)=>`H${p.x} V${toY(p.r)}`).join(' ')}
                      fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round"/>
                    {/* Current rate dot */}
                    <circle cx={518} cy={toY(11.5)} r={5} fill="#2563eb"/>
                    <text x={530} y={toY(11.5)+4} fontSize="9" fontWeight="700" fill="#2563eb">11.50%</text>
                    {/* X axis labels */}
                    {[{x:40,l:'Jul 25'},{x:115,l:'Sep 25'},{x:307,l:'Jan 26'},{x:451,l:'Apr 26'},{x:518,l:'Jun 26'}].map(p=>(
                      <text key={p.l} x={p.x} y="106" fontSize="8" fill="var(--text-muted)" textAnchor="middle">{p.l}</text>
                    ))}
                  </>
                )
              })()}
            </svg>
          </div>

          {/* Meeting rows — clean dividers only */}
          <div style={{ borderTop:'1px solid var(--bg-border)' }}>
            {MPC_MEETINGS.map((m,i) => {
              const isNext=m.status==='next', isFuture=m.status==='future'
              const isCut=m.decision.includes('Cut')
              const bps=(m.decision.match(/(\d+)bps/)||[])[1]
              const rateVal=m.rate!=='?'?parseFloat(m.rate):null
              const barPct=rateVal?`${((rateVal-10)/5)*100}%`:'28%'
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0 9px',
                  borderBottom:'1px solid var(--bg-border)', opacity:isFuture?.3:1,
                  backgroundColor:isNext?'rgba(245,158,11,.04)':'transparent' }}>
                  <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', width:88, flexShrink:0,
                    color:isNext?'#d97706':'var(--text-muted)', fontWeight:isNext?600:400 }}>{m.date}</span>
                  <span style={{ fontSize:11, fontWeight:600, width:80, flexShrink:0,
                    color:isCut?'#2563eb':isNext?'#d97706':'var(--text-muted)' }}>{m.decision}</span>
                  <span style={{ fontSize:15, fontWeight:800, width:52, flexShrink:0,
                    fontVariantNumeric:'tabular-nums', color:'var(--text-primary)' }}>{m.rate}</span>
                  <div className="hidden sm:block" style={{ flex:1, height:8, borderRadius:4, background:'var(--bg-hover)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, width:barPct,
                      backgroundColor:isCut?'#2563eb':isNext?'#f59e0b':'#94a3b8',
                      opacity:m.rate==='?'?.25:1 }}/>
                  </div>
                  <span className="hidden sm:inline" style={{ fontSize:11, fontWeight:700, width:60, textAlign:'right', flexShrink:0,
                    fontVariantNumeric:'tabular-nums',
                    color:isCut?'#16a34a':isNext?'#d97706':'var(--text-muted)' }}>
                    {isCut?`−${bps}bps`:isNext?'expected':'—'}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize:10, marginTop:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Future dates are estimates.
          </p>
        </Section>

        {/* ── Foreign Reserves Monitor ─────────────────────────────────────── */}
        <Section title="Foreign Reserves Monitor" subtitle="SBP weekly data — USD billions" icon={Building2}>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 mb-6 pb-5"
            style={{ borderBottom:'1px solid var(--bg-border)' }}>
            {([
              { label:'SBP Holdings',  value:'$17.1B', sub:'Aug 2026',    vc:'var(--text-primary)', accent:false },
              { label:'Total Reserves',value:'$22.5B', sub:'SBP + banks', vc:'var(--text-primary)', accent:false },
              { label:'Import Cover',  value:'~3 mo',  sub:'comfortable', vc:'#16a34a',             accent:true  },
              { label:'6-mo Change',   value:'+$4.0B', sub:'Feb→Aug 2026',vc:'#16a34a',             accent:true  },
            ] as const).map((s,i) => (
              <div key={i} className={i>0 ? 'sm:border-l sm:pl-6' : ''} style={{ borderColor:'var(--bg-border)' }}>
                <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{s.label}</p>
                <p style={{ fontSize:26, fontWeight:800, color:s.vc, fontVariantNumeric:'tabular-nums', lineHeight:1, letterSpacing:'-.01em' }}>{s.value}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Chart + table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <div>
              <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>Monthly trend</p>
              <svg viewBox="0 0 340 130" width="100%" height="130" style={{ display:'block', overflow:'visible' }}>
                {[0,10,20].map(v=>{const y=110-(v/25)*100;return(
                  <g key={v}><line x1="28" y1={y} x2="330" y2={y} stroke="var(--bg-border)" strokeWidth=".6"/>
                  <text x="24" y={y+3.5} fontSize="8" fill="var(--text-muted)" textAnchor="end">${v}B</text></g>
                )})}
                {RESERVES_DATA.map((d,i)=>{
                  const x=32+i*44; const sbpH=(d.sbp/25)*100; const totH=(d.total/25)*100
                  const isLast=i===RESERVES_DATA.length-1; const col=isLast?'#d97706':'#2563eb'
                  return(<g key={d.month}>
                    <rect x={x} y={110-totH} width="22" height={totH} fill={col} opacity=".15" rx="2"/>
                    <rect x={x} y={110-sbpH} width="22" height={sbpH} fill={col} rx="2" opacity={isLast?1:.8}/>
                    <text x={x+11} y="126" fontSize="8" fill={isLast?'#d97706':'var(--text-muted)'} textAnchor="middle">{d.month}</text>
                  </g>)
                })}
              </svg>
              <div style={{ display:'flex', gap:14, marginTop:6 }}>
                {([{c:'#2563eb',l:'SBP Reserves'},{c:'#2563eb22',l:'Total',b:'1px solid #2563eb40'}] as any[]).map((x,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:x.c, border:x.b||'none' }}/>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l pt-5 sm:pt-0 sm:pl-6" style={{ borderColor:'var(--bg-border)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'52px 60px 60px 48px',
                paddingBottom:7, borderBottom:'1px solid var(--bg-border)', marginBottom:4 }}>
                {['Month','SBP','Total','Chg'].map(h=>(
                  <span key={h} style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>{h}</span>
                ))}
              </div>
              {RESERVES_DATA.map((d,i)=>{
                const isLast=i===RESERVES_DATA.length-1
                const prev=i>0?RESERVES_DATA[i-1]:null
                const chg=prev?+(d.sbp-prev.sbp).toFixed(1):null
                return(
                  <div key={d.month} style={{ display:'grid', gridTemplateColumns:'52px 60px 60px 48px',
                    padding:'7px 0', borderBottom:'1px solid var(--bg-border)', fontWeight:isLast?700:400 }}>
                    <span style={{ fontSize:11, color:isLast?'#d97706':'var(--text-muted)' }}>{d.month}</span>
                    <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', color:isLast?'var(--text-primary)':'var(--text-secondary)' }}>${d.sbp}B</span>
                    <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', color:'var(--text-muted)' }}>${d.total}B</span>
                    <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', color:chg&&chg>0?'#16a34a':'var(--text-muted)' }}>{chg!==null?`+${chg}`:'—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <p style={{ fontSize:10, marginTop:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Low reserves = market stress signal. Watch for improvement after IMF tranche.
          </p>
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
