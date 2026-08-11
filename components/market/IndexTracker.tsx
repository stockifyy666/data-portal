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
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIndices()
    const interval = setInterval(fetchIndices, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-3 h-full">
        {[1, 2, 3].map(n => (
          <div key={n} className="card flex-1">
            <div className="h-3 w-16 rounded animate-pulse mb-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="h-6 w-28 rounded animate-pulse mb-2" style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="h-3 w-20 rounded animate-pulse"     style={{ backgroundColor: 'var(--bg-hover)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {indices.map(index => {
        const isUp = index.change >= 0
        return (
          <div key={index.key} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {index.label}
              </span>
              {isUp
                ? <TrendingUp  size={14} className="text-green-600" />
                : <TrendingDown size={14} className="text-red-500"  />
              }
            </div>

            <p className="text-xl font-bold font-number" style={{ color: 'var(--text-primary)' }}>
              {index.current > 0 ? formatPrice(index.current, 2) : '—'}
            </p>

            <p className={`text-sm font-number font-semibold mt-1
                           ${isUp ? 'text-green-600' : 'text-red-500'}`}>
              {index.change !== 0 ? formatChange(index.change) : '—'}
              {index.changePct !== 0 && (
                <span className="text-xs font-normal ml-1">
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
