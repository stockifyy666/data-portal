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
import { StockCompareTab } from './tabs/StockCompareTab'
import SymbolLogo from '@/components/ui/SymbolLogo'

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

/* ── GaugeMeter: top-level so React never remounts it on parent re-render ── */
function GaugeMeter({ score, label, sub, color, displayValue, badge }: {
  score: number | null; label: string; sub: string; color: string
  displayValue?: string; badge?: string
}) {
  const W = 260, H = 158
  const cx = W / 2, cy = 138
  const Ro = 108, Ri = 70
  const toRad = (d: number) => (d * Math.PI) / 180

  const pt = (deg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy - r * Math.sin(toRad(deg)),
  })

  function bandPath(fromDeg: number, toDeg: number) {
    const o1 = pt(fromDeg, Ro), o2 = pt(toDeg, Ro)
    const i1 = pt(fromDeg, Ri), i2 = pt(toDeg, Ri)
    const lg = (fromDeg - toDeg) > 180 ? 1 : 0
    return [
      `M ${o1.x.toFixed(1)} ${o1.y.toFixed(1)}`,
      `A ${Ro} ${Ro} 0 ${lg} 0 ${o2.x.toFixed(1)} ${o2.y.toFixed(1)}`,
      `L ${i2.x.toFixed(1)} ${i2.y.toFixed(1)}`,
      `A ${Ri} ${Ri} 0 ${lg} 1 ${i1.x.toFixed(1)} ${i1.y.toFixed(1)}`,
      'Z',
    ].join(' ')
  }

  const zones = [
    { from: 180, to: 135, col: '#dc2626' },
    { from: 135, to:  90, col: '#f97316' },
    { from:  90, to:  45, col: '#eab308' },
    { from:  45, to:   0, col: '#16a34a' },
  ]

  const pct = score !== null ? Math.min(1, Math.max(0, score / 100)) : null
  const targetRotation = pct !== null ? pct * 180 : 0

  // Animate on mount: cssRotation starts at 0, RAF sets it to target → CSS transition plays.
  // No cleanup/guard: in StrictMode both RAFs fire on the same frame with the same value,
  // React batches them into one update, so the transition fires exactly once.
  const [cssRotation, setCssRotation] = useState(0)
  useEffect(() => {
    requestAnimationFrame(() => setCssRotation(targetRotation))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update smoothly when score changes after mount
  const prevTarget = useRef(targetRotation)
  useEffect(() => {
    if (prevTarget.current === targetRotation) return
    prevTarget.current = targetRotation
    setCssRotation(targetRotation)
  }, [targetRotation])

  const activeZone = score !== null
    ? zones.find(z => targetRotation >= 180 - z.from && targetRotation <= 180 - z.to) ?? zones[0]
    : null
  const activeCol = activeZone?.col ?? '#94a3b8'

  const nLen = Ri - 6
  const nTip = pt(180, nLen)
  const nL   = pt(270, 6)
  const nR   = pt(90,  6)

  const innerCover = [
    `M ${pt(180, Ri).x.toFixed(1)} ${pt(180, Ri).y.toFixed(1)}`,
    `A ${Ri} ${Ri} 0 0 0 ${pt(0, Ri).x.toFixed(1)} ${pt(0, Ri).y.toFixed(1)}`,
    `L ${cx} ${cy} Z`,
  ].join(' ')

  const displayVal = displayValue ?? (score !== null ? String(score) : '—')

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)',
      borderRadius: 18, padding: '10px 8px 14px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: W }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {zones.map((z, i) => (
            <path key={i} d={bandPath(z.from, z.to)} fill={z.col} opacity={0.92} />
          ))}
          <path d={innerCover} fill="var(--bg-card)" />
          <g style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${cssRotation}deg)`,
            transition: 'transform 1.1s cubic-bezier(0.34, 1.2, 0.64, 1)',
          }}>
            <polygon
              points={`${nTip.x.toFixed(1)},${nTip.y.toFixed(1)} ${nL.x.toFixed(1)},${nL.y.toFixed(1)} ${nR.x.toFixed(1)},${nR.y.toFixed(1)}`}
              fill="#1e293b"
            />
          </g>
          <circle cx={cx} cy={cy} r={9} fill="#1e293b" />
          <circle cx={cx} cy={cy} r={4.5} fill="#94a3b8" />
          {/* Value label inside SVG so it scales with the gauge */}
          <text x={W - 12} y={22} textAnchor="end"
            fontSize="26" fontWeight="900"
            fill={activeCol} fontFamily="inherit">
            {displayVal}
          </text>
        </svg>
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1, textAlign: 'center' }}>{label}</p>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{sub}</p>
    </div>
  )
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
  const [peerView,    setPeerView]   = useState<'ranked'|'range'>('ranked')

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
              <div className="flex items-end gap-4 mb-4">
                <div>
                  <p className="text-3xl sm:text-4xl font-black font-number" style={{ color: 'var(--text-primary)' }}>
                    {formatPrice(Number(overview.price))}
                  </p>
                  <p className={`text-sm sm:text-base font-semibold font-number mt-1 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <GaugeMeter
                      score={isFinancial ? null : intrinsicScore}
                      label="Intrinsic Score"
                      sub={isFinancial ? 'N/A for financials' : 'Graham IV vs Price'}
                      color="#3b82f6"
                    />
                    <GaugeMeter
                      score={isFinancial ? null : (mos !== null ? Math.min(100, Math.max(0, 50 + mos / 2)) : null)}
                      label="Margin of Safety"
                      sub={isFinancial ? 'N/A for financials' : 'IV vs Current Price'}
                      color={isFinancial ? '#94a3b8' : mosColor}
                      displayValue={isFinancial ? 'N/A' : mosDisplay}
                      badge={!isFinancial && mos !== null ? mosSub : undefined}
                    />
                    <GaugeMeter score={stockifyyScore} label="Stockifyy Score" sub="Multi-factor rating" color="#FEA500" />
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
        <div className="space-y-4">
          {peersLoad ? (
            <div className="card space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ))}
            </div>
          ) : peers.length === 0 ? (
            <div className="card text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No peer data available.</div>
          ) : (() => {
            /* ── Build unified peer list (self + peers) ── */
            const selfQ    = allQuotes.find(q => q.symbol === symbol)
            const selfPrice = Number(overview?.price ?? 0)
            const selfEps   = Number(overview?.eps ?? selfQ?.eps ?? 0)
            const selfDps   = selfQ?.dps ?? 0
            const selfPe    = selfEps > 0 ? selfPrice / selfEps : null
            const selfDivY  = selfDps > 0 && selfPrice > 0 ? (selfDps / selfPrice) * 100 : null
            const selfRoe   = peerFunds[symbol]?.roe ?? null
            const selfDe    = peerFunds[symbol]?.de  ?? null
            const selfPb    = peerFunds[symbol]?.pb  ?? null
            const selfMc    = selfQ?.mc ?? 0
            const selfChgPct = Number(overview?.changePct ?? 0)
            const self52W   = selfQ?.high52 != null && selfQ?.low52 != null && selfQ.price > 0 && selfQ.high52 > selfQ.low52
              ? ((selfQ.price - selfQ.low52) / (selfQ.high52 - selfQ.low52)) * 100 : null

            type PeerEntry = {
              symbol: string; name: string; isSelf: boolean
              price: number; changePct: number; eps: number|null
              pe: number|null; divY: number|null; roe: number|null
              de: number|null; pb: number|null; mc: number|null
              pos52w: number|null
            }

            const allEntries: PeerEntry[] = [
              { symbol, name: String(overview?.name ?? symbol), isSelf: true,
                price: selfPrice, changePct: selfChgPct, eps: selfEps || null,
                pe: selfPe, divY: selfDivY, roe: selfRoe,
                de: selfDe, pb: selfPb, mc: selfMc || null, pos52w: self52W },
              ...peers.slice(0, 15).map(p => {
                const pe   = p.eps > 0 ? p.price / p.eps : null
                const divY = p.dps > 0 && p.price > 0 ? (p.dps / p.price) * 100 : null
                const roe  = peerFunds[p.symbol]?.roe ?? null
                const de   = peerFunds[p.symbol]?.de  ?? null
                const pb   = peerFunds[p.symbol]?.pb  ?? null
                const pos52w = p.high52 != null && p.low52 != null && p.price > 0 && p.high52 > p.low52
                  ? ((p.price - p.low52) / (p.high52 - p.low52)) * 100 : null
                return { symbol: p.symbol, name: p.name, isSelf: false,
                  price: p.price, changePct: p.changePct, eps: p.eps || null,
                  pe, divY, roe, de, pb, mc: p.mc || null, pos52w }
              }),
            ]

            /* ── KPI summary cards ── */
            const validPe   = allEntries.map(e => e.pe).filter((v): v is number => v != null && v > 0 && v < 200)
            const validDivY = allEntries.map(e => e.divY).filter((v): v is number => v != null && v > 0)
            const validRoe  = allEntries.map(e => e.roe).filter((v): v is number => v != null)
            const validEps  = allEntries.map(e => e.eps).filter((v): v is number => v != null)
            const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b,0) / arr.length : null
            const sectorPe   = avg(validPe)
            const sectorDivY = avg(validDivY)
            const sectorRoe  = avg(validRoe)
            const sectorEps  = avg(validEps)

            /* ── PREMIUM METRIC CARD ── */
            const MEDALS = ['🥇','🥈','🥉']
            function PremiumCard({ label, entries, getValue, fmt, lowerBetter = false }:
              { label: string; entries: PeerEntry[]
                getValue: (e: PeerEntry) => number|null
                fmt: (v: number) => string; lowerBetter?: boolean }) {
              const vals = entries.map(e => ({ ...e, v: getValue(e) })).filter(e => e.v != null) as (PeerEntry & { v: number })[]
              if (!vals.length) return null
              const selfEntry = vals.find(e => e.isSelf)
              const selfVal = selfEntry?.v ?? null
              const sorted = [...vals].sort((a, b) => lowerBetter ? a.v - b.v : b.v - a.v)
              const rank = selfVal != null ? sorted.findIndex(e => e.isSelf) + 1 : null
              const maxAbs = Math.max(...vals.map(e => Math.abs(e.v)), 1)
              // progress fill pct — for lowerBetter, invert so rank-1 gets full bar
              const fillPct = (e: { v: number }, i: number) =>
                maxAbs > 0 ? Math.abs(e.v) / maxAbs * 100 : 0
              // rank indicator bar width (selected stock position in leaderboard)
              const rankBarW = rank != null ? ((vals.length - rank + 1) / vals.length) * 100 : 0

              return (
                <div style={{ border: '1px solid var(--bg-border)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Header: metric name + value + rank badge */}
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--bg-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      {selfVal != null && (
                        <span className="text-xs font-bold" style={{ color: '#FEA500' }}>{fmt(selfVal)}</span>
                      )}
                    </div>
                    {rank != null && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg,rgba(254,165,0,0.15),rgba(152,99,0,0.15))', color: '#FEA500', border: '1px solid rgba(254,165,0,0.3)' }}>
                        #{rank} / {vals.length}
                      </span>
                    )}
                  </div>

                  {/* Rank position bar */}
                  {rank != null && (
                    <div style={{ height: 3, background: 'var(--bg-border)' }}>
                      <div style={{ height: '100%', width: `${rankBarW}%`, background: 'linear-gradient(90deg,#FEA500,#986300)', transition: 'width 0.4s ease' }} />
                    </div>
                  )}

                  {/* Rows */}
                  <div style={{ background: 'var(--bg-card)' }}>
                    {sorted.map((e, i) => {
                      const pct = fillPct(e, i)
                      const isNeg = e.v < 0
                      const rowBg = e.isSelf ? 'rgba(254,165,0,0.07)' : 'transparent'
                      const fillColor = e.isSelf
                        ? 'rgba(254,165,0,0.22)'
                        : isNeg ? 'rgba(220,38,38,0.1)' : 'rgba(100,160,100,0.1)'
                      const textColor = e.isSelf ? '#FEA500' : isNeg ? 'var(--color-down)' : 'var(--text-secondary)'
                      return (
                        <div key={e.symbol}
                          className="relative flex items-center gap-2 px-3"
                          style={{
                            height: 32,
                            borderBottom: i < sorted.length - 1 ? '1px solid var(--bg-border)' : 'none',
                            background: rowBg,
                            borderLeft: e.isSelf ? '3px solid #FEA500' : '3px solid transparent',
                          }}>
                          {/* subtle fill strip */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            width: `${pct}%`, background: fillColor,
                            pointerEvents: 'none',
                          }} />
                          {/* medal or rank number */}
                          <div style={{ width: 20, flexShrink: 0, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                            {i < 3
                              ? <span style={{ fontSize: 11 }}>{MEDALS[i]}</span>
                              : <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                            }
                          </div>
                          {/* logo + symbol */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 72, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                            <SymbolLogo symbol={e.symbol} size={20} isSelf={e.isSelf} />
                            <span style={{ fontSize: 10, fontWeight: e.isSelf ? 700 : 500, color: e.isSelf ? '#FEA500' : 'var(--text-secondary)' }}>{e.symbol}</span>
                          </div>
                          {/* spacer */}
                          <div style={{ flex: 1 }} />
                          {/* value */}
                          <span style={{
                            fontSize: 11, fontWeight: e.isSelf ? 700 : 400,
                            fontVariantNumeric: 'tabular-nums',
                            color: textColor,
                            position: 'relative', zIndex: 1,
                          }}>{fmt(e.v)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            /* ── Section group helper ── */
            function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
                  </div>
                  <div className="space-y-2">{children}</div>
                </div>
              )
            }

            /* ── Symbol colour for peer circles ── */
            function symColor(s: string) {
              const h = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
              const hues = [210, 160, 280, 30, 320, 180, 60, 240]
              return `hsl(${hues[h % hues.length]},55%,52%)`
            }

            /* ── Range dot-plot row (reference-image style) ── */
            function RangeRow({ label, entries, getValue, fmt, lowerBetter = false }:
              { label: string; entries: PeerEntry[]; getValue: (e: PeerEntry) => number|null
                fmt: (v: number) => string; lowerBetter?: boolean }) {
              const vals = entries.map(e => ({ ...e, v: getValue(e) })).filter(e => e.v != null) as (PeerEntry & { v: number })[]
              if (!vals.length) return null
              const selfE = vals.find(e => e.isSelf)
              const selfVal = selfE?.v ?? null
              const sorted = [...vals].sort((a, b) => lowerBetter ? a.v - b.v : b.v - a.v)
              const rank = selfVal != null ? sorted.findIndex(e => e.isSelf) + 1 : null
              const minV = Math.min(...vals.map(e => e.v))
              const maxV = Math.max(...vals.map(e => e.v))
              const rangeV = maxV - minV || 1
              // for lowerBetter: flip so low value = right (Stronger) side
              const trkPct = (v: number) => {
                const raw = ((v - minV) / rangeV) * 100
                return Math.min(94, Math.max(4, lowerBetter ? 100 - raw : raw))
              }
              const sectorAvgV = avg(vals.map(e => e.v))
              const TRACK_H = 90, D = 28, SELF_D = 34, GAP = 2

              // cluster peers for stacking
              const peers2 = vals.filter(e => !e.isSelf)
                .map(e => ({ ...e, lp: trkPct(e.v) }))
                .sort((a, b) => a.lp - b.lp)
              const clusters: (typeof peers2)[] = []
              for (const dot of peers2) {
                const last = clusters[clusters.length - 1]
                if (last && Math.abs(dot.lp - last[0].lp) < 5) last.push(dot)
                else clusters.push([dot])
              }

              return (
                <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  {/* Left label */}
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[11px] font-bold" style={{ color: '#FEA500' }}>
                      {selfVal != null ? fmt(selfVal) : <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 400 }}>No figure</span>}
                    </p>
                  </div>

                  {/* Track */}
                  <div className="relative flex-1" style={{ height: TRACK_H }}>
                    {/* baseline */}
                    <div className="absolute left-0 right-0 h-px" style={{ background: 'var(--bg-border)', top: '55%' }} />
                    {/* sector avg dashed */}
                    {sectorAvgV != null && (
                      <div className="absolute top-0 bottom-0 w-px border-l border-dashed"
                        style={{ left: `${trkPct(sectorAvgV)}%`, borderColor: 'var(--text-muted)', opacity: 0.45 }} />
                    )}
                    {/* peer circles */}
                    {clusters.flatMap(cluster =>
                      cluster.map((e, ci) => {
                        const totalH = cluster.length * (D + GAP) - GAP
                        const rawTop = TRACK_H * 0.55 - D / 2 + (-totalH / 2 + ci * (D + GAP))
                        const top = Math.max(2, Math.min(TRACK_H - D - 2, rawTop))
                        return (
                          <div key={e.symbol} title={`${e.symbol}: ${fmt(e.v)}`}
                            className="absolute"
                            style={{ left: `calc(${e.lp}% - ${D/2}px)`, top, zIndex: 1 }}>
                            <SymbolLogo symbol={e.symbol} size={D} />
                          </div>
                        )
                      })
                    )}
                    {/* self circle + value bubble */}
                    {selfVal != null && (() => {
                      const lp = trkPct(selfVal)
                      const dotTop = TRACK_H * 0.55 - SELF_D / 2
                      const bubbleTop = Math.max(0, dotTop - 22)
                      return (
                        <>
                          <div className="absolute text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              left: `calc(${lp}% - 24px)`, top: bubbleTop,
                              background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white',
                              zIndex: 12,
                            }}>
                            {fmt(selfVal)}
                          </div>
                          <div className="absolute"
                            style={{ left: `calc(${lp}% - ${SELF_D/2}px)`, top: TRACK_H * 0.55 - SELF_D / 2, zIndex: 11 }}>
                            <SymbolLogo symbol={symbol} size={SELF_D} isSelf />
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Rank */}
                  <div style={{ width: 68, flexShrink: 0, textAlign: 'right' }}>
                    {rank != null && (
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {rank}{rank===1?'st':rank===2?'nd':rank===3?'rd':'th'}
                        </span>
                        {' '}<span style={{ color: 'var(--text-muted)' }}>of {vals.length}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            }

            const rangeMetrics = [
              { label: 'Price',        getValue: (e: PeerEntry) => e.price,     fmt: (v: number) => `Rs ${v.toFixed(0)}`,                           section: 'Price & Market' },
              { label: 'Chg %',        getValue: (e: PeerEntry) => e.changePct, fmt: (v: number) => `${v>=0?'+':''}${v.toFixed(2)}%`,               section: 'Price & Market' },
              { label: 'Mkt Cap',      getValue: (e: PeerEntry) => e.mc,        fmt: (v: number) => v>=1e9?`${(v/1e9).toFixed(1)}B`:`${(v/1e6).toFixed(0)}M`, section: 'Price & Market' },
              { label: '52W Position', getValue: (e: PeerEntry) => e.pos52w,    fmt: (v: number) => `${v.toFixed(0)}% range`,                       section: 'Price & Market' },
              { label: 'P / E',        getValue: (e: PeerEntry) => e.pe != null && e.pe > 0 && e.pe < 500 ? e.pe : null, fmt: (v: number) => v.toFixed(1), lowerBetter: true, section: 'Valuation' },
              { label: 'P / B',        getValue: (e: PeerEntry) => e.pb,        fmt: (v: number) => `${v.toFixed(2)}x`, lowerBetter: true,          section: 'Valuation' },
              { label: 'Div Yield',    getValue: (e: PeerEntry) => e.divY,      fmt: (v: number) => `${v.toFixed(2)}%`,                             section: 'Valuation' },
              { label: 'EPS',          getValue: (e: PeerEntry) => e.eps,       fmt: (v: number) => `Rs ${v.toFixed(2)}`,                           section: 'Profitability' },
              { label: 'ROE',          getValue: (e: PeerEntry) => e.roe,       fmt: (v: number) => `${v.toFixed(2)}%`,                             section: 'Profitability' },
              { label: 'D / E',        getValue: (e: PeerEntry) => e.de,        fmt: (v: number) => `${v.toFixed(2)}x`, lowerBetter: true,          section: 'Leverage' },
            ] as const

            return (
              <>
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'P / E',          val: selfPe    != null ? selfPe.toFixed(1)         : '—', sub: sectorPe   ? `Sector ${sectorPe.toFixed(1)} · ${validPe.length} profitable`    : 'Sector avg n/a', pos: true },
                    { label: 'Dividend Yield', val: selfDivY  != null ? `${selfDivY.toFixed(2)}%`  : '—', sub: sectorDivY ? `Sector ${sectorDivY.toFixed(2)}% · ${validDivY.length} payers`   : 'Sector avg n/a', pos: true },
                    { label: 'ROE',            val: selfRoe   != null ? `${selfRoe.toFixed(2)}%`   : '—', sub: sectorRoe  ? `Sector ${sectorRoe.toFixed(2)}% · ${validRoe.length} companies`  : 'Sector avg n/a', pos: (selfRoe ?? 0) >= 0 },
                    { label: 'EPS',            val: selfEps   > 0     ? `Rs ${selfEps.toFixed(2)}` : selfEps < 0 ? `Rs ${selfEps.toFixed(2)}` : '—', sub: sectorEps ? `Sector avg Rs ${sectorEps.toFixed(2)}` : 'Sector avg n/a', pos: selfEps >= 0 },
                  ].map(c => (
                    <div key={c.label} className="card" style={{ background: 'rgba(254,165,0,0.04)', border: '1px solid rgba(254,165,0,0.15)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                      <p className="text-lg font-bold" style={{ color: c.pos ? 'var(--text-primary)' : '#dc2626' }}>{c.val}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Comparison card with view toggle */}
                <div className="card" style={{ padding: '1rem' }}>
                  {/* Header + toggle */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Sector Comparison</span>
                    <div className="flex items-center gap-2">
                      {(['ranked', 'range'] as const).map(v => (
                        <button key={v} onClick={() => setPeerView(v)}
                          className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={peerView === v ? {
                            background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white',
                          } : {
                            background: 'var(--bg-hover)', color: 'var(--text-muted)',
                            border: '1px solid var(--bg-border)',
                          }}>
                          {v === 'ranked' ? 'Ranked' : 'Range'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {peerView === 'ranked' ? (
                    <div className="space-y-5">
                      <SectionGroup title="Price & Market">
                        <PremiumCard label="Price" entries={allEntries} getValue={e => e.price} fmt={v => `Rs ${v.toFixed(0)}`} />
                        <PremiumCard label="Chg %" entries={allEntries} getValue={e => e.changePct} fmt={v => `${v>=0?'+':''}${v.toFixed(2)}%`} />
                        <PremiumCard label="Mkt Cap" entries={allEntries} getValue={e => e.mc} fmt={v => v>=1e9?`${(v/1e9).toFixed(1)}B`:`${(v/1e6).toFixed(0)}M`} />
                        <PremiumCard label="52W Position" entries={allEntries} getValue={e => e.pos52w} fmt={v => `${v.toFixed(0)}%`} />
                      </SectionGroup>
                      <SectionGroup title="Valuation">
                        <PremiumCard label="P / E" entries={allEntries} getValue={e => e.pe != null && e.pe > 0 && e.pe < 500 ? e.pe : null} fmt={v => v.toFixed(1)} lowerBetter />
                        <PremiumCard label="P / B" entries={allEntries} getValue={e => e.pb} fmt={v => `${v.toFixed(2)}x`} lowerBetter />
                        <PremiumCard label="Div Yield" entries={allEntries} getValue={e => e.divY} fmt={v => `${v.toFixed(2)}%`} />
                      </SectionGroup>
                      <SectionGroup title="Profitability">
                        <PremiumCard label="EPS" entries={allEntries} getValue={e => e.eps} fmt={v => `Rs ${v.toFixed(2)}`} />
                        <PremiumCard label="ROE" entries={allEntries} getValue={e => e.roe} fmt={v => `${v.toFixed(2)}%`} />
                      </SectionGroup>
                      <SectionGroup title="Leverage">
                        <PremiumCard label="D / E" entries={allEntries} getValue={e => e.de} fmt={v => `${v.toFixed(2)}x`} lowerBetter />
                      </SectionGroup>
                    </div>
                  ) : (
                    /* ── Range / dot-plot view ── */
                    <div>
                      {/* Weaker / Stronger header */}
                      <div className="flex items-center px-2 mb-1" style={{ paddingLeft: 136 }}>
                        <div className="flex-1 flex justify-between">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Weaker</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Stronger</span>
                        </div>
                        <div style={{ width: 68 }} />
                      </div>

                      {/* Rows grouped by section */}
                      {(['Price & Market', 'Valuation', 'Profitability', 'Leverage'] as const).map(section => {
                        const rows = rangeMetrics.filter(m => m.section === section)
                        const rendered = rows.map(m => (
                          <RangeRow key={m.label} label={m.label} entries={allEntries}
                            getValue={m.getValue as (e: PeerEntry) => number|null}
                            fmt={m.fmt as (v: number) => string}
                            lowerBetter={'lowerBetter' in m ? m.lowerBetter : false} />
                        )).filter(Boolean)
                        if (!rendered.length) return null
                        return (
                          <div key={section} className="mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest px-1 py-2"
                              style={{ color: '#FEA500' }}>{section}</p>
                            {rendered}
                          </div>
                        )
                      })}

                      {/* Legend */}
                      <div className="flex items-center gap-4 pt-3 mt-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full" style={{ border: '2px solid #FEA500', background: 'white' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>This Stock</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full" style={{ border: '2px solid var(--bg-border)', background: 'var(--bg-card)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Peers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-px border-t border-dashed" style={{ borderColor: 'var(--text-muted)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Sector Avg</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(['income', 'balance'] as const).map(t => (
                <button key={t} onClick={() => setStmtType(t)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                  style={stmtType === t
                    ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                    : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  {t === 'income' ? 'Income' : 'Balance Sheet'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 sm:ml-auto">
              {(['annual', 'quarterly'] as const).map(i => (
                <button key={i} onClick={() => setStmtInt(i)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
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
        <div className="space-y-4" style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--bg-border)',
          borderRadius: '0.75rem',
          padding: '1rem',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
        }}>
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

    </div>
  )
}
