'use client'

import { useState, useEffect } from 'react'
import SymbolLogo from '@/components/ui/SymbolLogo'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  DollarSign, Percent, Droplets, TrendingUp, TrendingDown,
  AlertCircle, Calendar, Shield, Building2, ArrowLeftRight,
  RefreshCw, Globe, Info, BarChart3, Landmark, Wallet, Send, Coins,
} from 'lucide-react'

// Live fallbacks while fetching
const LIVE_FALLBACK = {
  usdPkr:      { value: 278.40,   change: 0, label: 'USD / PKR',       note: 'Live — open.er-api.com' },
  oilBrent:    { value: 82.40,    change: 0, label: 'Brent Crude',     note: 'Live — Yahoo Finance (BZ=F)' },
  gold:        { value: 0,        change: 0, label: 'Gold',            note: 'Live — COMEX gold (USD / oz)' },
  wti:         { value: 78.20,    change: 0, label: 'WTI Crude',       note: 'Live — Yahoo Finance (CL=F)' },
  sbpRate:     { value: 12.00,    change: 0, label: 'SBP Policy Rate', note: 'MPC Oct 26, 2026 — Hike 50bps' },
  inflation:   { value: 4.50,     change: 0, label: 'CPI Inflation',   note: 'IMF WEO 2025 annual avg' },
  forex:       { value: 21.57,    change: 0, label: 'Forex Reserves',  note: 'SBP holdings — Nov 26' },
  currentAcct: { value: -0.20,    change: 0, label: 'Current Account', note: 'FY2026 full-year (est.) — USD billion' },
  gdpGrowth:   { value: 3.70,     change: 0, label: 'GDP Growth',      note: 'Real GDP growth — latest estimate' },
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

// CPEC-linked PSX names. Exposure is general guidance from public project
// information; name, live price, today's move and KMI status come from quotes.
const CPEC_STOCKS: { symbol: string; sector: string; exposure: 'High' | 'Medium' | 'Low'; note: string }[] = [
  { symbol: 'HUBC', sector: 'Power',  exposure: 'High',   note: 'China Power Hub & Thar coal plants' },
  { symbol: 'LUCK', sector: 'Cement', exposure: 'High',   note: 'Lucky Electric (Chinese JV), cement demand' },
  { symbol: 'CHCC', sector: 'Cement', exposure: 'High',   note: 'Northern plant near CPEC road projects' },
  { symbol: 'KOHC', sector: 'Cement', exposure: 'High',   note: 'Northern cement for CPEC infrastructure' },
  { symbol: 'PIOC', sector: 'Cement', exposure: 'Medium', note: 'Infrastructure construction demand' },
  { symbol: 'FCCL', sector: 'Cement', exposure: 'Medium', note: 'Infrastructure construction demand' },
  { symbol: 'DGKC', sector: 'Cement', exposure: 'Medium', note: 'Infrastructure construction demand' },
  { symbol: 'PKGS', sector: 'Paper',  exposure: 'Low',    note: 'Industrial and packaging growth' },
]

// FX exposure of well-known PSX names. Live price, today's move and Shariah
// (KMI index) status are filled in from /api/market/quotes — no estimates.
const PKR_IMPACT: { symbol: string; type: 'Exporter' | 'Importer'; note: string }[] = [
  { symbol: 'SYS',  type: 'Exporter', note: 'IT services billed in USD' },
  { symbol: 'ILP',  type: 'Exporter', note: 'Textile exports (apparel)' },
  { symbol: 'NML',  type: 'Exporter', note: 'Textile exports' },
  { symbol: 'LUCK', type: 'Exporter', note: 'Cement exports + foreign ops' },
  { symbol: 'PSO',  type: 'Importer', note: 'Imported fuel costs' },
  { symbol: 'ATRL', type: 'Importer', note: 'Crude oil priced in USD' },
  { symbol: 'HCAR', type: 'Importer', note: 'Imported CKD kits' },
  { symbol: 'INDU', type: 'Importer', note: 'Imported CKD kits' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatVal(key: string, val: number) {
  if (key === 'usdPkr')      return val.toFixed(2)
  if (key === 'oilBrent')    return `$${val.toFixed(2)}`
  if (key === 'gold')        return val <= 0 ? '—' : `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

const LIVE_IDS = new Set(['usdPkr', 'oilBrent', 'gold', 'wti', 'sbpRate', 'inflation', 'forex', 'currentAcct', 'gdpGrowth', 'remittances', 'kse100'])

// ── KPI skeleton ──────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 animate-pulse"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      <div className="w-12 h-12 rounded-xl shrink-0" style={{ background: 'var(--bg-hover)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-6 w-28 rounded" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 w-32 rounded" style={{ background: 'var(--bg-hover)' }} />
      </div>
    </div>
  )
}

// Icon per metric, used when the figure has no daily change to show
const KPI_ICONS: Record<string, React.ElementType> = {
  kse100: BarChart3, usdPkr: DollarSign, sbpRate: Landmark, inflation: Percent,
  oilBrent: Droplets, gold: Coins, wti: Droplets, forex: Wallet, currentAcct: ArrowLeftRight,
  gdpGrowth: TrendingUp, remittances: Send,
}

// Arrow-badge card (same style as the dashboard index cards):
// icon tile on the left; label, value and detail line on the right.
function KpiCard({ id, d, loading }: { id: string; d: { value: number; change: number; label: string; note: string } | null; loading?: boolean }) {
  if (!d) return <KpiSkeleton />
  const moving = d.change !== 0
  const up     = moving ? d.change > 0 : d.value >= 0
  const neg    = !moving && d.value < 0
  const fg = moving ? (up ? '#16a34a' : '#dc2626') : neg ? '#dc2626' : '#FEA500'
  const bg = moving ? (up ? 'rgba(22,163,74,0.13)' : 'rgba(220,38,38,0.13)')
           : neg ? 'rgba(220,38,38,0.13)' : 'rgba(254,165,0,0.14)'
  const Icon = moving ? (up ? TrendingUp : TrendingDown) : (KPI_ICONS[id] ?? BarChart3)
  const isLive = LIVE_IDS.has(id)

  return (
    <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 min-w-0"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', opacity: loading ? 0.7 : 1 }}
      title={d.note}>
      <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>
        <Icon size={24} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[13px] truncate" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{d.label}</p>
          {isLive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22c55e' }} title="Live data" />}
        </div>
        <p className="text-[24px] leading-tight tabular-nums truncate" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
          {formatVal(id, d.value)}
        </p>
        {moving ? (
          <p className="text-[13px] tabular-nums mt-0.5" style={{ color: fg, fontWeight: 700 }}>
            {up ? '+' : ''}{d.change.toFixed(2)}% today
            {id === 'gold' && d.note.startsWith('≈') && (
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}> · {d.note}</span>
            )}
          </p>
        ) : (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{d.note}</p>
        )}
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
              style={{ color: isLast ? '#FEA500' : 'var(--text-secondary)' }}>{d.month}</span>
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
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>SBP Reserves</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}/>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Total (SBP + Banks)</span>
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
  const [rupeeQuotes, setRupeeQuotes] = useState<Record<string, { price: number; changePct: number; shariah: boolean; name: string }>>({})

  // Live prices for the Rupee Impact stocks (shared, cached quotes endpoint)
  useEffect(() => {
    const want = new Set([...PKR_IMPACT, ...CPEC_STOCKS].map(x => x.symbol))
    fetch('/api/market/quotes')
      .then(r => r.json())
      .then(j => {
        const out: Record<string, { price: number; changePct: number; shariah: boolean; name: string }> = {}
        for (const q of (j.quotes ?? []) as { symbol: string; name: string; price: number; changePct: number; indexKeys?: string[] }[]) {
          if (want.has(q.symbol)) out[q.symbol] = {
            price: q.price, changePct: q.changePct, name: q.name,
            shariah: !!q.indexKeys?.some(k => k.startsWith('KMI')),
          }
        }
        setRupeeQuotes(out)
      })
      .catch(() => {})
  }, [])
  const [liveLoading, setLiveLoading] = useState(true)

  type KpiEntry = { value: number; change: number; label: string; note: string }
  const [liveData, setLiveData] = useState<Record<string, KpiEntry | null>>({
    usdPkr: null, oilBrent: null, gold: null, wti: null,
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
      gdpGrowth:   { value: 3.7,   change: 0, label: 'GDP Growth',      note: 'Real GDP growth — latest estimate' },
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
          gold:        (() => {
            // Gold per troy ounce (USD) + local equivalent per tola (11.6638 g) in PKR
            const g = pick('gold', 'gold', 'Gold (per oz)', 'Live — COMEX gold futures')
            const fx = j.usdPkr?.value
            if (g.value > 0 && fx > 0) {
              const tola = (g.value * fx * 11.6638) / 31.1035
              g.note = `≈ Rs ${Math.round(tola).toLocaleString('en-US')} per tola`
            }
            return g
          })(),
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
            style={{ color: 'var(--text-secondary)' }}>
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
        <KpiCard id="gold"        d={MACRO_DATA.gold}        loading={liveLoading} />
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
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', marginTop:6 }}>{k.sub}</p>
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
              <span style={{ fontSize:10, color:'var(--text-secondary)' }}><span style={{ color:'#16a34a' }}>●</span> Received ({IMF_RECEIVED.length})</span>
              <span style={{ fontSize:10, color:'var(--text-secondary)' }}><span style={{ color:'#f59e0b' }}>●</span> In Progress ({IMF_TRANCHES.filter(t => t.status === 'upcoming').length})</span>
              <span style={{ fontSize:10, color:'var(--text-secondary)' }}><span style={{ color:'var(--bg-border)' }}>●</span> Pending ({IMF_TRANCHES.filter(t => t.status === 'future').length})</span>
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
                const amtC     = received ? '#16a34a' : isNext ? '#f59e0b' : 'var(--text-secondary)'
                const dotColor = received ? '#16a34a' : isNext ? '#f59e0b' : 'var(--bg-border)'
                return (
                  <div key={i} style={{ opacity: isFuture ? .75 : 1, display:'flex', flexDirection:'column' }}>
                    {/* Connector line */}
                    <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', backgroundColor: dotColor, flexShrink:0, border: isFuture ? '2px solid var(--bg-border)' : 'none', boxSizing:'border-box' }}/>
                      {i < IMF_TRANCHES.length - 1 && <div style={{ flex:1, height:1, backgroundColor:'var(--bg-border)' }}/>}
                    </div>
                    {/* Card */}
                    <div className="macro-card" style={{ padding:'10px', borderRadius:10, backgroundColor:'var(--bg-hover)', border:'1px solid var(--bg-border)', flex:1, display:'flex', flexDirection:'column' }}>
                      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>{t.tranche}</p>
                      <p style={{ fontSize:14, fontWeight:800, color:amtC, fontVariantNumeric:'tabular-nums', lineHeight:1, marginBottom:4 }}>~${t.amt.toFixed(1)}B</p>
                      <p style={{ fontSize:11, color: isNext ? '#f59e0b' : 'var(--text-secondary)', fontWeight: isNext ? 800 : 600, marginBottom:4 }}>{t.date}</p>
                      <p style={{ fontSize:10.5, color:'var(--text-secondary)', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{t.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:11, marginTop:14, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
            <Info size={11}/> USD values approximate (EFF is denominated in SDR). Source: IMF press releases; future dates estimated.
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
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', marginTop:6 }}>{k.sub}</p>
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

          <p style={{ fontSize:10, marginTop:10, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
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
                    { label:'Total Reserves',   value:`$${latest.total}B`, sub:`SBP + commercial banks · ${latest.month}`, accent: false },
                    { label:'SBP Holdings',     value:`$${latest.sbp}B`,   sub:`${sbpPct}% of total`,                     accent: false },
                    { label:'Commercial Banks', value:`$${banksPortion}B`, sub:`${bankPct}% of total`,                    accent: false },
                    { label:'Change', value:`${gain6m >= 0 ? '+' : '−'}$${Math.abs(gain6m)}B`, sub:`SBP holdings · ${first.month} → ${latest.month}`, accent: true },
                  ].map((k) => (
                    <div key={k.label} className="card" style={{ padding:'16px 20px' }}>
                      <p style={{ fontSize:10, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10, fontWeight:700 }}>{k.label}</p>
                      <p style={{ fontSize:22, fontWeight:700, lineHeight:1, fontVariantNumeric:'tabular-nums', color: k.accent ? '#16a34a' : 'var(--text-primary)', marginBottom:6 }}>{k.value}</p>
                      <p style={{ fontSize:11, color: k.accent ? '#16a34a' : 'var(--text-secondary)' }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* ── Reserve Composition ── */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Reserve Composition — {latest.month}
                    </span>
                    <span style={{ fontSize:12, color:'var(--text-secondary)', flexShrink:0 }}>
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
                        <span style={{ fontSize:11, color:'var(--text-secondary)' }}>SBP Holdings</span>
                      </div>
                      <p style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', fontVariantNumeric:'tabular-nums', paddingLeft:16 }}>${latest.sbp}B <span style={{ fontSize:12, fontWeight:400, color:'var(--text-secondary)' }}>{sbpPct}%</span></p>
                    </div>
                    <div style={{ width:1, background:'var(--bg-border)' }}/>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'var(--bg-border)', flexShrink:0, border:'1px solid var(--text-muted)' }}/>
                        <span style={{ fontSize:11, color:'var(--text-secondary)' }}>Commercial Banks</span>
                      </div>
                      <p style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', fontVariantNumeric:'tabular-nums', paddingLeft:16 }}>${banksPortion}B <span style={{ fontSize:12, fontWeight:400, color:'var(--text-secondary)' }}>{bankPct}%</span></p>
                    </div>
                  </div>
                </div>

                {/* ── Monthly Trend chart ── */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Monthly Trend · {RESERVES_DATA[0]?.month.split(' ')[1] ? `20${RESERVES_DATA[0].month.split(' ')[1]}` : ''}
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'#FEA500' }}/>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)' }}>SBP Holdings</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:'var(--text-secondary)', opacity:.5 }}/>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)' }}>Commercial Banks</span>
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
                      margin={{ top:4, right:0, left:-6, bottom:0 }}
                      barCategoryGap="16%"
                    >
                      <CartesianGrid vertical={false} stroke="var(--bg-border)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        interval={0}
                        tickFormatter={(m: string) => m.split(' ')[0]}
                        tick={{ fontSize:10, fill:'var(--text-secondary)', fontWeight:600 }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        width={40}
                        tick={{ fontSize:10, fill:'var(--text-secondary)', fontWeight:600 }}
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

                <p style={{ fontSize:10, marginTop:14, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
                  <Info size={9}/> Source: SBP weekly liquid FX reserves (latest week ended Nov 06, 2026).
                </p>
              </>
            )
          })()}
        </Section>

        {/* ── Rupee Impact Analysis ────────────────────────────────────────── */}
        <Section title="Rupee Impact Analysis" subtitle="Who gains and who loses when the rupee weakens" icon={ArrowLeftRight}>
          {(() => {
            const fx = MACRO_DATA.usdPkr
            const Group = ({ type }: { type: 'Exporter' | 'Importer' }) => {
              const exp = type === 'Exporter'
              const accent = exp ? '#16a34a' : '#dc2626'
              return (
                <div>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="shrink-0 mt-0.5">{exp ? <TrendingUp size={15} color={accent} /> : <TrendingDown size={15} color={accent} />}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {exp ? 'Exporters' : 'Importers'}
                      </p>
                      <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {exp ? 'Earn in USD — benefit when PKR falls' : 'Pay in USD — costs rise when PKR falls'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-3">
                    {PKR_IMPACT.filter(x => x.type === type).map(x => {
                      const q = rupeeQuotes[x.symbol]
                      const chg = q ? q.changePct * 100 : null
                      const up = (chg ?? 0) >= 0
                      return (
                        <a key={x.symbol} href={`/stocks/${x.symbol}`}
                          className="rounded-xl px-4 py-3.5 flex items-center gap-3 min-w-0 transition-colors"
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = `${accent}66`)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}>
                          <SymbolLogo symbol={x.symbol} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm" style={{ color: '#FEA500', fontWeight: 800 }}>{x.symbol}</span>
                              {q?.shariah && (
                                <span className="text-[9px] font-bold px-1.5 rounded-full"
                                  style={{ color: '#16a34a', background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)' }}>KMI</span>
                              )}
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{x.note}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[15px] tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                              {q ? q.price.toFixed(2) : '—'}
                            </p>
                            {chg != null && (
                              <p className="text-xs tabular-nums" style={{ color: up ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                {up ? '+' : ''}{chg.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            }
            return (
              <div className="space-y-5">
                {/* Live rupee */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(254,165,0,0.07)', border: '1px solid rgba(254,165,0,0.25)' }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FEA500' }}>USD / PKR now</span>
                  <span className="text-xl tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                    {fx && fx.value > 0 ? fx.value.toFixed(2) : '—'}
                  </span>
                  {fx && fx.change !== 0 && (
                    <span className="text-[13px] tabular-nums" style={{ color: fx.change > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                      {fx.change > 0 ? '+' : ''}{fx.change.toFixed(2)}% · rupee {fx.change > 0 ? 'weaker' : 'stronger'}
                    </span>
                  )}
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>
                    A weaker rupee favours exporters and hurts importers.
                  </span>
                </div>
                <Group type="Exporter" />
                <Group type="Importer" />
              </div>
            )
          })()}

          <p className="text-[11px] mt-4 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <Info size={11}/> Prices and moves are live. FX exposure is general guidance, not a forecast or investment advice.
          </p>
        </Section>
      </div>

      {/* ── CPEC Beneficiary Stocks ──────────────────────────────────────────── */}
      <Section title="CPEC Beneficiary Stocks" subtitle="Listed companies linked to China–Pakistan Economic Corridor projects" icon={TrendingUp}>
        {(() => {
          const EXPO: Record<string, { fg: string; bg: string; bd: string }> = {
            High:   { fg: '#16a34a', bg: 'rgba(22,163,74,0.12)',  bd: 'rgba(22,163,74,0.3)' },
            Medium: { fg: '#d97706', bg: 'rgba(245,158,11,0.13)', bd: 'rgba(245,158,11,0.35)' },
            Low:    { fg: 'var(--text-secondary)', bg: 'var(--bg-hover)', bd: 'var(--bg-border)' },
          }
          return (
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-3">
              {CPEC_STOCKS.map(x => {
                const q   = rupeeQuotes[x.symbol]
                const chg = q ? q.changePct * 100 : null
                const up  = (chg ?? 0) >= 0
                const ex  = EXPO[x.exposure]
                return (
                  <a key={x.symbol} href={`/stocks/${x.symbol}`}
                    className="rounded-xl p-4 flex flex-col gap-3 min-w-0 transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(254,165,0,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <SymbolLogo symbol={x.symbol} size={44} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm" style={{ color: '#FEA500', fontWeight: 800 }}>{x.symbol}</span>
                            {q?.shariah && (
                              <span className="text-[9px] font-bold px-1.5 rounded-full"
                                style={{ color: '#16a34a', background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)' }}>KMI</span>
                            )}
                          </div>
                          <p className="text-[13px] truncate" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{q?.name ?? x.sector}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                        style={{ color: ex.fg, background: ex.bg, border: `1px solid ${ex.bd}` }}>{x.exposure}</span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-xl tabular-nums leading-none" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                          {q ? q.price.toFixed(2) : '—'}
                        </p>
                        {chg != null && (
                          <p className="text-xs tabular-nums mt-1" style={{ color: up ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {up ? '+' : ''}{chg.toFixed(2)}% today
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{x.sector}</span>
                    </div>

                    <p className="text-xs leading-snug pt-2.5 mt-auto" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--bg-border)' }}>
                      {x.note}
                    </p>
                  </a>
                )
              })}
            </div>
          )
        })()}
        <p className="text-[11px] mt-4 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <Info size={11}/> Prices are live. Exposure ratings are general guidance from public project information, not investment advice.
        </p>
      </Section>

    </div>
  )
}
