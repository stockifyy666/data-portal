'use client'

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { cachedFetch }         from '@/lib/utils/clientCache'

type Stock = {
  symbol:    string
  name:      string
  price:     number
  changePct: number
  volume:    number
}

type Sector = {
  name:        string
  code:        string
  stocks:      Stock[]
  totalVolume: number
  avgChangePct: number
}

function heatColor(pct: number): string {
  if (pct >= 5)    return 'bg-green-700  text-white'
  if (pct >= 2.5)  return 'bg-green-600  text-white'
  if (pct >= 1)    return 'bg-green-500  text-white'
  if (pct >= 0)    return 'bg-green-400  text-white'
  if (pct >= -1)   return 'bg-red-400    text-white'
  if (pct >= -2.5) return 'bg-red-500    text-white'
  if (pct >= -5)   return 'bg-red-600    text-white'
  return                  'bg-red-700    text-white'
}

function StockBox({ stock, compact }: { stock: Stock; compact?: boolean }) {
  const color = heatColor(stock.changePct)
  return (
    <Link
      href={`/stocks/${stock.symbol}`}
      title={`${stock.symbol} — ${stock.name}\nPrice: ${stock.price.toFixed(2)}\nChange: ${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%`}
      className={`${color} rounded flex flex-col items-center justify-center
                  hover:opacity-80 transition-opacity overflow-hidden cursor-pointer
                  ${compact ? 'p-0.5' : 'p-1'}`}
    >
      <span className={`font-bold leading-none ${compact ? 'text-[9px]' : 'text-xs'}`}>
        {stock.symbol}
      </span>
      {!compact && (
        <span className="text-[10px] font-semibold mt-0.5 leading-none opacity-90">
          {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
        </span>
      )}
    </Link>
  )
}

export default function SectorHeatmap() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    cachedFetch<{ sectors: Sector[] }>('/api/market/heatmap')
      .then(json => {
        if (json.sectors) setSectors(json.sectors)
        else setError('No data')
      })
      .catch(() => setError('Failed to load heatmap'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-slate-400 text-sm text-center py-10">{error}</p>
  }

  return (
    <div className="space-y-1">
      {/* Color legend */}
      <div className="flex items-center gap-2 text-[10px] mb-3 flex-wrap"
           style={{ color: 'var(--text-secondary)' }}>
        <span>Change %:</span>
        {[
          { label: '≥+5%',  cls: 'bg-green-700' },
          { label: '+2.5%', cls: 'bg-green-600' },
          { label: '+1%',   cls: 'bg-green-500' },
          { label: '0%',    cls: 'bg-green-400' },
          { label: '-1%',   cls: 'bg-red-400'   },
          { label: '-2.5%', cls: 'bg-red-500'   },
          { label: '-5%',   cls: 'bg-red-600'   },
          { label: '≤-5%',  cls: 'bg-red-700'   },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${l.cls}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Sector grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {(() => {
          const totalVol = sectors.reduce((s, sec) => s + sec.totalVolume, 0) || 1
          return sectors.map(sector => {
          // Show top stocks; how many depends on sector size
          const topStocks = sector.stocks.slice(0, Math.min(sector.stocks.length, 12))
          const big   = topStocks.slice(0, 2)    // large boxes
          const small = topStocks.slice(2, 12)    // small boxes
          const volPct = ((sector.totalVolume / totalVol) * 100).toFixed(1)

          return (
            <div key={sector.code} className="card p-2 flex flex-col gap-1.5 min-h-[130px]">
              {/* Sector header */}
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wide leading-none truncate block"
                        style={{ color: 'var(--text-primary)' }}>
                    {sector.name}
                  </span>
                  <span className="text-[9px] leading-none" style={{ color: 'var(--text-muted)' }}>
                    {volPct}% vol
                  </span>
                </div>
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded leading-none shrink-0
                  ${sector.avgChangePct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {sector.avgChangePct >= 0 ? '+' : ''}{sector.avgChangePct.toFixed(2)}%
                </span>
              </div>

              {/* Stock boxes */}
              <div className="flex-1 flex flex-col gap-1">
                {/* Top 2 stocks — larger */}
                {big.length > 0 && (
                  <div className={`grid gap-1 ${big.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                       style={{ minHeight: '48px' }}>
                    {big.map(s => (
                      <StockBox key={s.symbol} stock={s} />
                    ))}
                  </div>
                )}

                {/* Remaining stocks — smaller */}
                {small.length > 0 && (
                  <div className="grid grid-cols-4 gap-0.5" style={{ minHeight: '32px' }}>
                    {small.map(s => (
                      <StockBox key={s.symbol} stock={s} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })})()}
      </div>

      <p className="text-[10px] pt-2" style={{ color: 'var(--text-muted)' }}>
        Box size reflects trading volume · Click any stock to open detail page · Refreshes every 5 min
      </p>
    </div>
  )
}
