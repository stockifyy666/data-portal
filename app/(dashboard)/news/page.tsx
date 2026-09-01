'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, ExternalLink, RefreshCw, Search, Clock } from 'lucide-react'
import Link from 'next/link'

type NewsItem = {
  title: string
  date: string
  description: string
  link: string
  image: string
  source: string
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      <div className="h-36 w-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
      <div className="p-4 space-y-2.5">
        <div className="h-3 rounded-full w-4/5" style={{ backgroundColor: 'var(--bg-border)' }} />
        <div className="h-3 rounded-full w-3/5" style={{ backgroundColor: 'var(--bg-border)' }} />
        <div className="h-2.5 rounded-full w-2/5 mt-3" style={{ backgroundColor: 'var(--bg-border)' }} />
      </div>
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const hasImage = Boolean(item.image)

  return (
    <a
      href={item.link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)')}
    >
      {/* Image */}
      {hasImage ? (
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
          />
          {/* source badge */}
          <span
            className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,.55)', color: '#fff', backdropFilter: 'blur(4px)' }}
          >
            {item.source}
          </span>
        </div>
      ) : (
        <div className="h-10 flex items-center px-4"
          style={{ backgroundColor: 'var(--bg-hover)' }}>
          <span className="text-[9px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}>{item.source}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 gap-2">
        <p className="text-[13px] font-semibold leading-snug line-clamp-3"
          style={{ color: 'var(--text-primary)' }}>
          {item.title}
        </p>

        {item.description && (
          <p className="text-[11px] leading-relaxed line-clamp-2"
            style={{ color: 'var(--text-muted)' }}>
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2"
          style={{ borderTop: '1px solid var(--bg-border)' }}>
          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={9} />
            <span className="text-[10px]">{timeAgo(item.date)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: '#FEA500' }}>
            Read more
            <ExternalLink size={9} />
          </div>
        </div>
      </div>
    </a>
  )
}

export default function NewsPage() {
  const [news,    setNews]    = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<'all' | 'today' | 'week'>('all')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/market/news')
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.data)) setNews(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const now = Date.now()
  const filtered = news.filter(item => {
    const q = query.trim().toLowerCase()
    const matchQ = !q || item.title.toLowerCase().includes(q) || item.source.toLowerCase().includes(q)
    if (!matchQ) return false
    if (filter === 'today') {
      const d = new Date(item.date)
      return !isNaN(d.getTime()) && (now - d.getTime()) < 86400000
    }
    if (filter === 'week') {
      const d = new Date(item.date)
      return !isNaN(d.getTime()) && (now - d.getTime()) < 604800000
    }
    return true
  })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
              <Newspaper size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Market News</h1>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Latest news from Pakistan Stock Exchange
              </p>
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search news…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
              style={{
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Time filter */}
          {(['all', 'today', 'week'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors"
              style={filter === f ? {
                background: 'linear-gradient(135deg,#FEA500,#986300)',
                color: 'white',
              } : {
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
              }}
            >
              {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : 'This Week'}
            </button>
          ))}

          {!loading && (
            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Newspaper size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {query ? 'No results for your search.' : 'No news available right now.'}
            </p>
            {query && (
              <button onClick={() => setQuery('')} className="text-xs underline"
                style={{ color: '#FEA500' }}>Clear search</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item, i) => <NewsCard key={i} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
