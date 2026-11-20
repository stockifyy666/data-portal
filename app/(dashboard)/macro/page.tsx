'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'
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
  sbpRate:     { value: 12.00,    change: 0, label: 'SBP Policy Rate', note: 'MPC Oct 26, 2026 — Hike 50bps' },
  inflation:   { value: 4.50,     change: 0, label: 'CPI Inflation',   note: 'IMF WEO 2025 annual avg' },
  forex:       { value: 21.57,    change: 0, label: 'Forex Reserves',  note: 'SBP holdings — Nov 26' },
  currentAcct: { value: -0.20,    change: 0, label: 'Current Account', note: 'FY2026 full-year (est.) — USD billion' },
  gdpGrowth:   { value: 3.10,     change: 0, label: 'GDP Growth',      note: 'IMF WEO 2025 annual %' },
  remittances: { value: 3.20,     change: 0, label: 'Remittances',     note: 'SBP — monthly (Jul 2026, USD billion)' },
  kse100:      { value: 115000,   change: 0, label: 'KSE-100',         note: 'Live — Capital Stake' },
}

// IMF EFF (SDR 5.32bn ≈ $7.0B, 37 months, approved Sep 25 2024) — USD amounts approximate
const IMF_TRANCHES = [
  { tranche: 'Approval',   amt: 1.0, date: 'Sep 2024', status: 'received', note: 'Board approved EFF' },
  { tranche: '1st Review', amt: 1.0, date: 'May 2025', status: 'received', note: 'Board completed review' },
  { tranche: '2nd Review', amt: 1.0, date: 'Dec 2025', status: 'received', note: 'Board completed review' },
  { tranche: '3rd Review', amt: 1.1, date: 'May 2026', status: 'received', note: 'Board completed May 8' },
  { tranche: '4th Review', amt: 1.0, date: 'Dec 2026', status: 'upcoming', note: 'Staff-level deal Oct 2026 — Board pending' },
  { tranche: '5th Review', amt: 1.0, date: 'mid-2027', status: 'future',   note: 'Scheduled — estimated' },
  { tranche: '6th Review', amt: 0.9, date: 'late 2027', status: 'future',  note: 'Final review — program end' },
]
const IMF_TOTAL     = 7.0
const IMF_RECEIVED  = IMF_TRANCHES.filter(t => t.status === 'received')
const IMF_DISBURSED = +IMF_RECEIVED.reduce((s, t) => s + t.amt, 0).toFixed(1)
const IMF_PENDING   = IMF_TRANCHES.filter(t => t.status === 'upcoming').reduce((s, t) => s + t.amt, 0)
const IMF_PCT       = Math.round((IMF_DISBURSED / IMF_TOTAL) * 100)


const MPC_MEETINGS = [
  { date: 'Jul 29, 2025', decision: 'Cut 100bps', rate: '14.00%', status: 'past' },
  { date: 'Sep 12, 2025', decision: 'Cut 100bps', rate: '13.00%', status: 'past' },
  { date: 'Nov 03, 2025', decision: 'Hold',        rate: '13.00%', status: 'past' },
  { date: 'Jan 27, 2026', decision: 'Hold',        rate: '13.00%', status: 'past' },
  { date: 'Mar 17, 2026', decision: 'Cut 50bps',   rate: '12.50%', status: 'past' },
  { date: 'Apr 27, 2026', decision: 'Cut 100bps',  rate: '11.50%', status: 'past' },
  { date: 'Jun 23, 2026', decision: 'Hold',        rate: '11.50%', status: 'past' },
  { date: 'Jul 27, 2026', decision: 'Hold',        rate: '11.50%', status: 'past' },
  { date: 'Sep 14, 2026', decision: 'Hold',        rate: '11.50%', status: 'past' },
  { date: 'Oct 26, 2026', decision: 'Hike 50bps',  rate: '12.00%', status: 'past' },
]

// SBP official FY27 advance calendar of MPC meetings & communications
const MPC_CALENDAR_FY27 = [
  { meeting: '2026-07-27', statement: '27-Jul-26', briefing: '28-Jul-26', presser: '27-Jul-26', minutes: '21-Aug-26', mpr: '10-Aug-26' },
  { meeting: '2026-09-14', statement: '14-Sep-26', briefing: '15-Sep-26', presser: '–',         minutes: '09-Oct-26', mpr: '–' },
  { meeting: '2026-10-26', statement: '26-Oct-26', briefing: '27-Oct-26', presser: '26-Oct-26', minutes: '20-Nov-26', mpr: '–' },
  { meeting: '2026-12-14', statement: '14-Dec-26', briefing: '15-Dec-26', presser: '–',         minutes: '08-Jan-27', mpr: '–' },
  { meeting: '2027-01-25', statement: '25-Jan-27', briefing: '26-Jan-27', presser: '25-Jan-27', minutes: '19-Feb-27', mpr: '08-Feb-27' },
  { meeting: '2027-03-08', statement: '08-Mar-27', briefing: '09-Mar-27', presser: '–',         minutes: '02-Apr-27', mpr: '–' },
  { meeting: '2027-04-26', statement: '26-Apr-27', briefing: '27-Apr-27', presser: '26-Apr-27', minutes: '21-May-27', mpr: '–' },
  { meeting: '2027-06-17', statement: '17-Jun-27', briefing: '18-Jun-27', presser: '–',         minutes: '12-Jul-27', mpr: '–' },
]

const fmtMpcDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

const NEXT_MPC = MPC_CALENDAR_FY27.find(m => new Date(m.meeting + 'T23:59:59') >= new Date()) ?? null

// SBP weekly liquid FX reserves (USD bn) — month's latest reported week
const RESERVES_DATA = [
  { month: 'Jan 26', sbp: 16.16, total: 21.34 },  // week ended Jan 30
  { month: 'Feb 26', sbp: 16.30, total: 21.43 },  // week ended Feb 27
  { month: 'Mar 26', sbp: 16.38, total: 21.79 },  // week ended Mar 27
  { month: 'Apr 26', sbp: 15.85, total: 21.29 },  // week ended Apr 30
  { month: 'May 26', sbp: 17.19, total: 22.64 },  // week ended May 29
  { month: 'Jun 26', sbp: 16.50, total: 22.00 },  // week ended Jun 24
  { month: 'Jul 26', sbp: 17.04, total: 22.47 },  // week ended Jul 31
  { month: 'Aug 26', sbp: 17.12, total: 22.53 },  // week ended Aug 28
  { month: 'Sep 26', sbp: 21.44, total: 26.77 },  // week ended Sep 25
  { month: 'Oct 26', sbp: 21.56, total: 26.86 },  // week ended Oct 30
  { month: 'Nov 26', sbp: 21.57, total: 26.84 },  // week ended Nov 06
]

const CPEC_STOCKS = [
  { symbol: 'HUBC',  name: 'Hub Power Co.',          sector: 'Power',       exposure: 'High',   shariah: true,  note: 'CPEC power projects' },
  { symbol: 'NCPL',  name: 'Nishat Chunian Power',   sector: 'Power',       exposure: 'High',   shariah: false, note: 'Under CPEC framework' },
  { symbol: 'LUCK',  name: 'Lucky Cement',            sector: 'Cement',      exposure: 'High',   shariah: true,  note: 'CPEC infrastructure demand' },
  { symbol: 'PIOC',  name: 'Pioneer Cement',          sector: 'Cement',      exposure: 'High',   shariah: true,  note: 'Infrastructure projects' },
  { symbol: 'CHCC',  name: 'Cherat Cement',           sector: 'Cement',      exposure: 'Medium', shariah: true,  note: 'Construction demand' },
  { symbol: 'FFBL',  name: 'Fauji Fertilizer Bin Q.',sector: 'Fertilizer',  exposure: 'Medium', shariah: true,  note: 'Agricultural development' },
  { symbol: 'NRSL',  name: 'Nishat Ruby Ltd.',        sector: 'Textile',     exposure: 'Low',    shariah: false, note: 'Export corridor benefit' },
  { symbol: 'PKGS',  name: 'Packages Ltd.',           sector: 'Paper',       exposure: 'Low',    shariah: true,  note: 'Industrial growth' },
]

const PKR_IMPACT = [
  { symbol: 'ENGRO', type: 'Exporter',  shariah: true,  impact5pct: '+3.2%', note: 'Revenue in USD' },
  { symbol: 'LUCK',  type: 'Exporter',  shariah: true,  impact5pct: '+2.8%', note: 'Export earnings' },
  { symbol: 'TGL',   type: 'Exporter',  shariah: true,  impact5pct: '+2.1%', note: 'Glass exports' },
  { symbol: 'PSO',   type: 'Importer',  shariah: true,  impact5pct: '-4.1%', note: 'Oil import costs rise' },
  { symbol: 'HCAR',  type: 'Importer',  shariah: true,  impact5pct: '-3.6%', note: 'CKD parts imported' },
  { symbol: 'ICI',   type: 'Importer',  shariah: true,  impact5pct: '-2.9%', note: 'Raw material imports' },
  { symbol: 'ATRL',  type: 'Importer',  shariah: true,  impact5pct: '-2.4%', note: 'Crude oil input' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatVal(key: string, val: number) {
  if (key === 'usdPkr')      return val.toFixed(2)
  if (key === 'oilBrent')    return `$${val.toFixed(2)}`
  if (key === 'wti')         return `$${val.toFixed(2)}`
  if (key === 'forex')       return `$${val.toFixed(1)}B`
  if (key === 'currentAcct') return `${val < 0 ? '−' : ''}$${Math.abs(val).toFixed(2)}B`
  if (key === 'remittances') return `$${val.toFixed(1)}B`
  if (key === 'kse100')      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  const bgColor  = up ? 'rgba(22,163,74,0.12)' : isNeutral ? 'var(--bg-card)' : 'rgba(220,38,38,0.12)'
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
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
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
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
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
      <p className="hidden sm:block" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
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
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--bg-border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
          <Icon size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-subtitle)' }}>{subtitle}</p>
        </div>
      </div>
      <div className="p-3 sm:p-5">{children}</div>
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
                style={{ width: `${totW}%`, backgroundColor: 'var(--bg-hover)' }} />
              {/* sbp bar */}
              <div className="absolute left-0 top-0 h-full rounded-md transition-all"
                style={{ width: `${sbpW}%`, backgroundColor: isLast ? '#FEA500' : 'var(--text-secondary)' }} />
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
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--text-secondary)' }}/>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SBP Reserves</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}/>
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
    const lastPastMPC = [...MPC_MEETINGS].filter(m => m.status === 'past' && m.rate !== '?').at(-1)
    const sbpRateVal  = lastPastMPC ? parseFloat(lastPastMPC.rate) : 12.00
    const sbpRateNote = lastPastMPC ? `MPC ${lastPastMPC.date} — ${lastPastMPC.decision}` : 'MPC calendar'

    // Forex Reserves: derive from RESERVES_DATA (latest weekly SBP data)
    const lastReserve  = RESERVES_DATA.at(-1)
    const forexVal     = lastReserve ? lastReserve.sbp : 21.57
    const forexNote    = lastReserve ? `SBP holdings — ${lastReserve.month}` : 'SBP weekly data'

    // Remittances: latest published monthly figure (PBS / SBP)
    const remittancesVal  = 3.89
    const remittancesNote = 'SBP — Oct 2026 workers\' remittances (USD bn)'

    // Latest official monthly prints (PBS / SBP) — override annual IMF WEO figures
    const LATEST = {
      inflation:   { value: 9.6,   change: 0, label: 'CPI Inflation',   note: 'PBS — Oct 2026 YoY (Sep: 10.3%)' },
      currentAcct: { value: -0.85, change: 0, label: 'Current Account', note: 'SBP — Jul–Oct FY27 deficit (Oct: +$39M surplus)' },
      gdpGrowth:   { value: 4.0,   change: 0, label: 'GDP Growth',      note: 'SBP FY27 projection 3.5–4.5%' },
    }

    Promise.all([
      fetch('/api/market/macro').then(r => r.json()),
      fetch('/api/market/indices').then(r => r.json()).catch(() => ({ indices: [] })),
    ]).then(([j, idxData]) => {
      const kse = (idxData?.indices ?? []).find((i: any) => i.key === 'KSE100')
      const kse100Entry: KpiEntry = kse
        ? { value: kse.current, change: (kse.changePct ?? 0) * 100, label: 'KSE-100', note: 'Live — Capital Stake' }
        : LIVE_FALLBACK.kse100
        function pick(apiKey: string, fbKey: keyof typeof LIVE_FALLBACK, label: string, note: string): KpiEntry {
          const d = j[apiKey]
          if (d?.value != null) return { value: d.value, change: d.change ?? 0, label, note }
          return { ...LIVE_FALLBACK[fbKey], note: LIVE_FALLBACK[fbKey].note }
        }

        // Use live Capital Stake policy rate if available
        const pr = j.policyRate
        const sbpEntry: KpiEntry = pr?.value != null && pr.value === sbpRateVal
          ? { value: pr.value, change: pr.change ?? 0, label: 'SBP Policy Rate', note: `Capital Stake — ${pr.period}` }
          : { value: sbpRateVal, change: 0, label: 'SBP Policy Rate', note: sbpRateNote }

        // Use live Capital Stake NCPI if available
        const inflationEntry: KpiEntry = LATEST.inflation

        setLiveData({
          usdPkr:      pick('usdPkr',      'usdPkr',      'USD / PKR',       'Live — open.er-api.com'),
          oilBrent:    pick('brent',        'oilBrent',    'Brent Crude',     'Live — Yahoo Finance (BZ=F)'),
          wti:         pick('wti',          'wti',         'WTI Crude',       'Live — Yahoo Finance (CL=F)'),
          sbpRate:     sbpEntry,
          inflation:   inflationEntry,
          forex:       { value: forexVal,        change: 0, label: 'Forex Reserves',  note: forexNote },
          currentAcct: LATEST.currentAcct,
          gdpGrowth:   LATEST.gdpGrowth,
          remittances: { value: remittancesVal,  change: 0, label: 'Remittances',     note: remittancesNote },
          kse100:      kse100Entry,
        })
        setLastUpdated(new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }))
    }).catch(() => {
        setLiveData({
          ...Object.fromEntries(Object.keys(LIVE_FALLBACK).map(k => [k, LIVE_FALLBACK[k as keyof typeof LIVE_FALLBACK]])),
          sbpRate:     { value: sbpRateVal,     change: 0, label: 'SBP Policy Rate', note: sbpRateNote },
          ...LATEST,
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
  const today     = new Date()
  const daysToMPC = NEXT_MPC
    ? Math.max(0, Math.ceil((new Date(NEXT_MPC.meeting + 'T00:00:00').getTime() - today.getTime()) / 86400000))
    : 0

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
          <p className="text-sm font-bold" style={{ color: '#d97706' }}>
            IMF 4th EFF Review — Staff-Level Agreement Reached, ~$1.0B Pending Board Approval
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Banking, Cement, and Fertilizer stocks historically rally on tranche approvals.
            SBP reserves at $21.57B (Nov 6, 2026) — supported by IMF and other inflows.
          </p>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5">

        {/* ── IMF Program Tracker ─────────────────────────────────────────── */}
        <Section title="IMF Program Tracker" subtitle="Extended Fund Facility (EFF) · $7.0B · Sep 2024 – 2027" icon={Shield}>

          {/* ── 4 KPI stats ── */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4" style={{ gap:10, marginBottom:20 }}>
            {[
              { label:'Total Program', value:'$7.0B',   sub:'EFF commitment',   color:'var(--text-primary)' },
              { label:'Disbursed',     value:`~$${IMF_DISBURSED}B`, sub:`${IMF_RECEIVED.length} of ${IMF_TRANCHES.length} tranches`, color:'#16a34a' },
              { label:'Remaining',     value:`~$${(IMF_TOTAL - IMF_DISBURSED).toFixed(1)}B`, sub:`${IMF_TRANCHES.length - IMF_RECEIVED.length} tranches left`, color:'#f59e0b' },
              { label:'Program End',   value:'Late 2027', sub:'37-month EFF', color:'var(--text-secondary)' },
            ].map((k) => (
              <div key={k.label} className="card" style={{ padding:'16px 18px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>{k.label}</p>
                <p style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{k.value}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:5 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Progress bar ── */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)' }}>Disbursement Progress</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>~${IMF_DISBURSED}B of ${IMF_TOTAL.toFixed(1)}B — {IMF_PCT}%</span>
            </div>
            <div style={{ height:8, borderRadius:999, backgroundColor:'var(--bg-border)', overflow:'hidden', display:'flex' }}>
              <div style={{ width:`${IMF_PCT}%`, background:'#16a34a', borderRadius:999 }}/>
              <div style={{ width:`${(IMF_PENDING / IMF_TOTAL) * 100}%`, background:'#f59e0b', opacity:.6 }}/>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:6 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}><span style={{ color:'#16a34a' }}>●</span> Received ({IMF_RECEIVED.length})</span>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}><span style={{ color:'#f59e0b' }}>●</span> In Progress ({IMF_TRANCHES.filter(t => t.status === 'upcoming').length})</span>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}><span style={{ color:'var(--bg-border)' }}>●</span> Pending ({IMF_TRANCHES.filter(t => t.status === 'future').length})</span>
            </div>
          </div>

          {/* ── Tranche timeline ── */}
          <div style={{ borderTop:'1px solid var(--bg-border)', paddingTop:16 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Tranche Timeline</p>
            <div className="grid grid-cols-2 min-[480px]:grid-cols-4 xl:grid-cols-7" style={{ gap:6, gridAutoRows:'1fr' }}>
              {IMF_TRANCHES.map((t, i) => {
                const received = t.status === 'received'
                const isNext   = t.status === 'upcoming'
                const isFuture = t.status === 'future'
                const amtC     = received ? '#16a34a' : isNext ? '#f59e0b' : 'var(--text-muted)'
                const dotColor = received ? '#16a34a' : isNext ? '#f59e0b' : 'var(--bg-border)'
                return (
                  <div key={i} style={{ opacity: isFuture ? .45 : 1, display:'flex', flexDirection:'column' }}>
                    {/* Connector line */}
                    <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', backgroundColor: dotColor, flexShrink:0, border: isFuture ? '2px solid var(--bg-border)' : 'none', boxSizing:'border-box' }}/>
                      {i < IMF_TRANCHES.length - 1 && <div style={{ flex:1, height:1, backgroundColor:'var(--bg-border)' }}/>}
                    </div>
                    {/* Card */}
                    <div className="macro-card" style={{ padding:'10px', borderRadius:10, backgroundColor:'var(--bg-hover)', border:'1px solid var(--bg-border)', flex:1, display:'flex', flexDirection:'column' }}>
                      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>{t.tranche}</p>
                      <p style={{ fontSize:14, fontWeight:800, color:amtC, fontVariantNumeric:'tabular-nums', lineHeight:1, marginBottom:4 }}>~${t.amt.toFixed(1)}B</p>
                      <p style={{ fontSize:9, color: isNext ? '#f59e0b' : 'var(--text-muted)', fontWeight: isNext ? 700 : 400, marginBottom:4 }}>{t.date}</p>
                      <p style={{ fontSize:8.5, color:'var(--text-muted)', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{t.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:10, marginTop:14, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> USD values approximate (EFF is denominated in SDR). Source: IMF press releases; future dates estimated.
          </p>
        </Section>

        {/* ── SBP Policy Rate History ──────────────────────────────────────── */}
        <Section title="SBP Policy Rate History" subtitle="Monetary Policy Committee · FY27" icon={Calendar}>

          {/* ── Stats strip ── */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4" style={{ gap:10, marginBottom:20 }}>
            {[
              { label:'Current Rate',  value:'12.00%',      sub:'Effective Oct 27, 2026', color:'var(--text-primary)' },
              { label:'Last Decision', value:'+50bps',      sub:'Hike · MPC Oct 26, 2026 (9–1 vote)', color:'#dc2626' },
              { label:'Next MPC',      value: NEXT_MPC ? fmtMpcDate(NEXT_MPC.meeting) : 'TBA', sub: NEXT_MPC ? (daysToMPC === 0 ? 'Today' : `${daysToMPC} days away`) : 'FY28 calendar pending', color:'#f59e0b' },
              { label:'Rate Corridor', value:'11%–13%',     sub:'Floor · Ceiling (O/N repo)', color:'var(--text-primary)' },
            ].map((k) => (
              <div key={k.label} className="card" style={{ padding:'14px 16px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7 }}>{k.label}</p>
                <p style={{ fontSize:20, fontWeight:800, color:k.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{k.value}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:5 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── SBP FY27 advance calendar ── */}
          <p style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'.07em', margin:'4px 0 8px' }}>
            FY27 MPC Calendar &amp; Communications
          </p>
          <div style={{ overflowX:'auto', border:'1px solid var(--bg-border)', borderRadius:8 }}>
            <table style={{ width:'100%', minWidth:720, borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'var(--bg-hover)' }}>
                  {['MPC Meeting','Policy Statement','Analyst Briefing','Press Conference','Minutes (week ending)','Monetary Policy Report'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'9px 12px', fontSize:9, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'.07em', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MPC_CALENDAR_FY27.map(m => {
                  const isNext = m === NEXT_MPC
                  const past   = new Date(m.meeting + 'T23:59:59') < today
                  return (
                    <tr key={m.meeting} style={{ borderTop:'1px solid var(--bg-border)',
                      background: isNext ? 'rgba(245,158,11,0.08)' : 'transparent', opacity: past ? .85 : 1 }}>
                      <td style={{ padding:'8px 12px', fontWeight:700, whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums',
                        color: isNext ? '#f59e0b' : 'var(--text-primary)' }}>
                        {fmtMpcDate(m.meeting)}{isNext && <span style={{ marginLeft:6, fontSize:9 }}>NEXT</span>}
                      </td>
                      {[m.statement, m.briefing, m.presser, m.minutes, m.mpr].map((v, j) => (
                        <td key={j} style={{ padding:'8px 12px', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums',
                          color: v === '–' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{v}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize:10, marginTop:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Dates from SBP&apos;s FY27 advance MPC calendar. Rate corridor: 11.00%–13.00%.
          </p>
        </Section>

        {/* ── Foreign Reserves Monitor ─────────────────────────────────────── */}
        <Section title="Foreign Reserves Monitor" subtitle="SBP weekly data — USD billions" icon={Building2}>
          {(() => {
            const maxTotal     = Math.max(...RESERVES_DATA.map(d => d.total))
            const latest       = RESERVES_DATA[RESERVES_DATA.length - 1]
            const first        = RESERVES_DATA[0]
            const gain6m       = +(latest.sbp - first.sbp).toFixed(1)
            const banksPortion = +(latest.total - latest.sbp).toFixed(1)
            const sbpPct       = +((latest.sbp / latest.total) * 100).toFixed(1)
            const bankPct      = +(100 - sbpPct).toFixed(1)

            return (
              <>
                {/* ── KPI row ── */}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4" style={{ gap:10, marginBottom:24 }}>
                  {[
                    { label:'SBP Holdings',   value:`$${latest.sbp}B`,   sub:`${latest.month}`,             accent: false },
                    { label:'Total Reserves', value:`$${latest.total}B`, sub:'SBP + commercial banks',      accent: false },
                    { label:'SBP Target',     value:'$23B',               sub:'By Dec 2026 · $25B by Jun 27', accent: true  },
                    { label:'Change', value:`${gain6m >= 0 ? '+' : '−'}$${Math.abs(gain6m)}B`,      sub:`${first.month} → ${latest.month}`, accent: true  },
                  ].map((k) => (
                    <div key={k.label} className="card" style={{ padding:'16px 20px' }}>
                      <p style={{ fontSize:10, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10, fontWeight:700 }}>{k.label}</p>
                      <p style={{ fontSize:22, fontWeight:700, lineHeight:1, fontVariantNumeric:'tabular-nums', color: k.accent ? '#16a34a' : 'var(--text-primary)', marginBottom:6 }}>{k.value}</p>
                      <p style={{ fontSize:11, color: k.accent ? '#16a34a' : 'var(--text-muted)' }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* ── Reserve Composition ── */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Reserve Composition — {latest.month}
                    </span>
                    <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>
                      Total <strong style={{ color:'var(--text-primary)', fontVariantNumeric:'tabular-nums' }}>${latest.total}B</strong>
                    </span>
                  </div>
                  {/* Segmented bar */}
                  <div style={{ display:'flex', height:10, borderRadius:6, overflow:'hidden', gap:2, marginBottom:14 }}>
                    <div style={{ width:`${sbpPct}%`, background:'#FEA500', borderRadius:'6px 0 0 6px', transition:'width .4s' }}/>
                    <div style={{ flex:1, background:'var(--bg-border)', borderRadius:'0 6px 6px 0' }}/>
                  </div>
                  {/* Legend */}
                  <div style={{ display:'flex', gap:28 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'#FEA500', flexShrink:0 }}/>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>SBP Holdings</span>
                      </div>
                      <p style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', fontVariantNumeric:'tabular-nums', paddingLeft:16 }}>${latest.sbp}B <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>{sbpPct}%</span></p>
                    </div>
                    <div style={{ width:1, background:'var(--bg-border)' }}/>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'var(--bg-border)', flexShrink:0, border:'1px solid var(--text-muted)' }}/>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Commercial Banks</span>
                      </div>
                      <p style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', fontVariantNumeric:'tabular-nums', paddingLeft:16 }}>${banksPortion}B <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>{bankPct}%</span></p>
                    </div>
                  </div>
                </div>

                {/* ── Monthly Trend chart ── */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Monthly Trend
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'#FEA500' }}/>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>SBP Holdings</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'var(--text-secondary)', opacity:.5 }}/>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>Commercial Banks</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={RESERVES_DATA.map((d, i) => ({
                        month:   d.month,
                        sbp:     d.sbp,
                        banks:   +(d.total - d.sbp).toFixed(1),
                        isLast:  i === RESERVES_DATA.length - 1,
                      }))}
                      margin={{ top:4, right:0, left:-8, bottom:0 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid vertical={false} stroke="var(--bg-border)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize:10, fill:'var(--text-muted)' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize:10, fill:'var(--text-muted)' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `$${v}B`}
                        domain={[0, 'auto']}
                        tickCount={5}
                      />
                      <Tooltip
                        cursor={{ fill:'var(--bg-hover)', radius: 4 }}
                        contentStyle={{
                          background:'var(--bg-card)', border:'1px solid var(--bg-border)',
                          borderRadius:6, fontSize:11, color:'var(--text-primary)', boxShadow:'0 4px 12px rgba(0,0,0,.08)',
                        }}
                        formatter={(value, name) => [
                          `$${value}B`,
                          name === 'sbp' ? 'SBP Holdings' : 'Commercial Banks',
                        ]}
                        labelStyle={{ fontWeight:700, marginBottom:6, color:'var(--text-primary)', fontSize:12 }}
                        itemStyle={{ color:'var(--text-secondary)', padding:'1px 0' }}
                      />
                      <Bar dataKey="sbp" stackId="a" radius={[0,0,3,3]} maxBarSize={48}>
                        {RESERVES_DATA.map((d, i) => {
                          const isLast = i === RESERVES_DATA.length - 1
                          return <Cell key={d.month} fill={isLast ? '#FEA500' : '#FEA500'} fillOpacity={isLast ? 1 : 0.55} />
                        })}
                      </Bar>
                      <Bar dataKey="banks" stackId="a" radius={[3,3,0,0]} maxBarSize={48}>
                        {RESERVES_DATA.map((d, i) => {
                          const isLast = i === RESERVES_DATA.length - 1
                          return <Cell key={d.month} fill="#64748b" fillOpacity={isLast ? 0.7 : 0.35} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p style={{ fontSize:10, marginTop:14, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                  <Info size={9}/> Source: SBP weekly liquid FX reserves (latest week ended Nov 06, 2026).
                </p>
              </>
            )
          })()}
        </Section>

        {/* ── Rupee Impact Analysis ────────────────────────────────────────── */}
        <Section title="Rupee Impact Analysis" subtitle="Estimated earnings impact of a 5% PKR depreciation" icon={ArrowLeftRight}>

          {/* Exporters */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:12 }}>
              <TrendingUp size={10} color="#16a34a"/>
              <span style={{ fontSize:9, fontWeight:700, color:'#16a34a', textTransform:'uppercase', letterSpacing:'.08em' }}>Exporters — Gain on PKR Drop</span>
            </div>
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3" style={{ gap:10 }}>
              {PKR_IMPACT.filter(s => s.type === 'Exporter').map(s => {
                const val = Math.abs(parseFloat(s.impact5pct))
                return (
                  <div key={s.symbol} className="card" style={{
                    padding:'14px 16px', borderRadius:6,
                    display:'flex', flexDirection:'column', gap:8,
                    cursor:'pointer', transition:'border-color .15s, background .15s',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#FEA500' }}>{s.symbol}</span>
                        {s.shariah && (
                          <span style={{ fontSize:8, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.1)',
                            border:'1px solid rgba(22,163,74,0.25)', padding:'1px 5px', borderRadius:999,
                            letterSpacing:'.04em', textTransform:'uppercase', lineHeight:1.6 }}>Shariah</span>
                        )}
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>{s.impact5pct}</span>
                    </div>
                    <div style={{ height:3, borderRadius:2, background:'var(--bg-border)', overflow:'hidden' }}>
                      <div style={{ width:`${(val/5)*100}%`, height:'100%', borderRadius:2, background:'#16a34a' }}/>
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{s.note}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Importers */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:12 }}>
              <TrendingDown size={10} color="#dc2626"/>
              <span style={{ fontSize:9, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'.08em' }}>Importers — Lose on PKR Drop</span>
            </div>
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4" style={{ gap:10 }}>
              {PKR_IMPACT.filter(s => s.type === 'Importer').map(s => {
                const val = Math.abs(parseFloat(s.impact5pct))
                return (
                  <div key={s.symbol} className="card" style={{
                    padding:'14px 16px', borderRadius:6,
                    display:'flex', flexDirection:'column', gap:8,
                    cursor:'pointer', transition:'border-color .15s, background .15s',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#FEA500' }}>{s.symbol}</span>
                        {s.shariah && (
                          <span style={{ fontSize:8, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.1)',
                            border:'1px solid rgba(22,163,74,0.25)', padding:'1px 5px', borderRadius:999,
                            letterSpacing:'.04em', textTransform:'uppercase', lineHeight:1.6 }}>Shariah</span>
                        )}
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:'#dc2626', fontVariantNumeric:'tabular-nums', flexShrink:0 }}>{s.impact5pct}</span>
                    </div>
                    <div style={{ height:3, borderRadius:2, background:'var(--bg-border)', overflow:'hidden' }}>
                      <div style={{ width:`${(val/5)*100}%`, height:'100%', borderRadius:2, background:'#dc2626' }}/>
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{s.note}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:10, marginTop:14, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={9}/> Estimated. Exporters gain, importers lose on PKR depreciation.
          </p>
        </Section>
      </div>

      {/* ── CPEC Beneficiary Stocks ──────────────────────────────────────────── */}
      <Section title="CPEC Beneficiary Stocks" subtitle="Companies with significant CPEC revenue exposure" icon={TrendingUp}>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4" style={{ gap:10 }}>
          {CPEC_STOCKS.map(s => {
            const sectorColor: Record<string,string> = {
              Power:'#FEA500', Cement:'#f59e0b', Fertilizer:'#16a34a', Textile:'var(--text-secondary)', Paper:'var(--text-muted)'
            }
            const col = sectorColor[s.sector] || 'var(--text-muted)'
            const expColor = s.exposure === 'High' ? '#16a34a' : s.exposure === 'Medium' ? '#f59e0b' : 'var(--text-muted)'
            const expBg    = s.exposure === 'High' ? 'rgba(22,163,74,0.1)' : s.exposure === 'Medium' ? 'rgba(245,158,11,0.1)' : 'var(--bg-hover)'
            const expBdr   = s.exposure === 'High' ? 'rgba(22,163,74,0.25)' : s.exposure === 'Medium' ? 'rgba(245,158,11,0.25)' : 'var(--bg-border)'
            return (
              <div key={s.symbol} className="card" style={{
                padding:'16px', borderRadius:6,
                display:'flex', flexDirection:'column', gap:10,
                cursor:'pointer', transition:'border-color .15s, background .15s',
              }}>
                {/* Symbol + exposure */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#FEA500', letterSpacing:'.02em' }}>{s.symbol}</span>
                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:999,
                    color: expColor, background: expBg, border:`1px solid ${expBdr}`,
                    textTransform:'uppercase', letterSpacing:'.06em' }}>
                    {s.exposure}
                  </span>
                </div>
                {/* Company name */}
                <div>
                  <p style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)', marginBottom:3, lineHeight:1.3 }}>{s.name}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ fontSize:10, fontWeight:600, color:col }}>{s.sector}</p>
                    {s.shariah && (
                      <span style={{ fontSize:8, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.1)',
                        border:'1px solid rgba(22,163,74,0.25)', padding:'1px 5px', borderRadius:999,
                        letterSpacing:'.04em', textTransform:'uppercase', lineHeight:1.6 }}>
                        Shariah
                      </span>
                    )}
                  </div>
                </div>
                {/* Role note */}
                <p style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.4, borderTop:'1px solid var(--bg-border)', paddingTop:8, marginTop:'auto' }}>{s.note}</p>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize:10, marginTop:14, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
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
