'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, Zap, Clock, AlertTriangle, CheckCircle, Database, List, RefreshCw } from 'lucide-react'
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
  const [loading,   setLoading]   = useState(true)
  const [lastFetch, setLastFetch] = useState('')
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/api/admin/api-usage', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setUsage(json.usage)
        setFsCount(json.fsCount)
        setScCount(json.scCount)
        setLastFetch(new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        setCountdown(POLL_INTERVAL / 1000)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial + interval polling
  useEffect(() => {
    fetchData()
    const id = setInterval(() => fetchData(true), POLL_INTERVAL)
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

  const pct        = Math.min(100, (usage.used / 10_000) * 100)
  const resetHours = Math.floor(usage.resetIn / 3600)
  const resetMins  = Math.floor((usage.resetIn % 3600) / 60)
  const isWarning  = usage.used >= 8_000
  const isDanger   = usage.used >= 10_000

  const barColor    = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
  const statusColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
  const statusLabel = isDanger ? 'Limit Exceeded' : isWarning ? 'Near Limit' : 'Healthy'
  const StatusIcon  = isDanger ? AlertTriangle : isWarning ? AlertTriangle : CheckCircle

  const cacheStats = [
    { label: 'Financial Statements', value: fsCount, sub: 'income · balance · cashflow · fundamentals · shareholders' },
    { label: 'Stock Content',        value: scCount, sub: 'profiles · news · announcements · general news' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>API Usage</h1>
          <p style={{ fontSize: 13, color: 'var(--text-subtitle)', marginTop: 4 }}>
            Capital Stake UAT API — 10,000 requests/day · PKR 10 per overage request
          </p>
        </div>
        {/* Auto-refresh status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0,
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }} />
            Auto-refresh in {countdown}s
            {lastFetch && <span style={{ color: 'var(--text-muted)' }}>· {lastFetch}</span>}
          </div>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            title="Refresh now"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: 'var(--bg-hover)', border: '1px solid var(--bg-border)',
              color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main usage card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
        borderRadius: 5, padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={18} color="#FEA500" />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Daily Request Count</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            color: statusColor,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}30`,
            padding: '4px 10px', borderRadius: 4,
          }}>
            <StatusIcon size={13} />
            {statusLabel}
          </div>
        </div>

        {/* Big number */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 48, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {usage.used.toLocaleString()}
          </span>
          <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/ 10,000</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 10, background: 'var(--bg-hover)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: barColor,
            borderRadius: 99,
            transition: 'width .6s ease',
          }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Stat icon={Activity}      label="Used today"  value={usage.used.toLocaleString()}      color="#FEA500" />
          <Stat icon={CheckCircle}   label="Remaining"   value={usage.remaining.toLocaleString()} color="#22c55e" />
          <Stat icon={Clock}         label="Resets in"   value={`${resetHours}h ${resetMins}m`}  color="#60a5fa" />
          {isDanger && (
            <Stat icon={AlertTriangle} label="Overage cost"
              value={`PKR ${((usage.used - 10_000) * 10).toLocaleString()}`} color="#ef4444" />
          )}
        </div>
      </div>

      {/* Per-endpoint breakdown */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <List size={15} color="var(--text-muted)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Endpoint Breakdown</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>today · resets with daily counter</span>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, overflow: 'hidden' }}>
          {usage.endpoints.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              No API calls recorded yet today
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left',   fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Endpoint</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right',  fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Calls</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right',  fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Share</th>
                  <th style={{ padding: '10px 16px', width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {usage.endpoints.map((e, i) => {
                  const share = usage.used > 0 ? (e.count / usage.used) * 100 : 0
                  return (
                    <tr key={e.endpoint} style={{ borderBottom: i < usage.endpoints.length - 1 ? '1px solid var(--bg-border)' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12 }}>
                        {e.endpoint}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#FEA500', fontVariantNumeric: 'tabular-nums' }}>
                        {e.count.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {share.toFixed(1)}%
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${share}%`, background: '#FEA500', borderRadius: 99, transition: 'width .6s ease' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supabase cache stats */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Database size={15} color="var(--text-muted)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Supabase Cache</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>rows stored — served free, no CS API calls</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {cacheStats.map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
              borderRadius: 5, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 6, transition: 'all .3s' }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: 'rgba(254,165,0,.06)', border: '1px solid rgba(254,165,0,.2)',
        borderRadius: 5, padding: '14px 18px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
      }}>
        <strong style={{ color: '#FEA500' }}>How it works:</strong> Every Capital Stake API call increments this counter in Redis with a 24-hour rolling window.
        Market quotes reset automatically every 1–15 min via Redis cache — users never trigger duplicate calls within the TTL window.
        Supabase stores financial statements (24h), profiles &amp; shareholders (7 days) so repeat visits cost zero CS calls.
        <span style={{ display: 'block', marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>
          Page auto-refreshes every 30 seconds.
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 4, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  )
}
