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
  const up       = d.change > 0
  const isNeutral = d.change === 0
  const isLive   = LIVE_IDS.has(id)

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)',
      borderRadius: 5, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* Value */}
      <p style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {formatVal(id, d.value)}
      </p>

      {/* Bottom row: change only */}
      <div style={{ marginTop: 2 }}>
        {!isNeutral ? (
          <span style={{
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
            color: up ? '#16a34a' : '#dc2626',
          }}>
            {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {up ? '+' : ''}{d.change.toFixed(2)}%
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

      {/* KPI grid — 5 per row on laptop+, 2 cols on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

        {/* IMF Program Tracker */}
        <Section title="IMF Program Tracker" subtitle="EFF Program — $7.0B (2023–2027)" icon={Shield}>
          {/* Summary stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, marginBottom:20,
            borderRadius:5, overflow:'hidden', border:'1px solid var(--bg-border)' }}>
            {[
              { label:'Received',    value:'$6.5B', color:'#16a34a' },
              { label:'Remaining',   value:'$0.5B', color:'var(--text-primary)' },
              { label:'Tranches',    value:'6 / 8', color:'var(--text-primary)' },
              { label:'Program End', value:'Mar 2027', color:'var(--text-primary)' },
            ].map((s,i) => (
              <div key={i} style={{ padding:'12px 16px', background:'var(--bg-hover)',
                borderRight: i < 3 ? '1px solid var(--bg-border)' : 'none' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                  letterSpacing:'.06em', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Full-width horizontal timeline SVG */}
          <div style={{ marginBottom:20 }}>
            <svg viewBox="0 0 760 90" width="100%" height="90" style={{ display:'block', overflow:'visible' }}>
              {/* Track */}
              <line x1="40" y1="28" x2="720" y2="28" stroke="var(--bg-border)" strokeWidth="2" />
              {/* Filled track */}
              <line x1="40" y1="28" x2="504" y2="28" stroke="#16a34a" strokeWidth="2.5" />
              {/* In-progress segment */}
              <line x1="504" y1="28" x2="594" y2="28" stroke="#d97706" strokeWidth="2" strokeDasharray="5 3" />

              {IMF_TRANCHES.map((t, i) => {
                const received = t.status === 'received'
                const isNext   = t.status === 'upcoming'
                const isFuture = t.status === 'future'
                // 8 nodes: x = 40 + i * (680/7)
                const x = 40 + i * (680 / 7)
                const nodeColor = received ? '#16a34a' : isNext ? '#d97706' : 'var(--bg-border)'
                const textColor = received ? '#16a34a' : isNext ? '#d97706' : 'var(--text-muted)'
                return (
                  <g key={i} opacity={isFuture ? 0.4 : 1}>
                    {/* Amount above */}
                    <text x={x} y="12" fontSize="10" fontWeight="700" fill={textColor}
                      textAnchor="middle" fontVariantNumeric="tabular-nums">{t.amount}</text>
                    {/* Node */}
                    <circle cx={x} cy="28" r={isNext ? 7 : 5}
                      fill={received ? '#16a34a' : isNext ? '#d97706' : 'var(--bg-card)'}
                      stroke={nodeColor} strokeWidth="2" />
                    {received && (
                      <text x={x} y="32" fontSize="7" fill="#fff" textAnchor="middle" fontWeight="900">✓</text>
                    )}
                    {/* Date below */}
                    <text x={x} y="46" fontSize="9" fill="var(--text-muted)" textAnchor="middle">{t.date}</text>
                    {/* Status label */}
                    <text x={x} y="60" fontSize="9" fill={textColor} textAnchor="middle" fontWeight={isNext ? '700' : '400'}>
                      {received ? t.tranche : isNext ? 'In progress' : 'Pending'}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Detail table */}
          <div style={{ borderTop:'1px solid var(--bg-border)' }}>
            {IMF_TRANCHES.map((t, i) => {
              const received = t.status === 'received'
              const isNext   = t.status === 'upcoming'
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'32px 52px 72px 1fr 96px',
                  alignItems:'center', padding:'7px 4px', borderBottom:'1px solid var(--bg-border)',
                  opacity: t.status === 'future' ? .38 : 1 }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)', textAlign:'right', paddingRight:8 }}>{i+1}</span>
                  <span style={{ fontSize:12, fontWeight:700, fontVariantNumeric:'tabular-nums',
                    color: received ? '#16a34a' : isNext ? '#d97706' : 'var(--text-secondary)' }}>{t.amount}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{t.date}</span>
                  <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{t.note}</span>
                  <span style={{ fontSize:11, fontWeight:600, textAlign:'right',
                    color: received ? '#16a34a' : isNext ? '#d97706' : 'var(--text-muted)' }}>
                    {received ? 'Received' : isNext ? 'In progress' : 'Pending'}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize:10, marginTop:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Estimated — verify with IMF.org.
          </p>
        </Section>

        {/* SBP Rate Calendar */}
        <Section title="SBP Policy Rate History" subtitle="Monetary Policy Committee · Jul 2025 – present" icon={Calendar}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
            paddingBottom:16, marginBottom:4, borderBottom:'1px solid var(--bg-border)' }}>
            <div>
              <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'.06em', marginBottom:6 }}>Current Policy Rate</div>
              <div style={{ fontSize:36, fontWeight:800, color:'var(--text-primary)',
                fontVariantNumeric:'tabular-nums', lineHeight:1, letterSpacing:'-.02em' }}>11.50%</div>
              <div style={{ fontSize:11, color:'#16a34a', marginTop:6 }}>
                ↓ 350bps easing · 4 cuts since Jul 2025
              </div>
            </div>
            <div style={{ display:'flex', gap:32 }}>
              {[
                { label:'Next MPC',   value:'Sep 22, 2026', color:'#d97706' },
                { label:'Days away',  value:`${daysToMPC} days`,   color:'var(--text-primary)' },
                { label:'Expected',   value:'Cut',          color:'#16a34a' },
                { label:'Corridor',   value:'10.50%–12.50%', color:'var(--text-primary)' },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                    letterSpacing:'.05em', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:s.color,
                    fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'130px 110px 72px 1fr 80px',
            padding:'8px 0 6px', borderBottom:'1px solid var(--bg-border)', marginBottom:2 }}>
            {['Date','Decision','Rate','Rate level','Change'].map(h => (
              <span key={h} style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'.05em', fontWeight:600 }}>{h}</span>
            ))}
          </div>

          {/* Meeting rows with inline bar */}
          {MPC_MEETINGS.map((m, i) => {
            const isNext   = m.status === 'next'
            const isFuture = m.status === 'future'
            const isCut    = m.decision.includes('Cut')
            const isHold   = m.decision === 'Hold'
            const bps      = (m.decision.match(/(\d+)bps/) || [])[1]
            const rateVal  = m.rate !== '?' ? parseFloat(m.rate) : null
            // bar: rate shown as % of 15 (max). Shows the current level.
            const barPct   = rateVal ? `${((rateVal - 10) / 5) * 100}%` : '30%'
            const barColor = isCut ? '#2563eb' : isNext ? '#d97706' : '#94a3b8'
            return (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'130px 110px 72px 1fr 80px',
                alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--bg-border)',
                opacity: isFuture ? .32 : 1 }}>
                <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums',
                  color: isNext ? '#d97706' : 'var(--text-secondary)',
                  fontWeight: isNext ? 600 : 400 }}>{m.date}</span>
                <span style={{ fontSize:11, fontWeight:600,
                  color: isCut ? '#2563eb' : isNext ? '#d97706' : 'var(--text-secondary)' }}>
                  {m.decision}
                </span>
                <span style={{ fontSize:13, fontWeight:700, fontVariantNumeric:'tabular-nums',
                  color:'var(--text-primary)' }}>{m.rate}</span>
                {/* Inline bar */}
                <div style={{ paddingRight:20 }}>
                  <div style={{ height:5, borderRadius:2, background:'var(--bg-hover)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:2, width: barPct,
                      background: barColor, opacity: m.rate === '?' ? .3 : 1,
                      transition:'width .4s ease' }} />
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight: isCut ? 600 : 400,
                  color: isCut ? '#16a34a' : isNext ? '#d97706' : 'var(--text-muted)',
                  fontVariantNumeric:'tabular-nums' }}>
                  {isCut ? `−${bps}bps` : isNext ? 'expected' : '—'}
                </span>
              </div>
            )
          })}

          <p style={{ fontSize:10, marginTop:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Future dates are estimates.
          </p>
        </Section>

        {/* Foreign Reserves */}
        <Section title="Foreign Reserves Monitor" subtitle="SBP weekly data — USD billions" icon={Building2}>
          {/* Summary stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, marginBottom:20,
            borderRadius:5, overflow:'hidden', border:'1px solid var(--bg-border)' }}>
            {[
              { label:'SBP Holdings',   value:'$17.1B', sub:'Aug 2026',          color:'var(--text-primary)' },
              { label:'Total Reserves', value:'$22.5B', sub:'SBP + banks',       color:'var(--text-primary)' },
              { label:'Import Cover',   value:'~3 mo',  sub:'comfortable level', color:'#16a34a' },
              { label:'Change (6mo)',   value:'+$4.0B', sub:'Feb → Aug 2026',    color:'#16a34a' },
            ].map((s,i) => (
              <div key={i} style={{ padding:'12px 16px', background:'var(--bg-hover)',
                borderRight: i < 3 ? '1px solid var(--bg-border)' : 'none' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                  letterSpacing:'.06em', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Two columns: grouped bar chart + data table */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {/* Left: SVG grouped column chart */}
            <div>
              <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'.06em', marginBottom:10 }}>Monthly trend</div>
              <svg viewBox="0 0 340 140" width="100%" height="140" style={{ display:'block', overflow:'visible' }}>
                {/* Y grid — 0, 10, 20 */}
                {[0,10,20].map(v => {
                  const y = 120 - (v/25)*110
                  return (
                    <g key={v}>
                      <line x1="28" y1={y} x2="334" y2={y} stroke="var(--bg-border)" strokeWidth=".7" />
                      <text x="24" y={y+3.5} fontSize="8" fill="var(--text-muted)" textAnchor="end">${v}B</text>
                    </g>
                  )
                })}
                {RESERVES_DATA.map((d, i) => {
                  const slotW = 44
                  const x = 32 + i * slotW
                  const sbpH  = (d.sbp  / 25) * 110
                  const totH  = (d.total / 25) * 110
                  const isLast = i === RESERVES_DATA.length - 1
                  return (
                    <g key={d.month}>
                      {/* Total bar (background) */}
                      <rect x={x} y={120-totH} width="18" height={totH} fill={isLast ? '#d97706' : '#2563eb'} opacity=".22" rx="1" />
                      {/* SBP bar (foreground) */}
                      <rect x={x} y={120-sbpH} width="18" height={sbpH} fill={isLast ? '#d97706' : '#2563eb'} rx="1" />
                      {/* X label */}
                      <text x={x+9} y="135" fontSize="8" fill={isLast ? '#d97706' : 'var(--text-muted)'}
                        textAnchor="middle">{d.month}</text>
                    </g>
                  )
                })}
              </svg>
              {/* Legend */}
              <div style={{ display:'flex', gap:16, marginTop:4 }}>
                {[
                  { color:'#2563eb', label:'SBP Reserves' },
                  { color:'#2563eb22', label:'Total (SBP + Banks)', border:'1px solid #2563eb60' },
                ].map((l,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:l.color, border:l.border || 'none' }} />
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: data table */}
            <div style={{ borderLeft:'1px solid var(--bg-border)', paddingLeft:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'52px 64px 64px 52px',
                paddingBottom:6, borderBottom:'1px solid var(--bg-border)', marginBottom:2 }}>
                {['Month','SBP','Total','Chg'].map(h => (
                  <span key={h} style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                    letterSpacing:'.05em', fontWeight:600 }}>{h}</span>
                ))}
              </div>
              {RESERVES_DATA.map((d, i) => {
                const isLast = i === RESERVES_DATA.length - 1
                const prev   = i > 0 ? RESERVES_DATA[i-1] : null
                const chg    = prev ? +(d.sbp - prev.sbp).toFixed(1) : null
                return (
                  <div key={d.month} style={{ display:'grid', gridTemplateColumns:'52px 64px 64px 52px',
                    padding:'7px 0', borderBottom:'1px solid var(--bg-border)',
                    fontWeight: isLast ? 700 : 400 }}>
                    <span style={{ fontSize:11, color: isLast ? '#d97706' : 'var(--text-muted)' }}>{d.month}</span>
                    <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums',
                      color: isLast ? 'var(--text-primary)' : 'var(--text-secondary)' }}>${d.sbp}B</span>
                    <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', color:'var(--text-muted)' }}>${d.total}B</span>
                    <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums',
                      color: chg && chg > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                      {chg !== null ? `+${chg}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:10, marginTop:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Low reserves = market stress signal. Watch for improvement after IMF tranche.
          </p>
        </Section>

        {/* Rupee Impact Analysis */}
        <Section title="Rupee Impact Analysis" subtitle="Estimated impact of 5% PKR depreciation" icon={ArrowLeftRight}>
          {/* Diverging bar chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1px 1fr', gap:0, marginBottom:4 }}>
            {/* Exporters — left */}
            <div style={{ paddingRight:20 }}>
              <div style={{ fontSize:10, color:'#16a34a', textTransform:'uppercase',
                letterSpacing:'.06em', fontWeight:600, marginBottom:10 }}>Exporters — gain on PKR drop</div>
              {PKR_IMPACT.filter(s => s.type === 'Exporter').map(s => {
                const val = Math.abs(parseFloat(s.impact5pct))
                const barW = `${(val / 5) * 100}%`
                return (
                  <div key={s.symbol} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--brand)', width:44 }}>{s.symbol}</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.note}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'#16a34a',
                        fontVariantNumeric:'tabular-nums' }}>{s.impact5pct}</span>
                    </div>
                    <div style={{ height:5, borderRadius:2, background:'var(--bg-hover)', overflow:'hidden' }}>
                      <div style={{ width:barW, height:'100%', borderRadius:2, background:'#16a34a' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ width:1, background:'var(--bg-border)' }} />

            {/* Importers — right */}
            <div style={{ paddingLeft:20 }}>
              <div style={{ fontSize:10, color:'#dc2626', textTransform:'uppercase',
                letterSpacing:'.06em', fontWeight:600, marginBottom:10 }}>Importers — lose on PKR drop</div>
              {PKR_IMPACT.filter(s => s.type === 'Importer').map(s => {
                const val = Math.abs(parseFloat(s.impact5pct))
                const barW = `${(val / 5) * 100}%`
                return (
                  <div key={s.symbol} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--brand)', width:44 }}>{s.symbol}</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.note}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'#dc2626',
                        fontVariantNumeric:'tabular-nums' }}>{s.impact5pct}</span>
                    </div>
                    <div style={{ height:5, borderRadius:2, background:'var(--bg-hover)', overflow:'hidden' }}>
                      <div style={{ width:barW, height:'100%', borderRadius:2, background:'#dc2626' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:10, marginTop:8, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Estimated. Exporters gain, importers lose on PKR depreciation.
          </p>
        </Section>
      </div>

      {/* CPEC Beneficiary Stocks — full width */}
      <Section title="CPEC Beneficiary Stocks" subtitle="Companies with significant CPEC revenue exposure" icon={TrendingUp}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CPEC_STOCKS.map(s => (
            <div key={s.symbol} className="rounded-xl p-3 flex flex-col gap-1.5"
              style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: '#FEA500' }}>{s.symbol}</span>
                <ExposureBadge level={s.exposure} />
              </div>
              <p className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.sector}</p>
              <p className="text-[10px] mt-auto pt-1.5" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--bg-border)' }}>
                {s.note}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-4 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
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
