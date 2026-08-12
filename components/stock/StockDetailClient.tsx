'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, BarChart2, FileText, Users,
  Newspaper, Bell, Building2, ChevronDown, ExternalLink,
} from 'lucide-react'
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/utils/format'

/* ── Types ──────────────────────────────────────────────────────── */
type Overview = Record<string, number | string>

type Candle = {
  date: string; open: number; high: number
  low: number; close: number; volume: number
}

type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

type ProfileData = {
  profile: { data: {
    name: string; symbol: string; sector_name: string; description: string
    people:   Array<{ position: string; name: string }>
    auditors: string; offices: string[]
  }}
  org: { data: {
    nm: string; per: Array<{ nm: string; des: string; pht: string; ed: string | null }>
  }} | null
}

type NewsItem = {
  title: string; date: string; description: string
  link: string; image: string; source: string
}

type Announcement = {
  id: number; title: string; date: string; announcementType: string
  dividend: number | null; bonus: number | null; exDate: string | null
  pdf_id: string | null; name: string
}

/* ── Tabs ────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',      label: 'Overview',      Icon: BarChart2  },
  { id: 'chart',         label: 'Chart',          Icon: TrendingUp },
  { id: 'financials',    label: 'Financials',     Icon: FileText   },
  { id: 'fundamentals',  label: 'Fundamentals',   Icon: BarChart2  },
  { id: 'shareholders',  label: 'Shareholders',   Icon: Users      },
  { id: 'profile',       label: 'Company',        Icon: Building2  },
  { id: 'news',          label: 'News',           Icon: Newspaper  },
  { id: 'announcements', label: 'Announcements',  Icon: Bell       },
] as const

type TabId = typeof TABS[number]['id']

/* ── Helpers ─────────────────────────────────────────────────────── */
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}>
      {children}
    </h3>
  )
}

function LoadingRows({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-3 w-40 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-3 flex-1 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
      ))}
    </div>
  )
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || isNaN(v)) return '—'
  // Values that are ratios stored as decimals (< 10 and not currency) get %
  return v.toFixed(decimals)
}

/* ── Mini SVG line chart ─────────────────────────────────────────── */
function MiniChart({ candles }: { candles: Candle[] }) {
  if (!candles.length) return null
  const prices = candles.map(c => c.close)
  const min    = Math.min(...prices)
  const max    = Math.max(...prices)
  const range  = max - min || 1
  const W = 600; const H = 200

  const pts = candles.map((c, i) => {
    const x = (i / (candles.length - 1)) * W
    const y = H - ((c.close - min) / range) * H
    return `${x},${y}`
  }).join(' ')

  const isUp = candles[candles.length - 1].close >= candles[0].close
  const color = isUp ? '#16a34a' : '#dc2626'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}

/* ── Statement Table ─────────────────────────────────────────────── */
function StatementTable({ data, maxCols = 6 }: { data: StatementData; maxCols?: number }) {
  const periods = data.periods.slice(0, maxCols)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--bg-border)' }}>
            <th className="text-left py-2 px-2 min-w-[180px] font-semibold"
                style={{ color: 'var(--text-muted)' }}>
              Item
            </th>
            {periods.map(p => (
              <th key={p.period_end} className="text-right py-2 px-2 whitespace-nowrap font-semibold"
                  style={{ color: 'var(--text-muted)' }}>
                {p.quarter ? `${p.year} ${p.quarter}` : p.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.fields.map((f, i) => {
            if (f.is_heading) {
              return (
                <tr key={i}>
                  <td colSpan={periods.length + 1}
                      className="py-2 px-2 text-[11px] font-bold uppercase tracking-wide pt-4"
                      style={{ color: 'var(--text-secondary)' }}>
                    {f.label}
                  </td>
                </tr>
              )
            }
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}>
                <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </td>
                {periods.map((_, j) => {
                  const val = f.values[j]
                  const display = val == null ? '—'
                    : Math.abs(val) >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M`
                    : Math.abs(val) >= 1_000     ? `${(val / 1_000).toFixed(1)}K`
                    : val.toFixed(2)
                  return (
                    <td key={j} className="text-right py-2 px-2 font-number"
                        style={{ color: (val ?? 0) < 0 ? '#dc2626' : 'var(--text-primary)' }}>
                      {display}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── TradingView Widget ──────────────────────────────────────────── */
function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.height = '420px'
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = '100%'
    wrapper.appendChild(inner)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol:              `PSX:${symbol}`,
      interval:            'D',
      timezone:            'Asia/Karachi',
      theme:               document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      style:               '1',
      locale:              'en',
      enable_publishing:   false,
      hide_side_toolbar:   false,
      allow_symbol_change: false,
      save_image:          false,
      height:              420,
      width:               '100%',
    })
    wrapper.appendChild(script)
    container.appendChild(wrapper)
  }, [symbol])

  return <div ref={containerRef} className="w-full overflow-hidden rounded-lg" style={{ height: 420 }} />
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function StockDetailClient({
  symbol,
  overview: overviewProp,
}: {
  symbol:   string
  overview: Overview | null
}) {
  const [tab, setTab]   = useState<TabId>('overview')
  const loaded          = useRef<Set<TabId>>(new Set())

  const [overview,    setOverview]    = useState<Overview | null>(overviewProp)
  const [overviewLoad, setOverviewLoad] = useState(!overviewProp)

  /* Per-tab state */
  const [candles,   setCandles]   = useState<Candle[]>([])
  const [chartMode, setChartMode] = useState<'intraday' | 'daily'>('intraday')
  const [chartLoad, setChartLoad] = useState(false)

  const [stmtData,   setStmtData]   = useState<StatementData | null>(null)
  const [stmtType,   setStmtType]   = useState<'income' | 'balance'>('income')
  const [stmtInt,    setStmtInt]    = useState<'annual' | 'quarterly'>('annual')
  const [stmtLoad,   setStmtLoad]   = useState(false)
  const [stmtPdfUrl, setStmtPdfUrl] = useState<string | null>(null)

  const [fundData,  setFundData]  = useState<StatementData | null>(null)
  const [fundLoad,  setFundLoad]  = useState(false)

  const [shData,    setShData]    = useState<StatementData | null>(null)
  const [shLoad,    setShLoad]    = useState(false)

  const [profile,   setProfile]   = useState<ProfileData | null>(null)
  const [profLoad,  setProfLoad]  = useState(false)

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
      setCandles(chartMode === 'intraday' ? [...raw].reverse() : raw.slice(-180))
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

    if (tab === 'chart') {
      fetchChart()
    } else if (tab === 'financials') {
      fetchStatement()
      // Fetch latest financial statement PDF from announcements
      fetch(`/api/stock/${symbol}/announcements`)
        .then(r => r.json())
        .then(j => {
          if (!Array.isArray(j.announcements)) return
          const fin = j.announcements.find((a: Announcement) =>
            a.pdf_id &&
            /financial|result|statement|account|annual|quarter/i.test(a.announcementType + ' ' + a.title)
          )
          if (fin?.pdf_id) setStmtPdfUrl(fin.pdf_id)
        })
        .catch(() => {})
    } else if (tab === 'fundamentals' && !fundData) {
      setFundLoad(true)
      fetch(`/api/stock/${symbol}/statement?type=fundamentals&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setFundData(j.data) })
        .catch(() => {}).finally(() => setFundLoad(false))
    } else if (tab === 'shareholders' && !shData) {
      setShLoad(true)
      fetch(`/api/stock/${symbol}/statement?type=shareholders&interval=annual`)
        .then(r => r.json()).then(j => { if (j.data) setShData(j.data) })
        .catch(() => {}).finally(() => setShLoad(false))
    } else if (tab === 'profile' && !profile) {
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

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto hide-scrollbar -mx-1">
        <div className="flex gap-0.5 p-1 rounded-xl w-max min-w-full"
             style={{ backgroundColor: 'var(--bg-hover)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
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

      {/* ══ OVERVIEW ════════════════════════════════════════════════ */}
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

            {/* Key metrics */}
            <div className="card">
              <SectionHeading>Key Metrics</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Prev Close" value={formatPrice(Number(overview.lastClose))} />
                <Stat label="EPS"        value={overview.eps ? formatPrice(Number(overview.eps)) : '—'} />
                <Stat label="Sector"     value={sector || '—'} />
                <Stat label="Symbol"     value={symbol} />
              </div>
            </div>

            {/* TradingView chart */}
            <div className="card">
              <SectionHeading>Chart · PSX:{symbol}</SectionHeading>
              <TradingViewWidget symbol={symbol} />
            </div>
          </div>
        ) : (
          <div className="card"><p style={{ color: 'var(--text-muted)' }}>No overview data available.</p></div>
        )
      )}

      {/* ══ CHART ═══════════════════════════════════════════════════ */}
      {tab === 'chart' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['intraday', 'daily'] as const).map(m => (
              <button key={m}
                onClick={() => setChartMode(m)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={chartMode === m
                  ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                {m === 'intraday' ? 'Intraday (1D)' : 'Daily History'}
              </button>
            ))}
          </div>

          {chartLoad ? (
            <div className="h-52 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          ) : candles.length ? (
            <>
              <MiniChart candles={candles} />
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

      {/* ══ FINANCIALS ══════════════════════════════════════════════ */}
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

          {/* PDF link for current statement release */}
          {stmtPdfUrl && (
            <a href={stmtPdfUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
               style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
              <ExternalLink size={12} />
              View Statement PDF
            </a>
          )}

          {stmtLoad ? <LoadingRows /> : stmtData
            ? <StatementTable data={stmtData} maxCols={stmtInt === 'quarterly' ? 8 : 6} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>
          }
        </div>
      )}

      {/* ══ FUNDAMENTALS ════════════════════════════════════════════ */}
      {tab === 'fundamentals' && (
        <div className="card">
          <SectionHeading>Financial Ratios & Metrics (Annual)</SectionHeading>
          {fundLoad ? <LoadingRows /> : fundData
            ? <StatementTable data={fundData} maxCols={6} />
            : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No fundamentals data.</p>
          }
        </div>
      )}

      {/* ══ SHAREHOLDERS ════════════════════════════════════════════ */}
      {tab === 'shareholders' && (
        <div className="card">
          <SectionHeading>Shareholder Pattern</SectionHeading>
          {shLoad ? <LoadingRows /> : shData ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-border)' }}>
                    <th className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Category
                    </th>
                    {shData.periods.slice(0, 6).map(p => (
                      <th key={p.period_end} className="text-right py-2 px-2 whitespace-nowrap font-semibold"
                          style={{ color: 'var(--text-muted)' }}>
                        {p.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shData.fields.filter(f => !f.is_heading && f.label.trim()).map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bg-border)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}>
                      <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{f.label}</td>
                      {shData.periods.slice(0, 6).map((_, j) => {
                        const val = f.values[j]
                        return (
                          <td key={j} className="text-right py-2 px-2 font-number"
                              style={{ color: 'var(--text-primary)' }}>
                            {val != null ? `${(val * 100).toFixed(2)}%` : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No shareholder data.</p>
          )}
        </div>
      )}

      {/* ══ COMPANY PROFILE ════════════════════════════════════════ */}
      {tab === 'profile' && (
        profLoad ? (
          <div className="card"><LoadingRows n={8} /></div>
        ) : profile?.profile?.data ? (
          <div className="space-y-4">
            {/* About */}
            <div className="card space-y-3">
              <SectionHeading>About</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <Stat label="Name"    value={profile.profile.data.name} />
                <Stat label="Sector"  value={profile.profile.data.sector_name} />
                <Stat label="Auditors" value={profile.profile.data.auditors ?? '—'} />
              </div>
              {profile.profile.data.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {profile.profile.data.description}
                </p>
              )}
              {profile.profile.data.offices?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Registered Office
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {profile.profile.data.offices[0]}
                  </p>
                </div>
              )}
            </div>

            {/* Management */}
            {profile.org?.data?.per && (
              <div className="card">
                <SectionHeading>Management & Board</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.org.data.per
                    .filter(p => !p.ed) // Only current members
                    .map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg"
                           style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                             style={{ background: 'linear-gradient(135deg, #FEA500, #986300)' }}>
                          {p.nm.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {p.nm}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.des}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No profile available.
            </p>
          </div>
        )
      )}

      {/* ══ NEWS ═══════════════════════════════════════════════════ */}
      {tab === 'news' && (
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
      )}

      {/* ══ ANNOUNCEMENTS ══════════════════════════════════════════ */}
      {tab === 'announcements' && (
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
      )}
    </div>
  )
}
