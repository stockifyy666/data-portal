'use client'

// =============================================================================
// FILE: components/layout/StockTicker.tsx
// PURPOSE: Horizontal scrolling price ticker shown at the top of every page.
//          Displays top 50 stocks with live price and % change.
//          Uses clientCache (cachedFetch) so it doesn't fire a separate
//          /api/market/quotes request — shares the cached result with the
//          dashboard components instead of adding an extra network call.
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cachedFetch } from '@/lib/utils/clientCache'

type TickerItem = {
  symbol:    string
  price:     number
  change:    number
  changePct: number
}

function fmt(n: number, dp = 2) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

function TickerCell({ item }: { item: TickerItem }) {
  const up = item.change >= 0
  return (
    <span className="inline-flex items-center gap-2.5 px-5 shrink-0 select-none"
      style={{ borderRight: '1px solid var(--bg-border)' }}>
      <span className="text-[11px] font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>
        {item.symbol}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {fmt(item.price)}
      </span>
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold"
        style={{ color: up ? '#16a34a' : '#dc2626' }}>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {up ? '+' : ''}{fmt(item.change)} ({up ? '+' : ''}{fmt(item.changePct)}%)
      </span>
    </span>
  )
}

export default function StockTicker() {
  const [items,   setItems]   = useState<TickerItem[]>([])
  const [paused,  setPaused]  = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  /* fetch KMI tickers */
  useEffect(() => {
    async function load(bypass = false) {
      try {
        const json = bypass
          ? await fetch('/api/market/tickers').then(r => r.json())
          : await cachedFetch<{ tickers: TickerItem[] }>('/api/market/tickers', 5 * 60_000)
        const list = json?.tickers ?? []
        if (list.length) setItems(list)
      } catch { /* silently ignore */ }
    }
    load()
    const id = setInterval(() => load(true), 5 * 60_000)
    return () => clearInterval(id)
  }, [])

  /* CSS animation — pause on hover */
  const animStyle: React.CSSProperties = {
    display:        'flex',
    width:          'max-content',
    animationName:  'ticker-scroll',
    animationDuration: `${Math.max(items.length * 4, 60)}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: paused ? 'paused' : 'running',
  }

  if (!items.length) return null

  /* duplicate list so scroll loops seamlessly */
  const doubled = [...items, ...items]

  return (
    <div
      className="w-full overflow-hidden flex items-center shrink-0"
      style={{
        height:          '100%',
        backgroundColor: 'var(--bg-card)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Live badge */}
      <div className="flex items-center gap-1.5 px-3 shrink-0 h-full"
        style={{ borderRight: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-sidebar)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: '#16a34a' }}>
          Live
        </span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div ref={trackRef} style={animStyle}>
          {doubled.map((item, i) => (
            <TickerCell key={`${item.symbol}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
