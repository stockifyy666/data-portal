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
  const [indices,  setIndices]  = useState<IndexItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(0)

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
      {indices.map((index, i) => {
        const isUp  = index.change >= 0
        const isSel = i === selected
        const upClr = '#16a34a'
        const dnClr = '#dc2626'
        const tint  = isUp ? upClr : dnClr

        return (
          <div
            key={index.key}
            onClick={() => setSelected(i)}
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 14, padding: '14px 16px',
              cursor: 'pointer',
              backgroundColor: 'var(--bg-card)',
              border: isSel
                ? `1.5px solid #FEA500`
                : `1px solid var(--bg-border)`,
              boxShadow: isSel
                ? '0 0 0 3px rgba(254,165,0,0.18), 0 4px 20px rgba(254,165,0,0.25), 0 2px 8px rgba(0,0,0,0.15)'
                : `0 0 12px ${tint}22, 0 1px 4px rgba(0,0,0,0.06)`,
              transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.transform = 'translateY(-4px)'
              if (!isSel) el.style.boxShadow = `0 8px 28px rgba(0,0,0,0.18), 0 0 20px ${tint}44`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.transform = 'translateY(0)'
              el.style.boxShadow = isSel
                ? '0 0 0 3px rgba(254,165,0,0.18), 0 4px 20px rgba(254,165,0,0.25), 0 2px 8px rgba(0,0,0,0.15)'
                : `0 0 12px ${tint}22, 0 1px 4px rgba(0,0,0,0.06)`
            }}
          >
            {/* colored top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 3, borderRadius: '14px 14px 0 0',
              background: isSel
                ? 'linear-gradient(90deg, #FEA500, #f59e0b)'
                : `linear-gradient(90deg, ${tint}, ${tint}80)`,
              pointerEvents: 'none',
            }} />

            {/* bg tint */}
            <div style={{
              position: 'absolute', inset: 0,
              background: isSel
                ? 'radial-gradient(ellipse at top right, rgba(254,165,0,0.06) 0%, transparent 65%)'
                : `radial-gradient(ellipse at top right, ${tint}10 0%, transparent 65%)`,
              pointerEvents: 'none',
            }} />

            {/* header row */}
            <div className="flex items-center justify-between mb-2" style={{ position:'relative' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#ffffff', opacity: 1 }}>
                {index.label}
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, fontWeight:600, color:'#16a34a' }}>
                <span style={{ width:5, height:5, borderRadius:'50%', backgroundColor:'#16a34a', display:'inline-block', boxShadow:'0 0 4px #16a34a' }}/>
                LIVE
              </span>
            </div>

            {/* value */}
            <p style={{ position:'relative', fontSize: 21, fontWeight: 800, color: '#ffffff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 7, textShadow: '0 1px 8px rgba(255,255,255,0.15)' }}>
              {index.current > 0 ? formatPrice(index.current, 2) : '—'}
            </p>

            {/* change row */}
            <div className="flex items-center gap-1" style={{ position:'relative' }}>
              <span style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width: 16, height: 16, borderRadius: 4,
                backgroundColor: `${tint}20`,
                flexShrink: 0,
              }}>
                {isUp
                  ? <TrendingUp  size={10} style={{ color: upClr }} />
                  : <TrendingDown size={10} style={{ color: dnClr }} />
                }
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: tint, fontVariantNumeric: 'tabular-nums' }}>
                {index.change !== 0 ? formatChange(index.change) : '—'}
                {index.changePct !== 0 && (
                  <span style={{ fontWeight: 700, opacity: 1 }}>
                    {' '}({formatPercent(index.changePct / 100)})
                  </span>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
