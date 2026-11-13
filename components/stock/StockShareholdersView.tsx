'use client'

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

type Row = { label: string; values: (number | null)[] }

type Section = {
  title:    string
  subtitle: string
  keys:     string[]   // lowercase substrings to match against label
}

const SECTIONS: Section[] = [
  {
    title:    'Government & State',
    subtitle: 'Federal & public sector entities',
    keys:     ['president', 'government', 'public sector', 'federal', 'state'],
  },
  {
    title:    'Corporate & Promoters',
    subtitle: 'Associated companies and strategic holders',
    keys:     ['associated', 'undertaking', 'related part', 'promoter', 'director', 'sponsor'],
  },
  {
    title:    'Institutional',
    subtitle: 'Banks, NBFIs, funds and insurance',
    keys:     ['bank', 'financial institution', 'modaraba', 'mutual fund', 'insurance', 'nbfi', 'leasing', 'investment compan'],
  },
  {
    title:    'Foreign',
    subtitle: 'Foreign individuals and companies',
    keys:     ['foreign'],
  },
  {
    title:    'Local Investors',
    subtitle: 'Local individual and retail shareholders',
    keys:     ['local'],
  },
  {
    title:    'Management',
    subtitle: 'Directors, executives and employees',
    keys:     ['executive', 'employee', 'staff', 'nit ', 'nit,'],
  },
  {
    title:    'Others',
    subtitle: 'Remaining shareholders',
    keys:     ['other'],
  },
]

const PALETTE = [
  '#FEA500','#f97316','#eab308','#84cc16','#22c55e',
  '#14b8a6','#3b82f6','#8b5cf6','#ec4899','#ef4444',
]

// Section accent colors
const SECTION_COLORS: Record<string, string> = {
  'Government & State':    '#3b82f6',
  'Corporate & Promoters': '#f97316',
  'Institutional':         '#22c55e',
  'Foreign':               '#8b5cf6',
  'Local Investors':       '#14b8a6',
  'Management':            '#eab308',
  'Others':                '#94a3b8',
}

function matchSection(label: string): string | null {
  const lower = label.toLowerCase()
  for (const s of SECTIONS) {
    if (s.keys.some(k => lower.includes(k))) return s.title
  }
  return null
}

function Sparkline({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v != null).slice(0, 6).reverse()
  if (nums.length < 2) return <span style={{ width: 48 }} />
  const min = Math.min(...nums), max = Math.max(...nums), range = max - min || 1
  const W = 48, H = 20
  const pts = nums.map((v, i) => `${(i / (nums.length - 1)) * W},${H - ((v - min) / range) * (H - 2) - 1}`)
  const up = nums[nums.length - 1] >= nums[0]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <polyline points={pts.join(' ')} fill="none"
        stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function CompositionBar({ rows, colors }: { rows: Row[]; colors: string[] }) {
  const total = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)
  if (total === 0) return null
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full" style={{ backgroundColor: 'var(--bg-border)' }}>
      {rows.map((r, i) => {
        const pct = ((r.values[0] ?? 0) / total) * 100
        if (pct < 0.1) return null
        return <div key={i} style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length], transition: 'width 0.5s' }} />
      })}
    </div>
  )
}

function SectionTable({
  section, rows, colorOffset, histPeriods, periods,
}: {
  section:     Section
  rows:        Row[]
  colorOffset: number
  histPeriods: StatementData['periods']
  periods:     StatementData['periods']
}) {
  if (!rows.length) return null

  const accent   = SECTION_COLORS[section.title] ?? '#FEA500'
  const sectionTotal = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)

  const fmt = (v: number | null | undefined) =>
    v == null ? '—' : `${(v * 100).toFixed(2)}%`

  const gridCols = `1fr 56px 80px${histPeriods.map(() => ' 72px').join('')}`

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accent }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{section.title}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{section.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total stake</span>
          <span className="text-sm font-bold tabular-nums font-number px-2.5 py-0.5 rounded-lg"
            style={{ backgroundColor: `${accent}18`, color: accent }}>
            {fmt(sectionTotal)}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2"
        style={{
          gridTemplateColumns: gridCols,
          borderBottom: '1px solid var(--bg-border)',
          color: 'var(--text-muted)',
        }}>
        <span>Shareholder</span>
        <span className="text-right">Trend</span>
        <span className="text-right">{periods[0]?.year ?? 'Latest'}</span>
        {histPeriods.map(p => (
          <span key={p.period_end} className="text-right">{p.year}</span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const latest = row.values[0]
        const prev   = row.values[1] ?? null
        const trend  = latest != null && prev != null
          ? latest > prev ? 'up' : latest < prev ? 'down' : 'flat'
          : null
        const color  = PALETTE[(colorOffset + i) % PALETTE.length]
        const isLast = i === rows.length - 1

        return (
          <div key={i}
            className="grid items-center px-4 py-3 transition-colors hover:brightness-105"
            style={{
              gridTemplateColumns: gridCols,
              borderBottom: isLast ? 'none' : '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
            }}>

            {/* Label + bar */}
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                  {row.label}
                </p>
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (latest ?? 0) * 100)}%`, backgroundColor: color, opacity: 0.7 }} />
                </div>
              </div>
            </div>

            {/* Sparkline */}
            <div className="flex justify-end">
              <Sparkline values={row.values} />
            </div>

            {/* Latest value */}
            <div className="flex items-center justify-end gap-1">
              {trend && trend !== 'flat' && (
                <span className="text-[9px] font-bold"
                  style={{ color: trend === 'up' ? '#22c55e' : '#ef4444' }}>
                  {trend === 'up' ? '▲' : '▼'}
                </span>
              )}
              <span className="text-sm font-bold font-number tabular-nums"
                style={{ color: 'var(--text-primary)' }}>
                {fmt(latest)}
              </span>
            </div>

            {/* Historical columns */}
            {histPeriods.map((p, j) => (
              <div key={p.period_end} className="text-right">
                <span className="text-xs font-number tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {fmt(row.values[j + 1])}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function ShareholdersView({ data }: { data: StatementData }) {
  const periods     = data.periods.slice(0, 5)
  const histPeriods = periods.slice(1)

  const rows: Row[] = data.fields
    .filter(f => !f.is_heading && f.label.trim() && f.values.length > 0)
    .map(f => ({ label: f.label, values: f.values }))

  if (!rows.length) {
    return <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No shareholder data available.</p>
  }

  const fmt = (v: number | null | undefined) =>
    v == null ? '—' : `${(v * 100).toFixed(2)}%`

  const latestTotal = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)

  // Group rows into sections; unclaimed rows go to "Others"
  const grouped = new Map<string, Row[]>()
  SECTIONS.forEach(s => grouped.set(s.title, []))
  const unmatched: Row[] = []

  for (const row of rows) {
    const sectionTitle = matchSection(row.label)
    if (sectionTitle && grouped.has(sectionTitle)) {
      grouped.get(sectionTitle)!.push(row)
    } else {
      unmatched.push(row)
    }
  }
  // Append unmatched to Others
  grouped.get('Others')!.push(...unmatched)

  // Count total color offset per section to keep unique colors across sections
  let colorOffset = 0

  return (
    <div className="space-y-5">

      {/* Header: periods + total */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
        {latestTotal > 0 && (
          <span className="text-[11px] font-bold px-3 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            Total: {fmt(latestTotal)}
          </span>
        )}
      </div>

      {/* Composition bar */}
      <CompositionBar rows={rows} colors={PALETTE} />

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.label}</span>
          </div>
        ))}
      </div>

      {/* Sectioned tables */}
      {SECTIONS.map(section => {
        const sectionRows = grouped.get(section.title) ?? []
        if (!sectionRows.length) return null
        const offset = colorOffset
        colorOffset += sectionRows.length
        return (
          <SectionTable
            key={section.title}
            section={section}
            rows={sectionRows}
            colorOffset={offset}
            histPeriods={histPeriods}
            periods={periods}
          />
        )
      })}
    </div>
  )
}
