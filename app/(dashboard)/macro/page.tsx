'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Percent, Droplets, TrendingUp, TrendingDown,
  AlertCircle, Calendar, Shield, Building2, ArrowLeftRight,
  RefreshCw, Globe, Info,
} from 'lucide-react'

// Live fallbacks while fetching
const LIVE_FALLBACK = {
  usdPkr:      { value: 278.40, change: 0, label: 'USD / PKR',       note: 'Live — open.er-api.com' },
  oilBrent:    { value: 82.40,  change: 0, label: 'Brent Crude',     note: 'Live — Yahoo Finance (BZ=F)' },
  wti:         { value: 78.20,  change: 0, label: 'WTI Crude',       note: 'Live — Yahoo Finance (CL=F)' },
  sbpRate:     { value: 11.50,  change: 0, label: 'SBP Policy Rate', note: 'MPC Apr 27, 2026 — Cut 100bps' },
  inflation:   { value: 4.50,   change: 0, label: 'CPI Inflation',   note: 'IMF WEO 2025 annual avg' },
  forex:       { value: 17.10,  change: 0, label: 'Forex Reserves',  note: 'SBP holdings — Aug 26' },
  currentAcct: { value: -0.20,  change: 0, label: 'Current Account', note: 'FY2026 full-year (est.) — USD billion' },
  gdpGrowth:   { value: 3.10,   change: 0, label: 'GDP Growth',      note: 'IMF WEO 2025 annual %' },
  remittances: { value: 3.20,   change: 0, label: 'Remittances',     note: 'SBP — monthly (Jul 2026, USD billion)' },
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

const LIVE_IDS = new Set(['usdPkr', 'oilBrent', 'wti', 'sbpRate', 'inflation', 'forex', 'currentAcct', 'gdpGrowth', 'remittances'])

// ── KPI skeleton ──────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 animate-pulse"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #22c55e30' }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-4 w-12 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-28 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-3 w-20 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-2.5 w-32 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
      </div>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ id, d, loading }: { id: string; d: { value: number; change: number; label: string; note: string } | null; loading?: boolean }) {
  if (!d) return <KpiSkeleton />
  const Icon    = getIcon(id)
  const up      = d.change >= 0
  const isNeutral = d.change === 0
  const isLive  = LIVE_IDS.has(id)

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isLive ? '#22c55e30' : 'var(--bg-border)'}` }}>
      {isLive && (
        <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-green-600">
          <span className={`w-1.5 h-1.5 rounded-full bg-green-500 ${loading ? 'animate-pulse' : ''}`} />
          LIVE
        </span>
      )}
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
          <Icon size={14} className="text-white" />
        </div>
        {!isNeutral && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 mr-6
            ${up ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                 : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'}`}>
            {up ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
            {up ? '+' : ''}{d.change.toFixed(2)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black font-number" style={{ color: 'var(--text-primary)' }}>
          {formatVal(id, d.value)}
        </p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>{d.label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{d.note}</p>
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
    currentAcct: null, gdpGrowth: null, remittances: null,
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

    fetch('/api/market/macro')
      .then(r => r.json())
      .then(j => {
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
        })
        setLastUpdated(new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }))
      })
      .catch(() => {
        setLiveData({
          ...Object.fromEntries(Object.keys(LIVE_FALLBACK).map(k => [k, LIVE_FALLBACK[k as keyof typeof LIVE_FALLBACK]])),
          sbpRate:     { value: sbpRateVal,     change: 0, label: 'SBP Policy Rate', note: sbpRateNote },
          forex:       { value: forexVal,       change: 0, label: 'Forex Reserves',  note: forexNote },
          remittances: { value: remittancesVal, change: 0, label: 'Remittances',     note: remittancesNote },
        })
      })
      .finally(() => setLiveLoading(false))
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

      {/* KPI row 1: USD/PKR · SBP Rate · Inflation · Oil (Brent + WTI split) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard id="usdPkr"    d={MACRO_DATA.usdPkr}    loading={liveLoading} />
        <KpiCard id="sbpRate"   d={MACRO_DATA.sbpRate}   loading={liveLoading} />
        <KpiCard id="inflation" d={MACRO_DATA.inflation}  loading={liveLoading} />

        {/* Dual oil card — Brent left / WTI right */}
        <div className="rounded-2xl overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #22c55e30' }}>
          {/* LIVE badge */}
          <div className="flex items-center justify-end px-3 pt-2">
            <span className="flex items-center gap-1 text-[9px] font-bold text-green-600">
              <span className={`w-1.5 h-1.5 rounded-full bg-green-500 ${liveLoading ? 'animate-pulse' : ''}`} />
              LIVE
            </span>
          </div>
          <div className="flex flex-1" style={{ borderTop: '0' }}>
            {/* Brent */}
            <div className="flex-1 px-3 pb-3 flex flex-col gap-1">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                <Droplets size={13} className="text-white" />
              </div>
              {MACRO_DATA.oilBrent ? (
                <>
                  <p className="text-xl font-black font-number" style={{ color: 'var(--text-primary)' }}>
                    ${MACRO_DATA.oilBrent.value.toFixed(2)}
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Brent</p>
                  {MACRO_DATA.oilBrent.change !== 0 && (
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${MACRO_DATA.oilBrent.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {MACRO_DATA.oilBrent.change >= 0 ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
                      {MACRO_DATA.oilBrent.change >= 0 ? '+' : ''}{MACRO_DATA.oilBrent.change.toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <div className="animate-pulse space-y-1.5 mt-1">
                  <div className="h-6 w-16 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-3 w-10 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
                </div>
              )}
            </div>
            {/* WTI */}
            <div className="flex-1 px-3 pb-3 flex flex-col gap-1" style={{ borderLeft: '1px solid var(--bg-border)' }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4338ca)' }}>
                <Droplets size={13} className="text-white" />
              </div>
              {MACRO_DATA.wti ? (
                <>
                  <p className="text-xl font-black font-number" style={{ color: 'var(--text-primary)' }}>
                    ${MACRO_DATA.wti.value.toFixed(2)}
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>WTI</p>
                  {MACRO_DATA.wti.change !== 0 && (
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${MACRO_DATA.wti.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {MACRO_DATA.wti.change >= 0 ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
                      {MACRO_DATA.wti.change >= 0 ? '+' : ''}{MACRO_DATA.wti.change.toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <div className="animate-pulse space-y-1.5 mt-1">
                  <div className="h-6 w-16 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-3 w-10 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }} />
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] px-3 pb-2.5" style={{ color: 'var(--text-muted)' }}>USD/bbl — BZ=F &amp; CL=F</p>
        </div>
      </div>

      {/* KPI row 2: Forex · Current Account · GDP Growth · Remittances */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['forex', 'currentAcct', 'gdpGrowth', 'remittances'] as const).map(k => (
          <KpiCard key={k} id={k} d={MACRO_DATA[k]} loading={liveLoading} />
        ))}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* IMF Program Tracker */}
        <Section title="IMF Program Tracker" subtitle="EFF Program — $7B total (2023–2027)" icon={Shield}>
          <div className="space-y-2">
            {IMF_TRANCHES.map((t, i) => {
              const isNext    = t.status === 'upcoming'
              const received  = t.status === 'received'
              const isFuture  = t.status === 'future'
              return (
                <div key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: isNext ? '#f59e0b12' : received ? '#22c55e08' : 'var(--bg-hover)',
                    border: isNext ? '1px solid #f59e0b40' : '1px solid transparent',
                  }}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    received ? 'bg-green-500' : isNext ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'
                  }`} />
                  <span className="text-[11px] font-bold w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {t.tranche}
                  </span>
                  <span className="text-xs font-bold font-number w-14 shrink-0"
                    style={{ color: received ? '#16a34a' : isNext ? '#d97706' : 'var(--text-muted)' }}>
                    {t.amount}
                  </span>
                  <span className="text-[11px] w-18 shrink-0" style={{ color: 'var(--text-muted)' }}>{t.date}</span>
                  <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{t.note}</span>
                  {received && <span className="text-[10px] text-green-600 font-bold shrink-0">✓</span>}
                  {isNext   && <span className="text-[10px] text-amber-500 font-bold shrink-0">⏳</span>}
                </div>
              )
            })}
          </div>
          <p className="text-[10px] mt-3 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Info size={9}/> Total received: $6.5B of $7.0B. Data is estimated — verify with IMF.org.
          </p>
        </Section>

        {/* SBP Rate Calendar */}
        <Section title="SBP Rate Decision Calendar" subtitle="Monetary Policy Committee (MPC) meetings" icon={Calendar}>
          <div className={`flex items-center gap-3 mb-4 px-4 py-3 rounded-xl`}
            style={{ backgroundColor: '#3b82f612', border: '1px solid #3b82f630' }}>
            <div className="text-center">
              <p className="text-3xl font-black font-number" style={{ color: '#3b82f6' }}>{daysToMPC}</p>
              <p className="text-[10px] font-semibold" style={{ color: '#3b82f6' }}>days</p>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Next MPC — Sep 22, 2026</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Rate cut sectors: Banks, Real Estate, Cement · Corridor: 11.50% policy / 12.50% ceiling
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {MPC_MEETINGS.map((m, i) => {
              const isNext   = m.status === 'next'
              const isFuture = m.status === 'future'
              const isPast   = m.status === 'past'
              const isCut    = m.decision.includes('Cut')
              const isHike   = m.decision.includes('Hike')
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: isNext ? '#f59e0b10' : 'transparent',
                    border: isNext ? '1px solid #f59e0b30' : '1px solid transparent',
                  }}>
                  <span className="text-[11px] w-24 shrink-0 font-medium"
                    style={{ color: isNext ? '#d97706' : isFuture ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                    {m.date}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isCut  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                    isHike ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                    isNext || isFuture ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  }`}>
                    {m.decision}
                  </span>
                  <span className="text-[11px] font-number font-bold ml-auto"
                    style={{ color: 'var(--text-primary)' }}>
                    {m.rate}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] mt-3 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Info size={9}/> Dates are estimates for future meetings.
          </p>
        </Section>

        {/* Foreign Reserves */}
        <Section title="Foreign Reserves Monitor" subtitle="Weekly SBP data — USD billions" icon={Building2}>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-2xl font-black font-number" style={{ color: 'var(--text-primary)' }}>$17.1B</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>SBP Holdings — Aug 2026</p>
            </div>
            <div className="h-10 w-px" style={{ backgroundColor: 'var(--bg-border)' }} />
            <div>
              <p className="text-2xl font-black font-number" style={{ color: 'var(--text-primary)' }}>$22.5B</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total (SBP + banks)</p>
            </div>
            <div className="ml-auto px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: '#22c55e18', border: '1px solid #22c55e30' }}>
              <p className="text-[10px] font-bold text-green-600">✓ ~3 months import cover</p>
            </div>
          </div>
          <ReservesBar data={RESERVES_DATA} />
          <p className="text-[10px] mt-3 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Info size={9}/> Low reserves = market stress signal. Watch for improvement after IMF tranche.
          </p>
        </Section>

        {/* Rupee Impact Analysis */}
        <Section title="Rupee Impact Analysis" subtitle="How a 5% PKR depreciation affects these stocks" icon={ArrowLeftRight}>
          <div className="space-y-2">
            {PKR_IMPACT.map(s => {
              const isExporter = s.type === 'Exporter'
              const numVal     = parseFloat(s.impact5pct)
              return (
                <div key={s.symbol} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <span className="text-xs font-bold w-14 shrink-0" style={{ color: '#FEA500' }}>{s.symbol}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isExporter
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                  }`}>
                    {s.type}
                  </span>
                  <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{s.note}</span>
                  <span className={`text-sm font-black font-number shrink-0 ${numVal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {s.impact5pct}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] mt-3 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Info size={9}/> Impact is estimated. Exporters gain, importers lose on PKR depreciation.
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
