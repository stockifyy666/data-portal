'use client'

import { useRef, useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, Building2, Scale, Coins, Layers, Users, CalendarDays, BadgeDollarSign,
  ShieldCheck, FileText, MapPin, Globe, Package, Gauge, Factory } from 'lucide-react'
import { SectionHeading } from '../stock-detail-helpers'
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/utils/format'
import type { Overview, StatementData, ProfileData } from '../stock-detail-types'

/* ── Stat cell ── */
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

/* ── GaugeMeter ── */
function GaugeMeter({ score, label, sub, color, displayValue, badge }: {
  score: number | null; label: string; sub: string; color: string
  displayValue?: string; badge?: string
}) {
  const W = 170, H = 140
  const cx = W / 2, cy = 82
  const R  = 60
  const TW = 9

  const toRad = (d: number) => (d * Math.PI) / 180
  const pt    = (deg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy - r * Math.sin(toRad(deg)),
  })
  const arcPartial = (d1: number, d2: number) => {
    const p1 = pt(d1, R), p2 = pt(d2, R)
    const lg = Math.abs(d1 - d2) > 180 ? 1 : 0
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  const pct    = score !== null ? Math.min(1, Math.max(0, score / 100)) : null
  const endDeg = pct !== null
    ? (pct >= 0.999 ? 0.1 : pct <= 0.001 ? 179.9 : 180 - pct * 180)
    : 180
  const needleRot = pct !== null ? pct * 180 - 90 : -90

  const [cssRot, setCssRot] = useState(-90)
  const prevRot = useRef(needleRot)
  useEffect(() => {
    const id = requestAnimationFrame(() => setCssRot(needleRot))
    return () => cancelAnimationFrame(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prevRot.current === needleRot) return
    prevRot.current = needleRot
    setCssRot(needleRot)
  }, [needleRot])

  const activeCol = score === null ? '#94a3b8'
    : score >= 70 ? '#16a34a'
    : score >= 45 ? '#f59e0b'
    : '#dc2626'

  const ratingLabel = badge ?? (
    score === null ? 'N/A'
    : score >= 80 ? 'Excellent'
    : score >= 65 ? 'Good'
    : score >= 45 ? 'Fair'
    : score >= 25 ? 'Weak'
    : 'Poor'
  )
  const displayVal = displayValue ?? (score !== null ? String(score) : '—')
  const nLen = R - TW - 6
  const gid  = `gm-${label.replace(/\W/g, '')}`

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)',
      borderRadius: 20, padding: '8px 8px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#dc2626" />
            <stop offset="35%"  stopColor="#f97316" />
            <stop offset="65%"  stopColor="#eab308" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <path d={arcPartial(180, 0.1)} fill="none" stroke="var(--bg-hover)" strokeWidth={TW} strokeLinecap="round" />
        {pct !== null && pct > 0.005 && (
          <path d={arcPartial(180, endDeg)} fill="none" stroke={`url(#${gid})`} strokeWidth={TW} strokeLinecap="round" />
        )}
        {[0, 25, 50, 75, 100].map(t => {
          const deg = 180 - t * 1.8
          const p1  = pt(deg, R - TW / 2 - 1)
          const p2  = pt(deg, R + TW / 2 + 1)
          return <line key={t} x1={p1.x.toFixed(1)} y1={p1.y.toFixed(1)} x2={p2.x.toFixed(1)} y2={p2.y.toFixed(1)} stroke="var(--bg-card)" strokeWidth={2.5} strokeLinecap="round" />
        })}
        {([0, 50, 100] as const).map(t => {
          const lp = pt(180 - t * 1.8, R + TW / 2 + 12)
          return <text key={t} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="var(--text-muted)">{t}</text>
        })}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${cssRot}deg)`, transition: 'transform 1.1s cubic-bezier(0.34, 1.1, 0.64, 1)' }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - nLen} stroke="rgba(0,0,0,0.12)" strokeWidth={5} strokeLinecap="round" />
          <line x1={cx} y1={cy + 6} x2={cx} y2={cy - nLen} stroke={activeCol} strokeWidth={3} strokeLinecap="round" style={{ transition: 'stroke 0.5s' }} />
        </g>
        <circle cx={cx} cy={cy} r={9} fill="var(--bg-card)" stroke="var(--bg-border)" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={4} fill={activeCol} style={{ transition: 'fill 0.5s' }} />
        <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="900" fontFamily="inherit" fill={activeCol} style={{ transition: 'fill 0.5s' }}>{displayVal}</text>
        {(() => {
          const pw = ratingLabel.length * 5.8 + 12
          return (
            <>
              <rect x={cx - pw / 2} y={cy + 36} width={pw} height={15} rx={7.5} fill={`${activeCol}1a`} stroke={`${activeCol}55`} strokeWidth={1} />
              <text x={cx} y={cy + 43.5} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="800" fill={activeCol} style={{ transition: 'fill 0.5s' }}>{ratingLabel}</text>
            </>
          )
        })()}
      </svg>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, textAlign: 'center' }}>{label}</p>
      <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 1 }}>{sub}</p>
    </div>
  )
}

/* ── Props ── */
interface Props {
  symbol:       string
  overview:     Overview | null
  overviewLoad: boolean
  snapFunds:    StatementData | null
  snapLoad:     boolean
  profile:      ProfileData | null
  profLoad:     boolean
}

export function StockOverviewTab({ symbol, overview, overviewLoad, snapFunds, snapLoad, profile, profLoad }: Props) {
  if (overviewLoad) {
    return (
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
    )
  }

  if (!overview) {
    return <div className="card"><p style={{ color: 'var(--text-muted)' }}>No overview data available.</p></div>
  }

  const isUp = Number(overview.changePct ?? 0) >= 0

  /* ── Snapshot formatters ── */
  function pick(pattern: RegExp): number | null {
    if (!snapFunds) return null
    return snapFunds.fields.find(f => !f.is_heading && pattern.test(f.label.trim()))?.values[0] ?? null
  }
  function fmtSnap(key: string, raw: number | null): string {
    if (raw == null || isNaN(raw)) return '-'
    switch (key) {
      case 'divYield': case 'netMargin': return `${raw.toFixed(2)}%`
      case 'freeFloatPct': return `${raw.toFixed(2)}%`
      case 'eps': case 'pe': case 'pb': case 'peg': return raw.toFixed(2)
      case 'mktCap': case 'sharesOut': case 'freeFloat': {
        const abs = Math.abs(raw)
        if (abs >= 1_000_000_000) return `${(raw / 1_000_000_000).toFixed(2)}B`
        if (abs >= 1_000_000)     return `${(raw / 1_000_000).toFixed(2)}M`
        if (abs >= 1_000)         return `${(raw / 1_000).toFixed(2)}K`
        return raw.toFixed(2)
      }
      case 'lastDayVol': {
        const abs = Math.abs(raw)
        if (abs >= 1_000_000) return `${(raw / 1_000_000).toFixed(2)}M`
        if (abs >= 1_000)     return `${(raw / 1_000).toFixed(1)}K`
        return raw.toFixed(0)
      }
      default: return raw.toFixed(2)
    }
  }

  const snap = {
    mktCap:       overview.marketCap   ?? null,
    sharesOut:    overview.sharesOut    ?? null,
    freeFloat:    overview.freeFloat    ?? null,
    lastDayVol:   overview.lastDayVol   ?? null,
    freeFloatPct: overview.freeFloatPct ?? null,
    divYield:     pick(/dividend yield/i),
    eps:          pick(/\beps\b|latest eps|earnings per share/i),
    netMargin:    pick(/net.*income.*margin|net.*profit.*margin/i),
    pb:           pick(/price.?book|price.*to.*book|p\/b\b/i),
    pe:           pick(/price.?to.?earn|price.?earning|p\/e\b/i),
    peg:          pick(/peg/i),
  }

  const fundRows = [
    { label: 'Market Cap',         key: 'mktCap',       value: fmtSnap('mktCap',       snap.mktCap)       },
    { label: 'Shares Outstanding', key: 'sharesOut',    value: fmtSnap('sharesOut',    snap.sharesOut)    },
    { label: 'Free Float Shares',  key: 'freeFloat',    value: fmtSnap('freeFloat',    snap.freeFloat)    },
    { label: "Last Day's Volume",  key: 'lastDayVol',   value: fmtSnap('lastDayVol',   snap.lastDayVol)   },
    { label: 'Free Float %',       key: 'freeFloatPct', value: fmtSnap('freeFloatPct', snap.freeFloatPct) },
    { label: 'Dividend Yield',     key: 'divYield',     value: fmtSnap('divYield',     snap.divYield)     },
    { label: 'Earnings Per Share', key: 'eps',          value: fmtSnap('eps',          snap.eps)          },
    { label: 'Net Income Margin',  key: 'netMargin',    value: fmtSnap('netMargin',    snap.netMargin)    },
    { label: 'Price to Book',      key: 'pb',           value: fmtSnap('pb',           snap.pb)           },
    { label: 'Price to Earnings',  key: 'pe',           value: fmtSnap('pe',           snap.pe)           },
    { label: 'PEG Ratio',          key: 'peg',          value: fmtSnap('peg',          snap.peg)          },
  ]

  /* ── About the company ── */
  const ov         = profile?.overview
  const leg        = profile?.profile?.data
  const description  = ov?.description  || leg?.description
  const auditor      = ov?.auditors     || leg?.auditors
  const registrar    = ov?.registrar?.[0]
  const address      = ov?.offices?.[0] || leg?.offices?.[0]
  const rawWebsite   = ov?.website ?? ''
  const mdMatch      = rawWebsite.match(/\(([^)]+)\)$/)
  const website      = mdMatch ? mdMatch[1] : rawWebsite || undefined
  const sectorName   = ov?.sector_name  || leg?.sector_name
  const employees    = ov?.employees    ?? null
  const factories    = ov?.factories    ?? []
  const associated   = ov?.associated   ?? []
  const capacity     = ov?.capacity     ?? []
  const capacityUtil = ov?.capacity_util ?? []
  const yearEnd      = ov?.year_end     ?? null
  const parValue     = ov?.par_value    ?? null
  const people: Array<{ name: string; position: string }> =
    ov?.people?.length
      ? ov.people
      : (profile?.org?.data?.per ?? []).map((p: { nm: string; des: string }) => ({ name: p.nm, position: p.des }))

  return (
    <div className="space-y-4">
      {/* Price card */}
      {(() => {
        const price = Number(overview.price), lo = Number(overview.low), hi = Number(overview.high)
        const lo52 = Number(overview.low52), hi52 = Number(overview.high52)
        const pos = (v: number, a: number, b: number) => (b > a ? Math.min(100, Math.max(0, ((v - a) / (b - a)) * 100)) : 50)
        const dir = isUp ? '#16a34a' : '#dc2626'
        const bid = Number(overview.bidPrice), ask = Number(overview.askPrice)
        const spread = bid > 0 && ask > 0 ? ask - bid : null
        const Range = ({ label, a, b, v }: { label: string; a: number; b: number; v: number }) => (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{pos(v, a, b).toFixed(0)}% of range</span>
            </div>
            <div className="relative h-2 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(220,38,38,0.35), rgba(148,163,184,0.25), rgba(22,163,74,0.35))' }}>
              <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full"
                style={{ left: `${pos(v, a, b)}%`, background: '#FEA500', border: '2px solid var(--bg-card)', boxShadow: '0 0 0 2px rgba(254,165,0,0.35)' }} />
            </div>
            <div className="flex justify-between mt-1.5 text-xs font-bold font-number tabular-nums" style={{ color: 'var(--text-primary)' }}>
              <span>{formatPrice(a)}</span><span>{formatPrice(b)}</span>
            </div>
          </div>
        )
        return (
          <div className="card grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            {/* Price + change */}
            <div className="flex flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Last price</p>
                <p className="text-4xl sm:text-[44px] font-black font-number tabular-nums leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                  {formatPrice(price)}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-bold font-number"
                  style={{ color: dir, background: isUp ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)' }}>
                  {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  {formatChange(Number(overview.change))} ({formatPercent(Number(overview.changePct))})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { l: 'Open',   v: formatPrice(Number(overview.open)) },
                  { l: 'Volume', v: formatVolume(Number(overview.volume)) },
                  { l: 'Bid',    v: bid > 0 ? formatPrice(bid) : '—' },
                  { l: 'Ask',    v: ask > 0 ? formatPrice(ask) : '—' },
                ].map(x => (
                  <div key={x.l} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{x.l}</p>
                    <p className="text-sm font-bold font-number tabular-nums mt-0.5" style={{ color: 'var(--text-primary)' }}>{x.v}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Ranges */}
            <div className="flex flex-col justify-center gap-5 lg:pl-6 lg:border-l" style={{ borderColor: 'var(--bg-border)' }}>
              <Range label="Today&apos;s range" a={lo} b={hi} v={price} />
              <Range label="52-week range" a={lo52} b={hi52} v={price} />
              {spread != null && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Bid–ask spread <b className="font-number" style={{ color: 'var(--text-primary)' }}>{formatPrice(spread)}</b>
                  {price > 0 && <> · {((spread / price) * 100).toFixed(2)}% of price</>}
                </p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Company Snapshot — grouped */}
      <div className="card">
        <SectionHeading>Company Snapshot</SectionHeading>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: 'Size & float',        icon: Building2, accent: '#3b82f6', keys: ['mktCap', 'sharesOut', 'freeFloat', 'freeFloatPct'] },
            { title: 'Valuation',           icon: Scale,     accent: '#8b5cf6', keys: ['pe', 'pb', 'peg', 'divYield'] },
            { title: 'Earnings & activity', icon: Coins,     accent: '#10b981', keys: ['eps', 'netMargin', 'lastDayVol'] },
          ].map(g => (
            <div key={g.title} className="rounded-xl overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${g.accent}14, transparent 55%)`, border: `1px solid ${g.accent}38` }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${g.accent}26`, color: g.accent }}>
                  <g.icon size={14} />
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{g.title}</span>
              </div>
              <dl>
                {g.keys.map((k, i) => {
                  const r = fundRows.find(f => f.key === k)!
                  return (
                    <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderTop: i ? '1px solid var(--bg-border)' : 'none' }}>
                      <dt className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{r.label}</dt>
                      {snapLoad
                        ? <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                        : <dd className="text-[15px] font-bold font-number tabular-nums" style={{ color: r.value === '-' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{r.value === '-' ? '—' : r.value}</dd>}
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* About the Company */}
      <div className="card space-y-5">
        <SectionHeading>About the Company</SectionHeading>
        {profLoad ? (
          <div className="h-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        ) : !description && !auditor && !people.length ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Company profile not available.</p>
        ) : (() => {
          const details = [
            sectorName       && { icon: Layers,    label: 'Sector',     value: <span className="capitalize">{String(sectorName).toLowerCase()}</span> },
            employees !== null && { icon: Users,   label: 'Employees',  value: employees.toLocaleString() },
            yearEnd          && { icon: CalendarDays, label: 'Financial year end', value: yearEnd },
            parValue !== null && { icon: BadgeDollarSign, label: 'Face value', value: `Rs. ${parValue}` },
            auditor          && { icon: ShieldCheck, label: 'Auditor',  value: auditor },
            registrar        && { icon: FileText,  label: 'Registrar',  value: registrar },
            address          && { icon: MapPin,    label: 'Head office', value: address },
            website          && { icon: Globe,     label: 'Website', value: (
              <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer"
                className="hover:underline" style={{ color: '#FEA500' }}>{website.replace(/^https?:\/\//, '')}</a>) },
          ].filter(Boolean) as { icon: typeof Users; label: string; value: React.ReactNode }[]

          const LEAD = /(chief executive|\bceo\b|managing director|chief financial|\bcfo\b|chair|company secretary|secretary)/i
          const leaders   = people.filter(p => LEAD.test(p.position))
          const directors = people.filter(p => !LEAD.test(p.position))
          const initials  = (n: string) => n.replace(/\b(Lt\.?|Gen\.?|Brig\.?|Maj\.?|Capt\.?|Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Syed|\(.*?\))\s*/gi, '')
            .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || n[0]
          const Label = ({ children }: { children: React.ReactNode }) => (
            <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-primary)' }}>{children}</p>
          )

          return (
            <div className="space-y-6">
              {description && (
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)', opacity: 0.85 }}>{description}</p>
              )}

              {/* Company details */}
              {details.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
                  <dl className="grid md:grid-cols-2">
                    {details.map((d, i) => (
                      <div key={d.label}
                        className={`flex items-start gap-3 px-4 py-3 ${i === 0 ? '' : i === 1 ? 'border-t md:border-t-0' : 'border-t'}`}
                        style={{ borderColor: 'var(--bg-border)' }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(254,165,0,0.12)', color: '#FEA500' }}>
                          <d.icon size={15} />
                        </span>
                        <div className="min-w-0">
                          <dt className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.label}</dt>
                          <dd className="text-sm font-semibold mt-0.5 break-words" style={{ color: 'var(--text-primary)' }}>{d.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Production capacity */}
              {(capacity.length > 0 || capacityUtil.length > 0) && (
                <div>
                  <Label>Production capacity</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {capacity.map((c: string, i: number) => (
                      <div key={`c${i}`} className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), transparent)', border: '1px solid rgba(59,130,246,0.3)' }}>
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.18)', color: '#3b82f6' }}>
                          <Package size={17} />
                        </span>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Installed capacity</p>
                          <p className="text-base font-bold font-number" style={{ color: 'var(--text-primary)' }}>{c}</p>
                        </div>
                      </div>
                    ))}
                    {capacityUtil.map((c: string, i: number) => (
                      <div key={`u${i}`} className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), transparent)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981' }}>
                          <Gauge size={17} />
                        </span>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Capacity utilization</p>
                          <p className="text-base font-bold font-number" style={{ color: 'var(--text-primary)' }}>{c}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leadership */}
              {leaders.length > 0 && (
                <div>
                  <Label>Leadership</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {leaders.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl p-3.5"
                        style={{ background: 'linear-gradient(135deg, rgba(254,165,0,0.12), transparent)', border: '1px solid rgba(254,165,0,0.3)' }}>
                        <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                          {initials(p.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                          <p className="text-xs font-semibold mt-0.5" style={{ color: '#FEA500' }}>{p.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Board of directors */}
              {directors.length > 0 && (
                <div>
                  <Label>Board of directors <span className="font-semibold normal-case tracking-normal" style={{ color: 'var(--text-secondary)' }}>· {directors.length}</span></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {directors.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                          style={{ background: 'rgba(148,163,184,0.18)', color: 'var(--text-primary)' }}>
                          {initials(p.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={p.name}>{p.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{p.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Factories */}
              {factories.length > 0 && (
                <div>
                  <Label>Factories &amp; plants</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {factories.map((f: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
                        <Factory size={15} className="shrink-0 mt-0.5" style={{ color: '#FEA500' }} />
                        <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated companies */}
              {associated.length > 0 && (
                <div>
                  <Label>Associated companies</Label>
                  <div className="flex flex-wrap gap-2">
                    {associated.map((x: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }}>
                        <Building2 size={12} style={{ color: '#FEA500' }} /> {x}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
