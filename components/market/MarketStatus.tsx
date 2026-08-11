'use client'

import { useState, useEffect } from 'react'
import { Activity }            from 'lucide-react'
import { cachedFetch }         from '@/lib/utils/clientCache'

type Status = {
  isOpen:      boolean
  status:      string
  message:     string
  currentTime: string
  timezone:    string
}

export default function MarketStatus() {
  const [status,  setStatus]  = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchStatus() {
    try {
      const json = await cachedFetch<Status & { status: string }>('/api/market/status', 60_000)
      if (json.status) setStatus(json)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="card flex flex-col justify-between min-h-[100px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
          Market Status
        </span>
        <Activity size={14} style={{ color: 'var(--text-muted)' }} />
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-3 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
      ) : status ? (
        <div>
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
            ${status.isOpen
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full
              ${status.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            {status.isOpen ? 'OPEN' : 'CLOSED'}
          </div>

          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {status.message}
          </p>

          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date(status.currentTime).toLocaleTimeString('en-PK', {
              timeZone: 'Asia/Karachi',
              hour:   '2-digit',
              minute: '2-digit',
            })} PKT
          </p>
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Unable to load status</p>
      )}
    </div>
  )
}
