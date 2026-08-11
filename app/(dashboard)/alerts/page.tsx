'use client'

import { useState, useEffect }      from 'react'
import Link                         from 'next/link'
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, Gift, Layers } from 'lucide-react'
import { formatPrice, formatPercent } from '@/lib/utils/format'
import { cachedFetch }                from '@/lib/utils/clientCache'

/* ── Price Alerts ────────────────────────────────────────────────── */
type Alert = {
  id:           string
  symbol:       string
  target_price: number
  direction:    'above' | 'below'
  is_active:    boolean
  triggered_at: string | null
  created_at:   string
}

/* ── Corporate Events ────────────────────────────────────────────── */
type CorporateEvent = {
  symbol:    string
  name:      string
  sector:    string
  eventType: 'Dividend' | 'Bonus' | 'Rights'
  dps:       number
  price:     number
  changePct: number
}

const EVENT_META: Record<string, { icon: React.ElementType; badge: string; color: string }> = {
  Dividend: { icon: Gift,   badge: 'bg-amber-50 text-amber-700 border-amber-200',   color: 'text-amber-600' },
  Bonus:    { icon: Layers, badge: 'bg-blue-50 text-blue-700 border-blue-200',      color: 'text-blue-600'  },
  Rights:   { icon: TrendingUp, badge: 'bg-purple-50 text-purple-700 border-purple-200', color: 'text-purple-600' },
}

type Tab = 'events' | 'price'

export default function AlertsPage() {
  const [tab,     setTab]     = useState<Tab>('events')

  /* Events state */
  const [events,  setEvents]  = useState<CorporateEvent[]>([])
  const [evLoad,  setEvLoad]  = useState(true)
  const [evErr,   setEvErr]   = useState('')
  const [evFilter, setEvFilter] = useState<'' | 'Dividend' | 'Bonus' | 'Rights'>('')

  /* Price alerts state */
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [alLoad,  setAlLoad]  = useState(true)
  const [symbol,  setSymbol]  = useState('')
  const [price,   setPrice]   = useState('')
  const [dir,     setDir]     = useState<'above' | 'below'>('above')
  const [adding,  setAdding]  = useState(false)

  useEffect(() => {
    cachedFetch<{ events: CorporateEvent[] }>('/api/market/events', 5 * 60 * 1000)
      .then(json => {
        if (json.events) setEvents(json.events)
        else setEvErr('No event data returned')
      })
      .catch(() => setEvErr('Failed to load events'))
      .finally(() => setEvLoad(false))

    fetch('/api/alerts')
      .then(r => r.json())
      .then(json => { if (json.data) setAlerts(json.data) })
      .catch(() => {})
      .finally(() => setAlLoad(false))
  }, [])

  async function addAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !price) return
    setAdding(true)
    await fetch('/api/alerts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        symbol:      symbol.toUpperCase(),
        targetPrice: parseFloat(price),
        direction:   dir,
      }),
    })
    setSymbol('')
    setPrice('')
    const res  = await fetch('/api/alerts')
    const json = await res.json()
    if (json.data) setAlerts(json.data)
    setAdding(false)
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const visibleEvents = evFilter
    ? events.filter(e => e.eventType === evFilter)
    : events

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm
                      focus:outline-none transition-colors`
  const inputStyle = {
    backgroundColor: 'var(--bg-hover)',
    borderColor:     'var(--bg-border)',
    color:           'var(--text-primary)',
  }

  return (
    <div className="space-y-5 animate-data max-w-4xl">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Alerts &amp; Announcements
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Corporate events and your personal price alerts
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
           style={{ backgroundColor: 'var(--bg-hover)' }}>
        {([
          { value: 'events', label: 'Corporate Events' },
          { value: 'price',  label: 'Price Alerts'     },
        ] as { value: Tab; label: string }[]).map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={tab === t.value
              ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
              : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CORPORATE EVENTS ───────────────────────────────────────── */}
      {tab === 'events' && (
        <div className="card space-y-4">
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Filter:
            </span>
            {(['', 'Dividend', 'Bonus', 'Rights'] as const).map(f => (
              <button
                key={f}
                onClick={() => setEvFilter(f)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                style={evFilter === f
                  ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white', borderColor: 'transparent' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', borderColor: 'var(--bg-border)' }
                }
              >
                {f === '' ? 'All Events' : f}
              </button>
            ))}
          </div>

          {evLoad ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="h-8 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="flex-1 h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
                </div>
              ))}
            </div>
          ) : evErr ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>{evErr}</p>
          ) : visibleEvents.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
              No {evFilter || ''} events found.
            </p>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-[80px_1fr_90px_80px_80px] gap-2 py-1.5 text-[10px]
                              font-semibold uppercase tracking-wider"
                   style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
                <span>Symbol</span>
                <span>Company</span>
                <span>Event</span>
                <span className="text-right">DPS</span>
                <span className="text-right">% Chg</span>
              </div>

              <div className="space-y-0">
                {visibleEvents.map((ev, i) => {
                  const meta = EVENT_META[ev.eventType]
                  const Icon = meta.icon
                  const isUp = ev.changePct >= 0
                  return (
                    <div
                      key={`${ev.symbol}-${i}`}
                      className="grid grid-cols-[80px_1fr_90px_80px_80px] gap-2 py-2.5
                                 items-center transition-colors rounded-lg -mx-2 px-2"
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}
                    >
                      <Link
                        href={`/stocks/${ev.symbol}`}
                        className="font-bold text-xs hover:underline"
                        style={{ color: '#FEA500' }}
                      >
                        {ev.symbol}
                      </Link>

                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {ev.name}
                        </p>
                        {ev.sector && (
                          <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {ev.sector}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                         text-[10px] font-semibold border ${meta.badge}`}>
                          <Icon size={9} />
                          {ev.eventType}
                        </span>
                      </div>

                      <p className="text-xs font-number text-right font-semibold"
                         style={{ color: 'var(--text-primary)' }}>
                        {ev.dps > 0 ? `Rs ${ev.dps.toFixed(2)}` : '—'}
                      </p>

                      <p className={`text-xs font-number text-right font-semibold
                                     ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                        {isUp ? '+' : ''}{formatPercent(ev.changePct / 100)}
                      </p>
                    </div>
                  )
                })}
              </div>

              <p className="text-[10px] pt-1" style={{ color: 'var(--text-muted)' }}>
                {events.some(e => e.eventType === 'Dividend' && e.dps === 0)
                  ? 'Showing companies with active ex-dividend, ex-bonus, or ex-rights status.'
                  : 'Showing top dividend-paying companies by DPS. Ex-dividend/bonus/rights events appear when active.'
                }
                {' '}Refreshes every 5 min.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── PRICE ALERTS ────────────────────────────────────────────── */}
      {tab === 'price' && (
        <div className="space-y-4">
          {/* Add alert form */}
          <form onSubmit={addAlert} className="card space-y-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New Price Alert
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol (e.g. ENGRO)"
                maxLength={8}
                className={inputClass}
                style={inputStyle}
              />
              <select
                value={dir}
                onChange={e => setDir(e.target.value as 'above' | 'below')}
                className={inputClass}
                style={inputStyle}
              >
                <option value="above">Goes above</option>
                <option value="below">Falls below</option>
              </select>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Target price"
                step="0.01"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={adding || !symbol || !price}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }}
            >
              {adding ? 'Adding…' : 'Add Alert'}
            </button>
          </form>

          {/* Alerts list */}
          <div className="space-y-2">
            {alLoad ? (
              <div className="card space-y-3">
                {[1,2,3].map(n => (
                  <div key={n} className="h-4 rounded animate-pulse"
                       style={{ backgroundColor: 'var(--bg-hover)' }} />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="card text-center py-12">
                <Bell size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  No alerts set
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Use the form above to create your first alert.
                </p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`card flex items-center justify-between gap-4
                              ${alert.triggered_at ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {alert.triggered_at
                      ? <BellOff size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                      : <Bell    size={14} style={{ color: '#FEA500' }}           className="shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {alert.symbol}{' '}
                        <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
                          {alert.direction === 'above' ? '↑ above' : '↓ below'}{' '}
                          {formatPrice(alert.target_price)}
                        </span>
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {alert.triggered_at
                          ? `Triggered: ${new Date(alert.triggered_at).toLocaleDateString('en-PK')}`
                          : 'Active — checking every 5 min'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1 shrink-0 transition-colors hover:text-red-500"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
