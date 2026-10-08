'use client'

import type { Announcement } from '../stock-detail-types'
import { SectionHeading, LoadingRows } from '../stock-detail-helpers'

export function StockAnnouncementsTab({ anns, annLoad }: { anns: Announcement[]; annLoad: boolean }) {
  return (
    <div className="card">
      <SectionHeading>Corporate Announcements (Last 12 Months)</SectionHeading>
      {annLoad ? <LoadingRows n={6} /> : anns.length ? (
        <div className="space-y-0">
          {anns.map((ann, i) => (
            <div key={i} className="flex items-start gap-4 py-3 transition-colors"
                 style={{ borderBottom: '1px solid var(--bg-border)' }}
                 onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'}
                 onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}>
              <div className="shrink-0 w-16 text-center">
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  {new Date(ann.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(ann.date).getFullYear()}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {ann.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {ann.announcementType}
                  </span>
                  {ann.dividend != null && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      Dividend: Rs {ann.dividend}
                    </span>
                  )}
                  {ann.bonus != null && (
                    <span className="text-[10px] text-blue-600 font-semibold">
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
              {ann.pdf_id && (
                <a href={ann.pdf_id} target="_blank" rel="noopener noreferrer"
                   className="text-[10px] shrink-0 px-2 py-1 rounded border transition-colors hover:opacity-80"
                   style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
                  PDF
                </a>
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
