'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, ExternalLink, RefreshCw, Search, Clock, TrendingUp, Globe } from 'lucide-react'

type NewsItem = {
  title:       string
  date:        string
  description: string
  link:        string
  image:       string
  source:      string
}

// Keywords that classify a news item as "market / business"
const MARKET_KEYWORDS = [
  'psx', 'kse', 'stock', 'share', 'equity', 'market', 'trading', 'index',
  'rupee', 'dollar', 'sbp', 'inflation', 'gdp', 'profit', 'revenue', 'earnings',
  'dividend', 'ipo', 'listed', 'company', 'corporate', 'sector', 'fiscal',
  'budget', 'export', 'import', 'trade', 'economy', 'economic', 'finance',
  'bank', 'secp', 'textile', 'cement', 'oil', 'gas', 'fertilizer', 'fund',
  'investment', 'investor', 'quarter', 'annual', 'interest rate', 'monetary',
  'tsx', 'nasdaq', 'crypto', 'bitcoin', 'imf', 'world bank', 'sensex', 'nifty',
  'forex', 'currency', 'petroleum', 'energy', 'power', 'generation', 'agm',
]

function isMarketNews(item: NewsItem): boolean {
  const text = (item.title + ' ' + item.description + ' ' + item.source).toLowerCase()
  return MARKET_KEYWORDS.some(kw => text.includes(kw))
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
    <div className="card !p-4 flex gap-4 animate-pulse">
      <div className="w-28 h-20 sm:w-32 sm:h-[84px] rounded-lg shrink-0" style={{ backgroundColor: 'var(--bg-hover)' }} />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="h-3.5 rounded-full w-11/12" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-3.5 rounded-full w-3/4" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-2.5 rounded-full w-1/3 mt-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
      </div>
    </div>
  )
}

function Thumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  const cls = 'w-28 h-20 sm:w-32 sm:h-[84px] rounded-lg shrink-0'
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

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.link || '#'} target="_blank" rel="noopener noreferrer"
      className="group card !p-4 flex gap-4 items-start transition-colors"
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(254,165,0,0.45)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
      <Thumb src={item.image} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-[#FEA500] transition-colors"
          style={{ color: 'var(--text-primary)' }}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-[13px] leading-relaxed line-clamp-2 mt-1.5" style={{ color: 'var(--text-primary)', opacity: 0.75 }}>
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2.5 text-xs font-medium">
          <span className="font-semibold truncate" style={{ color: '#FEA500' }}>{item.source}</span>
          <span style={{ color: 'var(--text-secondary)' }}>·</span>
          <span className="shrink-0" style={{ color: 'var(--text-secondary)' }}>{timeAgo(item.date)}</span>
        </div>
      </div>
      <ExternalLink size={15} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#FEA500' }} />
    </a>
  )
}

type TabId = 'market' | 'general'

export default function NewsPage() {
  const [marketNews,  setMarketNews]  = useState<NewsItem[]>([])
  const [generalNews, setGeneralNews] = useState<NewsItem[]>([])
  const [tab,         setTab]         = useState<TabId>('market')
  const [loading,     setLoading]     = useState(true)
  const [genLoading,  setGenLoading]  = useState(false)
  const [query,       setQuery]       = useState('')
  const [filter,      setFilter]      = useState<'all' | 'today' | 'week'>('today')

  const loadMarket = useCallback(() => {
    setLoading(true)
    fetch('/api/market/news', { signal: AbortSignal.timeout(20_000) })
      .then(r => r.json())
      .then(j => {
        if (Array.isArray(j.data)) {
          // All PSX API news is market news, but filter out anything clearly non-market
          setMarketNews(j.data.filter(isMarketNews))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadGeneral = useCallback(() => {
    setGenLoading(true)
    fetch('/api/market/news-general', { signal: AbortSignal.timeout(20_000) })
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.data)) setGeneralNews(j.data) })
      .catch(() => {})
      .finally(() => setGenLoading(false))
  }, [])

  useEffect(() => { loadMarket() }, [loadMarket])

  // Lazy-load general news when tab is first opened
  useEffect(() => {
    if (tab === 'general' && generalNews.length === 0 && !genLoading) loadGeneral()
  }, [tab, generalNews.length, genLoading, loadGeneral])

  function refresh() {
    if (tab === 'market') loadMarket()
    else loadGeneral()
  }

  const now = Date.now()
  const source = tab === 'market' ? marketNews : generalNews
  const isLoading = tab === 'market' ? loading : genLoading

  const filtered = source.filter(item => {
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

  const tabs: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'market',
      label: 'Market News',
      icon: <TrendingUp size={14} />,
      desc: 'Business, stocks & economy',
    },
    {
      id: 'general',
      label: 'Other News',
      icon: <Globe size={14} />,
      desc: 'Pakistan, politics & society',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page header */}
      <div className=" py-5 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
              <Newspaper size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>News</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {tab === 'market' ? 'Business, markets & economy' : 'Pakistan, politics & society'}
              </p>
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mt-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={tab === t.id ? {
                background: 'linear-gradient(135deg,#FEA500,#986300)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(254,165,0,0.35)',
              } : {
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--bg-border)',
              }}
            >
              {t.icon}
              {t.label}
              {tab !== t.id && (
                <span className="text-[11px] font-normal hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>— {t.desc}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + time filter */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
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

          {!isLoading && (
            <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--text-secondary)' }}>
              {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* News grid */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Newspaper size={40} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {query ? 'No results for your search.'
                : filter === 'today' ? 'No stories published today yet.'
                : filter === 'week' ? 'No stories this week.'
                : 'No news available right now.'}
            </p>
            {!query && filter !== 'all' && source.length > 0 && (
              <div className="flex gap-2">
                {filter === 'today' && (
                  <button onClick={() => setFilter('week')} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(254,165,0,0.15)', color: '#FEA500' }}>Show this week</button>
                )}
                <button onClick={() => setFilter('all')} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }}>Show all</button>
              </div>
            )}
            {query && (
              <button onClick={() => setQuery('')} className="text-xs underline"
                style={{ color: '#FEA500' }}>Clear search</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filtered.map((item, i) => <NewsCard key={item.link + i} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
