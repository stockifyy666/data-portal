'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Landmark, Users, Crown, TrendingUp, TrendingDown, Minus, ChevronRight, X } from 'lucide-react'

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
      <p className="text-[11px] font-medium truncate relative mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
    </div>
  )
}

/* ── History mini-chart: one bar per year, oldest → newest, value on top ── */
function HistoryBars({ values, periods, color }: { values: (number | null)[]; periods: StatementData['periods']; color: string }) {
  const pts = periods.map((p, i) => ({ year: p.year, v: values[i] ?? null })).reverse()   // oldest first
  const max = Math.max(0.0001, ...pts.map(p => p.v ?? 0))
  return (
    <div className="flex items-end gap-2 h-[74px]">
      {pts.map((p, i) => {
        const latest = i === pts.length - 1
        const h = p.v == null ? 0 : Math.max(3, (p.v / max) * 40)
        return (
          <div key={p.year + i} className="flex flex-col items-center justify-end h-full w-12">
            <span className="text-[11px] font-number tabular-nums mb-1 whitespace-nowrap"
              style={{ color: 'var(--text-primary)', fontWeight: latest ? 800 : 600 }}>
              {p.v == null ? '—' : `${(p.v * 100).toFixed(1)}%`}
            </span>
            <div className="w-6 rounded-t" style={{
              height: h, background: color, opacity: latest ? 1 : 0.45,
            }} />
            <span className="text-[11px] mt-1" style={{ color: latest ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: latest ? 700 : 500 }}>{p.year}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Section header: clickable summary card; opens the holder detail popup ── */
function SectionHeader({ section, rows, periods, onOpen, inModal }: {
  section: Section; rows: Row[]; periods: StatementData['periods']; onOpen?: () => void; inModal?: boolean
}) {
  const total = rows.reduce((s, r) => s + (r.values[0] ?? 0), 0)
  const prevTotal = rows.reduce((s, r) => s + (r.values[1] ?? 0), 0)
  const Tag = onOpen ? 'button' : 'div'
  return (
      <Tag type={onOpen ? 'button' : undefined} onClick={onOpen}
        className={`w-full text-left flex items-center justify-between gap-3 pl-5 ${inModal ? 'pr-12' : 'pr-5'} py-3.5 ${onOpen ? 'cursor-pointer transition-colors hover:brightness-110' : ''}`}
        style={{ background: `linear-gradient(90deg, ${section.accent}1a, transparent 70%)`, borderBottom: inModal ? '1px solid var(--bg-border)' : 'none' }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-9 rounded-full shrink-0" style={{ background: section.accent }} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{section.title}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {section.subtitle} · {rows.length} {rows.length === 1 ? 'group' : 'groups'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ChangePill now={total} prev={periods.length > 1 ? prevTotal : null} />
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total stake</p>
            <p className="text-xl font-number tabular-nums leading-tight" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{pct(total)}</p>
          </div>
          {onOpen && <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />}
        </div>
      </Tag>
  )
}

/* ── Popup: full holder breakdown for one category ── */
function SectionModal({ section, rows, periods, onClose }: {
  section: Section; rows: Row[]; periods: StatementData['periods']; onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid var(--bg-border)', background: 'var(--bg-card)' }}
        onClick={e => e.stopPropagation()}>
        <div className="relative">
          <SectionHeader section={section} rows={rows} periods={periods} inModal />
          <button type="button" onClick={onClose} aria-label="Close"
            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto">
          <HolderRows rows={rows} periods={periods} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ── Holder rows ── */
function HolderRows({ rows, periods }: { rows: Row[]; periods: StatementData['periods'] }) {
  return (
    <>
      {rows.map((r, i) => {
        const now = r.values[0] ?? null
        return (
          <div key={r.label}
            className="grid items-center gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
            style={{ borderTop: i ? '1px solid var(--bg-border)' : 'none' }}>
            {/* Name + share bar */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.color }} />
                <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
              </div>
              <div className="mt-2 ml-[18px] flex items-center gap-2 max-w-md">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.max(1.5, Math.min(100, (now ?? 0) * 100))}%`,
                    background: `linear-gradient(90deg, ${r.color}99, ${r.color})`, transition: 'width .6s' }} />
                </div>
                <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>of company</span>
              </div>
            </div>

            {/* Current holding + change */}
            <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-1 md:w-28">
              <span className="text-2xl font-black font-number tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{pct(now)}</span>
              <span className="flex items-center gap-1.5">
                <ChangePill now={now} prev={r.values[1] ?? null} />
              </span>
              {periods[1] && <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>vs {periods[1].year}</span>}
            </div>

            {/* History */}
            <div className="overflow-x-auto">
              <HistoryBars values={r.values} periods={periods} color={r.color} />
            </div>
          </div>
        )
      })}
    </>
  )
}

export function ShareholdersView({ data }: { data: StatementData }) {
  const periods = data.periods.slice(0, 5)
  const [openSection, setOpenSection] = useState<string | null>(null)

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

      {/* Category cards — click to see holders */}
      <div className="space-y-3">
        {SECTIONS.map(s => {
          const sRows = grouped.get(s.title) ?? []
          return sRows.length ? (
            <div key={s.title} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)', background: 'var(--bg-card)' }}>
              <SectionHeader section={s} rows={sRows} periods={periods} onOpen={() => setOpenSection(s.title)} />
            </div>
          ) : null
        })}
      </div>
      {openSection && (() => {
        const s = SECTIONS.find(x => x.title === openSection)!
        return <SectionModal section={s} rows={grouped.get(s.title) ?? []} periods={periods} onClose={() => setOpenSection(null)} />
      })()}

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        pp = percentage-point change in holding versus the previous period.
      </p>
    </div>
  )
}
