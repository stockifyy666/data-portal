'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatPrice, formatPercent, formatVolume } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'

type SortCol = 'changePct' | 'price' | 'volume'
type SortDir = 'asc' | 'desc'

type Mover = {
  symbol:    string
  name:      string
  price:     number
  change:    number
  changePct: number
  volume:    number
  indexKeys?: string[]
}

type Props = { type: 'gainers' | 'losers' }

export default function GainersLosers({ type }: Props) {
  const [movers,  setMovers]  = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState<SortCol>('changePct')
  const [sortDir, setSortDir] = useState<SortDir>(type === 'gainers' ? 'desc' : 'asc')

  async function fetchMovers() {
    try {
      const json = await cachedFetch<{ movers: Mover[] }>(`/api/market/movers?type=${type}`, 15 * 60 * 1000)
      if (json.movers) setMovers(json.movers.slice(0, 5))
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovers()
    const interval = setInterval(fetchMovers, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [type])

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'changePct' ? (type === 'gainers' ? 'desc' : 'asc') : 'desc')
    }
  }

  const sorted = useMemo(() => {
    return [...movers].sort((a, b) => {
      const diff = a[sortCol] - b[sortCol]
      return sortDir === 'asc' ? diff : -diff
    })
  }, [movers, sortCol, sortDir])

  const isGainers = type === 'gainers'
  const color     = isGainers ? 'text-green-600' : 'text-red-500'
  const bgBadge   = isGainers ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
  const Icon      = isGainers ? TrendingUp        : TrendingDown

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={15} className={color} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Top {isGainers ? 'Gainers' : 'Losers'}
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Today
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="flex justify-between items-center gap-3">
              <div className="h-3 flex-1 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              <div className="h-3 w-14 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              <div className="h-3 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
            </div>
          ))}
        </div>
      ) : movers.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
          No data available
        </p>
      ) : (
        <div className="space-y-1">
          <div className="flex text-[10px] uppercase tracking-wider pb-1"
               style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
            <span className="flex-1">Symbol</span>
            {(['price', 'changePct', 'volume'] as SortCol[]).map(col => {
              const labels: Record<SortCol, string> = { price: 'Price', changePct: '%', volume: 'Volume' }
              const active = sortCol === col
              const Icon = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
              const cls = col === 'volume' ? 'w-16 hidden sm:flex' : col === 'price' ? 'w-20' : 'w-16'
              return (
                <button key={col}
                  onClick={() => handleSort(col)}
                  className={`${cls} flex items-center justify-end gap-0.5 cursor-pointer hover:opacity-80 transition-opacity`}
                  style={{ color: active ? '#FEA500' : 'var(--text-muted)' }}>
                  {labels[col]}
                  <Icon size={9} />
                </button>
              )
            })}
          </div>

          {sorted.map(m => (
            <Link
              key={m.symbol}
              href={`/stocks/${m.symbol}`}
              className="flex items-center py-1.5 rounded -mx-1 px-1 transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'}
            >
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {m.symbol}
                  </span>
                  {isKMI(m.indexKeys) && <KMIBadge />}
                </div>
                <p className="text-[10px] truncate max-w-[80px]" style={{ color: 'var(--text-muted)' }}>
                  {m.name}
                </p>
              </div>

              <span className="w-20 text-right text-xs font-number" style={{ color: 'var(--text-primary)' }}>
                {formatPrice(m.price)}
              </span>

              <div className="w-16 text-right">
                <span className={`text-xs font-semibold font-number px-1.5 py-0.5 rounded ${bgBadge}`}>
                  {formatPercent(m.changePct / 100)}
                </span>
              </div>

              <span className="w-16 text-right text-[10px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                {formatVolume(m.volume)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
