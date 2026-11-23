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
type AnnTab = 'results' | 'board' | 'others'
const TABS: { key: AnnTab; label: string }[] = [
  { key: 'results', label: 'Financial Results' },
  { key: 'board',   label: 'Board Meetings'    },
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

export function StockAnnouncementsTab({ anns, annLoad }: { anns: Announcement[]; annLoad: boolean }) {
  const [tab, setTab] = useState<AnnTab>('results')
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview])
  const counts = useMemo(() => {
    const c: Record<AnnTab, number> = { results: 0, board: 0, others: 0 }
    for (const a of anns) c[tabOf(a)]++
    return c
  }, [anns])
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

      {annLoad ? <LoadingRows n={6} /> : shown.length ? (
        <div>
          {shown.map((ann, i) => (
            <div key={i}
                 className="flex items-center gap-4 py-3 px-1 transition-colors"
                 style={{ borderBottom: '1px solid var(--bg-border)' }}
                 onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'}
                 onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}>

              {/* Date */}
              <div className="shrink-0 w-[92px]">
                <p className="text-xs font-semibold whitespace-nowrap font-number" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(ann.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
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
