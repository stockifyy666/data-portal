'use client'

import { useState, useEffect } from 'react'
import type { MutualFund }     from '@/types/market'
import { formatPrice }         from '@/lib/utils/format'

export default function MutualFundsPage() {
  const [funds,   setFunds]   = useState<MutualFund[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetch('/api/market/mutual-funds')
      .then(r => r.json())
      .then(json => { if (json.data) setFunds(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? funds.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f as any).symbol?.toLowerCase().includes(search.toLowerCase())
      )
    : funds

  return (
    <div className="space-y-5 animate-data">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mutual Funds</h1>
          <p className="text-sm text-slate-500 mt-0.5">Open-end and closed-end funds listed on PSX</p>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search funds..."
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2
                     text-xs text-slate-900 placeholder-slate-400
                     focus:outline-none focus:border-blue-400 max-w-[200px] w-full"
        />
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(n => (
              <div key={n} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {['Fund Name', 'Symbol', 'Type', 'NAV', 'Change'].map(col => (
                  <th key={col}
                      className="text-left py-2 px-2 text-[10px] font-semibold
                                 text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    {search ? 'No matching funds' : 'No funds data available'}
                  </td>
                </tr>
              ) : (
                filtered.map((fund, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-2 text-slate-900 font-medium max-w-[250px]">
                      <span className="truncate block">{fund.name}</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500">{(fund as any).symbol ?? '—'}</td>
                    <td className="py-2.5 px-2 text-slate-500">{(fund as any).type ?? '—'}</td>
                    <td className="py-2.5 px-2 font-number font-semibold text-slate-900">
                      {fund.nav ? formatPrice(fund.nav) : '—'}
                    </td>
                    <td className={`py-2.5 px-2 font-number font-semibold ${
                      ((fund as any).change ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {(fund as any).change != null
                        ? `${(fund as any).change >= 0 ? '+' : ''}${(fund as any).change.toFixed(2)}%`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
