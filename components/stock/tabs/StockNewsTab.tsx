'use client'

import type { NewsItem } from '../stock-detail-types'
import { LoadingRows } from '../stock-detail-helpers'

export function StockNewsTab({ news, newsLoad }: { news: NewsItem[]; newsLoad: boolean }) {
  return (
    <div className="space-y-3">
      {newsLoad ? (
        <div className="card"><LoadingRows n={5} /></div>
      ) : news.length ? (
        news.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
             className="card flex gap-4 items-start hover:opacity-90 transition-opacity">
            {item.image && (
              <img src={item.image} alt="" className="w-20 h-14 object-cover rounded shrink-0"
                   onError={e => (e.currentTarget.style.display = 'none')} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </p>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {item.source}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(item.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </a>
        ))
      ) : (
        <div className="card text-center py-10">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No news found.</p>
        </div>
      )}
    </div>
  )
}
