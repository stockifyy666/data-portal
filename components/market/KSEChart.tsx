'use client'

import { useState, useEffect } from 'react'
import { cachedFetch }         from '@/lib/utils/clientCache'

type Candle = { date: string; close: number; open: number; high: number; low: number; volume: number }

export default function KSEChart() {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cachedFetch<{ data: Candle[] }>('/api/stock/KSE100/intraday?period=1D', 5 * 60_000)
      .then(j => { if (j.data) setCandles([...j.data].reverse()) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-full w-full rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
  }

  if (!candles.length) {
    return <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No chart data</p>
  }

  const prices = candles.map(c => c.close)
  const min    = Math.min(...prices)
  const max    = Math.max(...prices)
  const range  = max - min || 1
  const W = 600; const H = 120
  const isUp   = prices[prices.length - 1] >= prices[0]
  const color  = isUp ? '#16a34a' : '#dc2626'
  const fill   = isUp ? '#16a34a22' : '#dc262622'

  const pts = candles.map((c, i) => {
    const x = (i / (candles.length - 1)) * W
    const y = H - ((c.close - min) / range) * (H - 8) - 4
    return `${x},${y}`
  })

  const areaPath = `M ${pts[0]} L ${pts.join(' L ')} L ${W},${H} L 0,${H} Z`
  const linePath = `M ${pts.join(' L ')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}
