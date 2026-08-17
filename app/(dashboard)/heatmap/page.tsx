'use client'

import { useState, useEffect } from 'react'
import SectorHeatmap            from '@/components/market/SectorHeatmap'
import CombinedHeatmap          from '@/components/market/CombinedHeatmap'
import { cachedFetch }          from '@/lib/utils/clientCache'

type HeatView = 'sector' | 'combined'
type Status   = { isOpen: boolean; status: string; message: string; currentTime: string }

function MarketBadge() {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    cachedFetch<Status>('/api/market/status', 60_000)
      .then(j => { if (j.status !== undefined) setStatus(j) }).catch(() => {})
    const iv = setInterval(() => {
      cachedFetch<Status>('/api/market/status', 60_000)
        .then(j => { if (j.status !== undefined) setStatus(j) }).catch(() => {})
    }, 60_000)
    return () => clearInterval(iv)
  }, [])

  if (!status) return <div className="h-7 w-32 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />

  const timeStr = new Date(status.currentTime).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
        {timeStr} PKT
      </span>
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
  )
}

export default function HeatmapPage() {
  const [view, setView] = useState<HeatView>('combined')

  return (
    <div className="space-y-5 animate-data">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Market Heatmap
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            PSX stocks — color shows % change today
          </p>
        </div>
        <MarketBadge />
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-hover)' }}>
        {([
          { id: 'combined', label: 'Combined View' },
          { id: 'sector',   label: 'Sector View'  },
        ] as { id: HeatView; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={view === t.id
              ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
              : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'sector'   && <SectorHeatmap />}
      {view === 'combined' && <CombinedHeatmap />}
    </div>
  )
}
