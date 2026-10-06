'use client'

// =============================================================================
// FILE: components/stock/StockShareholdersView.tsx
// PURPOSE: Shareholders tab content for the stock detail page.
//          Groups shareholding data by category (e.g. Directors, Institutions).
//          Shows progress bars with historical values per group member.
//          Data sourced from Capital Stake API via /api/stock/[symbol]/statement.
// =============================================================================

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

export function ShareholdersView({ data }: { data: StatementData }) {
  const periods = data.periods.slice(0, 6)

  type ShGroup = { heading: string; rows: Array<{ label: string; values: (number | null)[] }> }
  const groups: ShGroup[] = []
  let current: ShGroup = { heading: 'Shareholders', rows: [] }
  for (const f of data.fields) {
    if (f.is_heading) {
      if (current.rows.length) groups.push(current)
      current = { heading: f.label, rows: [] }
    } else if (f.label.trim()) {
      current.rows.push({ label: f.label, values: f.values })
    }
  }
  if (current.rows.length) groups.push(current)

  const fmt = (v: number | null) => v == null ? '—' : `${(v * 100).toFixed(2)}%`
  const pct = (v: number | null) => v == null ? 0 : Math.min(100, Math.max(0, v * 100))

  const COLORS = [
    '#FEA500','#16a34a','#2563eb','#9333ea','#dc2626',
    '#0891b2','#d97706','#15803d','#7c3aed','#b91c1c',
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Periods:
        </span>
        {periods.map(p => (
          <span key={p.period_end}
            className="px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {p.year}
          </span>
        ))}
      </div>

      {groups.map((group, gi) => {
        const latestTotal = group.rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)
        return (
          <div key={group.heading}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-white">
                  {group.heading}
                </h3>
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
              {latestTotal > 0 && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  Total: {(latestTotal * 100).toFixed(2)}%
                </span>
              )}
            </div>

            <div className="space-y-2">
              {group.rows.map((row, ri) => {
                const latest = row.values[0]
                const prev   = row.values[1] ?? null
                const bar    = pct(latest)
                const color  = COLORS[(gi * 5 + ri) % COLORS.length]
                const trend  = latest != null && prev != null
                  ? latest > prev ? 'up' : latest < prev ? 'down' : 'flat'
                  : null

                return (
                  <div key={row.label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {row.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {trend && (
                          <span className="text-[10px] font-semibold"
                            style={{ color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : 'var(--text-muted)' }}>
                            {trend === 'up' ? '▲' : '▼'}
                          </span>
                        )}
                        <span className="text-sm font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                          {fmt(latest)}
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${bar}%`, backgroundColor: color }} />
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {periods.slice(1).map((p, j) => {
                        const v = row.values[j + 1]
                        return (
                          <div key={p.period_end} className="flex flex-col items-center min-w-[36px]">
                            <span className="text-[9px] leading-none mb-0.5" style={{ color: 'var(--text-muted)' }}>
                              {p.year}
                            </span>
                            <span className="text-[10px] font-number font-semibold leading-none"
                              style={{ color: 'var(--text-secondary)' }}>
                              {fmt(v)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
