'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Activity, Zap, Clock, AlertTriangle, CheckCircle, Database, List, RefreshCw, TrendingUp, FileText,
  BarChart3, Building2, Bell, Newspaper, LineChart, Layers } from 'lucide-react'
import type { EndpointStat } from '@/lib/utils/rateLimit'

const POLL_INTERVAL = 30_000 // 30 seconds

type UsageData = {
  used:      number
  remaining: number
  resetIn:   number
  endpoints: EndpointStat[]
}

export default function APIUsagePage() {
  const [usage,     setUsage]     = useState<UsageData | null>(null)
  const [fsCount,   setFsCount]   = useState(0)
  const [scCount,   setScCount]   = useState(0)
  const [tables,    setTables]    = useState<Record<string, number> | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [lastFetch, setLastFetch] = useState('')
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000)

  const [offline, setOffline] = useState(false)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/api/admin/api-usage', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setUsage(json.usage)
        setFsCount(json.fsCount)
        setScCount(json.scCount)
        if (json.tables) setTables(json.tables)
        setLastFetch(new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        setOffline(false)
      } else {
        setOffline(true)
      }
    } catch {
      // Network blip (server restarting, connection dropped): keep the last
      // data on screen and try again on the next tick instead of crashing.
      setOffline(true)
    } finally {
      setCountdown(POLL_INTERVAL / 1000)
      setLoading(false)
    }
  }, [])

  // Initial + interval polling (skipped while the tab is hidden)
  useEffect(() => {
    fetchData()
    const id = setInterval(() => { if (!document.hidden) fetchData(true) }, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchData])

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => setCountdown(c => c > 0 ? c - 1 : POLL_INTERVAL / 1000), 1000)
    return () => clearInterval(id)
  }, [])

  if (!usage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <RefreshCw size={18} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const LIMIT      = 10_000
  const pct        = Math.min(100, (usage.used / LIMIT) * 100)
  const resetHours = Math.floor(usage.resetIn / 3600)
  const resetMins  = Math.floor((usage.resetIn % 3600) / 60)
  const isWarning  = usage.used >= 8_000
  const isDanger   = usage.used >= LIMIT
  const statusColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
  const statusLabel = isDanger ? 'Limit exceeded' : isWarning ? 'Near limit' : 'Healthy'
  const StatusIcon  = isDanger || isWarning ? AlertTriangle : CheckCircle

  // Pace: calls so far vs time elapsed in the 24h window → projected end-of-day total
  const elapsedH   = Math.max(0.25, 24 - usage.resetIn / 3600)
  const perHour    = usage.used / elapsedH
  const projected  = Math.round(usage.used + perHour * (usage.resetIn / 3600))
  const projColor  = projected >= LIMIT ? '#ef4444' : projected >= 8_000 ? '#f59e0b' : '#22c55e'

  // Group endpoints into categories
  type Row = EndpointStat & { label: string; variants: number; sync: boolean }
  const groups = new Map<string, { cat: Cat; total: number; rows: Map<string, Row> }>()
  for (const e of usage.endpoints) {
    const cat   = categorize(e.endpoint)
    const label = cleanEndpoint(e.endpoint)
    const sync  = /\[(sync|all)\]/.test(e.endpoint)
    const g = groups.get(cat.key) ?? { cat, total: 0, rows: new Map<string, Row>() }
    g.total += e.count
    const key = label + (sync ? '|sync' : '')
    const r = g.rows.get(key)
    if (r) { r.count += e.count; r.variants++ }
    else g.rows.set(key, { endpoint: e.endpoint, count: e.count, label, variants: 1, sync })
    groups.set(cat.key, g)
  }
  const grouped = Array.from(groups.values())
    .map(g => ({ ...g, rows: Array.from(g.rows.values()).sort((a, b) => b.count - a.count) }))
    .sort((a, b) => b.total - a.total)

  const tableStats = tables ? [
    { label: 'Financial statements', value: tables.financial_statements, sub: 'Income · balance · cash flow',     icon: FileText,  accent: '#3b82f6' },
    { label: 'Fundamentals',         value: tables.fundamentals,         sub: 'Key metrics per company',          icon: BarChart3, accent: '#10b981' },
    { label: 'Company profiles',     value: tables.company_profiles,     sub: 'Overview · detail · shareholders', icon: Building2, accent: '#8b5cf6' },
    { label: 'Announcements',        value: tables.announcements,        sub: 'Companies with filings stored',    icon: Bell,      accent: '#f97316' },
    { label: 'News',                 value: tables.news,                 sub: 'General + sector feeds',           icon: Newspaper, accent: '#06b6d4' },
  ] : [
    { label: 'Financial data', value: fsCount, sub: 'Statements + fundamentals', icon: FileText,  accent: '#3b82f6' },
    { label: 'Content',        value: scCount, sub: 'Profiles, news, announcements', icon: Newspaper, accent: '#06b6d4' },
  ]

  // Ring gauge
  const R = 64, C = 2 * Math.PI * R

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>API Usage</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Capital Stake API · 10,000 requests/day · PKR 10 per extra request
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: offline ? '#ef4444' : 'var(--text-secondary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: offline ? '#ef4444' : '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
            {offline ? `Connection lost · retrying in ${countdown}s` : `Live · next refresh ${countdown}s`}
            {lastFetch && !offline && <span style={{ color: 'var(--text-muted)' }}>· {lastFetch}</span>}
          </span>
          <button onClick={() => fetchData()} disabled={loading} title="Refresh now"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', opacity: loading ? 0.6 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Hero: gauge + KPIs */}
      <div className="rounded-xl p-5 sm:p-6 grid gap-6 lg:grid-cols-[auto_1fr] items-center"
        style={{ background: `linear-gradient(135deg, ${statusColor}14, var(--bg-card) 45%)`, border: '1px solid var(--bg-border)' }}>
        <div className="relative mx-auto" style={{ width: 168, height: 168 }}>
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--bg-border)" strokeWidth="14" />
            <circle cx="80" cy="80" r={R} fill="none" stroke={statusColor} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(Math.max(pct, 0.5) / 100) * C} ${C}`} style={{ transition: 'stroke-dasharray .6s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] font-extrabold leading-none font-number tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {usage.used.toLocaleString()}
            </span>
            <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>of 10,000 today</span>
            <span className="text-[11px] font-bold mt-1" style={{ color: statusColor }}>{pct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap size={18} color="#FEA500" />
              <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Daily request budget</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ color: statusColor, background: `${statusColor}1a`, border: `1px solid ${statusColor}40` }}>
              <StatusIcon size={13} /> {statusLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Kpi icon={Activity}    label="Used today"      value={usage.used.toLocaleString()}      sub={`${perHour.toFixed(0)} per hour on average`} color="#FEA500" />
            <Kpi icon={CheckCircle} label="Remaining"       value={usage.remaining.toLocaleString()} sub="Before overage charges"                       color="#22c55e" />
            <Kpi icon={TrendingUp}  label="Projected today" value={projected.toLocaleString()}       sub={projected >= LIMIT ? 'Over the daily limit' : 'At the current pace'} color={projColor} />
            <Kpi icon={Clock}       label="Resets in"       value={`${resetHours}h ${resetMins}m`}   sub="Rolling 24-hour window"                        color="#60a5fa" />
          </div>
          {isDanger && (
            <p className="mt-3 text-[13px] font-semibold px-3 py-2 rounded-lg"
              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              Overage so far: PKR {((usage.used - LIMIT) * 10).toLocaleString()} ({(usage.used - LIMIT).toLocaleString()} extra requests × PKR 10)
            </p>
          )}
        </div>
      </div>

      {/* Category summary */}
      {grouped.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Calls by category</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>today</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
            {grouped.map(g => (
              <div key={g.cat.key} title={`${g.cat.label}: ${g.total}`}
                style={{ width: `${(g.total / Math.max(1, usage.used)) * 100}%`, background: g.cat.color }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
            {grouped.map(g => (
              <span key={g.cat.key} className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: g.cat.color }} />
                {g.cat.label}
                <b className="font-number" style={{ color: 'var(--text-primary)' }}>{g.total.toLocaleString()}</b>
                <span style={{ color: 'var(--text-muted)' }}>({((g.total / Math.max(1, usage.used)) * 100).toFixed(0)}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Endpoint breakdown, grouped */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <List size={15} color="var(--text-secondary)" />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Endpoint breakdown</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· resets with the daily counter</span>
        </div>
        {grouped.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No API calls recorded yet today</p>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: 420 }}>
            <table className="w-full text-[13px]" style={{ minWidth: 560, borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className="sticky top-0 z-10">
                <tr style={{ background: 'var(--bg-hover)', boxShadow: '0 1px 0 var(--bg-border)' }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Endpoint</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Calls</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider w-[38%]" style={{ color: 'var(--text-secondary)' }}>Share of today</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(g => (
                  <Fragment key={g.cat.key}>
                    <tr style={{ borderTop: '1px solid var(--bg-border)', background: `${g.cat.color}0d` }}>
                      <td className="px-4 py-2" colSpan={3}>
                        <span className="inline-flex items-center gap-2 text-xs font-bold" style={{ color: g.cat.color }}>
                          <g.cat.icon size={13} /> {g.cat.label}
                          <span className="font-number" style={{ color: 'var(--text-secondary)' }}>· {g.total.toLocaleString()} calls</span>
                        </span>
                      </td>
                    </tr>
                    {g.rows.map(e => {
                      const share = usage.used > 0 ? (e.count / usage.used) * 100 : 0
                      return (
                        <tr key={e.label + (e.sync ? '|sync' : '')} style={{ borderTop: '1px solid var(--bg-border)' }}>
                          <td className="px-4 py-2.5 pl-9">
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }} title={e.endpoint}>{e.label}</span>
                            {e.variants > 1 && (
                              <span className="ml-2 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                × {e.variants} {e.label.includes('sector') ? 'sectors' : 'symbols'}
                              </span>
                            )}
                            {e.sync && (
                              <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.14)', color: '#10b981' }}>SYNC</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold font-number tabular-nums" style={{ color: 'var(--text-primary)' }}>{e.count.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.max(share, 1)}%`, background: g.cat.color, transition: 'width .6s ease' }} />
                              </div>
                              <span className="text-[11px] font-number w-11 text-right" style={{ color: 'var(--text-secondary)' }}>{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supabase storage */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database size={15} color="var(--text-secondary)" />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Stored in Supabase</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· rows served without any API call</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {tableStats.map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.accent}1f`, color: s.accent }}>
                <s.icon size={15} />
              </span>
              <p className="text-2xl font-extrabold font-number tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{s.value.toLocaleString()}</p>
              <p className="text-[13px] font-semibold mt-1.5" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How the budget is used */}
      <div className="rounded-xl p-4 sm:p-5" style={{ background: 'rgba(254,165,0,0.06)', border: '1px solid rgba(254,165,0,0.22)' }}>
        <p className="text-sm font-bold mb-3" style={{ color: '#FEA500' }}>How calls are scheduled</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {SCHEDULE.map(([what, when]) => (
            <div key={what} className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#FEA500' }} />
              <span><b style={{ color: 'var(--text-primary)' }}>{what}</b> — {when}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>This page refreshes every 30 seconds.</p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  )
}

type Cat = { key: string; label: string; color: string; icon: React.ElementType }
const CATS: (Cat & { re: RegExp })[] = [
  { key: 'prices',   label: 'Prices & market',   color: '#FEA500', icon: Activity,  re: /market\/(tickers|quotes|stocks|quote)/ },
  { key: 'charts',   label: 'Charts',            color: '#3b82f6', icon: LineChart, re: /intraday|chart/ },
  { key: 'fin',      label: 'Financials',        color: '#10b981', icon: FileText,  re: /financials|fundamentals/ },
  { key: 'profile',  label: 'Profiles',          color: '#8b5cf6', icon: Building2, re: /profile|shareholders/ },
  { key: 'news',     label: 'News & filings',    color: '#06b6d4', icon: Newspaper, re: /news|announcement/ },
]
const OTHER: Cat = { key: 'other', label: 'Other', color: '#94a3b8', icon: Layers }

function categorize(endpoint: string): Cat {
  return CATS.find(c => c.re.test(endpoint)) ?? OTHER
}
function cleanEndpoint(e: string) {
  return e.replace(/^GET\s+/, '').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '').replace(/\s*\[(sync|all)\]\s*$/, '')
}

const SCHEDULE: [string, string][] = [
  ['Prices (tickers, quotes)', 'at most once a minute while PSX is open; none after close'],
  ['General news + announcements', 'every hour'],
  ['Sector news', 'every 2 hours (shared by all companies in a sector)'],
  ['Financials + fundamentals', 'daily, overnight'],
  ['Profiles + shareholders', 'weekly, Sunday night'],
  ['Company pages', 'read from Supabase — no call unless data is missing'],
]

function Kpi({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl p-3.5 min-w-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1f`, color }}>
          <Icon size={14} />
        </span>
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <p className="text-xl font-extrabold font-number tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}
