'use client'

import { useState } from 'react'
import Link         from 'next/link'
import { Star, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'

const DUMMY_WATCHLIST = [
  { symbol: 'ENGRO',  name: 'Engro Corporation Limited',       price: 285.40, change:  4.20, changePct:  1.49, volume: 1_240_000 },
  { symbol: 'LUCK',   name: 'Lucky Cement Limited',            price: 932.00, change: -8.50, changePct: -0.90, volume:   318_000 },
  { symbol: 'HBL',    name: 'Habib Bank Limited',              price: 177.30, change:  1.80, changePct:  1.03, volume: 2_100_000 },
  { symbol: 'PSO',    name: 'Pakistan State Oil Co. Ltd',      price: 341.60, change: -3.40, changePct: -0.99, volume:   670_000 },
  { symbol: 'OGDC',   name: 'Oil & Gas Dev. Co. Limited',      price: 126.50, change:  0.90, changePct:  0.72, volume: 3_450_000 },
  { symbol: 'PPL',    name: 'Pakistan Petroleum Limited',      price: 112.80, change:  1.30, changePct:  1.17, volume: 1_890_000 },
  { symbol: 'MCB',    name: 'MCB Bank Limited',                price: 225.60, change: -2.10, changePct: -0.92, volume:   540_000 },
  { symbol: 'MARI',   name: 'Mari Petroleum Company Limited',  price: 2145.0, change: 22.50, changePct:  1.06, volume:    98_000 },
]

export default function WatchlistPage() {
  const [items, setItems] = useState(DUMMY_WATCHLIST)

  function remove(symbol: string) {
    setItems(prev => prev.filter(i => i.symbol !== symbol))
  }

  return (
    <div className="space-y-5 animate-data">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Watchlist</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Stocks you are tracking</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Star size={12} className="fill-amber-400 text-amber-400" />
          {items.length} symbols
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-16">
          <Star size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Your watchlist is empty</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Browse stocks and click "Add to Watchlist" to track them here.
          </p>
          <Link href="/stocks" className="text-xs" style={{ color: '#FEA500' }}>
            Browse PSX stocks →
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Symbol', 'Company', 'Price', 'Change', '% Chg', 'Volume', ''].map(col => (
                  <th key={col}
                      className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const clr = getChangeColor(item.change)
                const isUp = item.change >= 0
                return (
                  <tr key={item.symbol}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <td className="py-2.5 px-2">
                      <Link href={`/stocks/${item.symbol}`}
                            className="font-bold hover:underline"
                            style={{ color: '#FEA500' }}>
                        {item.symbol}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {item.name}
                    </td>
                    <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatPrice(item.price)}
                    </td>
                    <td className={`py-2.5 px-2 font-number ${clr}`}>{formatChange(item.change)}</td>
                    <td className={`py-2.5 px-2 font-number font-semibold ${clr}`}>
                      <span className="flex items-center gap-1">
                        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {formatPercent(item.changePct / 100)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                      {formatVolume(item.volume)}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <button onClick={() => remove(item.symbol)}
                              className="p-1 rounded transition-colors hover:text-red-500"
                              style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
