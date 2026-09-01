'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Sun, Moon, Sunrise, Clock, TrendingUp, TrendingDown,
  Flame, Newspaper, RefreshCw, BarChart3, ExternalLink,
  Activity, Users,
} from 'lucide-react'

/* ── PKT helpers ─────────────────────────────────────────────────── */
function nowPKT() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }))
}
function marketStatus() {
  const t = nowPKT(), h = t.getHours(), m = t.getMinutes(), day = t.getDay()
  const tot = h * 60 + m
  if (day === 0 || day === 6) return { label: 'Weekend – Closed', open: false, minutesToOpen: null }
  if (tot < 570)  return { label: 'Pre-Market',   open: false, minutesToOpen: 570 - tot }
  if (tot <= 930) return { label: 'Market Open',  open: true,  minutesToOpen: null }
  return               { label: 'Market Closed', open: false, minutesToOpen: null }
}
function greeting() {
  const h = nowPKT().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
function fmt(mins: number) {
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ''}`
}
function timeAgo(d: string) {
  if (!d) return ''
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}
function isRightShare(symbol: string, name: string) {
  return /\(R\d*\)|\bRight\b/i.test(name) || /R\d*$/.test(symbol)
}

/* ── Types ───────────────────────────────────────────────────────── */
type KSE    = { current: number; change: number; changePct: number }
type Sector = { name: string; avgPct: number }
type Stock  = { symbol: string; name: string; price: number; changePct: number }
type News   = { title: string; date: string; link: string; source: string }
type Quote  = { symbol: string; name: string; price: number; changePct: number; volume: number }

export default function MorningBrief({ userName }: { userName?: string }) {
  const [kse100,    setKse100]    = useState<KSE | null>(null)
  const [sectors,   setSectors]   = useState<Sector[]>([])
  const [topStocks, setTop]       = useState<Stock[]>([])
  const [news,      setNews]      = useState<News[]>([])
  const [gainers,   setGainers]   = useState(0)
  const [losers,    setLosers]    = useState(0)
  const [totalVol,  setTotalVol]  = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [idxRes, hmRes, qtRes, newsRes] = await Promise.allSettled([
        fetch('/api/market/indices').then(r => r.json()),
        fetch('/api/market/heatmap').then(r => r.json()),
        fetch('/api/market/quotes').then(r => r.json()),
        fetch('/api/market/news').then(r => r.json()),
      ])

      if (idxRes.status === 'fulfilled') {
        const k = (idxRes.value.indices ?? []).find((i: any) => i.key === 'KSE100')
        if (k) setKse100({ current: k.current, change: k.change, changePct: k.changePct })
      }

      if (hmRes.status === 'fulfilled') {
        const raw: any[] = hmRes.value.sectors ?? []
        setSectors(
          raw
            .map((s: any) => ({ name: s.name ?? '', avgPct: Number(s.avgChangePct ?? 0) }))
            .filter(s => s.name)
            .sort((a, b) => b.avgPct - a.avgPct)
        )
      }

      if (qtRes.status === 'fulfilled') {
        const all: Quote[] = qtRes.value.quotes ?? []
        const kse = all.filter(q => q.price > 0 && !isRightShare(q.symbol, q.name))
        setGainers(kse.filter(q => q.changePct > 0).length)
        setLosers(kse.filter(q => q.changePct < 0).length)
        setTotalVol(kse.reduce((s, q) => s + (q.volume || 0), 0))
        setTop(
          [...kse]
            .filter(q => q.changePct > 0)
            .sort((a, b) => b.changePct - a.changePct)
            .slice(0, 3)
            .map(q => ({ symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct }))
        )
      }

      if (newsRes.status === 'fulfilled') setNews((newsRes.value.data ?? []).slice(0, 3))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const status = marketStatus()
  const h = nowPKT().getHours()
  const GreetIcon = h < 6 ? Moon : h < 12 ? Sunrise : h < 18 ? Sun : Moon
  const displayName = userName || undefined

  const topSec  = sectors.slice(0, 3)
  const weakSec = [...sectors].sort((a, b) => a.avgPct - b.avgPct).slice(0, 2)

  const sentimentPct = gainers + losers > 0
    ? Math.round((gainers / (gainers + losers)) * 100) : 50

  if (loading) {
    return (
      <div className="rounded-2xl animate-pulse"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', height: 200 }} />
    )
  }

  const colCls = "px-5 py-4 border-b lg:border-b-0 lg:border-r last:border-r-0 last:border-b-0"

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{
          borderColor: 'var(--bg-border)',
          background: 'linear-gradient(90deg,rgba(254,165,0,.07) 0%,transparent 60%)',
        }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
            <GreetIcon size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#FEA500' }}>
              Morning Market Brief
            </p>
            <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {greeting()}{displayName ? `, ${displayName}` : ''} 👋
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{
              backgroundColor: status.open ? 'rgba(22,163,74,.1)' : 'rgba(107,114,128,.1)',
              color: status.open ? '#16a34a' : 'var(--text-muted)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: status.open ? '#16a34a' : '#9ca3af' }} />
            {status.open ? 'Market Open'
              : status.minutesToOpen != null ? `Opens in ${fmt(status.minutesToOpen)}`
              : status.label}
          </div>
          <button onClick={load} title="Refresh"
            className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity">
            <RefreshCw size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* ── 4-column body ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4"
        style={{ borderColor: 'var(--bg-border)' }}>

        {/* ── 1. Market Overview ──────────────────────────────────── */}
        <div className={colCls} style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <BarChart3 size={10} /> Market Overview
          </p>

          {kse100 ? (
            <div className="space-y-3">
              {/* Big number */}
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-[26px] font-bold tabular-nums leading-none"
                    style={{ color: 'var(--text-primary)' }}>
                    {kse100.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-xs font-bold mb-0.5 ${kse100.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {kse100.changePct >= 0 ? '▲' : '▼'} {Math.abs(kse100.changePct).toFixed(2)}%
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  KSE-100 &nbsp;·&nbsp;
                  <span className={kse100.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {kse100.change >= 0 ? '+' : ''}{kse100.change.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts
                  </span>
                </p>
              </div>

              {/* Sentiment bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-green-500 font-semibold">{gainers} Up</span>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Market Breadth</span>
                  <span className="text-[10px] text-red-500 font-semibold">{losers} Down</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                    style={{ width: `${sentimentPct}%` }} />
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)' }}>
                <Activity size={11} style={{ color: '#FEA500' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Vol: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {totalVol >= 1e9 ? `${(totalVol / 1e9).toFixed(2)}B`
                      : totalVol >= 1e6 ? `${(totalVol / 1e6).toFixed(0)}M`
                      : totalVol.toLocaleString()}
                  </span>
                </span>
              </div>

              {/* Trend line */}
              <p className="text-[11px] font-medium"
                style={{ color: kse100.changePct >= 0 ? '#16a34a' : '#dc2626' }}>
                {kse100.changePct >= 0 ? '📈 Trending upward today' : '📉 Under selling pressure'}
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>

        {/* ── 2. Sector Performance ───────────────────────────────── */}
        <div className={colCls} style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <TrendingUp size={10} /> Sector Performance
          </p>

          <div className="space-y-1">
            {topSec.length > 0 && (
              <>
                <p className="text-[9px] uppercase tracking-wider mb-1 font-semibold text-green-500">Top Gaining</p>
                {topSec.map(s => (
                  <div key={s.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(22,163,74,.06)' }}>
                    <div className="w-1 h-full min-h-[12px] rounded-full bg-green-500 shrink-0" />
                    <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                    <span className="text-[11px] font-bold text-green-500 tabular-nums shrink-0">+{s.avgPct.toFixed(2)}%</span>
                  </div>
                ))}
              </>
            )}

            {weakSec.length > 0 && (
              <>
                <p className="text-[9px] uppercase tracking-wider mt-2 mb-1 font-semibold text-red-400">Weakest</p>
                {weakSec.map(s => (
                  <div key={s.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(220,38,38,.06)' }}>
                    <div className="w-1 h-full min-h-[12px] rounded-full bg-red-400 shrink-0" />
                    <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                    <span className="text-[11px] font-bold text-red-400 tabular-nums shrink-0">{s.avgPct.toFixed(2)}%</span>
                  </div>
                ))}
              </>
            )}

            {topSec.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
            )}
          </div>
        </div>

        {/* ── 3. Top Movers ───────────────────────────────────────── */}
        <div className={colCls} style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <Flame size={10} style={{ color: '#FEA500' }} /> Top Movers Today
          </p>

          {topStocks.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data</p>
          ) : (
            <div className="space-y-2">
              {topStocks.map((s, i) => {
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <Link key={s.symbol} href={`/stocks/${s.symbol}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
                    style={{ backgroundColor: 'var(--bg-hover)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#FEA500')}
                  >
                    <span className="text-base shrink-0">{medals[i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold leading-none group-hover:underline"
                        style={{ color: 'var(--text-primary)' }}>{s.symbol}</p>
                      <p className="text-[9px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold tabular-nums"
                        style={{ color: 'var(--text-primary)' }}>Rs {s.price.toFixed(2)}</p>
                      <p className="text-[10px] font-bold text-green-500">+{s.changePct.toFixed(2)}%</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 4. Hot News ─────────────────────────────────────────── */}
        <div className={colCls} style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <Newspaper size={10} /> Hot News
          </p>

          {news.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No news available</p>
          ) : (
            <div className="space-y-3">
              {news.map((n, i) => (
                <a key={i} href={n.link || '#'} target="_blank" rel="noopener noreferrer"
                  className="block group">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold mt-0.5 shrink-0 w-4" style={{ color: '#FEA500' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-[11.5px] font-medium leading-snug line-clamp-2 group-hover:underline"
                        style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{n.source}</span>
                        <span style={{ color: 'var(--bg-border)' }}>·</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.date)}</span>
                        <ExternalLink size={8} className="opacity-0 group-hover:opacity-50 transition-opacity ml-0.5"
                          style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>
                  {i < news.length - 1 && (
                    <div className="mt-3 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
                  )}
                </a>
              ))}
              <Link href="/news" className="text-[10px] font-semibold hover:underline flex items-center gap-1 mt-1"
                style={{ color: '#FEA500' }}>
                View all news →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
