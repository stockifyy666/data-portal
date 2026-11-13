'use client'

// =============================================================================
// FILE: components/stock/StockDetailClient.tsx
// PURPOSE: Stock detail page orchestrator — manages all tab state and data
//          fetching, then delegates rendering to per-tab sub-components.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedFetch } from '@/lib/utils/clientCache'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart2, FileText, Users, Newspaper, Bell } from 'lucide-react'
import type { StockQuote } from '@/types/market'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'
import type { Overview, StatementData, ProfileData, NewsItem, Announcement } from './stock-detail-types'
import { StockNewsTab }          from './tabs/StockNewsTab'
import { StockAnnouncementsTab } from './tabs/StockAnnouncementsTab'
import { StockCompareTab }       from './tabs/StockCompareTab'
import { StockOverviewTab }      from './tabs/StockOverviewTab'
import { StockPeersTab }         from './tabs/StockPeersTab'
import { StockFinancialsTab }    from './tabs/StockFinancialsTab'
import { StockFundamentalsTab }  from './tabs/StockFundamentalsTab'
import { StockShareholdersTab }  from './tabs/StockShareholdersTab'
import SymbolLogo from '@/components/ui/SymbolLogo'

const TABS = [
  { id: 'overview',      label: 'Overview',       Icon: BarChart2 },
  { id: 'peers',         label: 'Sector Peers',   Icon: Users     },
  { id: 'compare',       label: 'Compare Sector', Icon: BarChart2 },
  { id: 'financials',    label: 'Financials',     Icon: FileText  },
  { id: 'fundamentals',  label: 'Fundamentals',   Icon: BarChart2 },
  { id: 'shareholders',  label: 'Shareholders',   Icon: Users     },
  { id: 'news',          label: 'News',           Icon: Newspaper },
  { id: 'announcements', label: 'Announcements',  Icon: Bell      },
] as const

type TabId = typeof TABS[number]['id']

type PeerData = {
  symbol: string; name: string; sector: string
  price: number; change: number; changePct: number; volume: number
  high52: number; low52: number; marketCap: number
  eps: number | null; divYield: number | null
  roe: number | null; de: number | null; pb: number | null
}

export default function StockDetailClient({
  symbol,
  overview: overviewProp,
}: {
  symbol:   string
  overview: Overview | null
}) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const validTabIds  = TABS.map(t => t.id)
  const initialTab   = (searchParams.get('tab') ?? 'overview') as TabId
  const [tab, setTab] = useState<TabId>(
    validTabIds.includes(initialTab) ? initialTab : 'overview'
  )
  const loaded = useRef<Set<TabId>>(new Set())

  function switchTab(id: TabId) {
    setTab(id)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', id)
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }

  /* ── Overview ── */
  const [overview,     setOverview]     = useState<Overview | null>(overviewProp)
  const [overviewLoad, setOverviewLoad] = useState(!overviewProp)

  /* ── Financials ── */
  const [stmtData,   setStmtData]   = useState<StatementData | null>(null)
  const [stmtType,   setStmtType]   = useState<'income' | 'balance' | 'cashflow'>('income')
  const [stmtInt,    setStmtInt]    = useState<'annual' | 'quarterly'>('annual')
  const [stmtLoad,   setStmtLoad]   = useState(false)
  const [stmtPdfs,   setStmtPdfs]   = useState<{ title: string; url: string; type: string }[]>([])

  /* ── Fundamentals ── */
  const [fundData, setFundData] = useState<StatementData | null>(null)
  const [fundLoad, setFundLoad] = useState(false)

  /* ── Snapshot fundamentals (Company Snapshot on overview tab) ── */
  const [snapFunds, setSnapFunds] = useState<StatementData | null>(null)
  const [snapLoad,  setSnapLoad]  = useState(false)

  /* ── Shareholders ── */
  const [shData, setShData] = useState<StatementData | null>(null)
  const [shLoad, setShLoad] = useState(false)

  /* ── Profile ── */
  const [profile,  setProfile]  = useState<ProfileData | null>(null)
  const [profLoad, setProfLoad] = useState(false)

  /* ── Peers ── */
  const [peers,     setPeers]     = useState<PeerData[]>([])
  const [peersLoad, setPeersLoad] = useState(false)

  /* ── Stock search ── */
  const [allQuotes,   setAllQuotes]   = useState<StockQuote[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen,  setSearchOpen]  = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  /* ── News / Announcements ── */
  const [news,    setNews]    = useState<NewsItem[]>([])
  const [newsLoad, setNewsLoad] = useState(false)
  const [anns,    setAnns]    = useState<Announcement[]>([])
  const [annLoad, setAnnLoad] = useState(false)

  /* ── Load all quotes once for search ── */
  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(j => setAllQuotes(j.quotes ?? []))
      .catch(() => {})
  }, [])

  /* ── Close search dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchResults = searchQuery.trim().length >= 1
    ? allQuotes
        .filter(q =>
          q.symbol.toUpperCase().includes(searchQuery.toUpperCase()) ||
          q.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10)
    : []

  const fetchStatement = useCallback(async () => {
    setStmtLoad(true); setStmtData(null)
    try {
      const res  = await fetch(`/api/stock/${symbol}/statement?type=${stmtType}&interval=${stmtInt}`)
      const json = await res.json()
      if (json.data) setStmtData(json.data)
    } catch {}
    setStmtLoad(false)
  }, [symbol, stmtType, stmtInt])

  /* ── Fetch overview client-side if SSR prop was null ── */
  useEffect(() => {
    if (overview) return
    setOverviewLoad(true)
    fetch(`/api/market/${symbol}/overview`)
      .then(r => r.json())
      .then(j => { if (j.data) setOverview(j.data) })
      .catch(() => {})
      .finally(() => setOverviewLoad(false))
  }, [symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Lazy-load per tab ── */
  useEffect(() => {
    if (loaded.current.has(tab)) return
    loaded.current.add(tab)

    if (tab === 'overview') {
      if (!snapFunds) {
        setSnapLoad(true)
        fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
          .then(r => r.json())
          .then(j => { if (j.data) setSnapFunds(j.data) })
          .catch(() => {})
          .finally(() => setSnapLoad(false))
      }
      if (!profile) {
        setProfLoad(true)
        fetch(`/api/stock/${symbol}/profile`)
          .then(r => r.json()).then(j => setProfile(j))
          .catch(() => {}).finally(() => setProfLoad(false))
      }
    }

    if ((tab === 'peers' || tab === 'compare') && !peers.length) {
      if (allQuotes.length > 0 && overview?.sector) {
        const sector = overview.sector
        const peerList = allQuotes
          .filter(q =>
            q.sector === sector &&
            q.symbol !== symbol &&
            !/\(R\d*\)|\bRight\b/i.test(q.name) &&
            !/R\d*$/.test(q.symbol)
          )
          .slice(0, 15)
          .map(q => ({
            symbol: q.symbol, name: q.name, sector: q.sector,
            price: q.price, change: q.change, changePct: q.changePct, volume: q.volume,
            high52: q.high52, low52: q.low52, marketCap: q.mc,
            eps: q.eps || null,
            roe: q.roe ? q.roe * 100 : null,
            pb:  q.bvps > 0 && q.price > 0 ? q.price / q.bvps : null,
            divYield: q.dps > 0 && q.price > 0 ? (q.dps / q.price) * 100 : null,
            de: null,
          }))
        setPeers(peerList)
      } else {
        setPeersLoad(true)
        fetch(`/api/stock/${symbol}/peers`)
          .then(r => r.json())
          .then(j => { if (Array.isArray(j.peers)) setPeers(j.peers) })
          .catch(() => {})
          .finally(() => setPeersLoad(false))
      }
      if (!snapFunds) {
        setSnapLoad(true)
        fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
          .then(r => r.json())
          .then(j => { if (j.data) setSnapFunds(j.data) })
          .catch(() => {})
          .finally(() => setSnapLoad(false))
      }
    }

    if (tab === 'financials') {
      fetchStatement()
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json())
        .then(j => {
          if (!Array.isArray(j.announcements)) return
          const isFinancialPdf = (a: Announcement) => {
            if (!a.pdf_id) return false
            const text = (a.announcementType + ' ' + a.title).toLowerCase()
            if (!/financial result|quarterly result|annual result|half.?year|q[1-4] result|financial statement|transmission of account|year ended|period ended/i.test(text)) return false
            if (/general meeting|agm|resolution|dividend|bonus|right share|notice of/i.test(text)) return false
            return true
          }
          const fins = (j.announcements as Announcement[]).filter(isFinancialPdf)
          if (fins.length) {
            setStmtPdfs(fins.map(a => ({
              title: a.title || a.announcementType || 'Financial Statement',
              url:   a.pdf_id!,
              type:  a.announcementType,
            })))
          }
        })
        .catch(() => {})
    }

    if (tab === 'fundamentals') {
      setFundLoad(true); setFundData(null)
      fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setFundData(j.data) })
        .catch(() => {}).finally(() => setFundLoad(false))
    }

    if (tab === 'shareholders' && !shData) {
      setShLoad(true)
      fetch(`/api/stock/${symbol}/statement?type=shareholders&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setShData(j.data) })
        .catch(() => {}).finally(() => setShLoad(false))
    }

    if (tab === 'news' && !news.length) {
      setNewsLoad(true)
      fetch(`/api/stock/${symbol}/news`)
        .then(r => r.json()).then(j => { if (Array.isArray(j.data)) setNews(j.data.slice(0, 20)) })
        .catch(() => {}).finally(() => setNewsLoad(false))
    }

    if (tab === 'announcements' && !anns.length) {
      setAnnLoad(true)
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json()).then(j => { if (j.announcements) setAnns(j.announcements.slice(0, 50)) })
        .catch(() => {}).finally(() => setAnnLoad(false))
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Re-fetch statement when filters change ── */
  useEffect(() => {
    if (tab === 'financials') fetchStatement()
  }, [stmtType, stmtInt]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 animate-data">

      {/* ── Stock Search ── */}
      <div ref={searchRef} style={{ position: 'relative', zIndex: 40 }}>
        <div className="flex items-center gap-2 px-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search stock by symbol or name..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="flex-1 py-2.5 text-sm bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
              className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>{'✕'}</button>
          )}
        </div>
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            {searchResults.map(q => {
              const up = q.changePct >= 0
              return (
                <a key={q.symbol} href={`/stocks/${q.symbol}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onClick={() => { setSearchQuery(''); setSearchOpen(false) }}>
                  <div className="flex items-center gap-3">
                    <SymbolLogo symbol={q.symbol} size={28} />
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{q.symbol}</p>
                        {isKMI(q.indexKeys, q.symbol) && <KMIBadge />}
                      </div>
                      <p className="text-[11px] truncate max-w-[220px]" style={{ color: 'var(--text-muted)' }}>{q.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-number" style={{ color: 'var(--text-primary)' }}>
                      {q.price.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-semibold font-number" style={{ color: up ? '#16a34a' : '#dc2626' }}>
                      {up ? '+' : ''}{q.changePct.toFixed(2)}%
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="overflow-x-auto hide-scrollbar -mx-1">
        <div className="flex gap-0.5 p-1 rounded-xl w-max min-w-full"
             style={{ backgroundColor: 'var(--bg-hover)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              style={tab === t.id
                ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
            >
              <t.Icon size={12} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab panels ── */}
      {tab === 'overview' && (
        <StockOverviewTab
          symbol={symbol}
          overview={overview}
          overviewLoad={overviewLoad}
          snapFunds={snapFunds}
          snapLoad={snapLoad}
          profile={profile}
          profLoad={profLoad}
        />
      )}

      {tab === 'peers' && (
        <StockPeersTab
          symbol={symbol}
          overview={overview}
          snapFunds={snapFunds}
          peers={peers}
          peersLoad={peersLoad}
          peerView="ranked"
        />
      )}

      {tab === 'compare' && (
        <StockCompareTab
          symbol={symbol}
          overview={overview}
          snapFunds={snapFunds}
          peers={peers}
          peersLoad={peersLoad}
          allQuotes={allQuotes}
        />
      )}

      {tab === 'financials' && (
        <StockFinancialsTab
          stmtData={stmtData}
          stmtLoad={stmtLoad}
          stmtType={stmtType}
          setStmtType={setStmtType}
          stmtInt={stmtInt}
          setStmtInt={setStmtInt}
          stmtPdfs={stmtPdfs}
        />
      )}

      {tab === 'fundamentals' && (
        <StockFundamentalsTab
          symbol={symbol}
          fundData={fundData}
          fundLoad={fundLoad}
          overview={overview}
        />
      )}

      {tab === 'shareholders' && (
        <StockShareholdersTab
          shData={shData}
          shLoad={shLoad}
        />
      )}

      {tab === 'news' && <StockNewsTab news={news} newsLoad={newsLoad} />}

      {tab === 'announcements' && <StockAnnouncementsTab anns={anns} annLoad={annLoad} />}

    </div>
  )
}
