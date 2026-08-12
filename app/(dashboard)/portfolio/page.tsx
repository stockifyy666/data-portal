'use client'

import { useState } from 'react'
import Link         from 'next/link'
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react'
import { formatPrice, getChangeColor } from '@/lib/utils/format'

const DUMMY_HOLDINGS = [
  { symbol: 'ENGRO', name: 'Engro Corporation',      qty: 500,  avgPrice: 265.00, ltp: 285.40, prevClose: 283.10 },
  { symbol: 'LUCK',  name: 'Lucky Cement',           qty: 100,  avgPrice: 880.00, ltp: 932.00, prevClose: 928.50 },
  { symbol: 'HBL',   name: 'Habib Bank',             qty: 1000, avgPrice: 160.00, ltp: 177.30, prevClose: 176.20 },
  { symbol: 'OGDC',  name: 'Oil & Gas Dev. Co.',     qty: 2000, avgPrice: 118.00, ltp: 126.50, prevClose: 127.40 },
  { symbol: 'MCB',   name: 'MCB Bank',               qty: 300,  avgPrice: 235.00, ltp: 225.60, prevClose: 224.80 },
  { symbol: 'MARI',  name: 'Mari Petroleum',         qty: 50,   avgPrice: 1980.0, ltp: 2145.0, prevClose: 2138.0 },
]

function fmtPKR(n: number) {
  if (Math.abs(n) >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000)     return `Rs ${(n / 1_000).toFixed(1)}K`
  return `Rs ${n.toFixed(2)}`
}

export default function PortfolioPage() {
  const [holdings] = useState(DUMMY_HOLDINGS)

  const totals = holdings.reduce((acc, h) => {
    const cost      = h.qty * h.avgPrice
    const mktVal    = h.qty * h.ltp
    const todayPnl  = h.qty * (h.ltp - h.prevClose)
    return { cost: acc.cost + cost, value: acc.value + mktVal, todayPnl: acc.todayPnl + todayPnl }
  }, { cost: 0, value: 0, todayPnl: 0 })

  const totalPnl    = totals.value - totals.cost
  const totalPnlPct = totals.cost > 0 ? (totalPnl / totals.cost) * 100 : 0
  const isUp        = totalPnl >= 0
  const todayIsUp   = totals.todayPnl >= 0

  return (
    <div className="space-y-5 animate-data">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Portfolio</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track your PSX holdings &amp; P&amp;L</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-muted)' }}>
          Demo
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Market Value', value: fmtPKR(totals.value),  sub: null,                color: 'var(--text-primary)' },
          { label: 'Cost Basis',   value: fmtPKR(totals.cost),   sub: null,                color: 'var(--text-primary)' },
          { label: 'Total P&L',    value: (isUp ? '+' : '') + fmtPKR(totalPnl),
            sub: `${isUp ? '+' : ''}${totalPnlPct.toFixed(2)}%`,
            color: isUp ? '#16a34a' : '#dc2626' },
          { label: "Today P&L",    value: (todayIsUp ? '+' : '') + fmtPKR(totals.todayPnl),
            sub: null, color: todayIsUp ? '#16a34a' : '#dc2626' },
        ].map(c => (
          <div key={c.label} className="card">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {c.label}
            </p>
            <p className="text-lg font-bold font-number" style={{ color: c.color }}>{c.value}</p>
            {c.sub && <p className="text-xs font-number mt-0.5" style={{ color: c.color }}>{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
              {['Symbol', 'Company', 'Qty', 'PP', 'LTP', 'Mkt Value', 'P&L', 'Today P&L', 'Return'].map(col => (
                <th key={col}
                    className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map(h => {
              const cost      = h.qty * h.avgPrice
              const mktVal    = h.qty * h.ltp
              const pnl       = mktVal - cost
              const pnlPct    = (pnl / cost) * 100
              const todayPnl  = h.qty * (h.ltp - h.prevClose)
              const clr       = getChangeColor(pnl)
              const up        = pnl >= 0
              const todayUp   = todayPnl >= 0
              return (
                <tr key={h.symbol}
                    style={{ borderBottom: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                  <td className="py-2.5 px-2">
                    <Link href={`/stocks/${h.symbol}`}
                          className="font-bold hover:underline"
                          style={{ color: '#FEA500' }}>
                      {h.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 max-w-[160px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {h.name}
                  </td>
                  <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                    {h.qty.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
                    {formatPrice(h.avgPrice)}
                  </td>

                  <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatPrice(h.ltp)}
                  </td>
                  <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-primary)' }}>
                    {fmtPKR(mktVal)}
                  </td>
                  <td className={`py-2.5 px-2 font-number font-semibold ${clr}`}>
                    {up ? '+' : ''}{fmtPKR(pnl)}
                  </td>
                  <td className={`py-2.5 px-2 font-number font-semibold ${todayUp ? 'text-green-600' : 'text-red-500'}`}>
                    {todayUp ? '+' : ''}{fmtPKR(todayPnl)}
                  </td>
                  <td className={`py-2.5 px-2 font-number ${clr}`}>
                    <span className="flex items-center gap-1">
                      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {up ? '+' : ''}{pnlPct.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
