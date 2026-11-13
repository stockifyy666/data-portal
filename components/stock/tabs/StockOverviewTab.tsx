'use client'

import { useRef, useEffect, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
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

  const SnapCell = ({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) => (
    <div className="flex flex-col gap-1 px-4 py-3"
      style={{ borderRight: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider leading-none" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {loading
        ? <div className="h-4 w-16 rounded animate-pulse mt-0.5" style={{ backgroundColor: 'var(--bg-hover)' }} />
        : <p className="text-sm font-bold font-number leading-none mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
      }
    </div>
  )

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
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
          <Stat label="Open"     value={formatPrice(Number(overview.open))} />
          <Stat label="High"     value={formatPrice(Number(overview.high))} />
          <Stat label="Low"      value={formatPrice(Number(overview.low))} />
          <Stat label="Volume"   value={formatVolume(Number(overview.volume))} />
          <Stat label="52W High" value={formatPrice(Number(overview.high52))} />
          <Stat label="52W Low"  value={formatPrice(Number(overview.low52))} />
          {overview.bidPrice > 0 && <Stat label="Bid" value={formatPrice(overview.bidPrice)} />}
          {overview.askPrice > 0 && <Stat label="Ask" value={formatPrice(overview.askPrice)} />}
        </div>
      </div>

      {/* Company Snapshot */}
      <div className="card">
        <SectionHeading>Company Snapshot</SectionHeading>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
          <div className="px-4 py-2" style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--bg-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>Company Info</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {fundRows.map(r => <SnapCell key={r.label} label={r.label} value={r.value} loading={snapLoad} />)}
          </div>
        </div>
      </div>

      {/* About the Company */}
      <div className="card space-y-4">
        <SectionHeading>About the Company</SectionHeading>
        {profLoad ? (
          <div className="h-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        ) : !description && !auditor && !people.length ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Company profile not available.</p>
        ) : (
          <div className="space-y-4">
            {description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sectorName && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Sector</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sectorName}</p>
                </div>
              )}
              {auditor && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Auditor</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{auditor}</p>
                </div>
              )}
              {registrar && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Registrar</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{registrar}</p>
                </div>
              )}
              {address && (
                <div className="rounded-xl p-3 sm:col-span-2 lg:col-span-2" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Address</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{address}</p>
                </div>
              )}
              {employees !== null && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Employees</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{employees.toLocaleString()}</p>
                </div>
              )}
              {website && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Website</p>
                  <a href={website.startsWith('http') ? website : `https://${website}`}
                     target="_blank" rel="noopener noreferrer"
                     className="text-sm font-semibold hover:underline" style={{ color: '#FEA500' }}>
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {yearEnd && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Year End</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{yearEnd}</p>
                </div>
              )}
              {parValue !== null && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Face Value</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Rs. {parValue}</p>
                </div>
              )}
            </div>

            {(capacity.length > 0 || capacityUtil.length > 0) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Production Capacity</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {capacity.map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                         style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      <span className="mt-0.5 shrink-0">📦</span>{c}
                    </div>
                  ))}
                  {capacityUtil.map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                         style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      <span className="mt-0.5 shrink-0">⚙️</span>Utilization: {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {people.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Key People</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {people.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                           style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {factories.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Factories / Plants</p>
                <div className="flex flex-col gap-1.5">
                  {factories.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                         style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      <span className="mt-0.5 shrink-0 text-[10px]">🏭</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {associated.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Associated Companies</p>
                <div className="flex flex-wrap gap-2">
                  {associated.map((a: string, i: number) => (
                    <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
