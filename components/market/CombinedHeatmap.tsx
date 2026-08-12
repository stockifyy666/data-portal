'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { cachedFetch }                   from '@/lib/utils/clientCache'
import type { StockQuote }               from '@/types/market'

function heatColor(pct: number): string {
  if (pct >= 5)    return '#166534'
  if (pct >= 2.5)  return '#16a34a'
  if (pct >= 1)    return '#22c55e'
  if (pct >= 0)    return '#4ade80'
  if (pct >= -1)   return '#f87171'
  if (pct >= -2.5) return '#ef4444'
  if (pct >= -5)   return '#dc2626'
  return                  '#991b1b'
}

type StockWithWeight = StockQuote & { weight: number; size: 'lg' | 'md' | 'sm' | 'xs' }

export default function CombinedHeatmap() {
  const [quotes,  setQuotes]  = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [index,   setIndex]   = useState('KSE100')

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(json => { if (json.quotes) setQuotes(json.quotes) })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const stocks = useMemo<StockWithWeight[]>(() => {
    let list = quotes.filter(q => q.price > 0 && q.volume > 0)
    if (index) list = list.filter(q => q.indexKeys?.includes(index))
    list = list.sort((a, b) => b.volume - a.volume).slice(0, 100)

    const maxVol = list[0]?.volume || 1
    return list.map(q => {
      const w = q.volume / maxVol
      const size: StockWithWeight['size'] = w >= 0.3 ? 'lg' : w >= 0.1 ? 'md' : w >= 0.03 ? 'sm' : 'xs'
      return { ...q, weight: w, size }
    })
  }, [quotes, index])

  const INDICES = [
    { value: 'KSE100',    label: 'KSE-100'  },
    { value: 'KSE30',     label: 'KSE-30'   },
    { value: 'KMI30',     label: 'KMI-30'   },
    { value: 'ALLSHR',    label: 'All Share' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1 mt-4">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="h-14 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>{error}</p>

  return (
    <div className="space-y-3">
      {/* Index filter */}
      <div className="flex gap-2 flex-wrap">
        {INDICES.map(idx => (
          <button
            key={idx.value}
            onClick={() => setIndex(idx.value)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={index === idx.value
              ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
              : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            {idx.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        <span>Change %:</span>
        {[
          { label: '≥+5%', color: '#166534' }, { label: '+2.5%', color: '#16a34a' },
          { label: '+1%',  color: '#22c55e' }, { label: '0%',   color: '#4ade80' },
          { label: '-1%',  color: '#f87171' }, { label: '-2.5%', color: '#ef4444' },
          { label: '-5%',  color: '#dc2626' }, { label: '≤-5%', color: '#991b1b' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
        <span className="ml-2 opacity-60">· Box size = volume</span>
      </div>

      {/* Treemap-style grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
        {stocks.map(stock => {
          const bg = heatColor(stock.changePct)
          const span = stock.size === 'lg' ? 3 : stock.size === 'md' ? 2 : 1
          const h    = stock.size === 'lg' ? 80 : stock.size === 'md' ? 64 : stock.size === 'sm' ? 52 : 40
          const compact = stock.size === 'sm' || stock.size === 'xs'
          return (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol}`}
              title={`${stock.symbol} — ${stock.name}\nPrice: ${stock.price.toFixed(2)}\nChange: ${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%`}
              className="flex flex-col items-center justify-center rounded hover:opacity-80 transition-opacity overflow-hidden p-0.5"
              style={{
                backgroundColor: bg,
                gridColumn: `span ${span}`,
                height: h,
                color: 'white',
              }}
            >
              <span className={`font-bold leading-none ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                {stock.symbol}
              </span>
              {!compact && (
                <span className="text-[9px] mt-0.5 leading-none opacity-90">
                  {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Top 100 stocks by volume · Click any stock to open detail · Refreshes every 5 min
      </p>
    </div>
  )
}
