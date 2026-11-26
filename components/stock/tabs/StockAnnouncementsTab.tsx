'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, X, Image as ImageIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { Announcement } from '../stock-detail-types'
import { SectionHeading, LoadingRows } from '../stock-detail-helpers'

// PSX form types: FR… = financial results, BM… = board meetings (falls back to the title).
// Interest disclosures (INTDISC001) and DQAV1008 filings are grouped with results too.
const RESULTS_FORMS = new Set(['INTDISC001', 'DQAV1008'])
// Extra form types grouped with board meetings
const BOARD_FORMS = new Set(['CBSA3272'])
type AnnTab = 'results' | 'board' | 'payout' | 'others'
const TABS: { key: AnnTab; label: string }[] = [
  { key: 'results', label: 'Financial Results' },
  { key: 'board',   label: 'Board Meetings'    },
  { key: 'payout',  label: 'Payout'            },
  { key: 'others',  label: 'Others'            },
]
function tabOf(a: Announcement): AnnTab {
  const ft = (a.form_type ?? '').toUpperCase()
  if (ft.startsWith('FR') || RESULTS_FORMS.has(ft)) return 'results'
  if (ft.startsWith('BM') || BOARD_FORMS.has(ft)) return 'board'
  const t = (a.title ?? '').toLowerCase()
  if (/financial result/.test(t)) return 'results'
  if (/board meeting|bod meeting/.test(t)) return 'board'
  return 'others'
}

export function StockAnnouncementsTab({ symbol, anns, annLoad }: { symbol: string; anns: Announcement[]; annLoad: boolean }) {
  const [tab, setTab] = useState<AnnTab>('results')

  // Payouts: read from our database (nightly 2 AM PKT sync) — no Capital Stake call
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [payLoad, setPayLoad] = useState(true)
  useEffect(() => {
    let alive = true
    setPayLoad(true)
    fetch(`/api/stock/${encodeURIComponent(symbol)}/payouts`)
      .then(r => r.json())
      .then(j => { if (alive) setPayouts(Array.isArray(j.data) ? j.data : []) })
      .catch(() => { if (alive) setPayouts([]) })
      .finally(() => { if (alive) setPayLoad(false) })
    return () => { alive = false }
  }, [symbol])

  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview])
  const counts = useMemo(() => {
    const c: Record<AnnTab, number> = { results: 0, board: 0, payout: payouts.length, others: 0 }
    for (const a of anns) c[tabOf(a)]++
    return c
  }, [anns, payouts])
  const shown = useMemo(() => anns.filter(a => tabOf(a) === tab), [anns, tab])

  return (
    <div className="card">
      {preview && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setPreview(null)} role="dialog" aria-label={preview.title}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{preview.title}</p>
              <div className="flex items-center gap-2 shrink-0">
                <a href={`${preview.src}&download=1`} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
                  <Download size={12} /> Download
                </a>
                <button onClick={() => setPreview(null)} aria-label="Close"
                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-auto p-3 flex items-start justify-center" style={{ background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.src} alt={preview.title} className="max-w-full h-auto" />
            </div>
          </div>
        </div>,
        document.body
      )}
      <SectionHeading>Corporate Announcements</SectionHeading>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto overflow-y-hidden" role="tablist"
        style={{ borderBottom: '2px solid var(--bg-border)', scrollbarWidth: 'none' }}>
        {TABS.map(t => {
          const on = tab === t.key
          return (
            <button key={t.key} role="tab" aria-selected={on} onClick={() => setTab(t.key)}
              className="relative shrink-0 px-4 py-2.5 text-sm transition-colors"
              style={{ color: on ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: on ? 700 : 600 }}>
              {t.label}
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-number"
                style={{ background: on ? 'rgba(254,165,0,0.18)' : 'var(--bg-border)', color: on ? 'var(--brand)' : 'var(--text-secondary)' }}>
                {counts[t.key]}
              </span>
              {on && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full" style={{ background: 'var(--brand)' }} />}
            </button>
          )
        })}
      </div>

      {tab === 'payout' ? (
        payLoad ? <LoadingRows n={6} /> : payouts.length ? (
          <PayoutView payouts={payouts} onPreview={setPreview} />
        ) : (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No payouts found.</p>
        )
      ) : annLoad ? <LoadingRows n={6} /> : shown.length ? (
        <div>
          {shown.map((ann, i) => (
            <div key={i}
                 className="flex items-center gap-4 py-3 px-1 transition-colors"
                 style={{ borderBottom: '1px solid var(--bg-border)' }}
                 onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'}
                 onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}>

              {/* Date */}
              <div className="shrink-0 w-[92px]">
                <p className="text-xs font-normal whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(ann.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Title + code */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {ann.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {ann.announcementType && (
                    <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#FEA500' }}>
                      {ann.announcementType}
                    </span>
                  )}
                  {ann.dividend != null && (
                    <span className="text-[10px] font-semibold text-amber-600">
                      Dividend: Rs {ann.dividend}
                    </span>
                  )}
                  {ann.bonus != null && (
                    <span className="text-[10px] font-semibold text-blue-500">
                      Bonus: {ann.bonus}%
                    </span>
                  )}
                  {ann.exDate && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Ex-date: {ann.exDate}
                    </span>
                  )}
                </div>
              </div>

              {/* PDF: view in a new tab, or download */}
              {ann.files?.length ? (
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {ann.files.map((file, fi) => (
                    <div key={file} className="flex items-center gap-1.5">
                      {ann.files.length > 1 && (
                        <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>PDF {fi + 1}</span>
                      )}
                      <a href={`/api/proxy/pdf?file=${encodeURIComponent(file)}`} target="_blank" rel="noopener noreferrer"
                        title={`View ${file}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-opacity hover:opacity-80"
                        style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
                        <Eye size={11} /> View
                      </a>
                      <a href={`/api/proxy/pdf?file=${encodeURIComponent(file)}&download=1`}
                        title={`Download ${file}`} aria-label={`Download ${file}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-opacity hover:opacity-80"
                        style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
                        <Download size={11} /><span className="hidden sm:inline">Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : ann.images?.length ? (
                /* No PDF — show the announcement image(s) instead */
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {ann.images.slice(0, 3).map((img, ii) => {
                    const src = `/api/proxy/pdf?file=${encodeURIComponent(img)}`
                    return (
                      <div key={img} className="flex items-center gap-1.5">
                        {ann.images!.length > 1 && (
                          <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>IMG {ii + 1}</span>
                        )}
                        <button type="button" onClick={() => setPreview({ src, title: ann.title })} title="View image"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-opacity hover:opacity-80"
                          style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
                          <ImageIcon size={11} /> View
                        </button>
                        <a href={`${src}&download=1`} title="Download image" aria-label="Download image"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-opacity hover:opacity-80"
                          style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
                          <Download size={11} /><span className="hidden sm:inline">Download</span>
                        </a>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-secondary)' }}>No file</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {anns.length ? `No ${TABS.find(t => t.key === tab)!.label.toLowerCase()} announcements.` : 'No announcements found.'}
        </p>
      )}
    </div>
  )
}

/* ── Payout tab ──────────────────────────────────────────────────────────── */

type PayoutItem = {
  id: string; title: string; quarter: string; period_ended: string; date: string
  docs: string[]; images: string[]
  payouts: {
    book_closure_from?: string; book_closure_to?: string; entitlement_date?: string; ex_date?: string
    dividend?: number; bonus?: number; right_price?: number; right_issue?: number
    split_num?: number; split_den?: number; rsplit_num?: number; rsplit_den?: number
    sdiv_num?: number; sdiv_den?: number
  }
}

const fmtD = (s?: string) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const num = (v: unknown) => Number(v) || 0

type Chip = { label: string; value: string; color: string }

function chipsOf(po: PayoutItem['payouts']): Chip[] {
  const c: Chip[] = []
  // PSX face value is Rs 10, so a Rs 8 dividend = 80%
  if (num(po.dividend) > 0)    c.push({ label: 'Cash dividend',  value: `Rs ${num(po.dividend).toFixed(2)}`, color: '#10b981' })
  if (num(po.bonus) > 0)       c.push({ label: 'Bonus shares',   value: `${num(po.bonus)}%`,                 color: '#3b82f6' })
  if (num(po.right_issue) > 0) c.push({ label: 'Right issue',    value: `${num(po.right_issue)}%${num(po.right_price) ? ` @ Rs ${num(po.right_price)}` : ''}`, color: '#8b5cf6' })
  if (num(po.split_num) > 0)   c.push({ label: 'Stock split',    value: `${po.split_num}:${po.split_den}`,   color: '#f59e0b' })
  if (num(po.rsplit_num) > 0)  c.push({ label: 'Reverse split',  value: `${po.rsplit_num}:${po.rsplit_den}`, color: '#f59e0b' })
  if (num(po.sdiv_num) > 0)    c.push({ label: 'Stock dividend', value: `${po.sdiv_num}:${po.sdiv_den}`,     color: '#06b6d4' })
  return c
}

const periodOf = (p: PayoutItem) => p.quarter === 'YEAR' ? 'Annual' : (p.quarter || 'Interim')

function PayoutView({ payouts, onPreview }: { payouts: PayoutItem[]; onPreview: (v: { src: string; title: string }) => void }) {
  // Summary: last 12 months of cash dividends (by announcement date)
  const yearAgo = Date.now() - 365 * 86_400e3
  const last12  = payouts.filter(p => Date.parse(p.date) >= yearAgo)
  const div12   = last12.reduce((s, p) => s + num(p.payouts?.dividend), 0)
  const latest  = payouts[0]
  const upcoming = payouts
    .map(p => p.payouts?.ex_date)
    .filter((d): d is string => !!d && Date.parse(d) >= Date.now() - 86_400e3)
    .sort()[0]

  const years  = groupByYear(payouts)
  const maxDiv = Math.max(0, ...payouts.map(p => num(p.payouts?.dividend)))

  const stats = [
    { label: 'Dividend · last 12 months', value: `Rs ${div12.toFixed(2)}`, sub: `${last12.length} payout${last12.length === 1 ? '' : 's'} · ${+(div12 * 10).toFixed(2)}% of face value`, accent: '#10b981' },
    { label: 'Latest payout', value: latest ? (chipsOf(latest.payouts)[0]?.value ?? '—') : '—', sub: latest ? `${periodOf(latest)} · announced ${fmtD(latest.date)}` : '—', accent: '#f59e0b' },
    { label: upcoming ? 'Next ex-date' : 'Last ex-date', value: fmtD(upcoming ?? latest?.payouts?.ex_date), sub: upcoming ? 'Buy before this date to qualify' : 'No upcoming payout announced', accent: '#3b82f6' },
  ]

  return (
    <div className="space-y-4 pt-1">
      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl p-3.5 relative overflow-hidden min-w-0"
            style={{ background: `linear-gradient(135deg, ${s.accent}1f, ${s.accent}08)`, border: `1px solid ${s.accent}40` }}>
            <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full" style={{ background: `${s.accent}22` }} />
            <p className="text-[11px] font-bold uppercase tracking-wider relative" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
            <p className="text-[22px] font-number tabular-nums mt-1.5 relative truncate" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{s.value}</p>
            <p className="text-[12px] font-semibold truncate relative mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* One section per year: annual payout on top, quarterly histogram below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        {years.map(y => <YearSection key={y.year} y={y} max={maxDiv} onPreview={onPreview} />)}
      </div>
    </div>
  )
}

const Q_ORDER: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4, YEAR: 5 }
const yearOf = (p: PayoutItem) => (p.period_ended || p.date || '').slice(0, 4) || '—'
const keyOf  = (p: PayoutItem) => p.id || p.date

type YearGroup = { year: string; items: PayoutItem[]; annual: PayoutItem[]; quarters: PayoutItem[]; total: number }

function groupByYear(payouts: PayoutItem[]): YearGroup[] {
  const map = new Map<string, PayoutItem[]>()
  for (const p of payouts) {
    const y = yearOf(p)
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(p)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, items]) => {
      const sorted = [...items].sort((a, b) => (Q_ORDER[a.quarter] ?? 9) - (Q_ORDER[b.quarter] ?? 9) || (a.date || '').localeCompare(b.date || ''))
      return {
        year, items: sorted,
        annual:   sorted.filter(p => p.quarter === 'YEAR'),
        quarters: sorted.filter(p => p.quarter !== 'YEAR'),
        total:    sorted.reduce((s, p) => s + num(p.payouts?.dividend), 0),
      }
    })
}

function ViewBtn({ p, onPreview }: { p: PayoutItem; onPreview: (v: { src: string; title: string }) => void }) {
  const file  = p.docs?.find(d => /\.pdf$/i.test(d))
  const image = !file ? p.images?.[0] : undefined
  const cls   = 'shrink-0 inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-80'
  const st    = { borderColor: 'var(--brand)', color: 'var(--brand)' }
  if (file) return (
    <a href={`/api/proxy/pdf?file=${encodeURIComponent(file)}`} target="_blank" rel="noopener noreferrer" title="View announcement" className={cls} style={st}>
      <Eye size={12} /> View
    </a>
  )
  if (image) return (
    <button type="button" onClick={() => onPreview({ src: `/api/proxy/pdf?file=${encodeURIComponent(image)}`, title: p.title })} className={cls} style={st}>
      <ImageIcon size={12} /> View
    </button>
  )
  return null
}

// Dates for one payout, in a compact 4-column row
function DateRow({ p, accent }: { p: PayoutItem; accent: string }) {
  const po = p.payouts ?? {}
  const steps = [
    { k: 'Announced',    v: fmtD(p.date) },
    { k: 'Ex-date',      v: fmtD(po.ex_date), hl: true },
    { k: 'Entitlement',  v: fmtD(po.entitlement_date) },
    { k: 'Book closure', v: po.book_closure_from ? `${fmtD(po.book_closure_from)} – ${fmtD(po.book_closure_to)}` : '—' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {steps.map(s => (
        <div key={s.k} className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{s.k}</p>
          <p className="text-[13px] font-normal mt-0.5 truncate" style={{ color: s.hl ? accent : 'var(--text-primary)' }} title={s.v}>{s.v}</p>
        </div>
      ))}
    </div>
  )
}

function YearSection({ y, max, onPreview }: { y: YearGroup; max: number; onPreview: (v: { src: string; title: string }) => void }) {
  const last = y.quarters[y.quarters.length - 1]
  const [sel, setSel] = useState<string | null>(last ? keyOf(last) : null)
  const selected = y.quarters.find(p => keyOf(p) === sel)

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      {/* Year header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--bg-border)', background: 'linear-gradient(135deg, #10b98114, transparent)' }}>
        <p className="text-[22px] leading-none font-number" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{y.year}</p>
        <div className="text-right min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total cash dividend</p>
          <p className="text-[16px] font-number tabular-nums" style={{ color: '#10b981', fontWeight: 800 }}>
            Rs {y.total.toFixed(2)}
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}> · {+(y.total * 10).toFixed(2)}% · {y.items.length} payout{y.items.length === 1 ? '' : 's'}</span>
          </p>
        </div>
      </div>

      {/* Annual payout */}
      {y.annual.map(p => {
        const chips  = chipsOf(p.payouts ?? {})
        const main   = chips[0]
        const accent = main?.color ?? '#94a3b8'
        return (
          <div key={keyOf(p)} className="px-4 py-3 space-y-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: `${accent}22`, color: accent }}>Annual</span>
                  {p.period_ended && <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Period ended {fmtD(p.period_ended)}</span>}
                </div>
                {main && (
                  <p className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                    <span className="text-[24px] leading-none font-number tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{main.value}</span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                      {main.label}{main.label === 'Cash dividend' ? ` · ${+(num(p.payouts?.dividend) * 10).toFixed(2)}%` : ''}
                    </span>
                    {chips.slice(1).map(c => (
                      <span key={c.label} className="text-[12px] font-bold px-2 py-0.5 rounded-md" style={{ color: c.color, background: `${c.color}1f` }}>{c.label} {c.value}</span>
                    ))}
                  </p>
                )}
              </div>
              <ViewBtn p={p} onPreview={onPreview} />
            </div>
            <DateRow p={p} accent={accent} />
          </div>
        )
      })}

      {/* Interim (quarterly) payouts as a histogram — click a bar for its dates */}
      {y.quarters.length > 0 ? (
        <div className="px-4 py-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Interim payouts</p>
          <div className="flex items-end justify-around gap-3 h-[120px]" style={{ borderBottom: '1px solid var(--bg-border)' }}>
            {y.quarters.map(p => {
              const k     = keyOf(p)
              const div   = num(p.payouts?.dividend)
              const chip  = chipsOf(p.payouts ?? {})[0]
              const color = chip?.color ?? '#94a3b8'
              const h     = div > 0 ? Math.max(8, (div / (max || 1)) * 78) : 8
              const on    = k === sel
              return (
                <button key={k} type="button" onClick={() => setSel(k)}
                  className="flex flex-col items-center justify-end h-full flex-1 max-w-[72px]"
                  title={chip ? `${periodOf(p)} · ${chip.label} ${chip.value}` : periodOf(p)}>
                  <span className="text-[12px] font-number tabular-nums mb-1 whitespace-nowrap" style={{ color: on ? color : 'var(--text-primary)', fontWeight: 800 }}>
                    {chip?.value ?? '—'}
                  </span>
                  <span className="w-full rounded-t-md transition-all"
                    style={{ height: `${h}%`, background: on ? color : `${color}66` }} />
                </button>
              )
            })}
          </div>
          <div className="flex justify-around gap-3 -mt-1.5">
            {y.quarters.map(p => {
              const k = keyOf(p)
              return (
                <button key={k} type="button" onClick={() => setSel(k)}
                  className="flex-1 max-w-[72px] text-[12px] font-bold text-center"
                  style={{ color: k === sel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{periodOf(p)}</button>
              )
            })}
          </div>

          {selected && (
            <div className="rounded-lg p-3 space-y-2.5" style={{ background: 'var(--bg-hover)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {periodOf(selected)}
                  {selected.period_ended ? <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}> · Period ended {fmtD(selected.period_ended)}</span> : null}
                </p>
                <ViewBtn p={selected} onPreview={onPreview} />
              </div>
              <DateRow p={selected} accent={chipsOf(selected.payouts ?? {})[0]?.color ?? '#94a3b8'} />
            </div>
          )}
        </div>
      ) : (
        <p className="px-4 py-4 text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>No interim payouts this year</p>
      )}
    </div>
  )
}
