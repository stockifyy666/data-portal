'use client'

import { useState, useEffect } from 'react'

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
  return r.json()
}

const CODE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  open:          { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  pre_market:    { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  post_market:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  after_hours:   { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' },
  friday_break:  { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe', dot: '#8b5cf6' },
  weekend:       { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' },
}

export default function MarketStatusBanner() {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => {})
    const iv = setInterval(() => fetchStatus().then(setStatus).catch(() => {}), 30_000)
    return () => clearInterval(iv)
  }, [])

  const timeStr = status?.currentTime ?? null

  const style = status ? (CODE_STYLES[status.code] ?? CODE_STYLES.after_hours) : null

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Market Overview
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Pakistan Stock Exchange · Live Data
        </p>
      </div>

      {status && style ? (
        <div className="flex items-center gap-3">
          {timeStr && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              {timeStr}
            </span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border"
              style={{ background: style.bg, color: style.text, borderColor: style.border, borderRadius: '9999px' }}
            >
              <span
                className={status.isOpen ? 'animate-pulse' : ''}
                style={{ width: 8, height: 8, borderRadius: '50%', background: style.dot, display: 'inline-block', flexShrink: 0 }}
              />
              {status.label.toUpperCase()}
            </div>
            {status.nextOpen && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Opens {status.nextOpen}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-8 w-40 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
      )}
    </div>
  )
}
