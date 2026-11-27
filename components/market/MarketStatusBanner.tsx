'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'

type Status = {
  isOpen: boolean
  status: string
  code: string
  label: string
  nextOpen: string
  currentTime: string   // pre-formatted "9:32 AM PKT" string from API
}

async function fetchStatus(): Promise<Status> {
  const r = await fetch('/api/market/status', { cache: 'no-store' })
  const j = await r.json()
  // Error responses (401 session expired, 429 rate limited) have no label — reject
  // so we keep the last good status instead of crashing on undefined.
  if (!r.ok || typeof j?.label !== 'string') throw new Error(j?.error ?? `status ${r.status}`)
  return j as Status
}

// One accent per market state; light/dark text shades keep contrast in both themes
const CODE_STYLES: Record<string, { rgb: string; light: string; dark: string }> = {
  open:         { rgb: '34,197,94',   light: '#15803d', dark: '#4ade80' },
  pre_market:   { rgb: '245,158,11',  light: '#b45309', dark: '#fbbf24' },
  post_market:  { rgb: '59,130,246',  light: '#1d4ed8', dark: '#60a5fa' },
  after_hours:  { rgb: '239,68,68',   light: '#b91c1c', dark: '#f87171' },
  friday_break: { rgb: '239,68,68',   light: '#b91c1c', dark: '#f87171' },
  weekend:      { rgb: '239,68,68',   light: '#b91c1c', dark: '#f87171' },
}

export default function MarketStatusBanner() {
  const [status, setStatus] = useState<Status | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => {})
    const iv = setInterval(() => fetchStatus().then(setStatus).catch(() => {}), 30_000)
    return () => clearInterval(iv)
  }, [])

  // Live ticking PKT clock (updates every second on the client)
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const parts = now
    ? Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
        weekday: 'short', day: 'numeric', month: 'short',
      }).formatToParts(now).map(p => [p.type, p.value]))
    : null
  const timeStr = parts ? true : status?.currentTime ?? null

  const style = status ? (CODE_STYLES[status.code] ?? CODE_STYLES.after_hours) : null

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-base sm:text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          Market Overview
        </h1>
        <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Pakistan Stock Exchange · Live Data
        </p>
      </div>

      {status && style ? (
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="inline-flex items-stretch rounded-full overflow-hidden text-[10px] sm:text-[11px] font-semibold"
            style={{ border: `1px solid rgba(${style.rgb},${isDark ? 0.35 : 0.3})`, background: 'var(--bg-card)' }}>
            {timeStr && (
              <span className="hidden sm:inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5"
                style={{ borderRight: `1px solid rgba(${style.rgb},${isDark ? 0.25 : 0.2})` }}>
                <span className="inline-flex items-center justify-center rounded-full"
                  style={{ width: 18, height: 18, background: `rgba(${style.rgb},${isDark ? 0.16 : 0.12})`, color: isDark ? style.dark : style.light }}>
                  <Clock size={10} strokeWidth={2.4} />
                </span>
                {parts ? (
                  <span className="flex items-baseline gap-1 tabular-nums">
                    <span className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '1em', letterSpacing: '0.02em' }}>
                      {parts.hour}<span className="clock-colon">:</span>{parts.minute}<span className="clock-colon">:</span>{parts.second}
                    </span>
                    <span className="text-[8.5px] sm:text-[9px] font-bold" style={{ color: isDark ? style.dark : style.light }}>{parts.dayPeriod}</span>
                    <span className="text-[8.5px] sm:text-[9px] font-semibold" style={{ color: 'var(--text-secondary)' }}>PKT · {parts.weekday} {parts.day} {parts.month}</span>
                  </span>
                ) : (
                  <span className="font-number" style={{ color: 'var(--text-secondary)' }}>{status.currentTime}</span>
                )}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 font-bold"
              style={{ color: isDark ? style.dark : style.light, background: `rgba(${style.rgb},${isDark ? 0.14 : 0.1})` }}>
              <span className="relative flex" style={{ width: 7, height: 7 }}>
                {/* Pulses in every state: fast ping when open, slow breathe when closed */}
                <span className={`absolute inset-0 rounded-full ${status.isOpen ? 'animate-ping' : 'dot-breathe'}`}
                  style={{ background: `rgb(${style.rgb})`, opacity: 0.6 }} />
                <span className="relative rounded-full" style={{ width: 7, height: 7, background: `rgb(${style.rgb})`, boxShadow: `0 0 6px rgba(${style.rgb},0.8)` }} />
              </span>
              {(status.label ?? '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
          {status.nextOpen && (
            <span className="text-[9px] sm:text-[9.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Opens {status.nextOpen}
            </span>
          )}
        </div>
      ) : (
        <div className="h-7 w-32 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'var(--bg-hover)' }} />
      )}
      <style>{`
        @keyframes dotBreathe { 0%,100% { transform: scale(1); opacity: .55 } 50% { transform: scale(2.4); opacity: 0 } }
        .dot-breathe { animation: dotBreathe 2.4s ease-in-out infinite; }
        @keyframes colonBlink { 0%,49% { opacity: 1 } 50%,100% { opacity: .25 } }
        .clock-colon { animation: colonBlink 1s steps(1) infinite; margin: 0 1px; }
        @media (prefers-reduced-motion: reduce) { .dot-breathe, .clock-colon { animation: none } }
      `}</style>
    </div>
  )
}
