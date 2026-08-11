'use client'

import { useState, useEffect } from 'react'
import { cachedFetch }         from '@/lib/utils/clientCache'

type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number }

/* ── Layout ─────────────────────────────────────────────────────── */
const W       = 1000
const H_C     = 270   // candle section height
const H_V     = 90    // volume section height
const H_X     = 30    // x-axis height
const H_GAP   = 6     // gap between candle and volume
const H_TOTAL = H_C + H_GAP + H_V + H_X
const PAD_L   = 8
const PAD_R   = 82
const PAD_T   = 8
const CW      = W - PAD_L - PAD_R

/* ── Helpers ────────────────────────────────────────────────────── */
function niceSteps(lo: number, hi: number, n = 7) {
  const raw  = (hi - lo) / n
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(f => f >= raw) ?? mag * 10
  const start = Math.floor(lo / step) * step
  const res: number[] = []
  for (let v = start; v <= hi + step * 0.1; v += step) res.push(+v.toFixed(2))
  return res
}

function fmtPrice(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(2)
}

function fmtVol(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function fmtDate(s: string, mode: 'daily' | 'intraday') {
  try {
    const d = new Date(s)
    if (mode === 'intraday') {
      return d.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false })
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function fmtMonth(s: string) {
  try {
    const d = new Date(s)
    return d.toLocaleDateString('en-US', { month: 'short' })
  } catch { return '' }
}

/* ── Chart SVG ──────────────────────────────────────────────────── */
function CandleChart({ data, mode }: { data: Candle[]; mode: 'daily' | 'intraday' }) {
  const n = data.length
  if (!n) return null

  /* Candle price range */
  const allH = data.map(c => c.high)
  const allL = data.map(c => c.low)
  const rawMin = Math.min(...allL)
  const rawMax = Math.max(...allH)
  const ySteps  = niceSteps(rawMin, rawMax, 7)
  const yMin    = ySteps[0]
  const yMax    = ySteps[ySteps.length - 1]
  const yRange  = yMax - yMin || 1

  /* Volume range */
  const vols    = data.map(c => c.volume)
  const vMax    = Math.max(...vols) || 1
  const vSteps  = niceSteps(0, vMax, 3)
  const vTopMax = vSteps[vSteps.length - 1] || vMax

  /* Coordinate helpers */
  const toY  = (v: number) => PAD_T + H_C - ((v - yMin) / yRange) * H_C
  const toVY = (v: number) => H_C + H_GAP + H_V - (v / vTopMax) * H_V
  const toX  = (i: number) => PAD_L + (i + 0.5) * (CW / n)

  /* Candle width */
  const slotW  = CW / n
  const bodyW  = Math.max(slotW * 0.6, 1.5)

  /* Current price */
  const last    = data[n - 1]
  const isUp    = last.close >= data[0].open
  const priceY  = toY(last.close)
  const priceColor = isUp ? '#16a34a' : '#e53e3e'

  /* X-axis labels — show month boundaries for daily, time intervals for intraday */
  const xLabels: { i: number; label: string }[] = []
  if (mode === 'daily') {
    // Show a label when month changes
    let lastMonth = ''
    data.forEach((c, i) => {
      const m = fmtMonth(c.date)
      if (m !== lastMonth) { xLabels.push({ i, label: m }); lastMonth = m }
    })
  } else {
    // ~6 evenly spaced time labels
    const count = Math.min(6, n)
    for (let k = 0; k < count; k++) {
      const i = Math.round((k / (count - 1)) * (n - 1))
      xLabels.push({ i, label: fmtDate(data[i].date, 'intraday') })
    }
  }

  /* OHLC header info */
  const ohlcColor = last.close >= last.open ? '#16a34a' : '#e53e3e'

  return (
    <div className="w-full">
      {/* OHLC header */}
      <div className="flex items-center gap-3 mb-1 px-1 flex-wrap text-[11px] font-mono">
        <span style={{ color: 'var(--text-muted)' }}>KSE 100 · {mode === 'intraday' ? '1D' : '1D'} · PSX</span>
        <span style={{ color: ohlcColor }}>
          O {fmtPrice(last.open)} &nbsp;
          H {fmtPrice(last.high)} &nbsp;
          L {fmtPrice(last.low)} &nbsp;
          C {fmtPrice(last.close)}
        </span>
        <span style={{ color: ohlcColor }}>
          {last.close >= data[0].close ? '+' : ''}{(last.close - data[0].close).toFixed(2)}
          {' '}({last.close >= data[0].close ? '+' : ''}{(((last.close - data[0].close) / data[0].close) * 100).toFixed(2)}%)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: H_TOTAL, display: 'block' }}
      >
        {/* ── Y-axis grid lines + right labels (candles) ─────────── */}
        {ySteps.map((val, i) => {
          if (val < yMin - 0.001 || val > yMax + 0.001) return null
          const y = toY(val)
          if (y < PAD_T - 2 || y > PAD_T + H_C + 2) return null
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                    stroke="var(--bg-border)" strokeWidth="0.5" strokeDasharray="3,5" />
              <text x={W - PAD_R + 6} y={y + 4}
                    fontSize="10" fill="var(--text-muted)" fontFamily="monospace">
                {fmtPrice(val)}
              </text>
            </g>
          )
        })}

        {/* ── Current price dashed line + box ────────────────────── */}
        <line x1={PAD_L} y1={priceY} x2={W - PAD_R} y2={priceY}
              stroke={priceColor} strokeWidth="0.8" strokeDasharray="4,4" opacity="0.7" />
        <rect x={W - PAD_R + 2} y={priceY - 9} width={PAD_R - 4} height={17}
              fill={priceColor} rx="2" />
        <text x={W - PAD_R + (PAD_R / 2)} y={priceY + 4}
              textAnchor="middle" fontSize="10" fill="white" fontFamily="monospace" fontWeight="bold">
          {fmtPrice(last.close)}
        </text>

        {/* ── Candlesticks ────────────────────────────────────────── */}
        {data.map((c, i) => {
          const x      = toX(i)
          const isGrn  = c.close >= c.open
          const color  = isGrn ? '#26a69a' : '#ef5350'
          const bTop   = toY(Math.max(c.open, c.close))
          const bBot   = toY(Math.min(c.open, c.close))
          const bH     = Math.max(bBot - bTop, 1)
          const midX   = x

          return (
            <g key={i}>
              {/* Wick */}
              <line x1={midX} y1={toY(c.high)} x2={midX} y2={bTop}
                    stroke={color} strokeWidth="1" />
              {/* Body */}
              <rect x={midX - bodyW / 2} y={bTop} width={bodyW} height={bH}
                    fill={color} rx="0.5" />
              {/* Lower wick */}
              <line x1={midX} y1={bBot} x2={midX} y2={toY(c.low)}
                    stroke={color} strokeWidth="1" />
            </g>
          )
        })}

        {/* ── Volume section separator ─────────────────────────────── */}
        <line x1={PAD_L} y1={H_C + H_GAP} x2={W - PAD_R} y2={H_C + H_GAP}
              stroke="var(--bg-border)" strokeWidth="0.8" />

        {/* ── Volume label ─────────────────────────────────────────── */}
        <text x={PAD_L + 2} y={H_C + H_GAP + 14}
              fontSize="10" fill="var(--text-muted)" fontFamily="sans-serif" fontWeight="600">
          Volume
        </text>
        <text x={PAD_L + 50} y={H_C + H_GAP + 14}
              fontSize="10" fill={priceColor} fontFamily="monospace" fontWeight="600">
          {fmtVol(last.volume)}
        </text>

        {/* ── Volume Y-axis labels ─────────────────────────────────── */}
        {vSteps.filter(v => v > 0).map((val, i) => {
          const vy = toVY(val)
          if (vy > H_C + H_GAP + H_V + 2 || vy < H_C + H_GAP - 2) return null
          return (
            <g key={i}>
              <line x1={PAD_L} y1={vy} x2={W - PAD_R} y2={vy}
                    stroke="var(--bg-border)" strokeWidth="0.4" strokeDasharray="3,5" />
              <text x={W - PAD_R + 6} y={vy + 4}
                    fontSize="9.5" fill="var(--text-muted)" fontFamily="monospace">
                {fmtVol(val)}
              </text>
            </g>
          )
        })}

        {/* ── Volume current value box ──────────────────────────────── */}
        {(() => {
          const vy = toVY(last.volume)
          if (vy < H_C + H_GAP || vy > H_C + H_GAP + H_V) return null
          return (
            <g>
              <line x1={PAD_L} y1={vy} x2={W - PAD_R} y2={vy}
                    stroke={priceColor} strokeWidth="0.6" strokeDasharray="3,4" opacity="0.5" />
              <rect x={W - PAD_R + 2} y={vy - 8} width={PAD_R - 4} height={15}
                    fill={priceColor} rx="2" />
              <text x={W - PAD_R + (PAD_R / 2)} y={vy + 4}
                    textAnchor="middle" fontSize="9" fill="white" fontFamily="monospace" fontWeight="bold">
                {fmtVol(last.volume)}
              </text>
            </g>
          )
        })()}

        {/* ── Volume bars ──────────────────────────────────────────── */}
        {data.map((c, i) => {
          const x     = toX(i)
          const isGrn = c.close >= c.open
          const color = isGrn ? '#26a69a55' : '#ef535055'
          const barH  = (c.volume / vTopMax) * H_V
          const barY  = H_C + H_GAP + H_V - barH
          return (
            <rect key={i}
                  x={x - bodyW / 2} y={barY}
                  width={bodyW} height={Math.max(barH, 1)}
                  fill={color} rx="0.5" />
          )
        })}

        {/* ── X-axis labels ────────────────────────────────────────── */}
        <line x1={PAD_L} y1={H_C + H_GAP + H_V} x2={W - PAD_R} y2={H_C + H_GAP + H_V}
              stroke="var(--bg-border)" strokeWidth="0.8" />

        {xLabels.map(({ i, label }) => {
          const x = toX(i)
          if (x < PAD_L + 20 || x > W - PAD_R - 20) return null
          return (
            <g key={i}>
              <line x1={x} y1={H_C + H_GAP + H_V} x2={x} y2={H_C + H_GAP + H_V + 4}
                    stroke="var(--bg-border)" strokeWidth="0.8" />
              <text x={x} y={H_C + H_GAP + H_V + 18}
                    textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="monospace">
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function KSEChart() {
  const [daily,    setDaily]    = useState<Candle[]>([])
  const [intraday, setIntraday] = useState<Candle[]>([])
  const [mode,     setMode]     = useState<'daily' | 'intraday'>('daily')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      cachedFetch<{ data: Candle[] }>('/api/stock/KSE100/daily', 10 * 60_000)
        .then(j => { if (j.data) setDaily(j.data.slice(-180)) }),
      cachedFetch<{ data: Candle[] }>('/api/stock/KSE100/intraday?period=1D', 5 * 60_000)
        .then(j => { if (j.data) setIntraday([...j.data].reverse()) }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const data = mode === 'daily' ? daily : intraday

  return (
    <div className="w-full">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-3">
        {(['daily', 'intraday'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
            style={mode === m
              ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
              : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }
            }
          >
            {m === 'daily' ? 'Daily' : 'Intraday'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse rounded" style={{ height: H_TOTAL, backgroundColor: 'var(--bg-hover)' }} />
      ) : !data.length ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>No chart data</p>
      ) : (
        <CandleChart data={data} mode={mode} />
      )}
    </div>
  )
}
