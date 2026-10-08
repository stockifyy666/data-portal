'use client'

// =============================================================================
// FILE: components/stock/StockDetailClient.tsx
// PURPOSE: Stock detail page orchestrator for a single stock (e.g. /stocks/ENGRO).
//          Manages all tab state and data fetching; delegates rendering to:
//          - StockChartComponents  ->-' MiniChart, TradingViewWidget, IndexVsStockChart
//          - StockFundamentalsView ->-' FundamentalsView (thematic metric cards + modal)
//          - StockShareholdersView ->-' ShareholdersView (progress bar breakdown)
//          - StockStatementTable   ->-' StatementTable (income/balance/cashflow)
//
//          All market data fetched via cachedFetch (browser in-memory cache, 5min TTL).
//          Search bar at top uses /api/market/quotes to power stock search.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { MiniChart, TradingViewWidget, IndexVsStockChart } from './StockChartComponents'
import { FundamentalsView } from './StockFundamentalsView'
import { ShareholdersView } from './StockShareholdersView'
import { StatementTable } from './StockStatementTable'
import { cachedFetch } from '@/lib/utils/clientCache'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TrendingUp, TrendingDown, BarChart2, FileText, Users,
  Newspaper, Bell, Building2, ChevronDown, ExternalLink,
} from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/utils/format'
import type { StockQuote } from '@/types/market'
import { COMPANY_BRANDS } from '@/data/company-brands'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'
import type { Overview, Candle, StatementData, ProfileData, NewsItem, Announcement } from './stock-detail-types'
import { SectionHeading, LoadingRows } from './stock-detail-helpers'
import { StockNewsTab } from './tabs/StockNewsTab'
import { StockAnnouncementsTab } from './tabs/StockAnnouncementsTab'
import { StockReportTab } from './tabs/StockReportTab'
import { StockCompareTab } from './tabs/StockCompareTab'

const TABS = [
  { id: 'overview',      label: 'Overview',        Icon: BarChart2  },
  { id: 'chart',         label: 'Chart',            Icon: TrendingUp },
  { id: 'peers',         label: 'Sector Peers',     Icon: Users      },
  { id: 'compare',       label: 'Compare Sector',   Icon: BarChart2  },
  { id: 'financials',    label: 'Financials',       Icon: FileText   },
  { id: 'fundamentals',  label: 'Fundamentals',     Icon: BarChart2  },
  { id: 'shareholders',  label: 'Shareholders',     Icon: Users      },
  { id: 'news',          label: 'News',             Icon: Newspaper  },
  { id: 'announcements', label: 'Announcements',    Icon: Bell       },
  { id: 'report',        label: 'Company Report',   Icon: FileText   },
] as const

type TabId = typeof TABS[number]['id']

/* -"--"- Helpers -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-semibold font-number" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || isNaN(v)) return '-'
  // Values that are ratios stored as decimals (< 10 and not currency) get %
  return v.toFixed(decimals)
}

/* -"--"- Main Component -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"- */
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

  const [overview,    setOverview]    = useState<Overview | null>(overviewProp)
  const [overviewLoad, setOverviewLoad] = useState(!overviewProp)

  /* Per-tab state */
  const [candles,   setCandles]   = useState<Candle[]>([])
  const [chartMode, setChartMode] = useState<'intraday' | 'weekly'>('intraday')
  const [chartLoad, setChartLoad] = useState(false)

  const [stmtData,   setStmtData]   = useState<StatementData | null>(null)
  const [stmtType,   setStmtType]   = useState<'income' | 'balance'>('income')
  const [stmtInt,    setStmtInt]    = useState<'annual' | 'quarterly'>('annual')
  const [stmtLoad,   setStmtLoad]   = useState(false)
  const [stmtPdfUrl, setStmtPdfUrl] = useState<string | null>(null)
  const [stmtPdfs,   setStmtPdfs]   = useState<{ title: string; url: string; type: string }[]>([])

  const [fundData,     setFundData]     = useState<StatementData | null>(null)
  const [fundLoad,     setFundLoad]     = useState(false)
  const [fundInterval, setFundInterval] = useState<'annual' | 'quarterly'>('annual')

  // Snapshot fundamentals - loaded on overview tab so Company Snapshot shows immediately
  const [snapFunds,    setSnapFunds]    = useState<StatementData | null>(null)
  const [snapLoad,     setSnapLoad]     = useState(false)

  const [shData,    setShData]    = useState<StatementData | null>(null)
  const [shLoad,    setShLoad]    = useState(false)

  const [profile,   setProfile]   = useState<ProfileData | null>(null)
  const [profLoad,  setProfLoad]  = useState(false)

  const [peers,       setPeers]      = useState<StockQuote[]>([])
  const [peersLoad,   setPeersLoad]  = useState(false)

  type PeerFunds = { roe: number|null; mktCap: number|null; de: number|null; pb: number|null }
  const [peerFunds, setPeerFunds] = useState<Record<string, PeerFunds>>({})

  function parseFunds(fields: Array<{ label: string; values: (number|null)[] }>): PeerFunds {
    let roe: number|null = null, mktCap: number|null = null, de: number|null = null, pb: number|null = null
    for (const f of fields) {
      if (!f.label || f.values[0] == null) continue
      const l = f.label.toLowerCase()
      const v = f.values[0]
      if (/return on equity|roe\b/.test(l))          roe    = v
      else if (/market cap/.test(l))                  mktCap = v
      else if (/debt.?to.?equity|debt.equity/.test(l)) de   = v
      else if (/price to book|p\/b/.test(l))          pb     = v
    }
    return { roe, mktCap, de, pb }
  }

  async function fetchFunds(sym: string): Promise<PeerFunds> {
    try {
      const j = await fetch(`/api/stock/${sym}/statement?type=fundamentals&interval=annual`).then(r => r.json())
      return parseFunds(j?.data?.fields ?? [])
    } catch { return { roe: null, mktCap: null, de: null, pb: null } }
  }

  const [indexCandles, setIndexCandles] = useState<Candle[]>([])
  const [stockCandles, setStockCandles] = useState<Candle[]>([])
  const [vsLoad,       setVsLoad]       = useState(false)

  // Stock search
  const [allQuotes,    setAllQuotes]    = useState<StockQuote[]>([])
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Load all quotes once for search
  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(j => setAllQuotes(j.quotes ?? []))
      .catch(() => {})
  }, [])

  // Close dropdown on outside click
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

  const [news,      setNews]      = useState<NewsItem[]>([])
  const [newsLoad,  setNewsLoad]  = useState(false)

  const [anns,      setAnns]      = useState<Announcement[]>([])
  const [annLoad,   setAnnLoad]   = useState(false)

  const fetchChart = useCallback(async () => {
    setChartLoad(true)
    try {
      const url  = chartMode === 'intraday'
        ? `/api/stock/${symbol}/intraday?period=1D`
        : `/api/stock/${symbol}/daily`
      const res  = await fetch(url)
      const json = await res.json()
      const raw  = Array.isArray(json.data) ? json.data : []
      // intraday: reverse chronological ->-' chronological; weekly: last 35 days (~5 weeks)
      setCandles(chartMode === 'intraday' ? [...raw].reverse() : raw.slice(-35))
    } catch { setCandles([]) }
    setChartLoad(false)
  }, [symbol, chartMode])

  const fetchStatement = useCallback(async () => {
    setStmtLoad(true); setStmtData(null)
    try {
      const res  = await fetch(`/api/stock/${symbol}/statement?type=${stmtType}&interval=${stmtInt}`)
      const json = await res.json()
      if (json.data) setStmtData(json.data)
    } catch {}
    setStmtLoad(false)
  }, [symbol, stmtType, stmtInt])

  // Fetch overview client-side on mount (SSR prop may be null if market data wasn't cached)
  useEffect(() => {
    if (overview) return
    setOverviewLoad(true)
    fetch(`/api/market/${symbol}/overview`)
      .then(r => r.json())
      .then(j => { if (j.data) setOverview(j.data) })
      .catch(() => {})
      .finally(() => setOverviewLoad(false))
  }, [symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load per tab
  useEffect(() => {
    if (loaded.current.has(tab)) return
    loaded.current.add(tab)

    if (tab === 'overview') {
      // Chart data
      if (!stockCandles.length) {
        setVsLoad(true)
        Promise.all([
          fetch(`/api/stock/${symbol}/daily`).then(r => r.json()),
          fetch(`/api/stock/KSE100/daily`).then(r => r.json()),
        ]).then(([sj, ij]) => {
          setStockCandles(Array.isArray(sj.data) ? sj.data : [])
          setIndexCandles(Array.isArray(ij.data) ? ij.data : [])
        }).catch(() => {}).finally(() => setVsLoad(false))
      }

      // Snapshot fundamentals (Company Snapshot card)
      if (!snapFunds) {
        setSnapLoad(true)
        fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
          .then(r => r.json())
          .then(j => { if (j.data) setSnapFunds(j.data) })
          .catch(() => {})
          .finally(() => setSnapLoad(false))
      }
    }

    if ((tab === 'peers' || tab === 'compare') && !peers.length) {
      setPeersLoad(true)
      cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
        .then(async j => {
          const all: StockQuote[] = j.quotes ?? []
          const sectorCode = all.find(q => q.symbol === symbol)?.sector ?? ''
          if (sectorCode) {
            const filtered = all
              .filter(q =>
                q.sector === sectorCode &&
                q.symbol !== symbol &&
                q.price > 0 &&
                !/\(R\d*\)|\bRight\b/i.test(q.name) &&
                !/R\d*$/.test(q.symbol)
              )
              .sort((a, b) => b.volume - a.volume)
            setPeers(filtered)
            const symbols = [symbol, ...filtered.slice(0, 10).map(p => p.symbol)]
            const results = await Promise.all(symbols.map(fetchFunds))
            const acc: Record<string, PeerFunds> = {}
            symbols.forEach((sym, i) => { acc[sym] = results[i] })
            setPeerFunds(acc)
          }
        })
        .catch(() => {})
        .finally(() => setPeersLoad(false))
    }

    if (tab === 'overview' && !profile) {
      setProfLoad(true)
      fetch(`/api/stock/${symbol}/profile`)
        .then(r => r.json()).then(j => setProfile(j))
        .catch(() => {}).finally(() => setProfLoad(false))
    } else if (tab === 'chart') {
      fetchChart()
    } else if (tab === 'financials') {
      fetchStatement()
      // Fetch latest financial statement PDF from announcements
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json())
        .then(j => {
          if (!Array.isArray(j.announcements)) return
          const isFinancialPdf = (a: Announcement) => {
            if (!a.pdf_id) return false
            const text = (a.announcementType + ' ' + a.title).toLowerCase()
            // must contain a financial keyword
            if (!/financial result|quarterly result|annual result|half.?year|q[1-4] result|financial statement|transmission of account|year ended|period ended/i.test(text)) return false
            // exclude notices, AGM, resolutions, dividends
            if (/general meeting|agm|resolution|dividend|bonus|right share|notice of/i.test(text)) return false
            return true
          }
          const fins = (j.announcements as Announcement[]).filter(isFinancialPdf)
          if (fins.length) {
            setStmtPdfUrl(fins[0].pdf_id)
            setStmtPdfs(fins.map(a => ({
              title: a.title || a.announcementType || 'Financial Statement',
              url:   a.pdf_id!,
              type:  a.announcementType,
            })))
          }
        })
        .catch(() => {})
    } else if (tab === 'fundamentals') {
      setFundLoad(true); setFundData(null)
      fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setFundData(j.data) })
        .catch(() => {}).finally(() => setFundLoad(false))
    } else if (tab === 'shareholders' && !shData) {
      setShLoad(true)
      fetch(`/api/stock/${symbol}/statement?type=shareholders&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setShData(j.data) })
        .catch(() => {}).finally(() => setShLoad(false))
    } else if ((tab as string) === 'profile' && !profile) {
      setProfLoad(true)
      fetch(`/api/stock/${symbol}/profile`)
        .then(r => r.json()).then(j => setProfile(j))
        .catch(() => {}).finally(() => setProfLoad(false))
    } else if (tab === 'news' && !news.length) {
      setNewsLoad(true)
      fetch(`/api/stock/${symbol}/news`)
        .then(r => r.json()).then(j => { if (Array.isArray(j.data)) setNews(j.data.slice(0, 20)) })
        .catch(() => {}).finally(() => setNewsLoad(false))
    } else if (tab === 'announcements' && !anns.length) {
      setAnnLoad(true)
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json()).then(j => { if (j.announcements) setAnns(j.announcements.slice(0, 50)) })
        .catch(() => {}).finally(() => setAnnLoad(false))
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch chart when mode changes
  useEffect(() => {
    if (tab === 'chart') fetchChart()
  }, [chartMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch statement when filters change
  useEffect(() => {
    if (tab === 'financials') fetchStatement()
  }, [stmtType, stmtInt]) // eslint-disable-line react-hooks/exhaustive-deps



  const isUp   = Number(overview?.changePct ?? 0) >= 0
  const sector = String(overview?.sector ?? '')

  return (
    <div className="space-y-5 animate-data">

      {/* ->"-->"- Stock Search ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
      <div ref={searchRef} style={{ position: 'relative', zIndex: 40 }}>
        <div className="flex items-center gap-2 px-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search another stock by symbol or name..."
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

        {/* Dropdown */}
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
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                      {q.symbol.charAt(0)}
                    </div>
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

      {/* ->"-->"- Tabs ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
      <div className="overflow-x-auto hide-scrollbar -mx-1">
        <div className="flex gap-0.5 p-1 rounded-xl w-max min-w-full"
             style={{ backgroundColor: 'var(--bg-hover)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         whitespace-nowrap transition-colors"
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

      {/* -> OVERVIEW -> */}
      {tab === 'overview' && (
        overviewLoad ? (
          <div className="card space-y-4">
            <div className="h-10 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-2 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                </div>
              ))}
            </div>
          </div>
        ) : overview ? (
          <div className="space-y-4">
            {/* Price card */}
            <div className="card">
              <div className="flex items-end gap-6 mb-5">
                <div>
                  <p className="text-4xl font-black font-number" style={{ color: 'var(--text-primary)' }}>
                    {formatPrice(Number(overview.price))}
                  </p>
                  <p className={`text-base font-semibold font-number mt-1 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                    {isUp ? <TrendingUp size={14} className="inline mr-1" /> : <TrendingDown size={14} className="inline mr-1" />}
                    {formatChange(Number(overview.change))} ({formatPercent(Number(overview.changePct) / 100)})
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4"
                   style={{ borderTop: '1px solid var(--bg-border)' }}>
                <Stat label="Open"      value={formatPrice(Number(overview.open))} />
                <Stat label="High"      value={formatPrice(Number(overview.high))} />
                <Stat label="Low"       value={formatPrice(Number(overview.low))} />
                <Stat label="Volume"    value={formatVolume(Number(overview.volume))} />
                <Stat label="52W High"  value={formatPrice(Number(overview.high52))} />
                <Stat label="52W Low"   value={formatPrice(Number(overview.low52))} />
              </div>
            </div>
            {/* ->"-->"- Score Cards ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
            {(() => {
              if (!snapFunds || !overview) return null

              // Pull fundamentals from snapFunds
              function pickF(pattern: RegExp): number | null {
                return snapFunds!.fields.find(f => !f.is_heading && pattern.test(f.label.trim()))?.values[0] ?? null
              }
              const eps      = pickF(/earnings per share|eps/i) ?? Number(overview.eps) ?? 0
              const bvps     = pickF(/book value per share|bvps/i) ?? 0
              const roe      = pickF(/return on equity|roe/i) ?? 0
              const npm      = pickF(/net profit margin/i) ?? 0
              const dps      = pickF(/dividend per share|dps/i) ?? 0
              const pe       = pickF(/price.*earning|p\/e/i) ?? 0
              const price    = Number(overview.price) || 0
              const high52   = Number(overview.high52) || price
              const low52    = Number(overview.low52) || price

              // ->"-->"- Intrinsic Score (0-100) ->"-->"-
              // Benjamin Graham formula: IV = ->-(22.5 x EPS x BVPS), normalised
              const grahamIV   = eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : 0
              const ivRatio    = grahamIV > 0 && price > 0 ? grahamIV / price : 0
              const intrinsicScore = grahamIV > 0
                ? Math.min(100, Math.round(Math.min(ivRatio, 2) * 50))  // 100 when IV ->--> 2x price
                : null

              // ->"-->"- Margin of Safety (%) ->"-->"-
              const mos = grahamIV > 0 && price > 0
                ? Math.round(((grahamIV - price) / grahamIV) * 100)
                : null

              // ->"-->"- Stockifyy Score (0-100) - multi-factor ->"-->"-
              let ss = 0, ssMax = 0
              // Valuation (25pts): P/E < 15 ideal
              if (pe > 0) {
                ssMax += 25
                ss += pe <= 10 ? 25 : pe <= 15 ? 20 : pe <= 20 ? 12 : pe <= 30 ? 6 : 0
              }
              // Profitability (25pts): net margin
              if (npm !== 0) {
                ssMax += 25
                const npmPct = Math.abs(npm) > 1 ? npm : npm * 100
                ss += npmPct >= 20 ? 25 : npmPct >= 12 ? 18 : npmPct >= 6 ? 12 : npmPct >= 0 ? 5 : 0
              }
              // ROE (20pts)
              if (roe !== 0) {
                ssMax += 20
                const roePct = Math.abs(roe) > 1 ? roe : roe * 100
                ss += roePct >= 20 ? 20 : roePct >= 12 ? 14 : roePct >= 6 ? 8 : roePct >= 0 ? 3 : 0
              }
              // Dividend (10pts)
              ssMax += 10
              ss += dps > 0 ? (dps / Math.max(price, 1) >= 0.05 ? 10 : dps / Math.max(price, 1) >= 0.02 ? 6 : 3) : 0
              // 52W position (20pts): price near 52W low = value opportunity
              if (high52 > low52) {
                ssMax += 20
                const pos = (price - low52) / (high52 - low52)
                ss += pos <= 0.25 ? 20 : pos <= 0.45 ? 15 : pos <= 0.65 ? 10 : pos <= 0.85 ? 5 : 2
              }
              const stockifyyScore = ssMax > 0 ? Math.round((ss / ssMax) * 100) : null

              function ScoreRing({ score, label, sub, color }: {
                score: number | null; label: string; sub: string; color: string
              }) {
                const s = score ?? 0
                const circumference = 2 * Math.PI * 26
                const dash = (s / 100) * circumference
                const grade = s >= 75 ? 'Excellent' : s >= 55 ? 'Good' : s >= 35 ? 'Fair' : 'Weak'
                const gradeColor = s >= 75 ? '#16a34a' : s >= 55 ? '#FEA500' : s >= 35 ? '#f97316' : '#dc2626'
                return (
                  <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
                    <div className="relative w-16 h-16">
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
                        {score !== null && (
                          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
                            strokeDasharray={`${dash} ${circumference}`}
                            strokeLinecap="round"
                            transform="rotate(-90 32 32)" />
                        )}
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-base font-black"
                        style={{ color: score !== null ? color : 'var(--text-muted)' }}>
                        {score !== null ? score : '-'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                      {score !== null && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ backgroundColor: gradeColor + '20', color: gradeColor }}>
                          {grade}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }

              const mosDisplay = mos !== null
                ? `${mos >= 0 ? '+' : ''}${mos}%`
                : '-'
              const mosSub = mos !== null
                ? mos >= 20 ? 'Undervalued' : mos >= 0 ? 'Near Fair Value' : 'Overvalued'
                : 'Insufficient data'
              const mosColor = mos !== null ? (mos >= 20 ? '#16a34a' : mos >= 0 ? '#FEA500' : '#dc2626') : '#94a3b8'

              // Sector-aware Graham warning
              const sectorCode = String(overview?.sector ?? '')
              const isFinancial = ['0807','0812','0813','0815','0819','0836'].includes(sectorCode)
              const isBank      = sectorCode === '0807'
              const grahamWarning = isBank
                ? 'Note: Graham IV is less reliable for banks - high BVPS inflates the score. Use Stockifyy Score instead.'
                : isFinancial
                ? 'Note: Graham IV may overstate intrinsic value for financial/insurance companies due to high book values.'
                : eps <= 0
                ? 'Note: Graham IV requires positive EPS. Intrinsic Score is not available for loss-making companies.'
                : null

              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Stockifyy Analysis
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      Based on fundamentals
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <ScoreRing
                      score={isFinancial ? null : intrinsicScore}
                      label="Intrinsic Score"
                      sub={isFinancial ? 'N/A for financials' : 'Graham IV vs Price'}
                      color="#3b82f6"
                    />
                    <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
                      <div className="w-16 h-16 flex items-center justify-center rounded-full text-xl font-black"
                        style={{ backgroundColor: (isFinancial ? '#94a3b8' : mosColor) + '20', color: isFinancial ? '#94a3b8' : mosColor }}>
                        {isFinancial ? 'N/A' : mosDisplay}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Margin of Safety</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {isFinancial ? 'N/A for financials' : 'IV vs Current Price'}
                        </p>
                        {!isFinancial && mos !== null && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                            style={{ backgroundColor: mosColor + '20', color: mosColor }}>
                            {mosSub}
                          </span>
                        )}
                      </div>
                    </div>
                    <ScoreRing score={stockifyyScore} label="Stockifyy Score" sub="Multi-factor rating" color="#FEA500" />
                  </div>

                  {/* Sector warning */}
                  {grahamWarning && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px]"
                      style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: 'var(--text-secondary)' }}>
                      <span className="shrink-0 mt-0.5 text-amber-500">&#9888;</span>
                      {grahamWarning}
                    </div>
                  )}

                  <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                    Scores are algorithmic estimates based on annual PSX fundamental data. Not investment advice.
                  </p>
                </div>
              )
            })()}

            {/* ->"-->"- Company Snapshot ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
            <div className="card">
              <SectionHeading>Company Snapshot</SectionHeading>

              {(() => {
                // ->"-->"- field extractor ->"-->"-
                function pick(pattern: RegExp): number | null {
                  if (!snapFunds) return null
                  return snapFunds.fields.find(f => !f.is_heading && pattern.test(f.label.trim()))?.values[0] ?? null
                }

                // ->"-->"- formatter ->"-->"-
                function fmtSnap(key: string, raw: number | null): string {
                  if (raw == null || isNaN(raw)) return '-'
                  switch (key) {
                    // Percentage fields (stored as decimal 0->-"1 in fundamentals)
                    case 'divYield':
                    case 'netMargin':
                      return `${(raw * 100).toFixed(2)}%`
                    case 'freeFloatPct':
                      // May be stored as 0->-"100 or 0->-"1; cap heuristic
                      return `${raw > 1 ? raw.toFixed(2) : (raw * 100).toFixed(2)}%`
                    // Ratio / per-share fields - display as-is
                    case 'eps':
                    case 'pe':
                    case 'pb':
                    case 'peg':
                      return raw.toFixed(2)
                    // Large count / monetary fields (stored in thousands by CS API)
                    case 'mktCap':
                    case 'sharesOut':
                    case 'freeFloat': {
                      const abs = Math.abs(raw)
                      if (abs >= 1_000_000) return `${(raw / 1_000_000).toFixed(2)}B`
                      if (abs >= 1_000)     return `${(raw / 1_000).toFixed(2)}M`
                      if (abs >= 1)         return `${raw.toFixed(2)}K`
                      return raw.toFixed(2)
                    }
                    case 'weeklyVol': {
                      const abs = Math.abs(raw)
                      if (abs >= 1_000_000) return `${(raw / 1_000_000).toFixed(2)}M`
                      if (abs >= 1_000)     return `${(raw / 1_000).toFixed(1)}K`
                      return raw.toFixed(0)
                    }
                    default: return raw.toFixed(2)
                  }
                }

                const snap = {
                  mktCap:      pick(/market cap/i),
                  sharesOut:   pick(/shares outstanding/i),
                  freeFloat:   pick(/free float(?!.*%)/i),
                  weeklyVol:   pick(/weekly.*vol|average.*vol/i),
                  freeFloatPct:pick(/free float.*%|free.*float.*percent/i),
                  divYield:    pick(/dividend yield/i),
                  eps:         pick(/\beps\b|latest eps|earnings per share/i),
                  netMargin:   pick(/net.*income.*margin|net.*profit.*margin/i),
                  pb:          pick(/price.*book.*value|price.*to.*book|p\/b\b/i),
                  pe:          pick(/price.*to.*earn|price.*earnings|p\/e\b/i),
                  peg:         pick(/peg/i),
                }

                // ->"-->"- Fundamentals rows (from snapshot fetch) ->"-->"-
                const fundRows: { label: string; key: keyof typeof snap; value: string }[] = [
                  { label: 'Market Cap',         key: 'mktCap',       value: fmtSnap('mktCap',       snap.mktCap)       },
                  { label: 'Shares Outstanding', key: 'sharesOut',    value: fmtSnap('sharesOut',    snap.sharesOut)    },
                  { label: 'Free Float Shares',  key: 'freeFloat',    value: fmtSnap('freeFloat',    snap.freeFloat)    },
                  { label: 'Weekly Avg Volume',  key: 'weeklyVol',    value: fmtSnap('weeklyVol',    snap.weeklyVol)    },
                  { label: 'Free Float %',       key: 'freeFloatPct', value: fmtSnap('freeFloatPct', snap.freeFloatPct) },
                  { label: 'Dividend Yield',     key: 'divYield',     value: fmtSnap('divYield',     snap.divYield)     },
                  { label: 'Earnings Per Share', key: 'eps',          value: fmtSnap('eps',          snap.eps ?? (overview?.eps ? Number(overview.eps) : null)) },
                  { label: 'Net Income Margin',  key: 'netMargin',    value: fmtSnap('netMargin',    snap.netMargin)    },
                  { label: 'Price to Book',      key: 'pb',           value: fmtSnap('pb',           snap.pb)           },
                  { label: 'Price to Earnings',  key: 'pe',           value: fmtSnap('pe',           snap.pe)           },
                  { label: 'PEG Ratio',          key: 'peg',          value: fmtSnap('peg',          snap.peg)          },
                ]

                const SnapCell = ({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) => (
                  <div className="flex flex-col gap-1 px-4 py-3"
                    style={{ borderRight: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider leading-none"
                      style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </p>
                    {loading
                      ? <div className="h-4 w-16 rounded animate-pulse mt-0.5" style={{ backgroundColor: 'var(--bg-hover)' }} />
                      : <p className="text-sm font-bold font-number leading-none mt-0.5"
                          style={{ color: 'var(--text-primary)' }}>
                          {value}
                        </p>
                    }
                  </div>
                )

                return (
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--bg-border)' }}>

                    {/* Section: Company Info */}
                    <div className="px-4 py-2"
                      style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--bg-border)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--brand)' }}>Company Info</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                      {fundRows.map(r => (
                        <SnapCell key={r.label} label={r.label} value={r.value} loading={snapLoad} />
                      ))}
                    </div>

                  </div>
                )
              })()}
            </div>

            {/* ->"-->"- Index vs Stock chart ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
            <div className="card">
              <SectionHeading>Index VS Stocks</SectionHeading>
              {vsLoad ? (
                <div className="h-72 rounded animate-pulse mt-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ) : stockCandles.length > 1 && indexCandles.length > 1
                ? <IndexVsStockChart stockCandles={stockCandles} indexCandles={indexCandles} symbol={symbol} />
                : <p className="text-sm py-4 text-center mt-3" style={{ color: 'var(--text-muted)' }}>Chart data not available.</p>
              }
            </div>

            {/* ->"-->"- Pros & Cons ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
            {snapFunds && overview && (() => {
              function pickF(pattern: RegExp): number | null {
                return snapFunds!.fields.find(f => !f.is_heading && pattern.test(f.label.trim()))?.values[0] ?? null
              }
              const eps    = pickF(/earnings per share|eps/i) ?? Number(overview.eps) ?? 0
              const bvps   = pickF(/book value per share|bvps/i) ?? 0
              const roe    = pickF(/return on equity|roe/i) ?? 0
              const npm    = pickF(/net profit margin/i) ?? 0
              const dps    = pickF(/dividend per share|dps/i) ?? 0
              const pe     = pickF(/price.*earning|p\/e/i) ?? 0
              const price  = Number(overview.price) || 0
              const high52 = Number(overview.high52) || price
              const low52  = Number(overview.low52) || price
              const npmPct = npm !== 0 ? (Math.abs(npm) > 1 ? npm : npm * 100) : 0
              const roePct = roe !== 0 ? (Math.abs(roe) > 1 ? roe : roe * 100) : 0
              const divYld = dps > 0 && price > 0 ? (dps / price) * 100 : 0
              const pos52  = high52 > low52 ? (price - low52) / (high52 - low52) : 0.5
              const sectorCodePC = String(overview?.sector ?? '')
              const isFinancialPC = ['0807','0812','0813','0815','0819','0836'].includes(sectorCodePC)

              const pros: string[] = []
              const cons: string[] = []

              // Valuation
              if (pe > 0 && pe <= 12)   pros.push(`Low P/E of ${pe.toFixed(1)}x - attractively valued vs earnings`)
              else if (pe > 0 && pe <= 18) pros.push(`Reasonable P/E of ${pe.toFixed(1)}x - fairly valued`)
              if (pe > 25)              cons.push(`High P/E of ${pe.toFixed(1)}x - stock may be expensive relative to earnings`)

              // Profitability - banks have naturally lower net margins, skip for financials
              if (!isFinancialPC) {
                if (npmPct >= 15)           pros.push(`Strong net profit margin of ${npmPct.toFixed(2)}% - efficient business`)
                if (npmPct > 0 && npmPct < 5) cons.push(`Thin net profit margin of ${npmPct.toFixed(2)}% - limited earnings buffer`)
                if (npmPct < 0)             cons.push(`Negative net profit margin - company is currently unprofitable`)
              }

              // ROE - higher threshold for banks
              const roeThreshold = isFinancialPC ? 12 : 15
              if (roePct >= roeThreshold)       pros.push(`High ROE of ${roePct.toFixed(2)}% - strong return for shareholders`)
              if (roePct > 0 && roePct < (isFinancialPC ? 8 : 8)) cons.push(`Low ROE of ${roePct.toFixed(2)}% - weak returns on shareholder equity`)
              if (roePct < 0)                   cons.push(`Negative ROE - equity is being eroded`)

              // EPS
              if (eps > 0)              pros.push(`Positive EPS of Rs ${eps.toFixed(2)} - company is profitable`)
              if (eps < 0)              cons.push(`Negative EPS of Rs ${eps.toFixed(2)} - company reporting a loss`)

              // BVPS - skip P/B comparison for banks (high BVPS is normal)
              if (!isFinancialPC) {
                if (bvps > 0 && price > 0 && price < bvps) pros.push(`Trading below book value (P/B < 1) - potential deep value opportunity`)
                if (bvps > 0 && price > 0 && price > bvps * 3) cons.push(`Trading at ${(price/bvps).toFixed(1)}x book value - significant premium to assets`)
              }

              // Dividend
              if (divYld >= 5)              pros.push(`High dividend yield of ${divYld.toFixed(2)}% - strong income for investors`)
              else if (divYld >= 2)         pros.push(`Decent dividend yield of ${divYld.toFixed(2)}%`)
              if (dps === 0)                cons.push(`No dividend paid - company does not distribute cash to shareholders`)

              // 52W position
              if (pos52 <= 0.2)             pros.push(`Price near 52-week low - potential value entry point`)
              if (pos52 >= 0.9)             cons.push(`Price near 52-week high - limited near-term upside unless fundamentals improve`)

              // Financial sector note
              if (isFinancialPC) {
                pros.push(`Financial sector companies are evaluated on ROE and P/E; book value metrics are excluded as high BVPS is normal for banks/insurers`)
              }

              if (pros.length === 0 && cons.length === 0) return null

              return (
                <div className="card">
                  <SectionHeading>Pros &amp; Cons</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    {/* Pros */}
                    <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#16a34a' }}>
                        Strengths
                      </p>
                      {pros.length > 0 ? pros.map((p, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="mt-0.5 shrink-0 text-xs" style={{ color: '#16a34a' }}>+</span>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</p>
                        </div>
                      )) : (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No notable strengths identified.</p>
                      )}
                    </div>
                    {/* Cons */}
                    <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#dc2626' }}>
                        Concerns
                      </p>
                      {cons.length > 0 ? cons.map((c, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="mt-0.5 shrink-0 text-xs" style={{ color: '#dc2626' }}>-</span>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c}</p>
                        </div>
                      )) : (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No major concerns identified.</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    Auto-generated from PSX fundamental data. Not financial advice.
                  </p>
                </div>
              )
            })()}

            {/* ->"-->"- About / Brands ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
            <div className="card space-y-4">
              <SectionHeading>About the Company</SectionHeading>

              {profLoad ? (
                <div className="h-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ) : profile?.profile?.data ? (
                <div className="space-y-4">
                  {profile.profile.data.description && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {profile.profile.data.description}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {profile.profile.data.sector_name && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Sector</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.profile.data.sector_name}</p>
                      </div>
                    )}
                    {profile.profile.data.auditors && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Auditors</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.profile.data.auditors}</p>
                      </div>
                    )}
                    {profile.profile.data.offices?.[0] && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Registered Office</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.profile.data.offices[0]}</p>
                      </div>
                    )}
                  </div>

                  {/* Board of Directors / Management */}
                  {profile.org?.data?.per && profile.org.data.per.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Board & Management
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {profile.org.data.per.slice(0, 6).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg"
                               style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                 style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                              {p.nm.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.nm}</p>
                              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.des}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Company profile not available.</p>
              )}
            </div>

            {/* ->"-->"- Brands & Subsidiaries ->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"-->"- */}
            {(() => {
              const brands = COMPANY_BRANDS[symbol] ?? []
              return (
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionHeading>Brands &amp; Subsidiaries</SectionHeading>
                    {brands.length === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        Coming soon
                      </span>
                    )}
                  </div>

                  {brands.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No brands data available for {symbol} yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {brands.map((brand, i) => (
                        <div key={i}
                          className="rounded-xl p-3 flex items-start gap-3"
                          style={{ backgroundColor: 'var(--bg-hover)' }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xl"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
                            {brand.logo ?? '🏢'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                              {brand.name}
                            </p>
                            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                              {brand.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
        ) : (
          <div className="card"><p style={{ color: 'var(--text-muted)' }}>No overview data available.</p></div>
        )
      )}

      {/* -> CHART -> */}
      {tab === 'chart' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['intraday', 'weekly'] as const).map(m => (
              <button key={m}
                onClick={() => setChartMode(m)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={chartMode === m
                  ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                {m === 'intraday' ? 'Intraday (1D)' : 'Weekly History'}
              </button>
            ))}
          </div>

          {chartLoad ? (
            <div className="h-52 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          ) : candles.length ? (
            <>
              <MiniChart candles={candles} mode={chartMode} />
              <div className="grid grid-cols-3 gap-4 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <Stat label="Open"   value={formatPrice(candles[0]?.open ?? 0)} />
                <Stat label="High"   value={formatPrice(Math.max(...candles.map(c => c.high)))} />
                <Stat label="Low"    value={formatPrice(Math.min(...candles.map(c => c.low)))} />
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No chart data available.
            </p>
          )}
        </div>
      )}

      {/* -> INDEX VS STOCK -> */}
      {/* -> SECTOR PEERS -> */}
      {tab === 'peers' && (
        <div className="card space-y-3">
          <SectionHeading>Sector Peer Comparison</SectionHeading>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            All companies in the same sector · ranked by trading volume
          </p>
          {peersLoad ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ))}
            </div>
          ) : peers.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No peer data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-border)' }}>
                    {['Company','Price','Chg%','EPS','P/E','ROE','Mkt Cap','D/E','Div Yield','P/B'].map(h => (
                      <th key={h}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider ${h==='Company'?'text-left pr-3':'text-right px-2'}`}
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const selfPrice     = Number(overview?.price ?? 0)
                    const selfChangePct = Number(overview?.changePct ?? 0)
                    const selfQ         = allQuotes.find(q => q.symbol === symbol)
                    const selfEps       = Number(overview?.eps ?? selfQ?.eps ?? 0)
                    const selfDps       = selfQ?.dps ?? 0
                    const selfPe        = selfEps > 0 ? (selfPrice / selfEps).toFixed(1) : '-'
                    const selfDivY      = selfDps > 0 && selfPrice > 0 ? `${((selfDps/selfPrice)*100).toFixed(2)}%` : '-'
                    const selfChgColor  = selfChangePct >= 0 ? '#16a34a' : '#dc2626'
                    function fmtMC(mc: number) {
                      if (!mc) return '-'
                      if (mc >= 1e12) return `${(mc/1e12).toFixed(2)}T`
                      if (mc >= 1e9)  return `${(mc/1e9).toFixed(2)}B`
                      if (mc >= 1e6)  return `${(mc/1e6).toFixed(1)}M`
                      return `${(mc/1e3).toFixed(1)}K`
                    }
                    return [
                      <tr key="__self__" style={{ borderBottom:'1px solid var(--bg-border)', backgroundColor:'rgba(254,165,0,0.08)' }}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>{symbol.charAt(0)}</div>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{symbol}</p>
                                <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background:'linear-gradient(135deg,#FEA500,#986300)',color:'white' }}>You</span>
                              </div>
                              <p className="text-[9px] truncate max-w-[100px]" style={{ color:'var(--text-muted)' }}>{String(overview?.name??'')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-xs font-bold tabular-nums" style={{ color:'var(--text-primary)' }}>{selfPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-semibold tabular-nums" style={{ color:selfChgColor }}>{selfChangePct>=0?'+':''}{selfChangePct.toFixed(2)}%</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:selfEps<0?'#dc2626':'var(--text-secondary)' }}>{selfEps?selfEps.toFixed(2):'-'}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{selfPe}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>-</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{fmtMC(selfQ?.mc??0)}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>-</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{selfDivY}</td>
                        <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>-</td>
                      </tr>,
                      ...peers.map((peer, i) => {
                        const pe      = peer.eps > 0 ? (peer.price/peer.eps).toFixed(1) : '-'
                        const divY    = peer.dps>0&&peer.price>0 ? `${((peer.dps/peer.price)*100).toFixed(2)}%` : '-'
                        const chgClr  = peer.changePct>=0?'#16a34a':'#dc2626'
                        return (
                          <tr key={peer.symbol} style={{ borderBottom:'1px solid var(--bg-border)', backgroundColor:i%2===0?'transparent':'var(--bg-hover)' }}>
                            <td className="py-2.5 pr-3">
                              <a href={`/stocks/${peer.symbol}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>{peer.symbol.charAt(0)}</div>
                                <div>
                                  <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{peer.symbol}</p>
                                  <p className="text-[9px] truncate max-w-[100px]" style={{ color:'var(--text-muted)' }}>{peer.name}</p>
                                </div>
                              </a>
                            </td>
                            <td className="py-2.5 px-2 text-right text-xs font-bold tabular-nums" style={{ color:'var(--text-primary)' }}>{peer.price.toFixed(2)}</td>
                            <td className="py-2.5 px-2 text-right text-xs font-semibold tabular-nums" style={{ color:chgClr }}>{peer.changePct>=0?'+':''}{peer.changePct.toFixed(2)}%</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:peer.eps<0?'#dc2626':'var(--text-secondary)' }}>{peer.eps?peer.eps.toFixed(2):'-'}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{pe}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>-</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{fmtMC(peer.mc)}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>-</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>{divY}</td>
                            <td className="py-2.5 px-2 text-right text-xs tabular-nums" style={{ color:'var(--text-secondary)' }}>-</td>
                          </tr>
                        )
                      }),
                    ]
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -> COMPARE SECTOR -> */}
      {tab === 'compare' && (
        <StockCompareTab
          symbol={symbol}
          overview={overview}
          peers={peers}
          peersLoad={peersLoad}
          allQuotes={allQuotes}
        />
      )}


      {/* -> FINANCIALS -> */}
      {tab === 'financials' && (
        <div className="card space-y-4">
          {/* Filter row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1">
              {(['income', 'balance'] as const).map(t => (
                <button key={t} onClick={() => setStmtType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={stmtType === t
                    ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                    : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  {t === 'income' ? 'Income Statement' : 'Balance Sheet'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              {(['annual', 'quarterly'] as const).map(i => (
                <button key={i} onClick={() => setStmtInt(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={stmtInt === i
                    ? { backgroundColor: 'var(--bg-border)', color: 'var(--text-primary)' }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                >
                  {i === 'annual' ? 'Annual' : 'Quarterly'}
                </button>
              ))}
            </div>
          </div>

          {/* Financial PDF reports - filtered by annual / quarterly toggle */}
          {stmtPdfs.length > 0 && (() => {
            const isAnnual = (t: string) => /annual|year ended|full.?year|transmission/i.test(t)
            const isQuarterly = (t: string) => /q[1-4]|quarter|half.?year|period ended/i.test(t)
            const filtered = stmtPdfs.filter(p =>
              stmtInt === 'annual' ? isAnnual(p.title) || (!isQuarterly(p.title))
                                   : isQuarterly(p.title)
            )
            const list = filtered.length ? filtered : stmtPdfs
            return (
            <div className="flex flex-col gap-1.5">
              {list.map((pdf, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                     style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{pdf.title}</span>
                  <a href={pdf.url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
                     style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                    <ExternalLink size={11} />
                    View PDF
                  </a>
                </div>
              ))}
            </div>
            )
          })()}

          {stmtLoad ? <LoadingRows /> : stmtData
            ? <StatementTable data={stmtData} maxCols={stmtInt === 'quarterly' ? 8 : 6} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>
          }
        </div>
      )}

      {/* -> FUNDAMENTALS -> */}
      {tab === 'fundamentals' && (
        <div className="card space-y-4">
          <SectionHeading>Financial Ratios &amp; Metrics</SectionHeading>
          {fundLoad ? <LoadingRows /> : fundData
            ? <FundamentalsView data={fundData} overview={overview} symbol={symbol} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No fundamentals data.</p>
          }
        </div>
      )}

      {/* -> SHAREHOLDERS -> */}
      {tab === 'shareholders' && (
        <div className="card">
          <SectionHeading>Shareholder Pattern</SectionHeading>
          {shLoad ? <LoadingRows /> : shData
            ? <ShareholdersView data={shData} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No shareholder data.</p>
          }
        </div>
      )}

      {tab === 'news' && <StockNewsTab news={news} newsLoad={newsLoad} />}

      {tab === 'announcements' && <StockAnnouncementsTab anns={anns} annLoad={annLoad} />}

      {tab === 'report' && (
        <StockReportTab
          symbol={symbol}
          overview={overview}
          snapFunds={snapFunds}
          profile={profile}
          anns={anns}
        />
      )}
    </div>
  )
}
