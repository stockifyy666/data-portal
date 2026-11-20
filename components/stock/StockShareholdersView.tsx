'use client'

import { useMemo, useState } from 'react'
import { Building2, Landmark, Users, Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react'

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

type Row = { label: string; values: (number | null)[]; color: string }

type Section = { title: string; subtitle: string; keys: string[]; accent: string }

const SECTIONS: Section[] = [
  { title: 'Government & State',    subtitle: 'Federal & public sector entities',          accent: '#3b82f6', keys: ['president', 'government', 'public sector', 'federal', 'state'] },
  { title: 'Corporate & Promoters', subtitle: 'Associated companies and strategic holders', accent: '#f97316', keys: ['associated', 'undertaking', 'related part', 'promoter', 'director', 'sponsor'] },
  { title: 'Institutional',         subtitle: 'Banks, NBFIs, funds and insurance',          accent: '#10b981', keys: ['bank', 'financial institution', 'modaraba', 'mutual fund', 'insurance', 'nbfi', 'leasing', 'investment compan', 'investment corporation'] },
  { title: 'Foreign',               subtitle: 'Foreign individuals and companies',          accent: '#8b5cf6', keys: ['foreign'] },
  { title: 'Retail & Local',        subtitle: 'Individuals and local investors',            accent: '#06b6d4', keys: ['individual', 'local', 'general public'] },
  { title: 'Management',            subtitle: 'Directors, executives and employees',        accent: '#eab308', keys: ['executive', 'employee', 'staff', 'nit ', 'nit,'] },
  { title: 'Others',                subtitle: 'Remaining shareholders',                     accent: '#94a3b8', keys: ['other', 'joint stock'] },
]

// Distinct, theme-friendly colours assigned by holding size (largest first)
const PALETTE = ['#FEA500', '#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308', '#ef4444', '#64748b', '#84cc16', '#14b8a6']

const pct  = (v: number | null | undefined, d = 2) => (v == null ? '—' : `${(v * 100).toFixed(d)}%`)
const sectionOf = (label: string) => {
  const l = label.toLowerCase()
  return SECTIONS.find(s => s.keys.some(k => l.includes(k)))?.title ?? 'Others'
}

/* ── Change pill: percentage-point change vs previous period ── */
function ChangePill({ now, prev }: { now: number | null; prev: number | null }) {
  if (now == null || prev == null) return <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>—</span>
  const pp = (now - prev) * 100
  const flat = Math.abs(pp) < 0.005
  const up = pp > 0
  const color = flat ? 'var(--text-muted)' : up ? '#16a34a' : '#dc2626'
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold font-number tabular-nums px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, background: flat ? 'var(--bg-hover)' : up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)' }}>
      <Icon size={10} strokeWidth={2.5} />
      {flat ? '0.00' : `${up ? '+' : ''}${pp.toFixed(2)}`} pp
    </span>
  )
}

/* ── Sparkline ── */
function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const nums = values.filter((v): v is number => v != null).slice(0, 6).reverse()
  if (nums.length < 2) return <span style={{ width: 56 }} />
  const min = Math.min(...nums), max = Math.max(...nums), range = max - min || 1
  const W = 56, H = 22
  const pts = nums.map((v, i) => [(i / (nums.length - 1)) * W, H - ((v - min) / range) * (H - 4) - 2])
  const line = pts.map(p => p.join(',')).join(' ')
  const area = `0,${H} ${line} ${W},${H}`
  const id = `sg-${color.replace('#', '')}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="2.2" fill={color} />
    </svg>
  )
}

/* ── Donut ── */
function Donut({ rows, active, onHover }: { rows: Row[]; active: string | null; onHover: (l: string | null) => void }) {
  const S = 220, c = S / 2, R = 92, W = 26
  const total = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0) || 1
  const circ = 2 * Math.PI * R
  let acc = 0
  const focus = rows.find(r => r.label === active) ?? rows[0]
  return (
    <div className="relative mx-auto" style={{ width: S, maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full h-auto -rotate-90">
        <circle cx={c} cy={c} r={R} fill="none" stroke="var(--bg-border)" strokeWidth={W} />
        {rows.map(r => {
          const frac = (r.values[0] ?? 0) / total
          const len = Math.max(0, frac * circ - (rows.length > 1 ? 1.5 : 0))
          const el = (
            <circle key={r.label} cx={c} cy={c} r={R} fill="none" stroke={r.color}
              strokeWidth={active === r.label ? W + 6 : W}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc * circ}
              style={{ transition: 'stroke-width .2s, opacity .2s', cursor: 'pointer',
                       opacity: active && active !== r.label ? 0.35 : 1 }}
              onMouseEnter={() => onHover(r.label)} onMouseLeave={() => onHover(null)} />
          )
          acc += frac
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {active ? 'Holding' : 'Largest holder'}
        </span>
        <span className="text-2xl font-black font-number tabular-nums mt-0.5" style={{ color: focus.color }}>
          {pct(focus.values[0])}
        </span>
        <span className="text-[10px] font-semibold leading-tight mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {focus.label}
        </span>
      </div>
    </div>
  )
}

/* ── KPI card ── */
function Kpi({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Users; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div className="rounded-xl p-3.5 relative overflow-hidden min-w-0"
      style={{ background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`, border: `1px solid ${accent}40` }}>
      <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full" style={{ background: `${accent}22` }} />
      <div className="flex items-center gap-1.5 relative">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${accent}2e`, color: accent }}>
          <Icon size={13} strokeWidth={2.4} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <p className="text-xl font-black font-number tabular-nums mt-2 relative" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px] truncate relative" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}

/* ── Section table ── */
function SectionTable({ section, rows, periods }: { section: Section; rows: Row[]; periods: StatementData['periods'] }) {
  const total = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)
  const hist  = periods.slice(1)
  const cols  = `minmax(200px,1fr) 64px 92px 84px${hist.map(() => ' 64px').join('')}`
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${section.accent}1a, transparent 70%)`, borderBottom: '1px solid var(--bg-border)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: section.accent }} />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{section.title}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{section.subtitle} · {rows.length} {rows.length === 1 ? 'group' : 'groups'}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total stake</p>
          <p className="text-lg font-black font-number tabular-nums leading-tight" style={{ color: section.accent }}>{pct(total)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 520 + hist.length * 64 }}>
          <div className="grid text-[9px] font-bold uppercase tracking-wider px-4 py-2"
            style={{ gridTemplateColumns: cols, color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-border)' }}>
            <span>Shareholder</span>
            <span className="text-right">Trend</span>
            <span className="text-right">{periods[0]?.year ?? 'Latest'}</span>
            <span className="text-right">vs {hist[0]?.year ?? 'prev'}</span>
            {hist.map(p => <span key={p.period_end} className="text-right">{p.year}</span>)}
          </div>
          {rows.map((r, i) => (
            <div key={r.label} className="grid items-center px-4 py-3 transition-colors"
              style={{ gridTemplateColumns: cols, borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--bg-border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.color }} />
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={r.label}>{r.label}</p>
                </div>
                <div className="mt-1.5 ml-[18px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.max(1.5, Math.min(100, (r.values[0] ?? 0) * 100))}%`,
                    background: `linear-gradient(90deg, ${r.color}99, ${r.color})`, transition: 'width .6s' }} />
                </div>
              </div>
              <div className="flex justify-end"><Sparkline values={r.values} color={r.color} /></div>
              <span className="text-right text-sm font-black font-number tabular-nums" style={{ color: 'var(--text-primary)' }}>{pct(r.values[0])}</span>
              <span className="flex justify-end"><ChangePill now={r.values[0] ?? null} prev={r.values[1] ?? null} /></span>
              {hist.map((p, j) => (
                <span key={p.period_end} className="text-right text-[11px] font-number tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {pct(r.values[j + 1])}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ShareholdersView({ data }: { data: StatementData }) {
  const [hover, setHover] = useState<string | null>(null)
  const periods = data.periods.slice(0, 5)

  // Rows sorted by latest holding; each gets one colour used everywhere
  const rows: Row[] = useMemo(() =>
    data.fields
      .filter(f => !f.is_heading && f.label.trim() && f.values.length > 0)
      .map(f => ({ label: f.label.trim().replace(/\.$/, ''), values: f.values }))
      .sort((a, b) => (b.values[0] ?? 0) - (a.values[0] ?? 0))
      .map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] })),
  [data])

  if (!rows.length) {
    return <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No shareholder data available.</p>
  }

  const grouped = new Map<string, Row[]>(SECTIONS.map(s => [s.title, []]))
  for (const r of rows) grouped.get(sectionOf(r.label))!.push(r)
  const stake = (title: string) => (grouped.get(title) ?? []).reduce((s, r) => s + (r.values[0] ?? 0), 0)

  const total   = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)
  const largest = rows[0]
  const lead    = largest.values[0] ?? 0

  return (
    <div className="space-y-5">
      {/* Periods + total */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Periods</span>
          {periods.map((p, i) => (
            <span key={p.period_end} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              style={i === 0
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {p.year}
            </span>
          ))}
        </div>
        <span className="text-[11px] font-bold px-3 py-1 rounded-full font-number"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
          {rows.length} holder groups · Total {pct(total)}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Crown}     label="Largest holder"   value={pct(lead)}                    sub={largest.label}                      accent={largest.color} />
        <Kpi icon={Building2} label="Promoters"        value={pct(stake('Corporate & Promoters'))} sub="Associated companies & sponsors" accent="#f97316" />
        <Kpi icon={Landmark}  label="Institutional"    value={pct(stake('Institutional') + stake('Government & State'))} sub="Banks, funds, DFIs & state" accent="#10b981" />
        <Kpi icon={Users}     label="Retail & Foreign" value={pct(stake('Retail & Local') + stake('Foreign'))}           sub="Individuals & foreign investors" accent="#06b6d4" />
      </div>

      {/* Donut + ranked holders */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-center rounded-2xl p-4 sm:p-5"
        style={{ border: '1px solid var(--bg-border)', background: 'var(--bg-card)' }}>
        <Donut rows={rows} active={hover} onHover={setHover} />
        <div className="min-w-0 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Ownership breakdown · {periods[0]?.year}
          </p>
          {rows.map(r => {
            const on = hover === r.label
            return (
              <div key={r.label} className="cursor-default rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                style={{ background: on ? 'var(--bg-hover)' : 'transparent', opacity: hover && !on ? 0.55 : 1 }}
                onMouseEnter={() => setHover(r.label)} onMouseLeave={() => setHover(null)}>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.color }} />
                  <span className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }} title={r.label}>{r.label}</span>
                  <ChangePill now={r.values[0] ?? null} prev={r.values[1] ?? null} />
                  <span className="text-xs font-black font-number tabular-nums w-14 text-right" style={{ color: 'var(--text-primary)' }}>
                    {pct(r.values[0])}
                  </span>
                </div>
                <div className="mt-1.5 ml-5 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.max(1, ((r.values[0] ?? 0) / (lead || 1)) * 100)}%`,
                    background: `linear-gradient(90deg, ${r.color}88, ${r.color})`, transition: 'width .6s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category tables */}
      {SECTIONS.map(s => {
        const sRows = grouped.get(s.title) ?? []
        return sRows.length ? <SectionTable key={s.title} section={s} rows={sRows} periods={periods} /> : null
      })}

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        pp = percentage-point change in holding versus the previous period.
      </p>
    </div>
  )
}
