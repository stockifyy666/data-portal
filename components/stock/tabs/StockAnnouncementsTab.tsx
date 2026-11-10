'use client'

import { Download } from 'lucide-react'
import type { Announcement } from '../stock-detail-types'
import { SectionHeading, LoadingRows } from '../stock-detail-helpers'

export function StockAnnouncementsTab({ anns, annLoad }: { anns: Announcement[]; annLoad: boolean }) {
  return (
    <div className="card">
      <SectionHeading>Corporate Announcements (Last 12 Months)</SectionHeading>
      {annLoad ? <LoadingRows n={6} /> : anns.length ? (
        <div>
          {anns.map((ann, i) => (
            <div key={i}
                 className="flex items-center gap-4 py-3 px-1 transition-colors"
                 style={{ borderBottom: '1px solid var(--bg-border)' }}
                 onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'}
                 onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}>

              {/* Date */}
              <div className="shrink-0 w-14 text-center">
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(ann.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(ann.date).getFullYear()}
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

              {/* PDF button */}
              {ann.pdf_id ? (
                <a
                  href={ann.pdf_id}
                  download
                  className="inline-flex items-center gap-1 text-[10px] font-semibold shrink-0 px-2.5 py-1 rounded border transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                >
                  <Download size={10} />
                  PDF
                </a>
              ) : (
                <div className="w-14 shrink-0" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No announcements found.
        </p>
      )}
    </div>
  )
}
