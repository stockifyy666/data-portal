'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Star, TrendingUp, TrendingDown, Trash2, Loader2, LayoutGrid, List } from 'lucide-react'
import { formatPrice, formatChange, getChangeColor } from '@/lib/utils/format'
import { cachedFetch } from '@/lib/utils/clientCache'
import type { StockQuote } from '@/types/market'
import KMIBadge, { isKMI } from '@/components/ui/KMIBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WatchItem {
  id:          string
  symbol:      string
  added_at:    string
  added_price: number
}

interface EnrichedItem extends WatchItem {
  name:       string
  price:      number
  change:     number
  changePct:  number
  volume:     number
  sector:     string
  indexKeys?: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_NAMES: Record<string, string> = {
  '0801': 'Automobiles',       '0802': 'Auto Parts',
  '0803': 'Cable & Elec.',     '0804': 'Cement',
  '0805': 'Chemical',          '0806': 'Closed-End MF',
  '0807': 'Commercial Banks',  '0808': 'Engineering',
  '0809': 'Fertilizers',       '0810': 'Food & Personal Care',
  '0811': 'Glass & Ceramics',  '0812': 'Insurance',
  '0813': 'Inv. Companies',    '0818': 'Miscellaneous',
  '0819': 'Modarbas',          '0820': 'Oil & Gas Expl.',
  '0821': 'Oil & Gas Mktg.',   '0822': 'Paper & Board',
  '0823': 'Pharmaceuticals',   '0824': 'Power Generation',
  '0825': 'Refinery',          '0826': 'Sugar & Allied',
  '0827': 'Synthetic & Rayon', '0828': 'Technology',
  '0829': 'Textile Composite', '0830': 'Textile Spinning',
  '0831': 'Textile Weaving',   '0832': 'Tobacco',
  '0833': 'Transport',         '0834': 'Vanaspati',
  '0835': 'Woolen',            '0836': 'REIT',
  '0837': 'ETFs',              '0838': 'Real Estate',
}

function sectorLabel(code: string) {
  return SECTOR_NAMES[code] ?? (code ? `Sector ${code}` : 'Other')
}

function fmtVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'list' | 'sector'

export default function WatchlistPage() {
  const [items,    setItems]    = useState<EnrichedItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [view,     setView]     = useState<View>('sector')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [wlRes, quotesJson] = await Promise.all([
        fetch('/api/watchlist'),
        cachedFetch<{ quotes: StockQuote[] }>('/api/market/quotes', 5 * 60_000),
      ])
      if (!wlRes.ok) return
      const wlJson = await wlRes.json()
      const allQuotes: StockQuote[] = quotesJson.quotes ?? []
      const qMap = Object.fromEntries(allQuotes.map(q => [q.symbol, q]))

      // Flatten all watchlist items across all watchlists
      const rawItems: WatchItem[] = (wlJson.data ?? []).flatMap(
        (wl: any) => (wl.watchlist_items ?? []).map((i: any) => ({
          id:          i.id,
          symbol:      i.symbol,
          added_at:    i.added_at ?? '',
          added_price: i.added_price ?? 0,
        }))
      )

      const enriched: EnrichedItem[] = rawItems.map(item => {
        const q = qMap[item.symbol]
        return {
          ...item,
          name:      q?.name      ?? item.symbol,
          price:     q?.price     ?? 0,
          change:    q?.change    ?? 0,
          changePct: q?.changePct ?? 0,
          volume:    q?.volume    ?? 0,
          sector:    q?.sector    ?? '',
          indexKeys: q?.indexKeys,
        }
      })

      setItems(enriched)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function remove(id: string, symbol: string) {
    setRemoving(id)
    try {
      const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
    } finally { setRemoving(null) }
  }

  // Group by sector for sector view
  const bySector = useMemo(() => {
    const map: Record<string, EnrichedItem[]> = {}
    for (const item of items) {
      const key = item.sector || '__other'
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    // Sort sectors by count desc
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length)
  }, [items])

  // Summary stats
  const gainers = items.filter(i => i.changePct > 0).length
  const losers  = items.filter(i => i.changePct < 0).length

  // ── Row component ──────────────────────────────────────────────────────────
  function Row({ item }: { item: EnrichedItem }) {
    const clr   = getChangeColor(item.change)
    const isUp  = item.change >= 0
    const isDel = removing === item.id

    return (
      <tr style={{ borderBottom: '1px solid var(--bg-border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-1">
            <Link href={`/stocks/${item.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>
              {item.symbol}
            </Link>
            {isKMI(item.indexKeys, item.symbol) && <KMIBadge />}
          </div>
        </td>
        <td className="py-2.5 px-2 max-w-[180px] truncate">
          <Link href={`/stocks/${item.symbol}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{item.name}</Link>
        </td>
        <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-muted)' }}>
          {item.added_price > 0 ? formatPrice(item.added_price) : '—'}
        </td>
        <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
          {item.price > 0 ? formatPrice(item.price) : '—'}
        </td>
        <td className={`py-2.5 px-2 font-number ${clr}`}>
          {item.price > 0 ? formatChange(item.change) : '—'}
        </td>
        <td className={`py-2.5 px-2 font-number font-semibold ${clr}`}>
          {item.price > 0
            ? <span className="flex items-center gap-1">
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {isUp ? '+' : ''}{item.changePct.toFixed(2)}%
              </span>
            : '—'}
        </td>
        <td className="py-2.5 px-2 font-number" style={{ color: 'var(--text-secondary)' }}>
          {item.volume > 0 ? fmtVolume(item.volume) : '—'}
        </td>
        <td className="py-2.5 px-2 text-right">
          <button onClick={() => remove(item.id, item.symbol)} disabled={isDel}
            className="p-1 rounded hover:text-red-500 disabled:opacity-30 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            {isDel
              ? <Loader2 size={12} className="animate-spin" />
              : <Trash2 size={12} />}
          </button>
        </td>
      </tr>
    )
  }

  function TableHead() {
    return (
      <thead>
        <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
          {['Symbol', 'Company', 'Added Price', 'Price', 'Change', '% Chg', 'Volume', ''].map(col => (
            <th key={col}
                className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
    )
  }

  return (
    <div className="space-y-5 animate-data">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Watchlist</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Stocks you are tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          {items.length > 0 && (
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <button onClick={() => setView('list')}
                className="p-1.5 rounded transition-colors"
                style={view === 'list'
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                  : { color: 'var(--text-muted)', backgroundColor: 'transparent' }}
                title="List view">
                <List size={13} />
              </button>
              <button onClick={() => setView('sector')}
                className="p-1.5 rounded transition-colors"
                style={view === 'sector'
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                  : { color: 'var(--text-muted)', backgroundColor: 'transparent' }}
                title="Sector view">
                <LayoutGrid size={13} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {loading ? '…' : `${items.length} symbols`}
          </div>
        </div>
      </div>

      {/* Summary chips */}
      {!loading && items.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Total',   val: items.length,      color: 'var(--text-primary)' },
            { label: 'Gaining', val: gainers,            color: '#16a34a' },
            { label: 'Losing',  val: losers,             color: '#dc2626' },
            { label: 'Sectors', val: bySector.length,   color: '#FEA500' },
          ].map(c => (
            <div key={c.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                 style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{c.label}</span>
              <span className="font-bold font-number" style={{ color: c.color }}>{c.val}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card space-y-3 p-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-border)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <Star size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Your watchlist is empty</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Browse stocks and click "Add to Watchlist" to track them here.
          </p>
          <Link href="/stocks" className="text-xs font-semibold" style={{ color: '#FEA500' }}>
            Browse PSX stocks →
          </Link>
        </div>
      ) : view === 'list' ? (
        /* ── List view ── */
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <TableHead />
            <tbody>
              {items.map(item => <Row key={item.id} item={item} />)}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Sector view ── */
        <div className="space-y-4">
          {bySector.map(([sectorCode, sectorItems]) => {
            const sUp   = sectorItems.filter(i => i.changePct > 0).length
            const sDown = sectorItems.filter(i => i.changePct < 0).length
            return (
              <div key={sectorCode} className="card overflow-x-auto">
                {/* Sector header */}
                <div className="flex items-center justify-between mb-3 pb-2"
                     style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {sectorLabel(sectorCode === '__other' ? '' : sectorCode)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-number"
                          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      {sectorItems.length}
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {sUp > 0   && <span style={{ color: '#16a34a' }}>▲ {sUp}</span>}
                    {sDown > 0 && <span style={{ color: '#dc2626' }}>▼ {sDown}</span>}
                  </div>
                </div>
                <table className="w-full text-xs">
                  <TableHead />
                  <tbody>
                    {sectorItems.map(item => <Row key={item.id} item={item} />)}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
