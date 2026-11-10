'use client'

// =============================================================================
// FILE: components/stock/StockStatementTable.tsx
// PURPOSE: Renders financial statement data (income, balance sheet, cash flow).
//          Values from Capital Stake API are in thousands (000s) — EPS is raw PKR.
//          Negative values shown in (parentheses) following Capital Stake convention.
// =============================================================================

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

function fmtStmt(label: string, val: number | null): string {
  if (val == null) return '—'
  const isEps = /\beps\b/i.test(label)
  if (isEps) return val.toFixed(2)
  const abs = Math.abs(Math.round(val))
  const str = abs.toLocaleString('en-US')
  return val < 0 ? `(${str})` : str
}

export function StatementTable({ data, maxCols = 6 }: { data: StatementData; maxCols?: number }) {
  const periods = data.periods.slice(0, maxCols)
  return (
    <div className="space-y-2">
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        All numbers in thousands (000s) except EPS · Source: Capital Stake
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--bg-border)' }}>
              <th className="text-left py-2 px-2 min-w-[200px] font-semibold"
                  style={{ color: 'var(--text-muted)' }}>
                Item
              </th>
              {periods.map(p => (
                <th key={p.period_end} className="text-right py-2 px-3 whitespace-nowrap font-semibold"
                    style={{ color: 'var(--text-muted)' }}>
                  {p.quarter ? `${p.year} ${p.quarter}` : p.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.fields.map((f, i) => {
              if (f.is_heading) {
                return (
                  <tr key={i}>
                    <td colSpan={periods.length + 1}
                        className="py-2 px-2 text-[11px] font-bold uppercase tracking-wide pt-5"
                        style={{ color: 'var(--text-secondary)' }}>
                      {f.label}
                    </td>
                  </tr>
                )
              }
              const isBold = /^(sales|gross profit|profit (from|before|after)|total)/i.test(f.label.trim())
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}>
                  <td className={`py-2 px-2 ${isBold ? 'font-semibold' : ''}`}
                      style={{ color: isBold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {f.label}
                  </td>
                  {periods.map((_, j) => {
                    const val = f.values[j]
                    const display = fmtStmt(f.label, val)
                    const isNeg = (val ?? 0) < 0
                    return (
                      <td key={j} className={`text-right py-2 px-3 font-number ${isBold ? 'font-semibold' : ''}`}
                          style={{ color: isNeg ? '#dc2626' : isBold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {display}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
