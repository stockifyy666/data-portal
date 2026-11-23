'use client'

// Stock news — one card per story: image on the left, headline / summary /
// source · date on the right. Kept close to the original layout, with better
// spacing, readable text and hover feedback.

import { useState } from 'react'
import { ExternalLink, Newspaper } from 'lucide-react'
import type { NewsItem } from '../stock-detail-types'
import { LoadingRows } from '../stock-detail-helpers'

function Thumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  const cls = 'w-24 h-16 sm:w-32 sm:h-[84px] rounded-lg shrink-0'
  if (!src || failed) {
    return (
      <div className={`${cls} flex items-center justify-center`} style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
        <Newspaper size={20} />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className={`${cls} object-cover`} onError={() => setFailed(true)} />
}

export function StockNewsTab({ news, newsLoad }: { news: NewsItem[]; newsLoad: boolean }) {
  if (newsLoad) return <div className="card"><LoadingRows n={5} /></div>

  if (!news.length) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No news found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {news.map((item, i) => (
        <a key={item.link + i} href={item.link} target="_blank" rel="noopener noreferrer"
          className="group card !p-4 flex gap-4 items-start transition-colors"
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(254,165,0,0.45)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
          <Thumb src={item.image} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug group-hover:text-[#FEA500] transition-colors"
              style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-[13px] leading-relaxed line-clamp-2 mt-1.5" style={{ color: 'var(--text-primary)', opacity: 0.75 }}>
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2.5 text-xs font-medium">
              <span className="font-semibold" style={{ color: '#FEA500' }}>{item.source}</span>
              <span style={{ color: 'var(--text-secondary)' }}>·</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {new Date(item.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <ExternalLink size={15} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#FEA500' }} />
        </a>
      ))}
    </div>
  )
}
