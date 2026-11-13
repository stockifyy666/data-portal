'use client'

import React from 'react'
import SymbolLogo from '@/components/ui/SymbolLogo'
import type { Overview, StatementData } from '../stock-detail-types'

type PeerData = {
  symbol: string; name: string; sector: string
  price: number; change: number; changePct: number; volume: number
  high52: number; low52: number; marketCap: number
  eps: number | null; divYield: number | null
  roe: number | null; de: number | null; pb: number | null
}

interface Props {
  symbol:    string
  overview:  Overview | null
  snapFunds: StatementData | null
  peers:     PeerData[]
  peersLoad: boolean
  peerView:  'ranked'
}

const MEDALS = ['🥇', '🥈', '🥉']

function symColor(s: string) {
  const h = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const hues = [210, 160, 280, 30, 320, 180, 60, 240]
  return `hsl(${hues[h % hues.length]},55%,52%)`
}

type PeerEntry = {
  symbol: string; name: string; isSelf: boolean
  price: number; changePct: number; eps: number | null
  pe: number | null; divY: number | null; roe: number | null
  de: number | null; pb: number | null; mc: number | null
  pos52w: number | null
}

function PremiumCard({ label, entries, getValue, fmt, lowerBetter = false }: {
  label: string; entries: PeerEntry[]
  getValue: (e: PeerEntry) => number | null
  fmt: (v: number) => string; lowerBetter?: boolean
}) {
  const vals = entries.map(e => ({ ...e, v: getValue(e) })).filter(e => e.v != null) as (PeerEntry & { v: number })[]
  if (!vals.length) return null
  const selfEntry = vals.find(e => e.isSelf)
  const selfVal = selfEntry?.v ?? null
  const sorted = [...vals].sort((a, b) => lowerBetter ? a.v - b.v : b.v - a.v)
  const rank = selfVal != null ? sorted.findIndex(e => e.isSelf) + 1 : null
  const maxAbs = Math.max(...vals.map(e => Math.abs(e.v)), 1)
  const fillPct = (e: { v: number }) => maxAbs > 0 ? Math.abs(e.v) / maxAbs * 100 : 0
  const rankBarW = rank != null ? ((vals.length - rank + 1) / vals.length) * 100 : 0

  return (
    <div style={{ border: '1px solid var(--bg-border)', borderRadius: 12, overflow: 'hidden' }}>
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
      {rank != null && (
        <div style={{ height: 3, background: 'var(--bg-border)' }}>
          <div style={{ height: '100%', width: `${rankBarW}%`, background: 'linear-gradient(90deg,#FEA500,#986300)', transition: 'width 0.4s ease' }} />
        </div>
      )}
      <div style={{ background: 'var(--bg-card)' }}>
        {sorted.map((e, i) => {
          const pct = fillPct(e)
          const isNeg = e.v < 0
          const rowBg = e.isSelf ? 'rgba(254,165,0,0.07)' : 'transparent'
          const fillColor = e.isSelf ? 'rgba(254,165,0,0.22)' : isNeg ? 'rgba(220,38,38,0.1)' : 'rgba(100,160,100,0.18)'
          const textColor = e.isSelf ? '#FEA500' : isNeg ? 'var(--color-down)' : 'var(--text-secondary)'
          return (
            <div key={e.symbol} className="relative flex items-center gap-2 px-3"
              style={{
                height: 32,
                borderBottom: i < sorted.length - 1 ? '1px solid var(--bg-border)' : 'none',
                background: rowBg,
                borderLeft: e.isSelf ? '3px solid #FEA500' : '3px solid transparent',
              }}>
              <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: fillColor, pointerEvents: 'none' }} />
              <div style={{ width: 20, flexShrink: 0, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {i < 3
                  ? <span style={{ fontSize: 11 }}>{MEDALS[i]}</span>
                  : <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                }
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 72, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <SymbolLogo symbol={e.symbol} size={20} isSelf={e.isSelf} />
                <span style={{ fontSize: 10, fontWeight: e.isSelf ? 700 : 500, color: e.isSelf ? '#FEA500' : 'var(--text-secondary)' }}>{e.symbol}</span>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, fontWeight: e.isSelf ? 700 : 400, fontVariantNumeric: 'tabular-nums', color: textColor, position: 'relative', zIndex: 1 }}>{fmt(e.v)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function StockPeersTab({ symbol, overview, snapFunds, peers, peersLoad }: Props) {
  if (peersLoad) {
    return (
      <div className="card space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        ))}
      </div>
    )
  }

  if (peers.length === 0) {
    return <div className="card text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No peer data available.</div>
  }

  const selfPrice = overview?.price ?? 0

  function pickSelf(pattern: RegExp): number | null {
    return snapFunds?.fields.find(f => !f.is_heading && pattern.test(f.label))?.values[0] ?? null
  }

  const selfEps  = pickSelf(/\beps\b|earnings per share/i)
  const selfDivY = pickSelf(/dividend yield/i)
  const selfPe   = selfEps != null && selfEps > 0 ? selfPrice / selfEps : null
  const selfRoe  = pickSelf(/return on equity|roe\b/i)
  const selfDe   = pickSelf(/debt.?to.?equity|debt.?equity|de ratio/i)
  const selfPb   = pickSelf(/price.?book|p\/b\b/i)
  const selfMc   = overview?.marketCap ?? 0
  const selfChgPct = overview?.changePct ?? 0
  const self52W = overview && overview.high52 > 0 && overview.low52 > 0 && selfPrice > 0 && overview.high52 > overview.low52
    ? ((selfPrice - overview.low52) / (overview.high52 - overview.low52)) * 100 : null

  const allEntries: PeerEntry[] = [
    {
      symbol, name: overview?.name ?? symbol, isSelf: true,
      price: selfPrice, changePct: selfChgPct, eps: selfEps,
      pe: selfPe, divY: selfDivY, roe: selfRoe,
      de: selfDe, pb: selfPb, mc: selfMc || null, pos52w: self52W,
    },
    ...peers.map(p => {
      const pe = p.eps != null && p.eps > 0 ? p.price / p.eps : null
      const pos52w = p.high52 > 0 && p.low52 > 0 && p.price > 0 && p.high52 > p.low52
        ? ((p.price - p.low52) / (p.high52 - p.low52)) * 100 : null
      return {
        symbol: p.symbol, name: p.name, isSelf: false,
        price: p.price, changePct: p.changePct, eps: p.eps,
        pe, divY: p.divYield, roe: p.roe, de: p.de, pb: p.pb,
        mc: p.marketCap || null, pos52w,
      }
    }),
  ]

  const validPe   = allEntries.map(e => e.pe).filter((v): v is number => v != null && v > 0 && v < 200)
  const validDivY = allEntries.map(e => e.divY).filter((v): v is number => v != null && v > 0)
  const validRoe  = allEntries.map(e => e.roe).filter((v): v is number => v != null)
  const validEps  = allEntries.map(e => e.eps).filter((v): v is number => v != null)
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const sectorPe   = avg(validPe)
  const sectorDivY = avg(validDivY)
  const sectorRoe  = avg(validRoe)
  const sectorEps  = avg(validEps)

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'P / E',          val: selfPe    != null ? selfPe.toFixed(1)         : '—', sub: sectorPe   ? `Sector ${sectorPe.toFixed(1)} · ${validPe.length} profitable`    : 'Sector avg n/a', pos: true },
          { label: 'Dividend Yield', val: selfDivY  != null ? `${selfDivY.toFixed(2)}%`  : '—', sub: sectorDivY ? `Sector ${sectorDivY.toFixed(2)}% · ${validDivY.length} payers`   : 'Sector avg n/a', pos: true },
          { label: 'ROE',            val: selfRoe   != null ? `${selfRoe.toFixed(2)}%`   : '—', sub: sectorRoe  ? `Sector ${sectorRoe.toFixed(2)}% · ${validRoe.length} companies`  : 'Sector avg n/a', pos: (selfRoe ?? 0) >= 0 },
          { label: 'EPS',            val: selfEps   != null ? `Rs ${selfEps.toFixed(2)}` : '—', sub: sectorEps  ? `Sector avg Rs ${sectorEps.toFixed(2)}`                           : 'Sector avg n/a', pos: (selfEps ?? 0) >= 0 },
        ].map(c => (
          <div key={c.label} className="card" style={{ background: 'rgba(254,165,0,0.04)', border: '1px solid rgba(254,165,0,0.15)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold" style={{ color: c.pos ? 'var(--text-primary)' : '#dc2626' }}>{c.val}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Comparison card */}
      <div className="card" style={{ padding: '1rem' }}>
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Sector Comparison</span>
        </div>
        <div className="space-y-5">
          <SectionGroup title="Price & Market">
            <PremiumCard label="Price"       entries={allEntries} getValue={e => e.price}    fmt={v => `Rs ${v.toFixed(0)}`} />
            <PremiumCard label="Chg %"       entries={allEntries} getValue={e => e.changePct} fmt={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
            <PremiumCard label="Mkt Cap"     entries={allEntries} getValue={e => e.mc}        fmt={v => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : `${(v / 1e6).toFixed(0)}M`} />
            <PremiumCard label="52W Position" entries={allEntries} getValue={e => e.pos52w}  fmt={v => `${v.toFixed(0)}%`} />
          </SectionGroup>
          <SectionGroup title="Valuation">
            <PremiumCard label="P / E"    entries={allEntries} getValue={e => e.pe != null && e.pe > 0 && e.pe < 500 ? e.pe : null} fmt={v => v.toFixed(1)} lowerBetter />
            <PremiumCard label="P / B"    entries={allEntries} getValue={e => e.pb}   fmt={v => `${v.toFixed(2)}x`} lowerBetter />
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
      </div>
    </div>
  )
}
