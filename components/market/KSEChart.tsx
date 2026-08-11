'use client'

import { useState, useEffect } from 'react'
import { cachedFetch }         from '@/lib/utils/clientCache'

type Candle = { date: string; close: number; open: number; high: number; low: number; volume: number }

/* ── Layout constants ───────────────────────────────────────────── */
const W   = 900
const H   = 280
const PAD = { L: 72, R: 12, T: 14, B: 36 }
const CW  = W - PAD.L - PAD.R
const CH  = H - PAD.T - PAD.B

function niceSteps(min: number, max: number, n = 6) {
  const raw  = (max - min) / n
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)))
  const nice = [1, 2, 2.5, 5, 10].map(f => f * mag).find(f => f >= raw) ?? mag * 10
  const lo   = Math.floor(min / nice) * nice
  const steps: number[] = []
  for (let v = lo; v <= max + nice * 0.5; v += nice) steps.push(+v.toFixed(2))
  return steps
}

function fmt(n: number) {
  if (n >= 100000) return (n / 1000).toFixed(0) + 'K'
  if (n >= 1000)   return (n / 1000).toFixed(1) + 'K'
  return n.toFixed(0)
}

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

  /* ── Data prep ────────────────────────────────────────────────── */
  // Limit to last 80 candles so each candle is visible
  const data  = candles.slice(-80)
  const n     = data.length

  const allHigh = data.map(c => c.high)
  const allLow  = data.map(c => c.low)
  const yMin    = Math.min(...allLow)
  const yMax    = Math.max(...allHigh)
  const yRange  = yMax - yMin || 1

  const ySteps  = niceSteps(yMin, yMax, 6)
  const yExtMin = ySteps[0]
  const yExtMax = ySteps[ySteps.length - 1]
  const yExtRange = yExtMax - yExtMin || 1

  const toY = (v: number) => PAD.T + CH - ((v - yExtMin) / yExtRange) * CH
  const toX = (i: number) => PAD.L + (i / n) * CW

  /* ── Candle geometry ──────────────────────────────────────────── */
  const slotW   = CW / n
  const bodyW   = Math.max(slotW * 0.65, 1.5)
  const bodyGap = (slotW - bodyW) / 2

  /* ── X-axis labels (time) ─────────────────────────────────────── */
  const labelCount = Math.min(6, n)
  const labelIdxs  = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (n - 1))
  )

  function timeLabel(dateStr: string) {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString('en-PK', {
        timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    } catch { return '' }
  }

  const isUp = data[n - 1].close >= data[0].open
  const accentColor = isUp ? '#16a34a' : '#dc2626'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ overflow: 'visible' }}
    >
      {/* ── Grid lines + Y-axis labels ────────────────────────────── */}
      {ySteps.map((val, i) => {
        if (val < yExtMin - 0.001 || val > yExtMax + 0.001) return null
        const y = toY(val)
        return (
          <g key={i}>
            {/* Grid line */}
            <line
              x1={PAD.L} y1={y} x2={W - PAD.R} y2={y}
              stroke="var(--bg-border)" strokeWidth="0.6" strokeDasharray="3,4"
            />
            {/* Y label */}
            <text
              x={PAD.L - 6} y={y + 4}
              textAnchor="end"
              fontSize="9.5"
              fill="var(--text-muted)"
              fontFamily="monospace"
            >
              {fmt(val)}
            </text>
          </g>
        )
      })}

      {/* ── Chart border lines ─────────────────────────────────────── */}
      <line x1={PAD.L} y1={PAD.T} x2={PAD.L} y2={PAD.T + CH}
            stroke="var(--bg-border)" strokeWidth="0.8" />
      <line x1={PAD.L} y1={PAD.T + CH} x2={W - PAD.R} y2={PAD.T + CH}
            stroke="var(--bg-border)" strokeWidth="0.8" />

      {/* ── Candlesticks ──────────────────────────────────────────── */}
      {data.map((c, i) => {
        const x     = toX(i) + bodyGap
        const isGreen = c.close >= c.open
        const color   = isGreen ? '#16a34a' : '#dc2626'
        const bodyTop = toY(Math.max(c.open, c.close))
        const bodyBot = toY(Math.min(c.open, c.close))
        const bodyH   = Math.max(bodyBot - bodyTop, 1)
        const midX    = x + bodyW / 2

        return (
          <g key={i}>
            {/* Upper wick */}
            <line
              x1={midX} y1={toY(c.high)}
              x2={midX} y2={bodyTop}
              stroke={color} strokeWidth="1"
            />
            {/* Body */}
            <rect
              x={x} y={bodyTop}
              width={bodyW} height={bodyH}
              fill={isGreen ? color : color}
              fillOpacity={isGreen ? 0.9 : 0.85}
              rx="0.5"
            />
            {/* Lower wick */}
            <line
              x1={midX} y1={bodyBot}
              x2={midX} y2={toY(c.low)}
              stroke={color} strokeWidth="1"
            />
          </g>
        )
      })}

      {/* ── X-axis labels ─────────────────────────────────────────── */}
      {labelIdxs.map(i => {
        if (i >= data.length) return null
        const x = toX(i) + slotW / 2
        return (
          <text
            key={i}
            x={x} y={H - 6}
            textAnchor="middle"
            fontSize="9"
            fill="var(--text-muted)"
            fontFamily="monospace"
          >
            {timeLabel(data[i].date)}
          </text>
        )
      })}
    </svg>
  )
}
