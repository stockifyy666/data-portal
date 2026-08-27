'use client'

import { useState, useEffect, useMemo } from 'react'
import Link                              from 'next/link'
import { cachedFetch }                   from '@/lib/utils/clientCache'
import type { StockQuote }               from '@/types/market'

/* ── Constants ────────────────────────────────────────────────────── */
const SECTOR_NAMES: Record<string, string> = {
  '0801': 'Automobiles',          '0802': 'Auto Parts',
  '0803': 'Cable & Electrical',   '0804': 'Cement',
  '0805': 'Chemical',             '0806': 'Closed-End MF',
  '0807': 'Commercial Banks',     '0808': 'Engineering',
  '0809': 'Fertilizers',          '0810': 'Food & Personal Care',
  '0811': 'Glass & Ceramics',     '0812': 'Insurance',
  '0813': 'Inv. Companies',       '0814': 'Jute',
  '0815': 'Leasing',              '0816': 'Leather',
  '0818': 'Miscellaneous',        '0819': 'Modarbas',
  '0820': 'Oil & Gas Expl.',      '0821': 'Oil & Gas Mktg.',
  '0822': 'Paper & Board',        '0823': 'Pharmaceuticals',
  '0824': 'Power Generation',     '0825': 'Refinery',
  '0826': 'Sugar & Allied',       '0827': 'Synthetic & Rayon',
  '0828': 'Technology',           '0829': 'Textile Composite',
  '0830': 'Textile Spinning',     '0831': 'Textile Weaving',
  '0832': 'Tobacco',              '0833': 'Transport',
  '0834': 'Vanaspati',            '0835': 'Woolen',
  '0836': 'REIT',                 '0837': 'ETFs',
  '0838': 'Real Estate',          '0839': 'Textile (Other)',
}


const CONTAINER_H = 540   // px height of the heatmap canvas

/* ── Helpers ──────────────────────────────────────────────────────── */
function heatColor(pct: number): string {
  if (pct >= 5)    return '#166534'
  if (pct >= 2.5)  return '#16a34a'
  if (pct >= 1)    return '#22c55e'
  if (pct >= 0)    return '#4ade80'
  if (pct >= -1)   return '#f87171'
  if (pct >= -2.5) return '#ef4444'
  if (pct >= -5)   return '#dc2626'
  return                  '#991b1b'
}

function isRegularShare(name: string): boolean {
  if (!name || !name.trim()) return false
  if (/\(R\d*\)|\bRight\b/i.test(name)) return false
  return true
}

/* ── Binary-partition treemap ─────────────────────────────────────── */
type Rect = { id: string; x: number; y: number; w: number; h: number }

function treeMap(
  items: { id: string; size: number }[],
  x: number, y: number, w: number, h: number,
): Rect[] {
  if (items.length === 0) return []
  if (items.length === 1) return [{ id: items[0].id, x, y, w, h }]

  const total = items.reduce((s, i) => s + i.size, 0)

  // Find split that puts ~50% area on each side
  let acc = 0, split = 1
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].size / total
    if (acc >= 0.5) { split = i + 1; break }
  }

  const leftShare = items.slice(0, split).reduce((s, i) => s + i.size, 0) / total

  if (w >= h) {
    // Split vertically (left | right)
    const lw = w * leftShare
    return [
      ...treeMap(items.slice(0, split), x,      y, lw,      h),
      ...treeMap(items.slice(split),    x + lw, y, w - lw,  h),
    ]
  } else {
    // Split horizontally (top / bottom)
    const th = h * leftShare
    return [
      ...treeMap(items.slice(0, split), x, y,      w, th     ),
      ...treeMap(items.slice(split),    x, y + th, w, h - th ),
    ]
  }
}

/* ── Types ────────────────────────────────────────────────────────── */
type SectorData = {
  code: string; name: string
  stocks: StockQuote[]; totalVolume: number
}

const INDICES = [
  { value: 'KSE100',    label: 'KSE-100'      },
  { value: 'KSE30',     label: 'KSE-30'       },
  { value: 'KMI30',     label: 'KMI-30'       },
  { value: 'KMIALLSHR', label: 'KMI All Share' },
  { value: 'ALLSHR',    label: 'All Share'     },
]

/* ── Main Component ───────────────────────────────────────────────── */
export default function CombinedHeatmap() {
  const [quotes,  setQuotes]  = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [index,   setIndex]   = useState('ALLSHR')

  useEffect(() => {
    cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000)
      .then(json => { if (json.quotes) setQuotes(json.quotes) })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  /* Group by sector */
  const sectors = useMemo<SectorData[]>(() => {
    let list = quotes.filter(q => q.price > 0 && q.volume > 0 && isRegularShare(q.name))
    if (index) list = list.filter(q => q.indexKeys?.includes(index))

    const map: Record<string, SectorData> = {}
    for (const q of list) {
      const code = q.sector || '0000'
      if (!map[code]) map[code] = { code, name: SECTOR_NAMES[code] ?? `Sector ${code}`, stocks: [], totalVolume: 0 }
      map[code].stocks.push(q)
      map[code].totalVolume += q.volume
    }

    return Object.values(map)
      .map(s => ({ ...s, stocks: s.stocks.sort((a, b) => b.volume - a.volume).slice(0, 20) }))
      .filter(s => s.stocks.length > 0)
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 22) // top 22 sectors
  }, [quotes, index])

  /* Compute sector rectangles (0–100 coordinate space) */
  const sectorRects = useMemo<Rect[]>(() => {
    if (!sectors.length) return []
    return treeMap(
      sectors.map(s => ({ id: s.code, size: s.totalVolume })),
      0, 0, 100, 100,
    )
  }, [sectors])

  /* Compute stock rectangles within each sector */
  const stockRects = useMemo<Record<string, Rect[]>>(() => {
    const out: Record<string, Rect[]> = {}
    for (const sr of sectorRects) {
      const sec = sectors.find(s => s.code === sr.id)
      if (!sec) continue
      out[sr.id] = treeMap(
        sec.stocks.map(s => ({ id: s.symbol, size: s.volume })),
        0, 0, 100, 100,
      )
    }
    return out
  }, [sectors, sectorRects])

  /* ── Render ── */
  if (loading) return (
    <div className="rounded-lg animate-pulse mt-4" style={{ height: CONTAINER_H, backgroundColor: 'var(--bg-hover)' }} />
  )
  if (error) return <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>{error}</p>

  return (
    <div className="space-y-3">

      {/* Index selector */}
      <div className="flex gap-1 flex-wrap">
        {INDICES.map(idx => (
          <button key={idx.value} onClick={() => setIndex(idx.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={index === idx.value
              ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
              : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {idx.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        <span>Change %:</span>
        {[
          { label: '≥+5%', color: '#166534' }, { label: '+2.5%', color: '#16a34a' },
          { label: '+1%',  color: '#22c55e' }, { label: '0%',    color: '#4ade80' },
          { label: '-1%',  color: '#f87171' }, { label: '-2.5%', color: '#ef4444' },
          { label: '-5%',  color: '#dc2626' }, { label: '≤-5%',  color: '#991b1b' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
        <span className="ml-1 opacity-60">· Box size = volume</span>
      </div>

      {/* Treemap canvas */}
      <div style={{ position: 'relative', width: '100%', height: CONTAINER_H, borderRadius: 6, overflow: 'hidden' }}>
        {sectorRects.map(sr => {
          const sec   = sectors.find(s => s.code === sr.id)
          if (!sec) return null
          const srecs = stockRects[sr.id] ?? []

          return (
            <div
              key={sr.id}
              style={{
                position: 'absolute',
                left:   `${sr.x}%`,
                top:    `${sr.y}%`,
                width:  `${sr.w}%`,
                height: `${sr.h}%`,
                padding: 1,
                boxSizing: 'border-box',
              }}
            >
              {/* Sector label tab */}
              <div style={{
                position: 'absolute', top: 2, left: 2, zIndex: 3,
                fontSize: 9, color: 'white', fontWeight: 700,
                background: 'rgba(0,0,0,0.45)',
                padding: '1px 4px', borderRadius: 2,
                pointerEvents: 'none', whiteSpace: 'nowrap',
                maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {sec.name}
              </div>

              {/* Stock rects within sector */}
              {srecs.map(rect => {
                const stock = sec.stocks.find(s => s.symbol === rect.id)
                if (!stock) return null

                // Approximate pixel dimensions to decide what text to show
                const approxPxW = (rect.w / 100) * (sr.w / 100) * 1400
                const approxPxH = (rect.h / 100) * CONTAINER_H * (sr.h / 100)
                const showSym = approxPxW > 24 && approxPxH > 18
                const showPct = approxPxW > 34 && approxPxH > 34
                const fs      = Math.min(14, Math.max(7, Math.min(approxPxW / 5.5, approxPxH / 3.5)))

                return (
                  <Link
                    key={stock.symbol}
                    href={`/stocks/${stock.symbol}`}
                    title={`${stock.symbol} — ${stock.name}\nPrice: ${stock.price.toFixed(2)}\nChange: ${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%`}
                    style={{
                      position:        'absolute',
                      left:            `${rect.x}%`,
                      top:             `${rect.y}%`,
                      width:           `${rect.w}%`,
                      height:          `${rect.h}%`,
                      backgroundColor: heatColor(stock.changePct),
                      border:          '1px solid rgba(0,0,0,0.18)',
                      boxSizing:       'border-box',
                      display:         'flex',
                      flexDirection:   'column',
                      alignItems:      'center',
                      justifyContent:  'center',
                      overflow:        'hidden',
                      color:           'white',
                      textDecoration:  'none',
                      transition:      'filter 0.1s',
                    }}
                    className="hover:brightness-110"
                  >
                    {showSym && (
                      <span style={{ fontSize: fs, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', maxWidth: '94%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stock.symbol}
                      </span>
                    )}
                    {showPct && (
                      <span style={{ fontSize: fs * 0.78, lineHeight: 1.1, opacity: 0.92, whiteSpace: 'nowrap' }}>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Grouped by sector · Box size = trading volume · Click any stock to open detail · Refreshes every 5 min
      </p>
    </div>
  )
}
