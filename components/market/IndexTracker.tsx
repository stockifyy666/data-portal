'use client'

import { useState, useEffect }      from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatPrice, formatChange, formatPercent } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'

type IndexItem = {
  key:       string
  label:     string
  current:   number
  change:    number
  changePct: number
  high:      number
  low:       number
  volume:    number
}

export default function IndexTracker() {
  const [indices, setIndices] = useState<IndexItem[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchIndices() {
    try {
      const json = await cachedFetch<{ indices: IndexItem[] }>('/api/market/indices')
      if (json.indices) setIndices(json.indices)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchIndices()
    const iv = setInterval(fetchIndices, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-2.5 w-14 rounded animate-pulse mb-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="h-5 w-24 rounded animate-pulse mb-2"   style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="h-2.5 w-16 rounded animate-pulse"      style={{ backgroundColor: 'var(--bg-hover)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {indices.map(index => {
        const isUp = index.change >= 0
        return (
          <div key={index.key} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}>
                {index.label}
              </span>
              {isUp
                ? <TrendingUp  size={13} className="text-green-600 shrink-0" />
                : <TrendingDown size={13} className="text-red-500  shrink-0" />
              }
            </div>

            <p className="text-lg font-bold font-number leading-tight"
               style={{ color: 'var(--text-primary)' }}>
              {index.current > 0 ? formatPrice(index.current, 0) : '—'}
            </p>

            <p className={`text-xs font-number font-semibold mt-1 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
              {index.change !== 0 ? formatChange(index.change) : '—'}
              {index.changePct !== 0 && (
                <span className="font-normal ml-1 opacity-80">
                  ({formatPercent(index.changePct / 100)})
                </span>
              )}
            </p>
          </div>
        )
      })}
    </div>
  )
}
