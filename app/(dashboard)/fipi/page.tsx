'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DayDetail { client: string; sector: string; vol: number; val: number; usd: number }
interface DayRecord  { date: string; details: DayDetail[]; vol: number; val: number; usd: number }
interface FIPIData   { foreign: DayRecord[]; local: DayRecord[] }

type Period     = '10d' | '3m' | '1y'
type InvType    = 'fipi' | 'lipi'
type BreakMode  = 'client' | 'sector'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(2)}M`
  if (a >= 1_000)     return `${s}$${(a / 1_000).toFixed(1)}K`
  return `${s}$${a.toLocaleString()}`
}
const fmtK = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (a >= 1_000) return `${s}${(a / 1_000).toFixed(1)}m`
  return `${s}${a.toFixed(0)}`
}

function breakdownFromDay(day: DayRecord, mode: BreakMode): Record<string, number> {
  const map: Record<string, number> = {}
  day.details.forEach(d => {
    const key = mode === 'client' ? d.client : d.sector
    map[key] = (map[key] ?? 0) + d.usd
  })
  return map
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, days, breakMode }: any) {
  if (!active || !payload?.length) return null
  const rawDate = payload[0]?.payload?.rawDate as string | undefined
  const day = rawDate ? days.find((d: DayRecord) => d.date === rawDate) : null
  const breakdown = day ? breakdownFromDay(day, breakMode) : {}
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
  const net = day?.usd ?? 0

  return (
    <div className="rounded-xl shadow-xl border text-xs min-w-[240px]"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }}>
      <div className="px-3 py-2 border-b font-semibold text-sm" style={{ borderColor: 'var(--bg-border)' }}>
        {label}
      </div>
      <div className="px-3 py-2 space-y-1">
        {entries.map(([name, usd]) => (
          <div key={name} className="flex justify-between gap-6">
            <span style={{ color: 'var(--text-muted)' }}>{name}:</span>
            <span className="font-mono font-semibold" style={{ color: usd >= 0 ? '#22c55e' : '#ef4444' }}>
              {usd >= 0 ? '' : '('}{Math.abs(usd).toLocaleString()}{usd < 0 ? ')' : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t flex justify-between font-semibold" style={{ borderColor: 'var(--bg-border)' }}>
        <span>NET {breakMode === 'client' ? 'Local' : 'Sector'}:</span>
        <span className="font-mono" style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>
          {net >= 0 ? '' : '('}{Math.abs(net).toLocaleString()}{net < 0 ? ')' : ''}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FIPIPage() {
  const [data,      setData]      = useState<FIPIData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [period,    setPeriod]    = useState<Period>('10d')
  const [invType,   setInvType]   = useState<InvType>('lipi')
  const [breakMode, setBreakMode] = useState<BreakMode>('client')

  const load = useCallback(async (p: Period) => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/market/fipi?period=${p}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [load])

  // Active dataset
  const days: DayRecord[] = Array.isArray(
    invType === 'fipi' ? data?.foreign : data?.local
  ) ? (invType === 'fipi' ? data!.foreign : data!.local) : []

  const maxBars = period === '1y' ? 260 : period === '3m' ? 65 : 10
  const sorted  = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-maxBars)

  // Cumulative line
  let cum = 0
  const chartData = sorted.map(d => {
    cum += d.usd
    return { date: d.date, label: d.date, net: Math.round(d.usd / 1000), cumulative: Math.round(cum / 1_000_000 * 100) / 100, rawDate: d.date }
  })

  // Latest day stats
  const latest = sorted[sorted.length - 1]
  const cumTotal = days.reduce((s, d) => s + d.usd, 0)

  return (
    <div className=" space-y-4" style={{ color: 'var(--text-primary)' }}>

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Portfolio Investments</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Foreign &amp; Local Institutional Portfolio Investment — PSX · Source: NCCPL
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* FIPI / LIPI toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-border)' }}>
            {(['fipi', 'lipi'] as InvType[]).map(t => (
              <button key={t} onClick={() => setInvType(t)}
                className="px-4 py-1.5 text-xs font-semibold transition-colors uppercase"
                style={{ background: invType === t ? '#1e3a5f' : 'var(--bg-card)', color: invType === t ? '#fff' : 'var(--text-secondary)' }}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => load(period)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="h-80 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
      )}

      {data && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: `${invType.toUpperCase()} Latest`, value: latest ? fmt(latest.usd) : '—', pos: (latest?.usd ?? 0) >= 0, sub: latest?.date ?? '' },
              { label: `${invType.toUpperCase()} Cumulative`, value: fmt(cumTotal), pos: cumTotal >= 0, sub: `${days.length} days` },
              { label: 'Net Volume', value: latest ? latest.vol.toLocaleString() : '—', pos: (latest?.vol ?? 0) >= 0, sub: 'shares' },
              { label: 'Days of Data', value: String(days.length), pos: true, sub: period },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                <p className="text-lg font-bold font-mono" style={{ color: c.pos ? '#22c55e' : '#ef4444' }}>{c.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Chart card */}
          <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}>
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                Net {invType.toUpperCase()} (in $USD)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 48, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="bar" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={v => `${fmtK(v)}K`} axisLine={false} tickLine={false} />
                <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={v => `${v}m`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip days={sorted} breakMode={breakMode} />} />
                <ReferenceLine yAxisId="bar" y={0} stroke="var(--text-muted)" strokeOpacity={0.4} />
                <Bar yAxisId="bar" dataKey="net" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {chartData.map((e, i) => (
                    <Cell key={i} fill={e.net >= 0 ? '#86efac' : '#fca5a5'} />
                  ))}
                </Bar>
                <Line yAxisId="line" type="monotone" dataKey="cumulative"
                  stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3, fill: '#1e3a5f' }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Bottom controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--bg-border)' }}>
              {/* Period */}
              <div className="flex gap-1">
                {(['10d', '3m', '1y'] as Period[]).map(p => (
                  <button key={p} onClick={() => { setPeriod(p); load(p) }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: period === p ? '#1e3a5f' : 'var(--bg-hover)', color: period === p ? '#fff' : 'var(--text-secondary)' }}>
                    {p === '10d' ? '10 Days' : p === '3m' ? '3 Months' : '1 Year'}
                  </button>
                ))}
              </div>
              {/* Breakdown mode */}
              <div className="flex gap-1">
                {(['client', 'sector'] as BreakMode[]).map(m => (
                  <button key={m} onClick={() => setBreakMode(m)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize"
                    style={{ background: breakMode === m ? '#1e3a5f' : 'var(--bg-hover)', color: breakMode === m ? '#fff' : 'var(--text-secondary)' }}>
                    By {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Latest day breakdown table */}
          {latest && (() => {
            const breakdown = breakdownFromDay(latest, breakMode)
            const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
            const net = latest.usd
            return (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bg-border)' }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}>
                  <span className="font-semibold text-sm">
                    {invType.toUpperCase()} Breakdown — {latest.date} · By {breakMode.charAt(0).toUpperCase() + breakMode.slice(1)}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>
                        {breakMode === 'client' ? 'Client Type' : 'Sector'}
                      </th>
                      <th className="px-4 py-2 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Net USD</th>
                      <th className="px-4 py-2 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(([name, usd]) => (
                      <tr key={name} className="border-t" style={{ borderColor: 'var(--bg-border)' }}>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{name}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium" style={{ color: usd >= 0 ? '#22c55e' : '#ef4444' }}>
                          {usd >= 0 ? '' : '('}{Math.abs(usd).toLocaleString()}{usd < 0 ? ')' : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold"
                            style={{ background: usd >= 0 ? '#22c55e22' : '#ef444422', color: usd >= 0 ? '#22c55e' : '#ef4444' }}>
                            {usd >= 0 ? 'BUY' : 'SELL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-semibold" style={{ borderColor: 'var(--bg-border)', background: 'var(--bg-hover)' }}>
                      <td className="px-4 py-2.5">NET Total</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>
                        {net >= 0 ? '' : '('}{Math.abs(net).toLocaleString()}{net < 0 ? ')' : ''}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
