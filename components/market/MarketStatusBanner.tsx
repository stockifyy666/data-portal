'use client'

import { useState, useEffect } from 'react'
import { cachedFetch }         from '@/lib/utils/clientCache'

type Status = { isOpen: boolean; status: string; message: string; currentTime: string }

export default function MarketStatusBanner() {
  const [status,  setStatus]  = useState<Status | null>(null)

  useEffect(() => {
    cachedFetch<Status>('/api/market/status', 60_000)
      .then(j => { if (j.status !== undefined) setStatus(j) })
      .catch(() => {})
    const iv = setInterval(() => {
      cachedFetch<Status>('/api/market/status', 60_000)
        .then(j => { if (j.status !== undefined) setStatus(j) }).catch(() => {})
    }, 60_000)
    return () => clearInterval(iv)
  }, [])

  const timeStr = status?.currentTime
    ? new Date(status.currentTime).toLocaleTimeString('en-PK', {
        timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit',
      })
    : null

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

      {status ? (
        <div className="flex items-center gap-3">
          {timeStr && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              {timeStr} PKT
            </span>
          )}
          <div className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border
            ${status.isOpen
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              : 'bg-red-50  text-red-600  border-red-200  dark:bg-red-950  dark:text-red-400  dark:border-red-800'}
          `}>
            <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            {status.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </div>
        </div>
      ) : (
        <div className="h-8 w-36 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
      )}
    </div>
  )
}
