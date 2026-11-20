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
  after_hours:  { rgb: '148,163,184', light: '#475569', dark: '#94a3b8' },
  friday_break: { rgb: '139,92,246',  light: '#6d28d9', dark: '#a78bfa' },
  weekend:      { rgb: '148,163,184', light: '#475569', dark: '#94a3b8' },
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

  const timeStr = status?.currentTime ?? null

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
          <div className="inline-flex items-stretch rounded-full overflow-hidden text-[10px] sm:text-xs font-semibold"
            style={{ border: `1px solid rgba(${style.rgb},${isDark ? 0.35 : 0.3})`, background: 'var(--bg-card)' }}>
            {timeStr && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 font-number"
                style={{ color: 'var(--text-secondary)', borderRight: `1px solid rgba(${style.rgb},${isDark ? 0.25 : 0.2})` }}>
                <Clock size={12} strokeWidth={2.2} style={{ color: 'var(--text-muted)' }} />
                {timeStr}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold tracking-wide"
              style={{ color: isDark ? style.dark : style.light, background: `rgba(${style.rgb},${isDark ? 0.14 : 0.1})` }}>
              <span className="relative flex" style={{ width: 7, height: 7 }}>
                {status.isOpen && (
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `rgb(${style.rgb})`, opacity: 0.6 }} />
                )}
                <span className="relative rounded-full" style={{ width: 7, height: 7, background: `rgb(${style.rgb})` }} />
              </span>
              {(status.label ?? '').toUpperCase()}
            </span>
          </div>
          {status.nextOpen && (
            <span className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Opens {status.nextOpen}
            </span>
          )}
        </div>
      ) : (
        <div className="h-7 w-32 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'var(--bg-hover)' }} />
      )}
    </div>
  )
}
